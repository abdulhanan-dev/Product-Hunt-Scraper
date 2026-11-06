"""Database validation and integrity check script."""

import argparse
from typing import Any, Dict
from config import settings
from database import get_db
from utils import get_logger

logger = get_logger("validate", settings.log_level)


def validate_database(target_date: str = "") -> Dict[str, Any]:
    """Inspect and report record counts and relational integrity across collections."""
    db = get_db()

    print("\n=======================================================")
    print("        PRODUCT HUNT SCRAPER - DATABASE REPORT        ")
    print("=======================================================")

    filter_date = {"target_date": target_date} if target_date else {}

    launches_count = db.launches.count_documents(filter_date)
    products_count = db.products.count_documents({})
    media_count = db.product_media.count_documents({})
    people_count = db.product_people.count_documents({})
    bw_count = db.product_built_with.count_documents({})
    comments_count = db.comments.count_documents({})
    reviews_count = db.reviews.count_documents({})
    profiles_count = db.profiles.count_documents({})
    runs_count = db.scraper_runs.count_documents({})

    print(f"Database Name:        {db.name}")
    if target_date:
        print(f"Target Date Filter:   {target_date}")
    print("-------------------------------------------------------")
    print(f"Launches:             {launches_count}")
    print(f"Products:             {products_count}")
    print(f"Product Media:        {media_count}")
    print(f"Product People:       {people_count}")
    print(f"Product Built-With:   {bw_count}")
    print(f"Comments:             {comments_count}")
    print(f"Reviews:              {reviews_count}")
    print(f"Profiles:             {profiles_count}")
    print(f"Scraper Runs:         {runs_count}")
    print("-------------------------------------------------------")

    # Recent runs
    recent_runs = list(db.scraper_runs.find().sort("started_at", -1).limit(5))
    if recent_runs:
        print("\nRecent Scraper Runs:")
        for r in recent_runs:
            print(
                f" - [{r.get('status')}] ID: {r.get('run_id')} | Date: {r.get('target_date')} "
                f"| Started: {r.get('started_at')} | Stats: {r.get('stats')}"
            )

    print("=======================================================\n")

    return {
        "launches": launches_count,
        "products": products_count,
        "media": media_count,
        "people": people_count,
        "built_with": bw_count,
        "comments": comments_count,
        "reviews": reviews_count,
        "profiles": profiles_count,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate MongoDB scraper data")
    parser.add_argument("--date", type=str, default="", help="Optional target date to filter")
    args = parser.parse_args()
    validate_database(args.date)

