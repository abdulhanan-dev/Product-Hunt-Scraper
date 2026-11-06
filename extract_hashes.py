"""Extract Product Hunt GraphQL persisted-query sha256 hashes and session cookies.

Extraction strategy (tried in order)
--------------------------------------
1. **Headless SeleniumBase UC** (preferred)
   Launches a headless, undetected-Chrome browser that passes Cloudflare's
   bot checks automatically.  Cloudflare challenges are resolved without any
   human interaction.  Requires ``seleniumbase`` to be installed.

2. **Visible regular Selenium** (fallback)
   Opens a *visible* Chrome window and monitors Chrome performance logs.
   Cloudflare challenges can be solved manually in the browser window.
   Used automatically when ``seleniumbase`` is not installed or the headless
   attempt yields no results.

Public API (unchanged — all callers in client.py / scraper.py / main.py
work without modification):
    extract_hashes_and_cookies(url, timeout, return_html) -> tuple
    update_env_file(leaderboard_hash, cookie_str) -> None
"""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from utils import get_logger

logger = get_logger("extract_hashes")

# ---------------------------------------------------------------------------
# Optional SeleniumBase import — checked once at module load time
# ---------------------------------------------------------------------------
try:
    from seleniumbase import Driver as _SBDriver  # type: ignore
    _HAS_SELENIUMBASE = True
except ImportError:
    _HAS_SELENIUMBASE = False


# ===========================================================================
# BROWSER MANAGER
# Launches a SeleniumBase UC (undetected-Chrome) headless browser.
# UC mode patches ChromeDriver so automation fingerprints are hidden from
# Cloudflare's JavaScript probes (navigator.webdriver, CDP markers, etc.).
# ===========================================================================

class BrowserManager:
    """
    Launches a fresh SeleniumBase UC headless Chrome browser.

    Each launch is a completely clean session — no persistent profile —
    so no fingerprint data leaks between runs.

    Anti-detection settings
    -----------------------
    - uc=True          : undetected-chromedriver patching
    - headless=True    : no visible window
    - no_sandbox=True  : required inside Docker / CI
    - disable_gpu=True : stability fix for headless mode
    - window_size      : realistic 1920×1080 viewport
    """

    def __init__(self) -> None:
        self.driver = None

    def launch(self):
        """Start the browser, enable CDP Network domain, return Driver."""
        if not _HAS_SELENIUMBASE:
            raise RuntimeError(
                "seleniumbase is not installed. Run: pip install seleniumbase"
            )

        print("[Browser] Launching SeleniumBase UC browser (headless)")

        self.driver = _SBDriver(
            browser="chrome",
            uc=True,
            headless=True,
            no_sandbox=True,
            disable_gpu=True,
            window_size="1920,1080",
        )

        self.driver.set_page_load_timeout(60)

        # Give ChromeDriver time to fully initialise before CDP calls
        time.sleep(2)

        # Enable the CDP Network domain so Network.getAllCookies works
        self.driver.execute_cdp_cmd("Network.enable", {})

        print("[Browser] Browser launched successfully")
        return self.driver

    def close(self) -> None:
        """Quit the browser and release all resources."""
        if self.driver:
            try:
                self.driver.quit()
                print("[Browser] Browser closed")
            except Exception as exc:
                print(f"[Browser] Error while closing: {exc}")
            finally:
                self.driver = None


# ===========================================================================
# PRODUCT HUNT HASH EXTRACTOR
# Uses BrowserManager to run a headless UC session, monitors CDP
# Network.requestWillBeSent events for /frontend/graphql requests, and
# extracts sha256Hash values from the persisted-query extensions parameter.
# ===========================================================================

# All GraphQL operations we want to capture
_PH_TARGET_OPERATIONS: tuple[str, ...] = (
    "LeaderboardDailyPage",
    "ProductsPageLayout",
    "ProductAboutPage",
    "ProductBuiltWithPage",
    "ProductComments",
    "DetailedReviewsPage",
    "DetailedReviewsFeedQuery",
)

