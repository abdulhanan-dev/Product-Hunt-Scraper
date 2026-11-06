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
)
from utils import get_logger, get_pacific_yesterday

logger = get_logger("main", settings.log_level)


def run_pipeline(target_date: str, resume: bool = False, limit: Optional[int] = None) -> None:
    """Execute the full 3-stage Product Hunt scraper pipeline."""
    run_id = f"run_{target_date}_{uuid4().hex[:8]}"
    start_time = time.time()

    logger.info("==================================================")
    logger.info("Product Hunt Scraper starting (run_id: %s)", run_id)
    logger.info("Target Pacific date: %s (resume=%s, limit=%s)", target_date, resume, limit)
    logger.info("==================================================")

    # 1. Connect to Database & initialize indexes
    try:
        db = get_db()
        ensure_indexes(db)
        record_run_start(db, run_id=run_id, target_date=target_date)
    except Exception as exc:
        logger.error("Failed to connect or initialize MongoDB: %s", exc)
        sys.exit(1)

    client = GraphQLClient()
    try:
        # 2. Stage 1: Leaderboard
        launches = []
        if resume:
            existing_cursor = db.launches.find({"target_date": target_date})
            launches = list(existing_cursor)
            if launches:
                logger.info("Resuming: Found %d existing launches in database.", len(launches))

        if not launches:
            launches = fetch_daily_leaderboard(client=client, target_date=target_date)
            saved_count = upsert_launches(db, launches)
            logger.info("Stage 1 complete: %d launches saved.", saved_count)
        else:
            saved_count = len(launches)

        if limit and limit > 0:
            logger.info("Applying test limit: processing first %d of %d launches", limit, len(launches))
            launches = launches[:limit]

        # 3. Stage 2: Product Enrichment
        logger.info("Starting Stage 2: Enriching %d products...", len(launches))
        enriched_products_count = 0
        total_media_count = 0
        total_people_count = 0
        total_bw_count = 0
        total_comments_count = 0
        total_reviews_count = 0
        discovered_usernames: set[str] = set()

        for idx, launch in enumerate(launches, 1):
            product_slug = launch.get("product_slug") or launch.get("post_slug")
            post_slug = launch.get("post_slug") or product_slug
            product_id = launch.get("product_id", "")
            if not product_slug:
                continue

            # Resumability check: if resume=True and product already enriched, skip
            if resume and product_id:
                if db.products.find_one({"product_id": product_id}):
                    logger.info("[%d/%d] Skipping already enriched product: %s", idx, len(launches), product_slug)
                    continue

            logger.info(
                "[%d/%d] Enriching product: %s (post: %s, id: %s)",
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
                        discovered_usernames.add(p["username"])

            if built_with:
                total_bw_count += upsert_product_built_with(db, built_with)

            # 3.2 Comments (CRITICAL: uses post_slug!)
            if post_slug:
                comments, comment_users = fetch_product_comments(
                    client=client, post_slug=post_slug, product_id=product_id
                )
                if comments:
                    total_comments_count += upsert_comments(db, comments)
                discovered_usernames.update(comment_users)

            # 3.3 Detailed Reviews (gated by count)
            reviews, review_users = fetch_product_reviews(
                client=client, product_slug=product_slug, product_id=product_id
            )
            if reviews:
                total_reviews_count += upsert_reviews(db, reviews)
            discovered_usernames.update(review_users)

        # 4. Stage 3: Public Profile Extraction
        logger.info(
            "Starting Stage 3: Fetching profiles for %d discovered usernames...",
            len(discovered_usernames),
        )
        total_profiles_count = 0
        for u_idx, username in enumerate(discovered_usernames, 1):
            if resume and db.profiles.find_one({"username": username.lower()}):
                logger.info("[%d/%d] Skipping already saved profile: @%s", u_idx, len(discovered_usernames), username)
                continue

            logger.info("[%d/%d] Fetching profile: @%s", u_idx, len(discovered_usernames), username)
            profile = fetch_user_profile(client=client, username=username)
            if profile:
                upsert_profile(db, profile)
                total_profiles_count += 1

        elapsed = round(time.time() - start_time, 2)

        stats = {
            "total_launches_found": len(launches),
            "launches_upserted": saved_count,
            "products_enriched": enriched_products_count,
            "media_items_saved": total_media_count,
            "people_relationships_saved": total_people_count,
            "built_with_saved": total_bw_count,
            "comments_saved": total_comments_count,
            "reviews_saved": total_reviews_count,
            "profiles_saved": total_profiles_count,
            "duration_seconds": elapsed,
        }
        record_run_finish(db, run_id=run_id, status="SUCCESS", stats=stats)

        logger.info("==================================================")
        logger.info(
            "Run %s completed in %.2fs: %d launches, %d products, %d comments, %d reviews, %d profiles saved.",
            run_id,
            elapsed,
            saved_count,
            enriched_products_count,
            total_comments_count,
            total_reviews_count,
            total_profiles_count,
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
        "--resume",
        action="store_true",
        help="Resume an interrupted run (skips already enriched records in MongoDB)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on number of products to enrich (useful for test runs)",
    )
    args = parser.parse_args()

    target_date = args.date or get_pacific_yesterday()
    run_pipeline(target_date=target_date, resume=args.resume, limit=args.limit)


if __name__ == "__main__":
    main()

