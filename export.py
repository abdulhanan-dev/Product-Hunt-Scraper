"""Export utility to export scraped MongoDB data to JSON or CSV."""

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List
from config import settings
from database import get_db
from utils import get_logger

logger = get_logger("export", settings.log_level)


def export_data(target_date: str = "", output_dir: str = "storage") -> None:
    """Export launches, products, comments, and reviews for a target date to JSON files."""
    db = get_db()
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    date_filter = {"target_date": target_date} if target_date else {}

    # 1. Launches
    launches = list(db.launches.find(date_filter, {"_id": 0}))
    launches_file = out_path / f"launches_{target_date or 'all'}.json"
    with open(launches_file, "w", encoding="utf-8") as f:
        json.dump(launches, f, indent=2, default=str)
    logger.info("Exported %d launches to %s", len(launches), launches_file)

    # 2. Products
    product_ids = [l.get("product_id") for l in launches if l.get("product_id")]
    prod_filter = {"product_id": {"$in": product_ids}} if product_ids else {}
    products = list(db.products.find(prod_filter, {"_id": 0}))
    products_file = out_path / f"products_{target_date or 'all'}.json"
    with open(products_file, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, default=str)
    logger.info("Exported %d products to %s", len(products), products_file)

    # 3. Comments
    post_slugs = [l.get("post_slug") for l in launches if l.get("post_slug")]
    comments_filter = {"post_slug": {"$in": post_slugs}} if post_slugs else {}
    comments = list(db.comments.find(comments_filter, {"_id": 0}))
    comments_file = out_path / f"comments_{target_date or 'all'}.json"
    with open(comments_file, "w", encoding="utf-8") as f:
        json.dump(comments, f, indent=2, default=str)
    logger.info("Exported %d comments to %s", len(comments), comments_file)

    # 4. Reviews
    reviews_filter = {"product_id": {"$in": product_ids}} if product_ids else {}
    reviews = list(db.reviews.find(reviews_filter, {"_id": 0}))
    reviews_file = out_path / f"reviews_{target_date or 'all'}.json"
    with open(reviews_file, "w", encoding="utf-8") as f:
        json.dump(reviews, f, indent=2, default=str)
    logger.info("Exported %d reviews to %s", len(reviews), reviews_file)

    print("\n=======================================================")
    print("                 DATA EXPORT SUMMARY                   ")
    print("=======================================================")
    print(f"Launches:   {len(launches):>6}  ->  {launches_file}")
    print(f"Products:   {len(products):>6}  ->  {products_file}")
    print(f"Comments:   {len(comments):>6}  ->  {comments_file}")
    print(f"Reviews:    {len(reviews):>6}  ->  {reviews_file}")
    print("=======================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export MongoDB data to JSON")
    parser.add_argument("--date", type=str, default="", help="Target date YYYY-MM-DD")
    parser.add_argument("--out", type=str, default="storage", help="Output directory")
    args = parser.parse_args()
    export_data(target_date=args.date, output_dir=args.out)

