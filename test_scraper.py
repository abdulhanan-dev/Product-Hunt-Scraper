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


# --- 5. Stage 2: Product Enrichment Tests ---

def test_parse_product_layout():
    from parsers import parse_product_layout

    payload = {
        "data": {
            "product": {
                "id": "prod_123",
                "name": "Super AI",
                "slug": "super-ai",
                "tagline": "The best AI",
                "description": "An AI platform",
                "reviewsRating": 4.9,
                "reviewsCount": 45,
                "categories": [{"name": "AI"}, {"name": "Productivity"}],
                "proConTags": ["fast", "easy to use"],
                "awards": ["Product of the Day #1"],
                "yc": {"batch": "W24"},
                "postsCount": 3,
                "socialLinks": {"website": "https://super.ai"},
            }
        }
    }

    product = parse_product_layout(payload)
    assert product["product_id"] == "prod_123"
    assert product["name"] == "Super AI"
    assert product["slug"] == "super-ai"
    assert product["ratings"]["average"] == 4.9
    assert product["ratings"]["count"] == 45
    assert product["categories"] == ["AI", "Productivity"]
    assert product["pro_con_tags"] == ["fast", "easy to use"]
    assert product["awards"] == ["Product of the Day #1"]
    assert product["yc_info"] == {"batch": "W24"}
    assert product["posts_count"] == 3


def test_parse_product_about():
    from parsers import parse_product_about

    payload = {
        "data": {
            "product": {
                "pricingType": "Free",
                "url": "https://super.ai",
                "media": [
                    {"url": "https://ph.co/img1.png", "type": "image"},
                    {"url": "https://ph.co/vid1.mp4", "type": "video"},
                ],
                "makers": [
                    {
                        "id": "u_1",
                        "username": "sarah_c",
                        "name": "Sarah Connor",
                        "headline": "Founder",
                        "profileImage": "https://ph.co/avatar1.jpg",
                    }
                ],
                "hunter": {
                    "id": "u_2",
                    "username": "kevin_h",
                    "name": "Kevin Hunter",
                    "profileImage": "https://ph.co/avatar2.jpg",
                },
            }
        }
    }

    media, people, about_info = parse_product_about(payload, product_id="prod_123", product_slug="super-ai")

    assert len(media) == 2
    assert media[0]["media_url"] == "https://ph.co/img1.png"
    assert media[0]["media_type"] == "image"
    assert media[1]["media_url"] == "https://ph.co/vid1.mp4"

    assert len(people) == 2
    # Maker
    assert people[0]["username"] == "sarah_c"
    assert people[0]["role"] == "maker"
    # Hunter
    assert people[1]["username"] == "kevin_h"
    assert people[1]["role"] == "hunter"

    assert about_info["pricing_type"] == "Free"
    assert about_info["primary_link"] == "https://super.ai"


def test_parse_product_built_with():
    from parsers import parse_product_built_with

    payload = {
        "data": {
            "product": {
                "authoredDetailedReviews": {
                    "edges": [
                        {
                            "node": {
                                "shoutoutNote": "Built with Next.js",
                                "product": {
                                    "id": "prod_nextjs",
                                    "name": "Next.js",
                                    "slug": "next-js",
                                }
                            }
                        }
                    ]
                }
            }
        }
    }

    built_with = parse_product_built_with(payload, product_id="prod_123")
    assert len(built_with) == 1
    assert built_with[0]["product_id"] == "prod_123"
    assert built_with[0]["related_product_id"] == "prod_nextjs"
    assert built_with[0]["related_product_name"] == "Next.js"
    assert built_with[0]["shoutout_note"] == "Built with Next.js"


def test_enrich_product_integration():
    from scraper import enrich_product

    mock_client = MagicMock(spec=GraphQLClient)

    # Mock responses for layout, about, built_with
    mock_client.execute_query.side_effect = [
        {
            "data": {
                "product": {
                    "id": "prod_999",
                    "name": "Test App",
                    "slug": "test-app",
                    "reviewsRating": 5.0,
                    "reviewsCount": 10,
                }
            }
        },
        {
            "data": {
                "product": {
                    "pricingType": "Paid",
                    "media": [{"url": "https://img.png", "type": "image"}],
                    "makers": [{"id": "m1", "username": "maker1", "name": "Maker One"}],
                }
            }
        },
        {
            "data": {
                "product": {
                    "authoredDetailedReviews": {
                        "edges": [
                            {
                                "node": {
                                    "shoutoutNote": "Used Postgres",
                                    "product": {"id": "p_db", "name": "Postgres", "slug": "postgres"}
                                }
                            }
                        ]
                    }
                }
            }
        },
    ]

    product_data, media, people, bw = enrich_product(mock_client, product_slug="test-app")

    assert product_data["name"] == "Test App"
    assert product_data["pricing_type"] == "Paid"
    assert len(media) == 1
    assert len(people) == 1
    assert len(bw) == 1
    assert mock_client.execute_query.call_count == 3


