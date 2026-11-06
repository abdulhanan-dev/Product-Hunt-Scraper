"""Scraper module for Stage 1: Daily Leaderboard."""

from typing import Any, Dict, List, Optional, Set, Tuple
from client import GraphQLClient
from config import (
    HASH_DETAILED_REVIEWS_FEED,
    HASH_DETAILED_REVIEWS_PAGE,
    HASH_PRODUCT_ABOUT_PAGE,
    HASH_PRODUCT_BUILT_WITH_PAGE,
    HASH_PRODUCT_COMMENTS,
    HASH_PRODUCTS_PAGE_LAYOUT,
    settings,
)
from parsers import (
    parse_comments_page,
    parse_detailed_reviews_count,
    parse_detailed_reviews_feed,
    parse_leaderboard_page,
    parse_product_about,
    parse_product_built_with,
    parse_product_layout,
    parse_profile_ssr,
)
from utils import get_logger

logger = get_logger(__name__, settings.log_level)


def fetch_daily_leaderboard(
    client: GraphQLClient,
    target_date: str,
    operation_hash: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve all featured launches for target_date across all cursor pages."""
    logger.info("Fetching daily leaderboard for date: %s", target_date)

    hash_to_use = operation_hash or settings.product_hunt_leaderboard_hash
    all_launches: List[Dict[str, Any]] = []
    cursor: Optional[str] = None
    page_num = 1

    # Auto-extract if hash is completely missing
    if not hash_to_use:
        logger.warning("No Leaderboard hash configured. Automatically launching hash extractor...")
        try:
            from extract_hashes import extract_hashes_and_cookies
            extracted, cookies, ua = extract_hashes_and_cookies()
            hash_to_use = extracted.get("LeaderboardDailyPage")
            if cookies:
                client.client.headers["Cookie"] = cookies
            if ua:
                client.client.headers["User-Agent"] = ua
        except Exception as exc:
            logger.error("Auto extraction failed: %s", exc)

    try:
        parts = [int(p) for p in target_date.split("-")]
        year, month, day = parts[0], parts[1], parts[2]
    except Exception:
        raise ValueError(f"Invalid target_date format '{target_date}'. Expected YYYY-MM-DD.")

    while True:
        variables: Dict[str, Any] = {
            "featured": True,
            "year": year,
            "month": month,
            "day": day,
            "order": "DAILY_RANK",
            "cursor": cursor,
        }

        logger.info(
            "Fetching leaderboard page %d (cursor=%s)",
            page_num,
            cursor or "START",
        )

        try:
            response = client.execute_query(
                operation_name="LeaderboardDailyPage",
                variables=variables,
                sha256_hash=hash_to_use,
            )
        except Exception as exc:
            err_msg = str(exc)
            if "This request could not be processed" in err_msg or "PersistedQuery" in err_msg:
                logger.warning(
                    "Persisted hash expired or rejected ('%s'). Automatically launching extractor to refresh...",
                    err_msg,
                )
                from extract_hashes import extract_hashes_and_cookies
                extracted, cookies, ua = extract_hashes_and_cookies()
                new_hash = extracted.get("LeaderboardDailyPage")
                if new_hash:
                    hash_to_use = new_hash
                if cookies:
                    client.client.headers["Cookie"] = cookies
                if ua:
                    client.client.headers["User-Agent"] = ua

                # Retry query with fresh hash
                response = client.execute_query(
                    operation_name="LeaderboardDailyPage",
                    variables=variables,
                    sha256_hash=hash_to_use,
                )
            else:
                raise

        launches, has_next_page, end_cursor = parse_leaderboard_page(response, target_date)
        all_launches.extend(launches)

        logger.info(
            "Page %d returned %d posts (has_next_page=%s)",
            page_num,
            len(launches),
            has_next_page,
        )

        if not has_next_page or not end_cursor:
            break

        if end_cursor == cursor:
            logger.warning("Pagination cursor did not advance. Stopping to prevent loop.")
            break

        cursor = end_cursor
        page_num += 1

    logger.info(
        "Successfully retrieved %d total launches for %s",
        len(all_launches),
        target_date,
    )
    return all_launches


def enrich_product(
    client: GraphQLClient,
    product_slug: str,
    product_id_hint: str = "",
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Retrieve detailed product information, about/media, makers, and built-with data."""
    logger.info("Enriching product details for slug: %s", product_slug)

    product_data: Dict[str, Any] = {}
    media_items: List[Dict[str, Any]] = []
    people: List[Dict[str, Any]] = []
    built_with: List[Dict[str, Any]] = []

    # 1. Product Layout / Details
    try:
        layout_vars = {
            "slug": product_slug,
            "includeAlternatives": True,
            "launchSlug": None,
        }
        layout_resp = client.execute_query(
            operation_name="ProductsPageLayout",
            variables=layout_vars,
            sha256_hash=HASH_PRODUCTS_PAGE_LAYOUT,
        )
        product_data = parse_product_layout(layout_resp)
    except Exception as exc:
        logger.warning("Failed to fetch layout for product %s: %s", product_slug, exc)

    # Use resolved product_id or hint
    resolved_product_id = product_data.get("product_id") or product_id_hint

    # 2. Product About (media, makers, hunters, pricing)
    try:
        about_vars = {"productSlug": product_slug}
        about_resp = client.execute_query(
            operation_name="ProductAboutPage",
            variables=about_vars,
            sha256_hash=HASH_PRODUCT_ABOUT_PAGE,
        )
        media_items, people, about_info = parse_product_about(
            about_resp,
            product_id=resolved_product_id,
            product_slug=product_slug,
        )
        if about_info:
            product_data.update(about_info)
    except Exception as exc:
        logger.warning("Failed to fetch about page for product %s: %s", product_slug, exc)

    # 3. Product Built With
    try:
        bw_vars = {"slug": product_slug}
        bw_resp = client.execute_query(
            operation_name="ProductBuiltWithPage",
            variables=bw_vars,
            sha256_hash=HASH_PRODUCT_BUILT_WITH_PAGE,
        )
        built_with = parse_product_built_with(bw_resp, product_id=resolved_product_id)
    except Exception as exc:
        logger.warning("Failed to fetch built-with for product %s: %s", product_slug, exc)

    return product_data, media_items, people, built_with


def fetch_product_comments(
    client: GraphQLClient,
    post_slug: str,
    product_id: str,
) -> Tuple[List[Dict[str, Any]], Set[str]]:
    """Retrieve all comments and nested replies for a launch post using post_slug."""
    logger.info("Fetching comments for post_slug: %s (product_id: %s)", post_slug, product_id)
    all_comments: List[Dict[str, Any]] = []
    seen_ids: Set[str] = set()
    discovered_users: Set[str] = set()
    cursor: Optional[str] = None
    page = 1

    while True:
        variables: Dict[str, Any] = {"postSlug": post_slug}
        if cursor:
            variables["cursor"] = cursor

        try:
            resp = client.execute_query(
                operation_name="ProductPageLaunchingTodayComments",
                variables=variables,
                sha256_hash=HASH_PRODUCT_COMMENTS,
            )
            comments, has_next, end_cursor, users = parse_comments_page(
                resp, product_id=product_id, post_slug=post_slug
            )
            discovered_users.update(users)

            for c in comments:
                cid = c["comment_id"]
                if cid not in seen_ids:
                    seen_ids.add(cid)
                    all_comments.append(c)

            if not has_next or not end_cursor or end_cursor == cursor:
                break
            cursor = end_cursor
            page += 1
        except Exception as exc:
            logger.warning("Failed to fetch comments page %d for %s: %s", page, post_slug, exc)
            break

    logger.info("Retrieved %d unique comments for post_slug: %s", len(all_comments), post_slug)
    return all_comments, discovered_users


def fetch_product_reviews(
    client: GraphQLClient,
    product_slug: str,
    product_id: str,
) -> Tuple[List[Dict[str, Any]], Set[str]]:
    """Retrieve detailed reviews after verifying detailedReviewsCount > 0."""
    logger.info("Checking detailed review count for product_slug: %s", product_slug)
    all_reviews: List[Dict[str, Any]] = []
    seen_ids: Set[str] = set()
    discovered_users: Set[str] = set()

    # Step 1: Check review count gate
    review_count = 0
    try:
        count_resp = client.execute_query(
            operation_name="DetailedReviewsPage",
            variables={"slug": product_slug, "commentsListSubjectThreadsLimit": 10},
            sha256_hash=HASH_DETAILED_REVIEWS_PAGE,
        )
        review_count = parse_detailed_reviews_count(count_resp)
    except Exception as exc:
        logger.warning("Failed to check review count for %s: %s", product_slug, exc)

    logger.info("Detailed reviews count for %s: %d", product_slug, review_count)
    if review_count <= 0:
        logger.info("Skipping review feed for %s (count is 0)", product_slug)
        return [], discovered_users

    # Step 2: Fetch review feed
    cursor: Optional[str] = None
    page = 1
    while True:
        variables: Dict[str, Any] = {
            "slug": product_slug,
            "reviewsLimit": 10,
            "commentsListSubjectThreadsLimit": 10,
        }
        if cursor:
            variables["cursor"] = cursor

        try:
            feed_resp = client.execute_query(
                operation_name="DetailedReviewsFeedQuery",
                variables=variables,
                sha256_hash=HASH_DETAILED_REVIEWS_FEED,
            )
            reviews, has_next, end_cursor, users = parse_detailed_reviews_feed(
                feed_resp, product_id=product_id
            )
            discovered_users.update(users)

            for r in reviews:
                rid = r["review_id"]
                if rid not in seen_ids:
                    seen_ids.add(rid)
                    all_reviews.append(r)

            if not has_next or not end_cursor or end_cursor == cursor:
                break
            cursor = end_cursor
            page += 1
        except Exception as exc:
            logger.warning("Failed to fetch review feed page %d for %s: %s", page, product_slug, exc)
            break

    logger.info("Retrieved %d unique reviews for product_slug: %s", len(all_reviews), product_slug)
    return all_reviews, discovered_users


_browser_cookie_refresh_done = False


def reset_browser_refresh_flag() -> None:
    """Reset the browser cookie refresh flag for a new run."""
    global _browser_cookie_refresh_done
    _browser_cookie_refresh_done = False


def fetch_user_profile(
    client: GraphQLClient, username: str, max_auth_retries: int = 1
) -> Optional[Dict[str, Any]]:
    """Retrieve public profile data for a username by parsing SSR HTML.

    If 403 Forbidden is encountered, automatically launches visible Chrome
    once to refresh cookies and User-Agent, then retries seamlessly.
    """
    global _browser_cookie_refresh_done

    clean_username = username.strip().lstrip("@")
    if not clean_username:
        return None

    profile_url = f"https://www.producthunt.com/@{clean_username}"
    logger.info("Fetching user profile for @%s", clean_username)

    for attempt in range(max_auth_retries + 1):
        client._apply_delay()
        try:
            resp = client.client.get(profile_url)
            if resp.status_code == 404:
                logger.info("Profile not found (404) for @%s", clean_username)
                return None

            if resp.status_code == 429:
                retry_hdr = resp.headers.get("Retry-After")
                try:
                    retry_wait = float(retry_hdr) if retry_hdr else 2.0
                except ValueError:
                    retry_wait = 2.0
                wait = max(retry_wait, 2.0 * (2**attempt))
                logger.warning(
                    "Rate limited (429) fetching profile for @%s. Backing off for %.1fs...",
                    clean_username,
                    wait,
                )
                import time
                time.sleep(wait)
                continue

            if resp.status_code == 403:
                if not _browser_cookie_refresh_done and attempt < max_auth_retries:
                    _browser_cookie_refresh_done = True
                    logger.warning(
                        "Received 403 Forbidden for @%s. Launching browser to refresh cookies...",
                        clean_username,
                    )
                    from extract_hashes import extract_hashes_and_cookies

                    extracted, cookies, ua = extract_hashes_and_cookies(url=profile_url)
                    if cookies:
                        client.client.headers["Cookie"] = cookies
                    if ua:
                        client.client.headers["User-Agent"] = ua
                    logger.info("Retrying profile fetch for @%s with fresh session...", clean_username)
                    continue
                else:
                    logger.warning(
                        "Profile for @%s returned 403 Forbidden (Cloudflare protection).",
                        clean_username,
                    )
                    return None

            resp.raise_for_status()
            return parse_profile_ssr(resp.text, username=clean_username)

        except Exception as exc:
            if "403" in str(exc) and not _browser_cookie_refresh_done and attempt < max_auth_retries:
                _browser_cookie_refresh_done = True
                logger.warning(
                    "403 error for @%s (%s). Launching browser to refresh cookies...",
                    clean_username,
                    exc,
                )
                from extract_hashes import extract_hashes_and_cookies

                extracted, cookies, ua = extract_hashes_and_cookies(url=profile_url)
                if cookies:
                    client.client.headers["Cookie"] = cookies
                if ua:
                    client.client.headers["User-Agent"] = ua
                continue

            logger.warning("Failed to fetch profile for @%s: %s", clean_username, exc)
            return None

    return None

