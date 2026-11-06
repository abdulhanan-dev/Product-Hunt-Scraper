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
