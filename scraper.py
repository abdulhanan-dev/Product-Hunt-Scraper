"""Scraper module for Stage 1: Daily Leaderboard."""

from typing import Any, Dict, List, Optional
from client import GraphQLClient
from config import settings
from parsers import parse_leaderboard_page
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
