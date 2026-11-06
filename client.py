"""Reusable HTTP and GraphQL client for Product Hunt requests."""

import json
import time
from typing import Any, Dict, Optional
import httpx
from config import settings
from utils import get_logger

logger = get_logger(__name__, settings.log_level)


class GraphQLClient:
    """Client for executing GraphQL persisted queries against Product Hunt."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        bearer_token: Optional[str] = None,
        cookie: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        delay: Optional[float] = None,
    ) -> None:
        self.base_url = base_url or settings.product_hunt_graphql_url
        self.bearer_token = bearer_token or settings.product_hunt_bearer_token
        self.cookie = cookie or settings.product_hunt_cookie
        self.timeout = timeout or settings.request_timeout_seconds
        self.max_retries = max_retries or settings.max_retries
        self.delay = delay or settings.request_delay_seconds
        self._last_request_time = 0.0

        # Build default headers without leaking credentials
        headers = {
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        if self.cookie:
            headers["Cookie"] = self.cookie

        self.client = httpx.Client(headers=headers, timeout=self.timeout)

    def _apply_delay(self) -> None:
        """Enforce rate limiting delay between consecutive requests."""
        if self.delay <= 0:
            return
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def execute_query(
        self,
        operation_name: str,
        variables: Dict[str, Any],
        sha256_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute a GraphQL operation with retry handling and persisted query extension."""
        params: Dict[str, str] = {
            "operationName": operation_name,
            "variables": json.dumps(variables),
        }

        if sha256_hash:
            extensions = {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": sha256_hash,
                }
            }
            params["extensions"] = json.dumps(extensions)

        attempt = 0
        backoff = 1.0

        while attempt <= self.max_retries:
            attempt += 1
            self._apply_delay()

            try:
                logger.info(
                    "Executing GraphQL operation=%s (attempt %d/%d)",
                    operation_name,
                    attempt,
                    self.max_retries + 1,
                )
                response = self.client.get(self.base_url, params=params)
                self._last_request_time = time.time()

                # Handle Rate Limiting (429)
                if response.status_code == 429:
                    retry_after = float(response.headers.get("Retry-After", backoff))
                    logger.warning(
                        "Rate limited (429) on %s. Backing off for %.1fs",
                        operation_name,
                        retry_after,
                    )
                    time.sleep(retry_after)
                    backoff *= 2
                    continue

                # Handle 403 Forbidden (Cloudflare session refresh)
                if response.status_code == 403:
                    logger.warning(
                        "Received 403 Forbidden on %s. Launching browser to refresh session...",
                        operation_name,
                    )
                    try:
                        from extract_hashes import extract_hashes_and_cookies
                        extracted, cookies = extract_hashes_and_cookies()
                        if cookies:
                            self.client.headers["Cookie"] = cookies
                        if operation_name in extracted:
                            new_hash = extracted[operation_name]
                            extensions = {"persistedQuery": {"version": 1, "sha256Hash": new_hash}}
                            params["extensions"] = json.dumps(extensions)
                        continue
                    except Exception as exc:
                        logger.error("Failed to auto-refresh session: %s", exc)

                # Handle Server Errors (5xx)
                if 500 <= response.status_code < 600:
                    logger.warning(
                        "Server error (%d) on %s attempt %d. Retrying...",
                        response.status_code,
                        operation_name,
                        attempt,
                    )
                    time.sleep(backoff)
                    backoff *= 2
                    continue

                response.raise_for_status()
                data = response.json()

                # Check for GraphQL errors
                if "errors" in data and data["errors"]:
                    error_msgs = [e.get("message", "Unknown error") for e in data["errors"]]
                    logger.error("GraphQL errors for %s: %s", operation_name, error_msgs)
                    raise RuntimeError(f"GraphQL returned errors: {error_msgs}")

                return data

            except httpx.HTTPError as exc:
                if attempt > self.max_retries:
                    logger.error(
                        "Exceeded max retries for %s: %s",
                        operation_name,
                        exc.__class__.__name__,
                    )
                    raise
                logger.warning(
                    "HTTP error (%s) on %s attempt %d. Retrying in %.1fs...",
                    exc.__class__.__name__,
                    operation_name,
                    attempt,
                    backoff,
                )
                time.sleep(backoff)
                backoff *= 2

        raise RuntimeError(f"Failed to execute {operation_name} after {self.max_retries} retries")

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self.client.close()

