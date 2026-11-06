"""Main entry point to execute the Product Hunt daily scraper pipeline."""

import argparse
import sys
import time
from uuid import uuid4
from client import GraphQLClient
from config import settings
from database import (
    ensure_indexes,
    get_db,
    record_run_finish,
    record_run_start,
    upsert_launches,
    upsert_product,
    upsert_product_built_with,
    upsert_product_media,
    upsert_product_people,
)
from scraper import enrich_product, fetch_daily_leaderboard
from utils import get_logger, get_pacific_yesterday

logger = get_logger("main", settings.log_level)


def run_pipeline(target_date: str) -> None:
    """Execute the Stage 1 Leaderboard scraper pipeline."""
    run_id = f"run_{target_date}_{uuid4().hex[:8]}"
    start_time = time.time()

    logger.info("==================================================")
    logger.info("Product Hunt Scraper starting (run_id: %s)", run_id)
    logger.info("Target Pacific date: %s", target_date)
    logger.info("==================================================")

    # 1. Connect to Database & initialize indexes
    try:
        db = get_db()
        ensure_indexes(db)
        record_run_start(db, run_id=run_id, target_date=target_date)
    except Exception as exc:
        logger.error("Failed to connect or initialize MongoDB: %s", exc)
        sys.exit(1)

    # 2. Scrape Leaderboard (Stage 1)
    client = GraphQLClient()
    try:
        launches = fetch_daily_leaderboard(client=client, target_date=target_date)

        # 3. Save / Upsert to MongoDB (Stage 1)
        saved_count = upsert_launches(db, launches)
        logger.info("Stage 1 complete: %d launches saved.", saved_count)

        # 4. Stage 2: Product Enrichment
        logger.info("Starting Stage 2: Enriching %d products...", len(launches))
        enriched_products_count = 0
        total_media_count = 0
        total_people_count = 0
        total_bw_count = 0

        for idx, launch in enumerate(launches, 1):
            product_slug = launch.get("product_slug") or launch.get("post_slug")
            product_id = launch.get("product_id", "")
            if not product_slug:
                continue

            logger.info(
                "[%d/%d] Enriching product: %s (id: %s)",
                idx,
                len(launches),
                product_slug,
                product_id,
            )

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

            if built_with:
                total_bw_count += upsert_product_built_with(db, built_with)

        elapsed = round(time.time() - start_time, 2)

        stats = {
            "total_launches_found": len(launches),
            "launches_upserted": saved_count,
            "products_enriched": enriched_products_count,
            "media_items_saved": total_media_count,
            "people_relationships_saved": total_people_count,
            "built_with_saved": total_bw_count,
            "duration_seconds": elapsed,
        }
        record_run_finish(db, run_id=run_id, status="SUCCESS", stats=stats)

        logger.info("==================================================")
        logger.info(
            "Run %s completed in %.2fs: %d launches, %d products, %d media, %d people saved.",
            run_id,
            elapsed,
            saved_count,
            enriched_products_count,
            total_media_count,
            total_people_count,
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
    args = parser.parse_args()

    target_date = args.date or get_pacific_yesterday()
    run_pipeline(target_date)


if __name__ == "__main__":
    main()

