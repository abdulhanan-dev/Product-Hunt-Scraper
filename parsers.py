"""Parsers for extracting and normalizing Product Hunt payloads."""

from typing import Any, Dict, List, Optional, Set, Tuple
from bs4 import BeautifulSoup
from utils import decode_base64_url


def parse_leaderboard_page(
    payload: Dict[str, Any], target_date: str
) -> Tuple[List[Dict[str, Any]], bool, Optional[str]]:
    """Parse a LeaderboardDailyPage response.

    Returns:
        tuple: (launches_list, has_next_page, end_cursor)
    """
    data = payload.get("data") or {}

    # Locate the connection node (e.g. posts, dailyLeaderboard, leaderboard)
    connection = None
    for key in ["dailyLeaderboard", "posts", "leaderboard", "viewer"]:
        if key in data and isinstance(data[key], dict):
            if "edges" in data[key] or "pageInfo" in data[key]:
                connection = data[key]
                break
            # Check nested inside viewer
            for subkey in ["posts", "leaderboard"]:
                if subkey in data[key] and isinstance(data[key][subkey], dict):
                    connection = data[key][subkey]
                    break
        if connection:
            break

    # If connection not found at top level, search any dict containing 'edges'
    if not connection:
        for val in data.values():
            if isinstance(val, dict) and ("edges" in val or "nodes" in val):
                connection = val
                break

    if not connection:
        return [], False, None

    # Parse PageInfo
    page_info = connection.get("pageInfo", {})
    has_next_page = bool(page_info.get("hasNextPage", False))
    end_cursor = page_info.get("endCursor")

    # Extract items/edges
    edges = connection.get("edges") or []
    launches: List[Dict[str, Any]] = []

    for edge in edges:
        node = edge.get("node") if isinstance(edge, dict) and "node" in edge else edge
        if not isinstance(node, dict):
            continue

        typename = node.get("__typename", "Post")

        # Filter: Skip Ad entries, keep Post entries
        if typename.lower() == "ad":
            continue
        if typename.lower() != "post" and typename != "":
            # Skip any non-post entry
            continue

        # Post ID & Slug (launch specific)
        post_id = str(node.get("id", ""))
        post_slug = node.get("slug", "")

        # Product details (may be nested under product object)
        product_obj = node.get("product") if isinstance(node.get("product"), dict) else {}
        product_id = str(product_obj.get("id") or node.get("productId") or "")
        product_slug = product_obj.get("slug") or node.get("productSlug") or post_slug

        # Topics
        topics_raw = node.get("topics") or []
        topics: List[str] = []
        if isinstance(topics_raw, dict) and "edges" in topics_raw:
            topics = [e.get("node", {}).get("name", "") for e in topics_raw["edges"] if isinstance(e, dict)]
        elif isinstance(topics_raw, list):
            topics = [t.get("name", "") if isinstance(t, dict) else str(t) for t in topics_raw]

        launch_record: Dict[str, Any] = {
            "target_date": target_date,
            "post_id": post_id,
            "post_slug": post_slug,
            "product_id": product_id,
            "product_slug": product_slug,
            "name": node.get("name", ""),
            "tagline": node.get("tagline", ""),
            "score": node.get("votesCount") or node.get("score") or node.get("points") or 0,
            "rank": node.get("rank") or node.get("dailyRank"),
            "comments_count": node.get("commentsCount", 0),
            "topics": [t for t in topics if t],
            "logo_uuid": node.get("logoUuid") or (node.get("thumbnail") or {}).get("url"),
            "shortened_url": node.get("shortenedUrl") or node.get("url"),
            "featured_at": node.get("featuredAt"),
            "weekly_rank": node.get("weeklyRank"),
            "monthly_rank": node.get("monthlyRank"),
            "__typename": typename,
        }

        # Cursor fallback from edge if page_info cursor is missing
        if not end_cursor and isinstance(edge, dict) and "cursor" in edge:
            end_cursor = edge["cursor"]

        if post_id:
            launches.append(launch_record)

    return launches, has_next_page, end_cursor


