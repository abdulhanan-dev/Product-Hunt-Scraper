"""MongoDB connection, index initialization, and upsert repositories."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pymongo import ASCENDING, MongoClient
from pymongo.database import Database
from config import settings
from utils import get_logger

logger = get_logger(__name__, settings.log_level)


def get_db(uri: Optional[str] = None, database_name: Optional[str] = None) -> Database:
    """Connect to MongoDB and return the target database instance."""
    client_uri = uri or settings.mongodb_uri
    db_name = database_name or settings.mongodb_database
    client = MongoClient(client_uri, serverSelectionTimeoutMS=5000)
    return client[db_name]


def ensure_indexes(db: Database) -> None:
    """Create all required unique and lookup indexes for idempotency."""
    logger.info("Ensuring MongoDB indexes...")

    # launches: unique on target_date + post_id
    db.launches.create_index(
        [("target_date", ASCENDING), ("post_id", ASCENDING)],
        unique=True,
        name="idx_launches_target_date_post_id",
    )
    db.launches.create_index([("product_id", ASCENDING)], name="idx_launches_product_id")
    db.launches.create_index([("target_date", ASCENDING)], name="idx_launches_target_date")

    # products: unique on product_id
    db.products.create_index([("product_id", ASCENDING)], unique=True, name="idx_products_product_id")
    db.products.create_index([("slug", ASCENDING)], name="idx_products_slug")

    # comments: unique on comment_id
    db.comments.create_index([("comment_id", ASCENDING)], unique=True, name="idx_comments_comment_id")
    db.comments.create_index([("product_id", ASCENDING)], name="idx_comments_product_id")
    db.comments.create_index([("post_slug", ASCENDING)], name="idx_comments_post_slug")

    # reviews: unique on review_id
    db.reviews.create_index([("review_id", ASCENDING)], unique=True, name="idx_reviews_review_id")
    db.reviews.create_index([("product_id", ASCENDING)], name="idx_reviews_product_id")

    # profiles: unique on username
    db.profiles.create_index([("username", ASCENDING)], unique=True, name="idx_profiles_username")

    # scraper_runs: unique on run_id
    db.scraper_runs.create_index([("run_id", ASCENDING)], unique=True, name="idx_scraper_runs_run_id")

    logger.info("Indexes successfully ensured.")


def upsert_launch(db: Database, launch: Dict[str, Any]) -> None:
    """Idempotently insert or update a daily launch record."""
    launch["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.launches.update_one(
        {
            "target_date": launch["target_date"],
            "post_id": str(launch["post_id"]),
        },
        {"$set": launch},
        upsert=True,
    )


def upsert_launches(db: Database, launches: List[Dict[str, Any]]) -> int:
    """Upsert a list of launches into the launches collection."""
    count = 0
    for item in launches:
        upsert_launch(db, item)
        count += 1
    return count


def record_run_start(db: Database, run_id: str, target_date: str) -> None:
    """Record the start of a scraper run."""
    db.scraper_runs.update_one(
        {"run_id": run_id},
        {
            "$set": {
                "run_id": run_id,
                "target_date": target_date,
                "status": "RUNNING",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )


def record_run_finish(
    db: Database,
    run_id: str,
    status: str,
    stats: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> None:
    """Record completion or failure of a scraper run."""
    update: Dict[str, Any] = {
        "status": status,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    if stats:
        update["stats"] = stats
    if error:
        update["error"] = error

    db.scraper_runs.update_one({"run_id": run_id}, {"$set": update}, upsert=True)
