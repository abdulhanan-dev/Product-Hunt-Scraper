"""Main entry point to execute the Product Hunt daily scraper pipeline."""

import argparse
import sys
import time
from importlib import reload
from typing import Optional
from uuid import uuid4
from client import GraphQLClient
import config as _config_module
from config import settings
from database import (
    ensure_indexes,
    flush_database,
    get_db,
    record_run_finish,
    record_run_start,
    upsert_comment,
    upsert_comments,
    upsert_launches,
    upsert_product,
    upsert_product_built_with,
    upsert_product_media,
    upsert_product_people,
    upsert_profile,
    upsert_review,
    upsert_reviews,
)
from scraper import (
    enrich_product,
    fetch_daily_leaderboard,
    fetch_product_comments,
    fetch_product_reviews,
    fetch_user_profile,
    reset_browser_refresh_flag,
)
from utils import get_logger, get_pacific_yesterday

logger = get_logger("main", settings.log_level)


def _ensure_hashes(client: GraphQLClient) -> None:
    """Guarantee all GraphQL hashes are present before scraping begins.

    Checks whether the leaderboard hash (the only one stored in settings) is
    populated.  If it is missing or still an empty string — meaning .env was
    never populated or the value was cleared — the extractor is run
    automatically so the pipeline never blocks on a missing hash.

    After extraction the .env file is updated (inside extract_hashes) and
    settings is reloaded so every subsequent call that reads
    ``settings.product_hunt_leaderboard_hash`` gets the fresh value.
    The client's Cookie and User-Agent headers are also updated in place.
    """
    # Reload settings from .env to pick up any value written by a previous
    # extraction in the same process (e.g. a prior --date run in the same session).
    reload(_config_module)
    current_hash = _config_module.settings.product_hunt_leaderboard_hash

    if current_hash:
        logger.info(
            "[pre-flight] Leaderboard hash present (%s...). Skipping extraction.",
            current_hash[:12],
        )
        return

    logger.warning(
        "[pre-flight] No leaderboard hash found in .env. "
        "Launching headless browser to extract hashes automatically..."
    )

    try:
        from extract_hashes import extract_hashes_and_cookies
        extracted, cookies, ua = extract_hashes_and_cookies()
    except Exception as exc:
        logger.error("[pre-flight] Hash extraction failed: %s", exc)
        logger.error(
            "[pre-flight] Please run `python extract_hashes.py` manually, "
            "then retry."
        )
        sys.exit(1)

    if not extracted.get("LeaderboardDailyPage"):
        logger.error(
            "[pre-flight] Extraction completed but LeaderboardDailyPage hash "
            "was not captured. Check your network connection and try again."
        )
        sys.exit(1)

    # Apply fresh cookies / UA to the client that will be used for scraping
    if cookies:
        client.client.headers["Cookie"] = cookies
    if ua:
        client.client.headers["User-Agent"] = ua

    # Reload settings so the rest of the pipeline reads the updated hash
    reload(_config_module)
    logger.info(
        "[pre-flight] Hash extraction complete. LeaderboardDailyPage: %s...",
        extracted["LeaderboardDailyPage"][:12],
    )