# Extraction is considered complete once these are captured
_PH_CRITICAL_OPERATIONS: tuple[str, ...] = ("LeaderboardDailyPage",)

# Module-level lock — only one browser extraction runs at a time
_PH_EXTRACT_LOCK = threading.Lock()


class ProductHuntHashExtractor:
    """
    Headless SeleniumBase UC browser that bypasses Cloudflare and captures
    Product Hunt GraphQL persisted-query sha256 hashes + session cookies.

    How it works
    ------------
    1. BrowserManager launches headless UC-patched Chrome.
    2. CDP Network domain is enabled — all outgoing requests are captured.
    3. Browser navigates to the seed URL (default: daily leaderboard).
    4. _wait_for_cf() polls document.title until Cloudflare resolves.
    5. CDP Network.requestWillBeSent events are scanned for /frontend/graphql
       requests — sha256Hash is pulled from the URL query-string extensions
       param (GET) or post body (POST).
    6. Cookies are read via CDP Network.getAllCookies.

    Public API
    ----------
    extract(url, timeout, return_html) → (hashes, cookie_str, user_agent)
                                       or (..., page_html) if return_html=True
    """

    def __init__(self) -> None:
        self.browser = BrowserManager()

    def extract(
        self,
        url: str = "https://www.producthunt.com/leaderboard/daily",
        timeout: int = 60,
        return_html: bool = False,
    ) -> tuple:
        """Launch headless Chrome, bypass Cloudflare, and capture hashes."""
        with _PH_EXTRACT_LOCK:
            return self._run(url=url, timeout=timeout, return_html=return_html)

    def _run(self, url: str, timeout: int, return_html: bool) -> tuple:
        print("\n[PH Extractor] ================================================")
        print("[PH Extractor]  Product Hunt Headless Hash & Cookie Extractor  ")
        print("[PH Extractor] ================================================")
        print(f"[PH Extractor] URL: {url} | timeout: {timeout}s | headless: True")

        driver = None
        captured_hashes: dict[str, str] = {}
        cookie_string: str = ""
        user_agent: str = ""
        page_html: str = ""

        try:
            driver = self.browser.launch()
            print(f"[PH Extractor] Navigating to {url} ...")
            driver.get(url)

            self._wait_for_cf(driver, label="page", timeout=45)
            time.sleep(3)  # allow SPA to fire initial GraphQL calls

            try:
                user_agent = driver.execute_script("return navigator.userAgent") or ""
                print(f"[PH Extractor] User-Agent: {user_agent[:80]}...")
            except Exception:
                pass

            print(f"[PH Extractor] Monitoring CDP logs for up to {timeout}s...")
            deadline = time.time() + timeout

            while time.time() < deadline:
                self._scan_cdp_logs(driver, captured_hashes)

                critical_done = all(
                    op in captured_hashes for op in _PH_CRITICAL_OPERATIONS
                )
                all_done = all(
                    op in captured_hashes for op in _PH_TARGET_OPERATIONS
                )

                if critical_done and all_done:
                    print("[PH Extractor] All target operations captured!")
                    break
                if critical_done and time.time() + 5 >= deadline:
                    break

                time.sleep(1.5)

            # Final drain
            self._scan_cdp_logs(driver, captured_hashes)

            try:
                page_html = driver.page_source or ""
            except Exception:
                page_html = ""

            cookie_string = self._read_cookies(driver)

        except Exception as exc:
            print(f"[PH Extractor] ERROR: {exc}")
        finally:
            if driver is not None:
                try:
                    self.browser.close()
                except Exception:
                    pass

        # Summary
        print("\n[PH Extractor] ================================================")
        if captured_hashes:
            print("[PH Extractor] Captured hashes:")
            for op, sha in captured_hashes.items():
                print(f"  {op}: {sha}")
        else:
            print("[PH Extractor] No hashes captured.")
        if cookie_string:
            print(f"[PH Extractor] Cookies (first 100 chars): {cookie_string[:100]}...")
        print("[PH Extractor] ================================================\n")

        if return_html:
            return captured_hashes, cookie_string, user_agent, page_html
        return captured_hashes, cookie_string, user_agent

    def _scan_cdp_logs(
        self, driver, captured_hashes: dict[str, str]
    ) -> None:
        """Drain the CDP performance log and extract GraphQL hashes."""
        try:
            logs = driver.get_log("performance")
        except Exception:
            return

        for entry in logs:
            try:
                msg = json.loads(entry["message"])["message"]
                if msg.get("method") != "Network.requestWillBeSent":
                    continue

                req = msg.get("params", {}).get("request", {})
                req_url = req.get("url", "")

                if "frontend/graphql" not in req_url:
                    continue

                # GET — check URL query string
                parsed = urlparse(req_url)
                qs = parse_qs(parsed.query)
                op_name = qs.get("operationName", [None])[0]
                ext_raw = qs.get("extensions", [None])[0]

                if op_name and ext_raw:
                    try:
                        sha = (
                            json.loads(ext_raw)
                            .get("persistedQuery", {})
                            .get("sha256Hash")
                        )
                        if sha and op_name not in captured_hashes:
                            captured_hashes[op_name] = sha
                            print(f"[PH Extractor] [+] GET  {op_name} → {sha}")
                    except Exception:
                        pass

                # POST — check request body
                post_data = req.get("postData")
                if post_data:
                    try:
                        pj = json.loads(post_data)
                        op_p = pj.get("operationName")
                        sha_p = (
                            pj.get("extensions", {})
                            .get("persistedQuery", {})
                            .get("sha256Hash")
                        )
                        if op_p and sha_p and op_p not in captured_hashes:
                            captured_hashes[op_p] = sha_p
                            print(f"[PH Extractor] [+] POST {op_p} → {sha_p}")
                    except Exception:
                        pass

            except Exception:
                continue

    def _read_cookies(self, driver) -> str:
        """Read all cookies via CDP; fall back to document.cookie."""
        try:
            result = driver.execute_cdp_cmd("Network.getAllCookies", {})
            cookies = result.get("cookies", [])
            if cookies:
                ck_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
                print(f"[PH Extractor] Captured {len(cookies)} cookies via CDP.")
                return ck_str
        except Exception as err:
            print(f"[PH Extractor] CDP cookie read failed: {err}")

        try:
            raw = driver.execute_script("return document.cookie") or ""
            if raw:
                print("[PH Extractor] Cookies captured via document.cookie (fallback).")
                return raw
        except Exception:
            pass

        return ""

    @staticmethod
    def _wait_for_cf(driver, label: str, timeout: int = 45) -> None:
        """Poll document.title until Cloudflare's challenge page clears."""
        print(f"[PH Extractor] Waiting for Cloudflare challenge ({label})...")
        for _ in range(timeout // 2):
            time.sleep(2)
            try:
                title = driver.execute_script("return document.title") or ""
            except Exception:
                title = ""

            blocked = any(
                kw in title.lower()
                for kw in ("just a moment", "attention required", "access denied")
            )
            if title and not blocked:
                print(f"[PH Extractor] Page ready ({label}): '{title}'")
                return

        print(f"[PH Extractor] WARNING: page may still be loading after {timeout}s")


# ===========================================================================
# PRODUCT HUNT AUTH MANAGER
# TTL-based session cache (storage/ph_session.json, 10-hour expiry).
# Wraps ProductHuntHashExtractor with disk persistence and force_refresh().
# ===========================================================================

_PH_SESSION_FILE = Path("storage/ph_session.json")
_PH_SESSION_TTL = timedelta(hours=10)


class ProductHuntAuthManager:
    """
    Caches Product Hunt hashes + cookies on disk; refreshes when stale.

    Session file: storage/ph_session.json
    TTL: 10 hours (cf_clearance typically lasts 12 h)

    Usage
    -----
        mgr = ProductHuntAuthManager()
        hashes, cookie_str, ua = mgr.get_session()

        # After a 403:
        hashes, cookie_str, ua = mgr.force_refresh()
    """

    def __init__(self) -> None:
        self._extractor = ProductHuntHashExtractor()

    def get_session(self) -> tuple[dict[str, str], str, str]:
        """Return (hashes, cookie_str, user_agent); extract if cache is stale."""
        if self._is_cache_valid():
            data = self._load()
            if data:
                print("[PH AuthManager] Using cached session.")
                return (
                    data.get("hashes", {}),
                    data.get("cookie_str", ""),
                    data.get("user_agent", ""),
                )
        print("[PH AuthManager] Cache missing/expired — running browser extractor.")
        return self._do_extract()

    def force_refresh(self) -> tuple[dict[str, str], str, str]:
        """Discard cache and extract a fresh session immediately."""
        print("[PH AuthManager] Force refresh — deleting cache.")
        self._delete_cache()
        return self._do_extract()

    def _do_extract(self) -> tuple[dict[str, str], str, str]:
        hashes, cookie_str, user_agent = self._extractor.extract()
        self._save(hashes, cookie_str, user_agent)
        if hashes or cookie_str:
            try:
                _update_env(
                    leaderboard_hash=hashes.get("LeaderboardDailyPage"),
                    cookie_str=cookie_str,
                )
            except Exception as exc:
                print(f"[PH AuthManager] Could not update .env: {exc}")
        return hashes, cookie_str, user_agent

    def _is_cache_valid(self) -> bool:
        data = self._load()
        if not data or not data.get("cookie_str"):
            return False
        try:
            ts = datetime.fromisoformat(data["timestamp"])
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - ts >= _PH_SESSION_TTL:
                print("[PH AuthManager] Cache expired.")
                return False
        except Exception:
            return False
        return True

    def _save(self, hashes: dict, cookie_str: str, user_agent: str) -> None:
        _PH_SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(_PH_SESSION_FILE, "w", encoding="utf-8") as fh:
                json.dump(
                    {
                        "timestamp":  datetime.now(timezone.utc).isoformat(),
                        "hashes":     hashes,
                        "cookie_str": cookie_str,
                        "user_agent": user_agent,
                    },
                    fh,
                    indent=4,
                )
            print(f"[PH AuthManager] Session saved ({len(hashes)} hashes).")
        except Exception as exc:
            print(f"[PH AuthManager] Failed to save session: {exc}")

    def _load(self) -> dict | None:
        if not _PH_SESSION_FILE.exists():
            return None
        try:
            content = _PH_SESSION_FILE.read_text(encoding="utf-8").strip()
            return json.loads(content) if content else None
        except Exception:
            return None

    def _delete_cache(self) -> None:
        if _PH_SESSION_FILE.exists():
            try:
                _PH_SESSION_FILE.unlink()
            except Exception:
                pass


# ===========================================================================
# Public API
# ===========================================================================

def extract_hashes_and_cookies(
    url: str = "https://www.producthunt.com/leaderboard/daily",
    timeout: int = 45,
    return_html: bool = False,
) -> tuple:
    """Extract Product Hunt GraphQL hashes and session cookies.

    Tries the headless SeleniumBase UC path first (automatic Cloudflare
    bypass).  Falls back to the visible-browser Selenium path if
    ``seleniumbase`` is not installed or the headless attempt yields nothing.

    Args:
        url:         Seed URL to navigate to (default: daily leaderboard).
        timeout:     Maximum seconds to allow for hash capture.
        return_html: When True, a fourth element (page HTML) is appended.

    Returns:
        (hashes_dict, cookie_string, user_agent_string)
        (hashes_dict, cookie_string, user_agent_string, page_html)  ← return_html=True
    """
    if _HAS_SELENIUMBASE:
        result = _headless_extract(url=url, timeout=timeout, return_html=return_html)
        hashes, cookie_str = result[0], result[1]
        if hashes:
            return result
        logger.warning(
            "[extract_hashes] Headless UC extraction yielded no hashes — "
            "falling back to visible browser."
        )

    return _visible_extract(url=url, timeout=timeout, return_html=return_html)


# ===========================================================================
# Path 1 — Headless SeleniumBase UC
# ===========================================================================

def _headless_extract(url: str, timeout: int, return_html: bool) -> tuple:
    """Run ProductHuntHashExtractor (headless UC browser)."""
    print("\n=======================================================")
    print("  HEADLESS UC EXTRACTION (SeleniumBase + TLS spoof)   ")
    print("=======================================================")

    try:
        extractor = ProductHuntHashExtractor()
        result = extractor.extract(url=url, timeout=timeout, return_html=return_html)

        hashes     = result[0]
        cookie_str = result[1]
        user_agent = result[2]
        page_html  = result[3] if return_html else ""

        if hashes.get("LeaderboardDailyPage") or cookie_str:
            try:
                update_env_file(
                    leaderboard_hash=hashes.get("LeaderboardDailyPage"),
                    cookie_str=cookie_str,
                )
                print("[✓] .env updated from headless extraction.")
            except Exception as exc:
                print(f"[!] Could not update .env: {exc}")

        if return_html:
            return hashes, cookie_str, user_agent, page_html
        return hashes, cookie_str, user_agent

    except Exception as exc:
        logger.error("[extract_hashes] Headless extraction error: %s", exc)
        return ({}, "", "") + (("",) if return_html else ())


# ===========================================================================
# Path 2 — Visible regular Selenium (original fallback)
# ===========================================================================

def _visible_extract(url: str, timeout: int, return_html: bool) -> tuple:
    """Original visible-browser extraction using standard Selenium WebDriver."""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    print("\n=======================================================")
    print("      PRODUCT HUNT HASH & COOKIE EXTRACTION HELPER     ")
    print("=======================================================")
    print("Launching visible Chrome browser...")
    print("-> If a Cloudflare challenge appears, solve it in the browser window.")
    print("-> Once the page loads, hashes and cookies are captured automatically.\n")

    chrome_options = Options()
    chrome_options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--start-maximized")

    driver = None
    captured_hashes: dict = {}
    captured_cookies: str = ""
    user_agent: str = ""

    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)

        try:
            user_agent = driver.execute_script("return navigator.userAgent")
        except Exception:
            pass

        start_time = time.time()
        print(f"Monitoring network traffic for up to {timeout} seconds...")

        while time.time() - start_time < timeout:
            logs = driver.get_log("performance")
            for entry in logs:
                try:
                    msg = json.loads(entry["message"])["message"]
                    if msg.get("method") != "Network.requestWillBeSent":
                        continue

                    req = msg.get("params", {}).get("request", {})
                    req_url = req.get("url", "")

                    if "frontend/graphql" not in req_url:
                        continue

                    parsed = urlparse(req_url)
                    qs = parse_qs(parsed.query)
                    op_name = qs.get("operationName", [None])[0]
                    ext_raw = qs.get("extensions", [None])[0]

                    if op_name and ext_raw:
                        sha = (
                            json.loads(ext_raw)
                            .get("persistedQuery", {})
                            .get("sha256Hash")
                        )
                        if sha and op_name not in captured_hashes:
                            captured_hashes[op_name] = sha
                            print(f" [+] Captured Operation: {op_name} -> {sha}")

                    post_data = req.get("postData")
                    if post_data:
                        try:
                            pj = json.loads(post_data)
                            op_p = pj.get("operationName")
                            sha_p = (
                                pj.get("extensions", {})
                                .get("persistedQuery", {})
                                .get("sha256Hash")
                            )
                            if op_p and sha_p and op_p not in captured_hashes:
                                captured_hashes[op_p] = sha_p
                                print(f" [+] Captured Operation (POST): {op_p} -> {sha_p}")
                        except Exception:
                            pass

                except Exception:
                    continue

            if "leaderboard" not in url:
                try:
                    title = driver.title or ""
                    if (
                        "Just a moment" not in title
                        and "Attention Required" not in title
                        and len(title) > 0
                    ):
                        cks = driver.get_cookies()
                        has_cf = any(c.get("name") == "cf_clearance" for c in cks)
                        src = driver.page_source or ""
                        if has_cf or "ApolloSSRDataTransport" in src or "profile" in src:
                            print(f"\n[✓] Page loaded successfully: {title}")
                            break
                except Exception:
                    pass
            elif "LeaderboardDailyPage" in captured_hashes:
                print("\n[✓] Successfully captured LeaderboardDailyPage hash!")
                break

            time.sleep(1.0)

        page_html = driver.page_source if driver else ""
        cookies = driver.get_cookies()
        if cookies:
            captured_cookies = "; ".join(
                f"{c['name']}={c['value']}" for c in cookies
            )
            print(f"[✓] Captured {len(cookies)} browser cookies.")

    except Exception as exc:
        print(f"[!] Error running browser: {exc}")
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

    print("\n=======================================================")
    print("                  EXTRACTION SUMMARY                   ")
    print("=======================================================")

    if captured_hashes:
        print("Captured Operations & Hashes:")
        for op, sha in captured_hashes.items():
            print(f"  {op}: {sha}")
    else:
        print("No GraphQL operations captured during the session.")

    if captured_cookies:
        print(f"\nCookie String Preview (first 100 chars):")
        print(f"  {captured_cookies[:100]}...")

    if "LeaderboardDailyPage" in captured_hashes or captured_cookies:
        print("\nUpdating .env file with captured values...")
        try:
            update_env_file(
                leaderboard_hash=captured_hashes.get("LeaderboardDailyPage"),
                cookie_str=captured_cookies,
            )
            print("[✓] .env updated successfully!")
        except Exception as exc:
            print(f"[!] Could not update .env: {exc}")

    print("=======================================================\n")

    if return_html:
        return captured_hashes, captured_cookies, user_agent, page_html
    return captured_hashes, captured_cookies, user_agent