def parse_product_layout(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ProductsPageLayout GraphQL response."""
    data = payload.get("data") or {}
    product_obj = data.get("product") or data.get("productPage") or {}
    if not isinstance(product_obj, dict):
        return {}

    # Extract categories
    categories_raw = product_obj.get("categories") or []
    categories: List[str] = []
    if isinstance(categories_raw, dict) and "edges" in categories_raw:
        categories = [
            e.get("node", {}).get("name", "")
            for e in categories_raw["edges"]
            if isinstance(e, dict)
        ]
    elif isinstance(categories_raw, list):
        categories = [c.get("name", "") if isinstance(c, dict) else str(c) for c in categories_raw]

    # Social links
    social_links = product_obj.get("socialLinks") or {}
    if not isinstance(social_links, dict):
        social_links = {}

    # Ratings
    ratings = {
        "average": product_obj.get("reviewsRating") or (product_obj.get("ratings") or {}).get("average", 0.0),
        "count": product_obj.get("reviewsCount") or (product_obj.get("ratings") or {}).get("count", 0),
    }

    return {
        "product_id": str(product_obj.get("id", "")),
        "name": product_obj.get("name", ""),
        "slug": product_obj.get("slug", ""),
        "tagline": product_obj.get("tagline", ""),
        "description": product_obj.get("description", ""),
        "categories": [c for c in categories if c],
        "ratings": ratings,
        "pro_con_tags": product_obj.get("proConTags") or [],
        "awards": product_obj.get("awards") or [],
        "yc_info": product_obj.get("yc") or product_obj.get("yCombinator") or {},
        "posts_count": product_obj.get("postsCount", 0),
        "first_post": product_obj.get("firstPost") or {},
        "social_links": social_links,
    }


def parse_product_about(
    payload: Dict[str, Any], product_id: str, product_slug: str
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """Parse ProductAboutPage GraphQL response.

    Returns:
        tuple: (media_items, people, about_info)
    """
    data = payload.get("data") or {}
    product_obj = data.get("product") or data.get("productAbout") or {}
    if not isinstance(product_obj, dict):
        return [], [], {}

    media_items: List[Dict[str, Any]] = []
    media_raw = product_obj.get("media") or []
    if isinstance(media_raw, dict) and "edges" in media_raw:
        media_raw = [e.get("node") for e in media_raw["edges"] if isinstance(e, dict)]

    for idx, item in enumerate(media_raw):
        if not isinstance(item, dict):
            continue
        media_url = item.get("url") or item.get("imageUrl") or item.get("videoUrl")
        if media_url:
            media_items.append(
                {
                    "product_id": product_id,
                    "product_slug": product_slug,
                    "media_url": media_url,
                    "media_type": item.get("type") or item.get("mediaType", "image"),
                    "priority": idx + 1,
                }
            )

    people: List[Dict[str, Any]] = []

    # Makers
    makers_raw = product_obj.get("makers") or []
    if isinstance(makers_raw, dict) and "edges" in makers_raw:
        makers_raw = [e.get("node") for e in makers_raw["edges"] if isinstance(e, dict)]

    for maker in makers_raw:
        if not isinstance(maker, dict):
            continue
        username = maker.get("username", "")
        if username:
            people.append(
                {
                    "product_id": product_id,
                    "user_id": str(maker.get("id", "")),
                    "username": username,
                    "name": maker.get("name", ""),
                    "headline": maker.get("headline", ""),
                    "avatar_url": maker.get("profileImage") or maker.get("avatarUrl", ""),
                    "role": "maker",
                }
            )

    # Hunter
    hunter = product_obj.get("hunter") or product_obj.get("user")
    if isinstance(hunter, dict) and hunter.get("username"):
        people.append(
            {
                "product_id": product_id,
                "user_id": str(hunter.get("id", "")),
                "username": hunter.get("username", ""),
                "name": hunter.get("name", ""),
                "headline": hunter.get("headline", ""),
                "avatar_url": hunter.get("profileImage") or hunter.get("avatarUrl", ""),
                "role": "hunter",
            }
        )

    about_info = {
        "pricing_type": product_obj.get("pricingType") or product_obj.get("pricing", ""),
        "primary_link": product_obj.get("url") or product_obj.get("website", ""),
    }

    return media_items, people, about_info


def parse_product_built_with(
    payload: Dict[str, Any], product_id: str
) -> List[Dict[str, Any]]:
    """Parse ProductBuiltWithPage GraphQL response."""
    data = payload.get("data") or {}
    product_obj = data.get("product") or data.get("productBuiltWith") or {}
    if not isinstance(product_obj, dict):
        return []

    reviews_obj = product_obj.get("authoredDetailedReviews") or {}
    edges = reviews_obj.get("edges") or [] if isinstance(reviews_obj, dict) else []

    built_with_items: List[Dict[str, Any]] = []
    for edge in edges:
        node = edge.get("node") if isinstance(edge, dict) and "node" in edge else edge
        if not isinstance(node, dict):
            continue

        related_prod = node.get("product") or {}
        related_id = str(related_prod.get("id", ""))
        if not related_id:
            continue

        built_with_items.append(
            {
                "product_id": product_id,
                "related_product_id": related_id,
                "related_product_name": related_prod.get("name", ""),
                "related_product_slug": related_prod.get("slug", ""),
                "shoutout_note": node.get("shoutoutNote") or "",
            }
        )

    return built_with_items


def parse_comments_page(
    payload: Dict[str, Any], product_id: str, post_slug: str
) -> Tuple[List[Dict[str, Any]], bool, Optional[str], Set[str]]:
    """Parse comments and nested replies from ProductPageLaunchingTodayComments response.

    Returns:
        tuple: (comments_list, has_next_page, end_cursor, discovered_usernames)
    """
    data = payload.get("data") or {}
    comments_node = None
    for key in ["comments", "post", "launchingToday"]:
        if key in data and isinstance(data[key], dict):
            if "edges" in data[key] or "pageInfo" in data[key]:
                comments_node = data[key]
                break
            if "comments" in data[key] and isinstance(data[key]["comments"], dict):
                comments_node = data[key]["comments"]
                break

    if not comments_node:
        for val in data.values():
            if isinstance(val, dict) and ("edges" in val or "nodes" in val):
                comments_node = val
                break

    if not comments_node:
        return [], False, None, set()

    page_info = comments_node.get("pageInfo", {})
    has_next_page = bool(page_info.get("hasNextPage", False))
    end_cursor = page_info.get("endCursor")

    edges = comments_node.get("edges") or []
    comments: List[Dict[str, Any]] = []
    discovered_users: Set[str] = set()

    def process_comment_node(node: Dict[str, Any], parent_id: Optional[str] = None) -> None:
        if not isinstance(node, dict) or not node.get("id"):
            return

        cid = str(node.get("id"))
        user_info = node.get("user") or node.get("author") or {}
        username = user_info.get("username", "")
        if username:
            discovered_users.add(username)

        comment_record = {
            "comment_id": cid,
            "product_id": product_id,
            "post_slug": post_slug,
            "parent_comment_id": parent_id,
            "body_html": node.get("bodyHtml") or node.get("body", ""),
            "votes_count": node.get("votesCount", 0),
            "created_at": node.get("createdAt"),
            "url": node.get("url", ""),
            "badges": node.get("badges") or [],
            "is_pinned": bool(node.get("isPinned", False)),
            "author_username": username,
            "author_id": str(user_info.get("id", "")),
            "author_name": user_info.get("name", ""),
        }
        comments.append(comment_record)

        # Process nested replies
        replies_obj = node.get("replies") or node.get("childComments") or []
        reply_nodes = []
        if isinstance(replies_obj, dict):
            reply_edges = replies_obj.get("edges") or replies_obj.get("nodes") or []
            reply_nodes = [
                e.get("node") if isinstance(e, dict) and "node" in e else e
                for e in reply_edges
            ]
        elif isinstance(replies_obj, list):
            reply_nodes = replies_obj

        for r_node in reply_nodes:
            if isinstance(r_node, dict):
                process_comment_node(r_node, parent_id=cid)

    for edge in edges:
        node = edge.get("node") if isinstance(edge, dict) and "node" in edge else edge
        if isinstance(node, dict):
            process_comment_node(node)
            if not end_cursor and isinstance(edge, dict) and "cursor" in edge:
                end_cursor = edge["cursor"]

    return comments, has_next_page, end_cursor, discovered_users


def parse_detailed_reviews_count(payload: Dict[str, Any]) -> int:
    """Extract detailedReviewsCount from DetailedReviewsPage response."""
    data = payload.get("data") or {}
    product_obj = data.get("product") or {}
    if isinstance(product_obj, dict):
        count = product_obj.get("detailedReviewsCount")
        if count is not None:
            return int(count)

    # Fallback to direct key
    for val in data.values():
        if isinstance(val, dict) and "detailedReviewsCount" in val:
            return int(val["detailedReviewsCount"])

    return 0


def parse_detailed_reviews_feed(
    payload: Dict[str, Any], product_id: str
) -> Tuple[List[Dict[str, Any]], bool, Optional[str], Set[str]]:
    """Parse detailed review cards from DetailedReviewsFeedQuery response.

    Returns:
        tuple: (reviews_list, has_next_page, end_cursor, discovered_usernames)
    """
    data = payload.get("data") or {}
    reviews_node = None

    for key in ["reviewsPage", "reviews", "product"]:
        if key in data and isinstance(data[key], dict):
            if "edges" in data[key] or "pageInfo" in data[key]:
                reviews_node = data[key]
                break
            if "reviews" in data[key] and isinstance(data[key]["reviews"], dict):
                reviews_node = data[key]["reviews"]
                break

    if not reviews_node:
        for val in data.values():
            if isinstance(val, dict) and ("edges" in val or "nodes" in val):
                reviews_node = val
                break

    if not reviews_node:
        return [], False, None, set()

    page_info = reviews_node.get("pageInfo", {})
    has_next_page = bool(page_info.get("hasNextPage", False))
    end_cursor = page_info.get("endCursor")

    edges = reviews_node.get("edges") or []
    reviews: List[Dict[str, Any]] = []
    discovered_users: Set[str] = set()

    for edge in edges:
        node = edge.get("node") if isinstance(edge, dict) and "node" in edge else edge
        if not isinstance(node, dict) or not node.get("id"):
            continue

        rid = str(node.get("id"))
        user_info = node.get("user") or node.get("author") or {}
        username = user_info.get("username", "")
        if username:
            discovered_users.add(username)

        review_record = {
            "review_id": rid,
            "product_id": product_id,
            "review_type": node.get("reviewType", ""),
            "created_at": node.get("createdAt"),
            "rating": node.get("rating") or node.get("score"),
            "feedback": node.get("feedback") or node.get("body", ""),
            "pros": node.get("pros") or node.get("selectedPros") or [],
            "cons": node.get("cons") or node.get("selectedCons") or [],
            "alternative_products": node.get("alternativeProducts") or [],
            "votes_count": node.get("votesCount", 0),
            "author_username": username,
            "author_id": str(user_info.get("id", "")),
            "replies": node.get("replies") or [],
        }
        reviews.append(review_record)

        if not end_cursor and isinstance(edge, dict) and "cursor" in edge:
            end_cursor = edge["cursor"]

    return reviews, has_next_page, end_cursor, discovered_users


def parse_profile_ssr(html_text: str, username: str) -> Optional[Dict[str, Any]]:
    """Parse Apollo SSR data from a public Product Hunt profile HTML page."""
    import json
    import re

    soup = BeautifulSoup(html_text, "html.parser")
    profile_data: Optional[Dict[str, Any]] = None
    decoder = json.JSONDecoder()

    # Search script tags for ApolloSSRDataTransport or profile query
    scripts = soup.find_all("script")
    for script in scripts:
        content = script.string or script.text or ""
        if not content:
            continue

        if "ProfileLayoutQuery" in content or "ProfileAboutPage" in content or "ApolloSSRDataTransport" in content or "profile" in content:
            # Safely replace JS undefined with null
            sanitized = re.sub(r':\s*undefined\b', ': null', content)

            # Search for JSON start positions '{'
            pos = 0
            while True:
                idx = sanitized.find('{', pos)
                if idx == -1:
                    break
                try:
                    obj, end_idx = decoder.raw_decode(sanitized[idx:])
                    pos = idx + end_idx
                    if isinstance(obj, dict):
                        cand = (
                            obj.get("data", {}).get("profile")
                            or obj.get("value", {}).get("data", {}).get("profile")
                            or obj.get("profile")
                        )
                        if cand and isinstance(cand, dict) and (cand.get("id") or cand.get("name") or cand.get("username")):
                            profile_data = cand
                            break
                except Exception:
                    pos = idx + 1
        if profile_data:
            break

    if not profile_data:
        return None

    # Social links decoding
    social_links_raw = profile_data.get("socialLinks") or profile_data.get("links") or {}
    decoded_links: Dict[str, str] = {}
    if isinstance(social_links_raw, dict):
        for k, v in social_links_raw.items():
            if isinstance(v, dict) and "encodedUrl" in v:
                decoded_links[k] = decode_base64_url(v["encodedUrl"])
            elif isinstance(v, str):
                decoded_links[k] = v
    elif isinstance(social_links_raw, list):
        for item in social_links_raw:
            if isinstance(item, dict):
                label = item.get("type") or item.get("label", "link")
                url = item.get("url") or decode_base64_url(item.get("encodedUrl", ""))
                if url:
                    decoded_links[label] = url

    return {
        "username": username.lower(),
        "user_id": str(profile_data.get("id", "")),
        "name": profile_data.get("name", ""),
        "headline": profile_data.get("headline", ""),
        "about": profile_data.get("about", ""),
        "is_maker": bool(profile_data.get("isMaker", False)),
        "is_verified": bool(profile_data.get("isVerified", False)),
        "verified": bool(profile_data.get("isVerified", False)),
        "streak": profile_data.get("streak", 0),
        "kitty_coins": profile_data.get("kittyCoins", 0),
        "created_at": profile_data.get("createdAt"),
        "badges": profile_data.get("badges") or [],
        "social_links": decoded_links,
    }