def run_pipeline(
    target_date: str,
    force: bool = False,
    limit: Optional[int] = None,
    flush: bool = False,
) -> None:
    """Execute the Product Hunt scraper pipeline with automatic deduplication."""
    run_id = f"run_{target_date}_{uuid4().hex[:8]}"
    start_time = time.time()

    logger.info("==================================================")
    logger.info("Product Hunt Scraper starting (run_id: %s)", run_id)
    logger.info(
        "Target Pacific date: %s (force=%s, limit=%s, flush=%s)",
        target_date,
        force,
        limit,
        flush,
    )
    logger.info("==================================================")
    reset_browser_refresh_flag()

    # 1. Connect to Database & initialize indexes
    try:
        db = get_db()
        ensure_indexes(db)
        if flush:
            flush_database(db)
        record_run_start(db, run_id=run_id, target_date=target_date)
    except Exception as exc:
        logger.error("Failed to connect or initialize MongoDB: %s", exc)
        sys.exit(1)

    client = GraphQLClient()
    try:
        # Pre-flight: ensure all hashes are present before scraping begins
        _ensure_hashes(client)

        # 2. Stage 1: Leaderboard
        launches = fetch_daily_leaderboard(client=client, target_date=target_date)
        saved_count = upsert_launches(db, launches)
        logger.info("Stage 1 complete: %d launches saved/updated.", saved_count)

        if limit and limit > 0:
            logger.info("Applying limit: processing first %d of %d launches", limit, len(launches))
            launches = launches[:limit]

        # 3. Stage 2: Product Enrichment (With Strict Deduplication)
        logger.info("Starting Stage 2: Checking %d products for new entries...", len(launches))
        enriched_products_count = 0
        skipped_products_count = 0
        total_media_count = 0
        total_people_count = 0
        total_bw_count = 0
        total_comments_count = 0
        total_reviews_count = 0
        new_discovered_usernames: set[str] = set()

        for idx, launch in enumerate(launches, 1):
            product_slug = launch.get("product_slug") or launch.get("post_slug")
            post_slug = launch.get("post_slug") or product_slug
            product_id = launch.get("product_id", "")
            if not product_slug:
                continue

            # Enforce request delay between products
            client._apply_delay()

            # Strict Deduplication Check: Skip if product already present in DB
            existing_product = None
            if product_id:
                existing_product = db.products.find_one({"product_id": str(product_id)})
            if not existing_product and product_slug:
                existing_product = db.products.find_one({"slug": product_slug})

            if existing_product and not force:
                logger.info(
                    "[%d/%d] Product '%s' (id: %s) ALREADY IN DATABASE. Skipping Stage 2 & 3.",
                    idx,
                    len(launches),
                    product_slug,
                    product_id,
                )
                skipped_products_count += 1
                continue

            # NEW PRODUCT: Run all 3 stages for it!
            logger.info(
                "[%d/%d] NEW PRODUCT '%s' (post: %s, id: %s) -> Running enrichment...",
                idx,
                len(launches),
                product_slug,
                post_slug,
                product_id,
            )

            try:
                # 3.1 Product Details, About & Built-With
                product_data, media_items, people, built_with = enrich_product(
                    client=client,
                    product_slug=product_slug,
                    product_id_hint=product_id,
                )

                if product_data:
                    upsert_product(db, product_data)
                    enriched_products_count += 1

                if media_items:
                    total_media_count += upsert_product_media(db, media_items)

                if people:
                    total_people_count += upsert_product_people(db, people)
                    for p in people:
                        if p.get("username"):
                            new_discovered_usernames.add(p["username"])

                if built_with:
                    total_bw_count += upsert_product_built_with(db, built_with)

                # 3.2 Comments (CRITICAL: uses post_slug!)
                if post_slug:
                    comments, comment_users = fetch_product_comments(
                        client=client, post_slug=post_slug, product_id=product_id
                    )
                    if comments:
                        total_comments_count += upsert_comments(db, comments)
                    new_discovered_usernames.update(comment_users)

                # 3.3 Detailed Reviews (gated by count)
                reviews, review_users = fetch_product_reviews(
                    client=client, product_slug=product_slug, product_id=product_id
                )
                if reviews:
                    total_reviews_count += upsert_reviews(db, reviews)
                new_discovered_usernames.update(review_users)

            except Exception as exc:
                logger.error(
                    "Error enriching product '%s' (%s): %s. Moving to next product.",
                    product_slug,
                    product_id,
                    exc,
                )

        # 4. Stage 3: Public Profile Extraction for newly discovered users
        logger.info(
            "Starting Stage 3: Fetching profiles for %d newly discovered usernames...",
            len(new_discovered_usernames),
        )
        total_profiles_count = 0
        skipped_profiles_count = 0

        for u_idx, username in enumerate(new_discovered_usernames, 1):
            clean_u = username.lower().strip().lstrip("@")
            # Profile dedup: skip if already in DB
            if not force and db.profiles.find_one({"username": clean_u}):
                logger.info(
                    "[%d/%d] Profile @%s already in database. Skipping.",
                    u_idx,
                    len(new_discovered_usernames),
                    clean_u,
                )
                skipped_profiles_count += 1
                continue

            logger.info(
                "[%d/%d] Fetching new profile: @%s",
                u_idx,
                len(new_discovered_usernames),
                clean_u,
            )
            client._apply_delay()
            try:
                profile = fetch_user_profile(client=client, username=clean_u)
                if profile:
                    upsert_profile(db, profile)
                    total_profiles_count += 1
            except Exception as exc:
                logger.warning("Error fetching profile @%s: %s", clean_u, exc)

        elapsed = round(time.time() - start_time, 2)

        stats = {
            "total_launches_found": len(launches),
            "launches_upserted": saved_count,
            "new_products_enriched": enriched_products_count,
            "existing_products_skipped": skipped_products_count,
            "media_items_saved": total_media_count,
            "people_relationships_saved": total_people_count,
            "built_with_saved": total_bw_count,
            "comments_saved": total_comments_count,
            "reviews_saved": total_reviews_count,
            "new_profiles_saved": total_profiles_count,
            "existing_profiles_skipped": skipped_profiles_count,
            "duration_seconds": elapsed,
        }
        record_run_finish(db, run_id=run_id, status="SUCCESS", stats=stats)

        logger.info("==================================================")
        logger.info(
            "Run %s completed in %.2fs: %d launches, %d new products enriched, %d skipped (already in DB).",
            run_id,
            elapsed,
            saved_count,
            enriched_products_count,
            skipped_products_count,
        )
        logger.info("==================================================")

    except Exception as exc:
        elapsed = round(time.time() - start_time, 2)
        logger.error("Scraper run %s failed after %.2fs: %s", run_id, elapsed, exc)
        record_run_finish(db, run_id=run_id, status="FAILED", error=str(exc))
        sys.exit(1)
    finally:
        client.close()


def main() -> None:
    """Parse CLI arguments and run pipeline."""
    parser = argparse.ArgumentParser(description="Product Hunt Scraper CLI")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Target date in YYYY-MM-DD format (defaults to yesterday in America/Los_Angeles)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on number of products to enrich (useful for test runs)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-enrichment of products even if already in database",
    )
    parser.add_argument(
        "--flush",
        action="store_true",
        help="Flush/clear all database collections before running",
    )
    args = parser.parse_args()

    target_date = args.date or get_pacific_yesterday()
    run_pipeline(
        target_date=target_date,
        force=args.force,
        limit=args.limit,
        flush=args.flush,
    )


if __name__ == "__main__":
    main()

