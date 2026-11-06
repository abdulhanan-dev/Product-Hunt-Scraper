"""Main entry point to execute the Product Hunt daily scraper pipeline."""

import argparse
import sys
import time
from typing import Optional
from uuid import uuid4
from client import GraphQLClient
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
            profile = fetch_user_profile(client=client, username=clean_u)
            if profile:
                upsert_profile(db, profile)
                total_profiles_count += 1

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