# ===========================================================================
# .env helpers
# ===========================================================================

def _update_env(
    leaderboard_hash: str | None,
    cookie_str: str | None,
) -> None:
    """Internal helper used by ProductHuntAuthManager."""
    update_env_file(leaderboard_hash=leaderboard_hash, cookie_str=cookie_str)


def update_env_file(
    leaderboard_hash: str = None,
    cookie_str: str = None,
) -> None:
    """Update PRODUCT_HUNT_LEADERBOARD_HASH and PRODUCT_HUNT_COOKIE in .env."""
    try:
        with open(".env", "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        lines = []

    new_lines = []
    hash_updated = False
    cookie_updated = False

    for line in lines:
        if line.startswith("PRODUCT_HUNT_LEADERBOARD_HASH=") and leaderboard_hash:
            new_lines.append(f"PRODUCT_HUNT_LEADERBOARD_HASH={leaderboard_hash}\n")
            hash_updated = True
        elif line.startswith("PRODUCT_HUNT_COOKIE=") and cookie_str:
            new_lines.append(f"PRODUCT_HUNT_COOKIE={cookie_str}\n")
            cookie_updated = True
        else:
            new_lines.append(line)

    if not hash_updated and leaderboard_hash:
        new_lines.append(f"PRODUCT_HUNT_LEADERBOARD_HASH={leaderboard_hash}\n")
    if not cookie_updated and cookie_str:
        new_lines.append(f"PRODUCT_HUNT_COOKIE={cookie_str}\n")

    with open(".env", "w", encoding="utf-8") as f:
        f.writelines(new_lines)


# ===========================================================================
# CLI entry point
# ===========================================================================

if __name__ == "__main__":
    extract_hashes_and_cookies()