def test_upsert_product_entities():
    from database import (
        upsert_product,
        upsert_product_built_with,
        upsert_product_media,
        upsert_product_people,
    )

    mock_db = MagicMock()

    upsert_product(mock_db, {"product_id": "p1", "name": "App 1"})
    assert mock_db.products.update_one.call_count == 1

    media_count = upsert_product_media(mock_db, [{"product_id": "p1", "media_url": "https://img"}])
    assert media_count == 1
    assert mock_db.product_media.update_one.call_count == 1

    people_count = upsert_product_people(mock_db, [{"product_id": "p1", "username": "u1", "role": "maker"}])
    assert people_count == 1
    assert mock_db.product_people.update_one.call_count == 1

    bw_count = upsert_product_built_with(mock_db, [{"product_id": "p1", "related_product_id": "p2"}])
    assert bw_count == 1
    assert mock_db.product_built_with.update_one.call_count == 1


# --- 6. Stage 3: Comments, Reviews, and Profiles Tests ---

def test_parse_comments_with_nested_replies():
    from parsers import parse_comments_page

    payload = {
        "data": {
            "comments": {
                "pageInfo": {"hasNextPage": False, "endCursor": None},
                "edges": [
                    {
                        "node": {
                            "id": "c_1",
                            "bodyHtml": "<p>Great launch!</p>",
                            "votesCount": 5,
                            "user": {"id": "u_1", "username": "alice", "name": "Alice"},
                            "replies": {
                                "edges": [
                                    {
                                        "node": {
                                            "id": "c_2",
                                            "bodyHtml": "<p>Thanks Alice!</p>",
                                            "user": {"id": "u_2", "username": "bob", "name": "Bob"},
                                        }
                                    }
                                ]
                            },
                        }
                    }
                ],
            }
        }
    }

    comments, has_next, end_cursor, users = parse_comments_page(
        payload, product_id="prod_100", post_slug="my-launch"
    )

    assert len(comments) == 2
    # Parent comment
    assert comments[0]["comment_id"] == "c_1"
    assert comments[0]["parent_comment_id"] is None
    assert comments[0]["author_username"] == "alice"
    assert comments[0]["votes_count"] == 5

    # Nested reply
    assert comments[1]["comment_id"] == "c_2"
    assert comments[1]["parent_comment_id"] == "c_1"
    assert comments[1]["author_username"] == "bob"

    assert users == {"alice", "bob"}
    assert has_next is False


def test_detailed_reviews_count_and_gate():
    from parsers import parse_detailed_reviews_count
    from scraper import fetch_product_reviews

    # Case 1: Count is 0
    zero_payload = {"data": {"product": {"detailedReviewsCount": 0}}}
    assert parse_detailed_reviews_count(zero_payload) == 0

    mock_client = MagicMock()
    mock_client.execute_query.return_value = zero_payload

    reviews, users = fetch_product_reviews(
        mock_client, product_slug="zero-review-app", product_id="p0"
    )
    assert reviews == []
    assert users == set()
    # Ensure feed query was never called (only 1 call for count)
    assert mock_client.execute_query.call_count == 1


def test_parse_detailed_reviews_feed():
    from parsers import parse_detailed_reviews_feed

    payload = {
        "data": {
            "reviewsPage": {
                "pageInfo": {"hasNextPage": False, "endCursor": None},
                "edges": [
                    {
                        "node": {
                            "id": "rev_55",
                            "reviewType": "detailed",
                            "rating": 5,
                            "feedback": "Loving this tool!",
                            "pros": ["Easy setup"],
                            "cons": [],
                            "user": {"id": "u_rev", "username": "reviewer_dan"},
                        }
                    }
                ],
            }
        }
    }

    reviews, has_next, end_cursor, users = parse_detailed_reviews_feed(
        payload, product_id="prod_100"
    )
    assert len(reviews) == 1
    assert reviews[0]["review_id"] == "rev_55"
    assert reviews[0]["rating"] == 5
    assert reviews[0]["author_username"] == "reviewer_dan"
    assert users == {"reviewer_dan"}


