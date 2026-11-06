"""Scraper module for Stage 1: Daily Leaderboard."""

from typing import Any, Dict, List, Optional, Tuple
from client import GraphQLClient
from config import (
    HASH_PRODUCT_ABOUT_PAGE,
    HASH_PRODUCT_BUILT_WITH_PAGE,
    HASH_PRODUCTS_PAGE_LAYOUT,
    settings,
)
from parsers import (
    parse_leaderboard_page,
    parse_product_about,
    parse_product_built_with,
    parse_product_layout,
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

    all_launches: List[Dict[str, Any]] = []
    cursor: Optional[str] = None
    page_num = 1

    while True:
        variables: Dict[str, Any] = {
            "featured": True,
            "date": target_date,
            "order": "DAILY_RANK",
        }
        if cursor:
            variables["after"] = cursor

        logger.info(
            "Fetching leaderboard page %d (cursor=%s)",
            page_num,
            cursor or "START",
        )

        response = client.execute_query(
            operation_name="LeaderboardDailyPage",
            variables=variables,
            sha256_hash=operation_hash,
        )

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
        about_vars = {"slug": product_slug}
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

