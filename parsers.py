"""Parsers for extracting and normalizing Product Hunt payloads."""

from typing import Any, Dict, List, Optional, Tuple


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