def test_parse_profile_ssr():
    from parsers import parse_profile_ssr

    sample_html = """
    <!DOCTYPE html>
    <html>
    <head><title>John Doe on Product Hunt</title></head>
    <body>
    <script>
    window.__APOLLO_STATE__ = {
      "data": {
        "profile": {
          "id": "u_999",
          "name": "John Doe",
          "headline": "Maker & Founder",
          "about": "Building cool tools",
          "isMaker": true,
          "isVerified": true,
          "streak": 14,
          "kittyCoins": 1500,
          "socialLinks": {
            "twitter": "https://twitter.com/johndoe",
            "website": {
              "encodedUrl": "aHR0cHM6Ly9qb2huZG9lLmNvbQ=="
            }
          }
        }
      }
    };
    </script>
    </body>
    </html>
    """

    profile = parse_profile_ssr(sample_html, username="johndoe")
    assert profile is not None
    assert profile["username"] == "johndoe"
    assert profile["user_id"] == "u_999"
    assert profile["name"] == "John Doe"
    assert profile["is_maker"] is True
    assert profile["is_verified"] is True
    assert profile["streak"] == 14
    assert profile["kitty_coins"] == 1500
    assert profile["social_links"]["twitter"] == "https://twitter.com/johndoe"
    # Base64 decoded URL:
    assert profile["social_links"]["website"] == "https://johndoe.com"


def test_database_upsert_comments_reviews_profiles():
    from database import upsert_comment, upsert_profile, upsert_review

    mock_db = MagicMock()

    upsert_comment(mock_db, {"comment_id": "c1", "body_html": "hi"})
    assert mock_db.comments.update_one.call_count == 1

    upsert_review(mock_db, {"review_id": "r1", "rating": 5})
    assert mock_db.reviews.update_one.call_count == 1

    upsert_profile(mock_db, {"username": "alice", "name": "Alice"})
    assert mock_db.profiles.update_one.call_count == 1


def test_auto_hash_extraction_on_expired_hash(mocker):
    from scraper import fetch_daily_leaderboard

    mock_client = MagicMock()
    # First attempt fails with 'This request could not be processed'
    # Second attempt succeeds with new hash
    mock_client.execute_query.side_effect = [
        RuntimeError("GraphQL returned errors: ['This request could not be processed']"),
        {
            "data": {
                "dailyLeaderboard": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [{"node": {"id": "1", "slug": "test", "__typename": "Post"}}],
                }
            }
        },
    ]

    mock_extractor = mocker.patch("extract_hashes.extract_hashes_and_cookies")
    mock_extractor.return_value = ({"LeaderboardDailyPage": "fresh_new_hash_123"}, "dummy_cookie", "dummy_ua")

    launches = fetch_daily_leaderboard(
        mock_client, target_date="2026-11-04", operation_hash="expired_hash"
    )

    assert len(launches) == 1
    assert mock_extractor.call_count == 1
    assert mock_client.execute_query.call_count == 2
    # Second call should have used the fresh hash
    assert mock_client.execute_query.call_args_list[1][1]["sha256_hash"] == "fresh_new_hash_123"


def test_fetch_user_profile_recovers_from_403(mocker):
    from scraper import fetch_user_profile

    mock_client = MagicMock()
    mock_client.client.headers = {}

    # First GET response: 403 Forbidden
    # Second GET response: 200 OK with Apollo HTML
    mock_resp_403 = MagicMock()
    mock_resp_403.status_code = 403

    mock_resp_200 = MagicMock()
    mock_resp_200.status_code = 200
    mock_resp_200.text = """
    <script>
    window.__APOLLO_STATE__ = {
      "data": {
        "profile": {
          "id": "u_test",
          "name": "Test User",
          "headline": "Builder"
        }
      }
    };
    </script>
    """

    mock_client.client.get.side_effect = [mock_resp_403, mock_resp_200]

    mock_extractor = mocker.patch("extract_hashes.extract_hashes_and_cookies")
    mock_extractor.return_value = ({}, "fresh_session_cookie=abc", "Mozilla/5.0 DummyUA")

    profile = fetch_user_profile(mock_client, username="testuser")

    assert profile is not None
    assert profile["username"] == "testuser"
    assert profile["name"] == "Test User"
    assert mock_extractor.call_count == 1
    # Check that fresh cookies were injected into client headers
    assert mock_client.client.headers["Cookie"] == "fresh_session_cookie=abc"
    assert mock_client.client.headers["User-Agent"] == "Mozilla/5.0 DummyUA"
    assert mock_client.client.get.call_count == 2


