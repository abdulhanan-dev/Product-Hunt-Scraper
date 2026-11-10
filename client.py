"""Reusable HTTP and GraphQL client for Product Hunt requests."""

import json
import time
from threading import Lock
from typing import Any, Dict, Optional
import httpx
from config import settings
from utils import get_logger

logger = get_logger(__name__, settings.log_level)

# Global rate limiter lock shared across all GraphQLClient instances
# This ensures that concurrent threads respect the delay between ANY requests
_global_rate_limit_lock = Lock()
_global_last_request_time = 0.0


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
        self.timeout = timeout if timeout is not None else settings.request_timeout_seconds
        self.max_retries = max_retries if max_retries is not None else settings.max_retries
        self.delay = delay if delay is not None else settings.request_delay_seconds
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
        """Enforce rate limiting delay between consecutive requests.
        
        Uses a global lock to ensure that ALL threads (in concurrent processing)
        respect the minimum delay between ANY API requests, not just per-client.
        """
        global _global_last_request_time
        
        if self.delay <= 0:
            return
        
        with _global_rate_limit_lock:
            elapsed = time.time() - _global_last_request_time
            if elapsed < self.delay:
                wait_time = self.delay - elapsed
                time.sleep(wait_time)
            _global_last_request_time = time.time()

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
                
                # Update global last request time (already updated in _apply_delay, but ensure consistency)
                global _global_last_request_time
                _global_last_request_time = time.time()

                # Handle Rate Limiting (429) with Exponential Backoff up to max_retries
                if response.status_code == 429:
                    if attempt > self.max_retries:
                        raise RuntimeError(
                            f"Rate limit (429) persisted after {self.max_retries} retries for {operation_name}"
                        )
                    retry_header = response.headers.get("Retry-After")
                    try:
                        retry_after = float(retry_header) if retry_header else 0.0
                    except ValueError:
                        retry_after = 0.0
                    
                    # Use the larger of: Retry-After header or exponential backoff
                    wait_time = max(retry_after, backoff)
                    
                    logger.warning(
                        "⚠️  Rate limited (429) on %s (attempt %d/%d). Backing off for %.1fs before retry...",
                        operation_name,
                        attempt,
                        self.max_retries + 1,
                        wait_time,
                    )
                    time.sleep(wait_time)
                    backoff = min(backoff * 2, 120.0)  # Cap at 2 minutes
                    continue

                # Handle 403 Forbidden (Cloudflare session refresh)
                if response.status_code == 403:
                    if attempt > self.max_retries:
                        raise RuntimeError(f"Access forbidden (403) for {operation_name}")
                    logger.warning(
                        "Received 403 Forbidden on %s. Launching browser to refresh session...",
                        operation_name,
                    )
                    try:
                        from extract_hashes import extract_hashes_and_cookies
                        extracted, cookies, ua = extract_hashes_and_cookies()
                        if cookies:
                            self.client.headers["Cookie"] = cookies
                        if ua:
                            self.client.headers["User-Agent"] = ua
                        if operation_name in extracted:
                            new_hash = extracted[operation_name]
                            extensions = {"persistedQuery": {"version": 1, "sha256Hash": new_hash}}
                            params["extensions"] = json.dumps(extensions)
                        continue
                    except Exception as exc:
                        logger.error("Failed to auto-refresh session: %s", exc)

                # Handle Server Errors (5xx)
                if 500 <= response.status_code < 600:
                    if attempt > self.max_retries:
                        response.raise_for_status()
                    logger.warning(
                        "Server error (%d) on %s (attempt %d/%d). Retrying in %.1fs...",
                        response.status_code,
                        operation_name,
                        attempt,
                        self.max_retries,
                        backoff,
                    )
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 60.0)
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
                    "HTTP error (%s) on %s (attempt %d/%d). Retrying in %.1fs...",
                    exc.__class__.__name__,
                    operation_name,
                    attempt,
                    self.max_retries,
                    backoff,
                )
                time.sleep(backoff)
                backoff = min(backoff * 2, 60.0)
            except Exception as exc:
                # If it's an explicit GraphQL error that was raised, bubble it up
                if "GraphQL returned errors" in str(exc) or "Access forbidden" in str(exc):
                    raise
                if attempt > self.max_retries:
                    logger.error("Exceeded max retries for %s: %s", operation_name, exc)
                    raise
                logger.warning(
                    "Transient error (%s) on %s (attempt %d/%d). Retrying in %.1fs...",
                    exc,
                    operation_name,
                    attempt,
                    self.max_retries,
                    backoff,
                )
                time.sleep(backoff)
                backoff = min(backoff * 2, 60.0)

        raise RuntimeError(f"Failed to execute {operation_name} after {self.max_retries} retries")

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self.client.close()

