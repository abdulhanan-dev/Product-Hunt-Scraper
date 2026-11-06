"""Unit tests for Stage 1: Pacific date, client, parsers, and leaderboard scraper."""

from datetime import datetime, timedelta
import re
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo
import pytest
from client import GraphQLClient
from database import upsert_launch, upsert_launches
from parsers import parse_leaderboard_page
from scraper import fetch_daily_leaderboard
from utils import decode_base64_url, get_pacific_yesterday, sanitize_headers_for_logging


# --- 1. Date & Util Tests ---

def test_get_pacific_yesterday():
    pacific_tz = ZoneInfo("America/Los_Angeles")
    now_pacific = datetime.now(pacific_tz)
    expected_yesterday = (now_pacific.date() - timedelta(days=1)).strftime("%Y-%m-%d")
    assert get_pacific_yesterday() == expected_yesterday
    # Ensure format YYYY-MM-DD
    assert re.match(r"^\d{4}-\d{2}-\d{2}$", get_pacific_yesterday())


def test_decode_base64_url():
    # "https://example.com" base64 is "aHR0cHM6Ly9leGFtcGxlLmNvbQ=="
    encoded = "aHR0cHM6Ly9leGFtcGxlLmNvbQ=="
    assert decode_base64_url(encoded) == "https://example.com"

    # Test unpadded string
    unpadded = "aHR0cHM6Ly9leGFtcGxlLmNvbQ"
    assert decode_base64_url(unpadded) == "https://example.com"

    # Test empty or malformed
    assert decode_base64_url("") == ""


def test_sanitize_headers_for_logging():
    headers = {
        "Authorization": "Bearer sensitive_secret_token_123",
        "Cookie": "session=secret_cookie_val",
        "User-Agent": "TestAgent/1.0",
        "Accept": "application/json",
    }
    sanitized = sanitize_headers_for_logging(headers)
    assert sanitized["Authorization"] == "[REDACTED]"
    assert sanitized["Cookie"] == "[REDACTED]"
    assert sanitized["User-Agent"] == "TestAgent/1.0"
    assert sanitized["Accept"] == "application/json"


# --- 2. Parser Tests ---

@pytest.fixture
def sample_leaderboard_payload():
    return {
        "data": {
            "dailyLeaderboard": {
                "pageInfo": {
                    "hasNextPage": True,
                    "endCursor": "cursor_page_1",
                },
                "edges": [
                    {
                        "cursor": "cursor_1",
                        "node": {
                            "__typename": "Post",
                            "id": "1001",
                            "slug": "ai-copilot-launch",
                            "name": "AI Copilot",
                            "tagline": "Your everyday assistant",
                            "votesCount": 250,
                            "rank": 1,
                            "commentsCount": 42,
                            "product": {
                                "id": "prod_555",
                                "slug": "ai-copilot",
                            },
                            "topics": [{"name": "AI"}, {"name": "Productivity"}],
                            "shortenedUrl": "https://ph.co/1001",
                        },
                    },
                    {
                        "cursor": "cursor_2",
                        "node": {
                            "__typename": "Ad",
                            "id": "ad_999",
                            "name": "Sponsored Ad Product",
                        },
                    },
                    {
                        "cursor": "cursor_3",
                        "node": {
                            "__typename": "Post",
                            "id": "1002",
                            "slug": "smart-notes-launch",
                            "name": "Smart Notes",
                            "tagline": "Markdown note taking",
                            "votesCount": 180,
                            "rank": 2,
                            "commentsCount": 15,
                            "productId": "prod_777",
                            "productSlug": "smart-notes",
                        },
                    },
                ],
            }
        }
    }


def test_parse_leaderboard_page(sample_leaderboard_payload):
    launches, has_next, end_cursor = parse_leaderboard_page(
        sample_leaderboard_payload, target_date="2026-11-05"
    )

    assert has_next is True
    assert end_cursor == "cursor_page_1"
    # Ad should have been filtered out!
    assert len(launches) == 2

    # Check first launch
    launch1 = launches[0]
    assert launch1["post_id"] == "1001"
    assert launch1["post_slug"] == "ai-copilot-launch"
    assert launch1["product_id"] == "prod_555"
    assert launch1["product_slug"] == "ai-copilot"
    assert launch1["name"] == "AI Copilot"
    assert launch1["score"] == 250
    assert launch1["rank"] == 1
    assert launch1["comments_count"] == 42
    assert launch1["topics"] == ["AI", "Productivity"]
    assert launch1["__typename"] == "Post"

    # Check second launch
    launch2 = launches[1]
    assert launch2["post_id"] == "1002"
    assert launch2["post_slug"] == "smart-notes-launch"
    assert launch2["product_id"] == "prod_777"
    assert launch2["product_slug"] == "smart-notes"
    assert launch2["score"] == 180


# --- 3. Scraper Pagination Tests ---

def test_fetch_daily_leaderboard_pagination():
    mock_client = MagicMock(spec=GraphQLClient)

    # Page 1 response
    page1 = {
        "data": {
            "dailyLeaderboard": {
                "pageInfo": {"hasNextPage": True, "endCursor": "cursor_page_1"},
                "edges": [
                    {
                        "node": {
                            "__typename": "Post",
                            "id": "1",
                            "slug": "post-1",
                            "name": "Post 1",
                        }
                    }
                ],
            }
        }
    }

    # Page 2 response (last page)
    page2 = {
        "data": {
            "dailyLeaderboard": {
                "pageInfo": {"hasNextPage": False, "endCursor": None},
                "edges": [
                    {
                        "node": {
                            "__typename": "Post",
                            "id": "2",
                            "slug": "post-2",
                            "name": "Post 2",
                        }
                    }
                ],
            }
        }
    }

    mock_client.execute_query.side_effect = [page1, page2]

    results = fetch_daily_leaderboard(mock_client, target_date="2026-11-05")

    assert len(results) == 2
    assert results[0]["post_id"] == "1"
    assert results[1]["post_id"] == "2"
    assert mock_client.execute_query.call_count == 2


# --- 4. Database Upsert Tests ---

def test_upsert_launches():
    mock_db = MagicMock()
    launches = [
        {"target_date": "2026-11-05", "post_id": "1001", "name": "Item 1"},
        {"target_date": "2026-11-05", "post_id": "1002", "name": "Item 2"},
    ]

    saved_count = upsert_launches(mock_db, launches)
    assert saved_count == 2
    assert mock_db.launches.update_one.call_count == 2