def test_product_deduplication_skips_existing(mocker):
    from main import run_pipeline

    mock_db = MagicMock()
    # Simulate that product already exists in MongoDB
    mock_db.products.find_one.return_value = {"product_id": "1001", "name": "Existing App"}

    mocker.patch("main.get_db", return_value=mock_db)
    mocker.patch("main.ensure_indexes")
    mocker.patch("main.record_run_start")
    mocker.patch("main.record_run_finish")
    mocker.patch("main.upsert_launches", return_value=1)

    mock_enrich = mocker.patch("main.enrich_product")

    # Mock leaderboard with 1 product
    mocker.patch(
        "main.fetch_daily_leaderboard",
        return_value=[{"post_id": "p_1", "product_id": "1001", "product_slug": "existing-app"}],
    )

    run_pipeline(target_date="2026-11-04", force=False)

    # Because product already exists, enrich_product should NOT be called!
    assert mock_enrich.call_count == 0


def test_rate_limit_429_exponential_backoff_and_retries(mocker):
    from client import GraphQLClient

    client = GraphQLClient(max_retries=5, delay=0.0)
    mock_sleep = mocker.patch("time.sleep")

    # Mock responses: 3x 429 rate limit, then 1x 200 OK
    resp_429_1 = MagicMock(status_code=429, headers={"Retry-After": "2"})
    resp_429_2 = MagicMock(status_code=429, headers={})
    resp_429_3 = MagicMock(status_code=429, headers={"Retry-After": "4"})
    resp_200 = MagicMock(status_code=200)
    resp_200.json.return_value = {"data": {"test": "success"}}

    mocker.patch.object(
        client.client, "get", side_effect=[resp_429_1, resp_429_2, resp_429_3, resp_200]
    )

    data = client.execute_query("TestQuery", {"param": 1})

    assert data == {"data": {"test": "success"}}
    # Ensure sleep was called for backoff 3 times
    assert mock_sleep.call_count == 3
    # Check that wait times followed exponential backoff / Retry-After
    waits = [call[0][0] for call in mock_sleep.call_args_list]
    assert waits[0] == 2.0  # From Retry-After: 2
    assert waits[1] == 2.0  # From backoff (1.0 * 2)
    assert waits[2] == 4.0  # From Retry-After: 4 / backoff
    assert client.client.get.call_count == 4


def test_fetch_product_comments_retries_page_error(mocker):
    from scraper import fetch_product_comments

    mock_client = MagicMock()
    mock_sleep = mocker.patch("time.sleep")

    # First call: page 1 returns 1 comment with hasNextPage=True
    resp_page1 = {
        "data": {
            "post": {
                "threads": {
                    "pageInfo": {"hasNextPage": True, "endCursor": "cur1"},
                    "edges": [
                        {
                            "node": {
                                "id": "c1",
                                "body": "Great product!",
                                "createdAt": "2026-11-04T12:00:00Z",
                                "user": {"id": "u1", "username": "user1"},
                            }
                        }
                    ],
                }
            }
        }
    }

    # Second call (page 2 attempt 1): raises transient exception
    # Third call (page 2 attempt 2): succeeds with 1 comment
    resp_page2 = {
        "data": {
            "post": {
                "threads": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [
                        {
                            "node": {
                                "id": "c2",
                                "body": "Awesome launch!",
                                "createdAt": "2026-11-04T13:00:00Z",
                                "user": {"id": "u2", "username": "user2"},
                            }
                        }
                    ],
                }
            }
        }
    }

    mock_client.execute_query.side_effect = [
        resp_page1,
        RuntimeError("Transient network failure"),
        resp_page2,
    ]

    comments, users = fetch_product_comments(mock_client, post_slug="test-product", product_id="p1")

    assert len(comments) == 2
    assert comments[0]["comment_id"] == "c1"
    assert comments[1]["comment_id"] == "c2"
    assert "user1" in users
    assert "user2" in users
    # Verify execute_query was called 3 times (1 for page 1, 2 for page 2)
    assert mock_client.execute_query.call_count == 3


