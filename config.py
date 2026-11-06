"""Simple configuration and GraphQL operation constants."""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration loaded from .env or environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Product Hunt API
    product_hunt_graphql_url: str = Field(
        default="https://www.producthunt.com/frontend/graphql",
        validation_alias="PRODUCT_HUNT_GRAPHQL_URL",
    )
    product_hunt_bearer_token: Optional[str] = Field(
        default=None,
        validation_alias="PRODUCT_HUNT_BEARER_TOKEN",
    )
    product_hunt_cookie: Optional[str] = Field(
        default=None,
        validation_alias="PRODUCT_HUNT_COOKIE",
    )
    product_hunt_leaderboard_hash: str = Field(
        default="8a8f3bb6637e2cccfdc7898eb071e994f64e6f8e49c73475363da7858d919bd3",
        validation_alias="PRODUCT_HUNT_LEADERBOARD_HASH",
    )

    # MongoDB
    mongodb_uri: str = Field(
        default="mongodb://localhost:27017",
        validation_alias="MONGODB_URI",
    )
    mongodb_database: str = Field(
        default="product_hunt_scraper",
        validation_alias="MONGODB_DATABASE",
    )

    # Client limits & retries
    request_timeout_seconds: float = Field(
        default=30.0,
        validation_alias="REQUEST_TIMEOUT_SECONDS",
    )
    max_retries: int = Field(
        default=3,
        validation_alias="MAX_RETRIES",
    )
    request_delay_seconds: float = Field(
        default=1.0,
        validation_alias="REQUEST_DELAY_SECONDS",
    )
    log_level: str = Field(
        default="INFO",
        validation_alias="LOG_LEVEL",
    )


# Persisted Query SHA-256 Hashes
HASH_LEADERBOARD_DAILY = "8a8f3bb6637e2cccfdc7898eb071e994f64e6f8e49c73475363da7858d919bd3"
HASH_PRODUCTS_PAGE_LAYOUT = "2c1bdf022d6d3945357e8933d65d7b1d76435e973d9046b06405928ba5225ca3"
HASH_PRODUCT_ABOUT_PAGE = "13c8d08dec1bf9edf9ecd53237ab781429bc8fea8016ca025ec9ac82fc6044bb"
HASH_PRODUCT_BUILT_WITH_PAGE = "3d3ad8ce5c601c4eeb6bd27a5bd05c28d0809e80540e3082a14db866403b73b1"
HASH_PRODUCT_COMMENTS = "21c7f3277deb31948f8ba9f378076d8ce5aa71d201ab4292de32bba4ac5cb0b7"
HASH_DETAILED_REVIEWS_PAGE = "4ad0fcf36959ef43b571d19a2e9c022352956b141b44b12327552dcd520c543d"
HASH_DETAILED_REVIEWS_FEED = "10f4714cc0f69c7edad99af5edd7cfe6405edd347b67cb161ce766ba474f2f37"

# Singleton settings
settings = Settings()

