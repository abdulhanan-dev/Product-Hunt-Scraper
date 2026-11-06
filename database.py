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

    # product_media: compound unique on product_id + media_url
    db.product_media.create_index(
        [("product_id", ASCENDING), ("media_url", ASCENDING)],
        unique=True,
        name="idx_product_media_product_id_media_url",
    )

    # product_people: compound unique on product_id + username + role
    db.product_people.create_index(
        [("product_id", ASCENDING), ("username", ASCENDING), ("role", ASCENDING)],
        unique=True,
        name="idx_product_people_product_id_username_role",
    )

    # product_built_with: compound unique on product_id + related_product_id
    db.product_built_with.create_index(
        [("product_id", ASCENDING), ("related_product_id", ASCENDING)],
        unique=True,
        name="idx_product_built_with_product_related",
    )

    # scraper_runs: unique on run_id
    db.scraper_runs.create_index([("run_id", ASCENDING)], unique=True, name="idx_scraper_runs_run_id")

    logger.info("Indexes successfully ensured.")


def flush_database(db: Database) -> None:
    """Clear all documents from all scraper collections while preserving indexes."""
    logger.info("Flushing all data from database: %s", db.name)
    collections = [
        "launches",
        "products",
        "product_media",
        "product_people",
        "product_built_with",
        "comments",
        "reviews",
        "profiles",
        "scraper_runs",
    ]
    for col in collections:
        deleted = db[col].delete_many({}).deleted_count
        logger.info("Cleared %d documents from collection '%s'", deleted, col)
    logger.info("Database successfully flushed.")


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


def upsert_product(db: Database, product: Dict[str, Any]) -> None:
    """Idempotently insert or update a product document."""
    product_id = str(product.get("product_id", ""))
    if not product_id:
        return
    product["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.products.update_one(
        {"product_id": product_id},
        {"$set": product},
        upsert=True,
    )


def upsert_product_media(db: Database, media_items: List[Dict[str, Any]]) -> int:
    """Upsert media items for a product."""
    count = 0
    now = datetime.now(timezone.utc).isoformat()
    for item in media_items:
        product_id = str(item.get("product_id", ""))
        media_url = item.get("media_url", "")
        if not product_id or not media_url:
            continue
        item["updated_at"] = now
        db.product_media.update_one(
            {"product_id": product_id, "media_url": media_url},
            {"$set": item},
            upsert=True,
        )
        count += 1
    return count


def upsert_product_people(db: Database, people: List[Dict[str, Any]]) -> int:
    """Upsert maker and hunter relationships for a product."""
    count = 0
    now = datetime.now(timezone.utc).isoformat()
    for person in people:
        product_id = str(person.get("product_id", ""))
        username = person.get("username", "")
        role = person.get("role", "")
        if not product_id or not username or not role:
            continue
        person["updated_at"] = now
        db.product_people.update_one(
            {"product_id": product_id, "username": username, "role": role},
            {"$set": person},
            upsert=True,
        )
        count += 1
    return count


def upsert_product_built_with(db: Database, items: List[Dict[str, Any]]) -> int:
    """Upsert built-with and shoutout relationships for a product."""
    count = 0
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        product_id = str(item.get("product_id", ""))
        related_id = str(item.get("related_product_id", ""))
        if not product_id or not related_id:
            continue
        item["updated_at"] = now
        db.product_built_with.update_one(
            {"product_id": product_id, "related_product_id": related_id},
            {"$set": item},
            upsert=True,
        )
        count += 1
    return count


def upsert_comment(db: Database, comment: Dict[str, Any]) -> None:
    """Idempotently insert or update a launch comment."""
    comment_id = str(comment.get("comment_id", ""))
    if not comment_id:
        return
    comment["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.comments.update_one(
        {"comment_id": comment_id},
        {"$set": comment},
        upsert=True,
    )


def upsert_comments(db: Database, comments: List[Dict[str, Any]]) -> int:
    """Upsert a list of launch comments."""
    count = 0
    for c in comments:
        upsert_comment(db, c)
        count += 1
    return count


def upsert_review(db: Database, review: Dict[str, Any]) -> None:
    """Idempotently insert or update a product review."""
    review_id = str(review.get("review_id", ""))
    if not review_id:
        return
    review["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.reviews.update_one(
        {"review_id": review_id},
        {"$set": review},
        upsert=True,
    )


def upsert_reviews(db: Database, reviews: List[Dict[str, Any]]) -> int:
    """Upsert a list of product reviews."""
    count = 0
    for r in reviews:
        upsert_review(db, r)
        count += 1
    return count


def upsert_profile(db: Database, profile: Dict[str, Any]) -> None:
    """Idempotently insert or update a user public profile."""
    username = profile.get("username", "")
    if not username:
        return
    profile["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.profiles.update_one(
        {"username": username.lower()},
        {"$set": profile},
        upsert=True,
    )


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

