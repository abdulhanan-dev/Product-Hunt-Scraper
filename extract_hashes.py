"""Extract Product Hunt GraphQL persisted-query sha256 hashes and session cookies.

Hash extraction strategy
--------------------------
Product Hunt uses Apollo Client with SSR (server-side rendering). The leaderboard
page data is pre-fetched on the server and embedded in the HTML response via the
Apollo cache. Because of this, the browser's Apollo Client sees the cache is already
populated and NEVER fires a LeaderboardDailyPage GraphQL network request.

To get the hash we scan the Next.js JS bundle files that are loaded by the page.
The bundle contains the full query definition AND the sha256Hash for the persisted
query. We use the authenticated browser session (already past Cloudflare) to fetch
the bundles so they are served without blocking.

Headless strategy
------------------
Chrome runs with headless2=True (--headless=new flag), which is Chrome's modern
headless mode. It is significantly less detectable by Cloudflare than the old
--headless flag.  On Linux servers Xvfb is also available as a fallback if
headless2 still gets blocked.

CF bypass click priority
--------------------------
1. uc_gui_click_captcha()  — pyautogui OS-level event
2. uc_gui_handle_captcha() — SeleniumBase alternative helper
3. CDP Input.dispatchMouseEvent — direct DevTools click on iframe coords
4. JS click fallback       — last resort same-origin iframe click

Public API (unchanged):
    extract_hashes_and_cookies(url, timeout, return_html) -> tuple
    update_env_file(leaderboard_hash, cookie_str) -> None
"""

from __future__ import annotations

import json
import os
import platform
import subprocess
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from utils import get_logger

logger = get_logger("extract_hashes")

# ---------------------------------------------------------------------------
# Optional imports
# ---------------------------------------------------------------------------
try:
    from seleniumbase import Driver as _SBDriver  # type: ignore
    _HAS_SELENIUMBASE = True
except ImportError:
    _HAS_SELENIUMBASE = False

# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------
_IS_LINUX = platform.system() == "Linux"


# ---------------------------------------------------------------------------
# Virtual display manager (Linux only)
# ---------------------------------------------------------------------------
class _VirtualDisplay:
    """Start/stop an Xvfb virtual display on Linux servers.

    On macOS or when a DISPLAY is already set, this is a no-op so local dev
    is completely unaffected.
    """

    def __init__(self, width: int = 1920, height: int = 1080) -> None:
        self._proc = None
        self._display_num = None
        self._width = width
        self._height = height
        self._original_display = os.environ.get("DISPLAY", "")

    def start(self) -> str:
        """Start Xvfb and return the DISPLAY value (e.g. ':99').

        Returns the existing DISPLAY unchanged if already set or on macOS.
        """
        if not _IS_LINUX:
            return self._original_display

        # If a real display is already available, use it
        if self._original_display:
            print(f"[Display] Existing DISPLAY={self._original_display} — skipping Xvfb")
            return self._original_display

        # Find a free display number
        display_num = 99
        for num in range(99, 200):
            lock_file = f"/tmp/.X{num}-lock"
            if not os.path.exists(lock_file):
                display_num = num
                break

        display = f":{display_num}"
        try:
            self._proc = subprocess.Popen(
                [
                    "Xvfb", display,
                    "-screen", "0", f"{self._width}x{self._height}x24",
                    "-ac",          # disable access control
                    "+extension", "GLX",
                    "+render",
                    "-noreset",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            time.sleep(1.5)  # give Xvfb time to initialise

            if self._proc.poll() is not None:
                raise RuntimeError("Xvfb process exited immediately")

            os.environ["DISPLAY"] = display
            self._display_num = display_num
            print(f"[Display] Xvfb started on {display}")
            return display

        except FileNotFoundError:
            # Xvfb not installed — try PyVirtualDisplay as fallback
            print("[Display] Xvfb binary not found. Trying PyVirtualDisplay...")
            try:
                from xvfbwrapper import Xvfb  # type: ignore
                self._vdisplay = Xvfb(width=self._width, height=self._height, colordepth=24)
                self._vdisplay.start()
                display = f":{self._vdisplay.vdisplay_num}"
                os.environ["DISPLAY"] = display
                print(f"[Display] PyVirtualDisplay started on {display}")
                return display
            except Exception as e:
                print(f"[Display] PyVirtualDisplay also failed: {e}")
                print("[Display] Proceeding without virtual display (may fail on headless servers)")
                return ""

        except Exception as e:
            print(f"[Display] Failed to start Xvfb: {e}")
            return ""

    def stop(self) -> None:
        """Stop the virtual display and restore DISPLAY env var."""
        if self._proc and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=5)
            except Exception:
                self._proc.kill()
            self._proc = None
            print("[Display] Xvfb stopped")

        if hasattr(self, "_vdisplay"):
            try:
                self._vdisplay.stop()
            except Exception:
                pass

        # Restore original DISPLAY
        if self._original_display:
            os.environ["DISPLAY"] = self._original_display
        elif "DISPLAY" in os.environ and _IS_LINUX:
            del os.environ["DISPLAY"]


# ---------------------------------------------------------------------------
# JS interceptor — patches fetch + XHR to capture GraphQL hashes in-page
# ---------------------------------------------------------------------------
_JS_INTERCEPTOR = """
window.__phHashes = window.__phHashes || {};
(function() {
    function extractHash(url) {
        try {
            var u = new URL(url, window.location.href);
            if (!u.pathname.includes('frontend/graphql')) return;
            var op  = u.searchParams.get('operationName');
            var ext = u.searchParams.get('extensions');
            if (op && ext) {
                var parsed = JSON.parse(ext);
                var sha = parsed.persistedQuery && parsed.persistedQuery.sha256Hash;
                if (sha) window.__phHashes[op] = sha;
            }
        } catch(e) {}
    }
    var _fetch = window.fetch;
    window.fetch = function() {
        var url = arguments[0];
        if (typeof url === 'string') extractHash(url);
        else if (url && url.url) extractHash(url.url);
        return _fetch.apply(this, arguments);
    };
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        try { extractHash(url); } catch(e) {}
        return _open.apply(this, arguments);
    };
})();
"""


# ---------------------------------------------------------------------------
# CDP network log parser
# ---------------------------------------------------------------------------
def _parse_hashes_from_cdp_logs(driver, captured: dict) -> None:
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

            # GET request — hash in query string
            qs = parse_qs(urlparse(req_url).query)
            op = qs.get("operationName", [None])[0]
            ext = qs.get("extensions", [None])[0]
            if op and ext:
                try:
                    sha = json.loads(ext).get("persistedQuery", {}).get("sha256Hash")
                    if sha and op not in captured:
                        captured[op] = sha
                        print(f" [+] {op} → {sha}")
                except Exception:
                    pass

            # POST request — hash in body
            post = req.get("postData")
            if post:
                try:
                    pj = json.loads(post)
                    op_p = pj.get("operationName")
                    sha_p = (pj.get("extensions", {})
                               .get("persistedQuery", {})
                               .get("sha256Hash"))
                    if op_p and sha_p and op_p not in captured:
                        captured[op_p] = sha_p
                        print(f" [+] {op_p} → {sha_p}")
                except Exception:
                    pass

        except Exception:
            continue


# ---------------------------------------------------------------------------
# JS hash reader (secondary source — injected interceptor)
# ---------------------------------------------------------------------------
def _read_js_hashes(driver, captured: dict) -> None:
    """Read hashes captured by the injected JS interceptor."""
    try:
        js_hashes = driver.execute_script("return window.__phHashes || {};")
        if isinstance(js_hashes, dict):
            for op, sha in js_hashes.items():
                if op and sha and op not in captured:
                    captured[op] = sha
                    print(f" [+] (js) {op} → {sha}")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Cloudflare checkbox clicker
# ---------------------------------------------------------------------------
def _click_cf_checkbox(driver) -> None:
    """Click the Cloudflare Turnstile checkbox using multiple strategies.

    Strategy priority:
    1. uc_gui_click_captcha()  — pyautogui, works inside Xvfb on Linux
    2. uc_gui_handle_captcha() — SeleniumBase alternative
    3. CDP Input.dispatchMouseEvent — DevTools synthetic click
    4. JS click on iframe content — last resort
    """

    def _do_click():
        # 1. SeleniumBase pyautogui-based click (works inside Xvfb)
        try:
            driver.uc_gui_click_captcha()
            print(" [CF] uc_gui_click_captcha: triggered")
            return
        except Exception as e:
            print(f" [CF] uc_gui_click_captcha failed: {e}")

        # 2. Alternative SB captcha handler
        try:
            driver.uc_gui_handle_captcha()
            print(" [CF] uc_gui_handle_captcha: triggered")
            return
        except Exception as e:
            print(f" [CF] uc_gui_handle_captcha failed: {e}")

        # 3. CDP mouse event on CF iframe bounding rect
        try:
            rect = driver.execute_script("""
                var iframes = document.querySelectorAll('iframe');
                for (var i = 0; i < iframes.length; i++) {
                    var src = iframes[i].src || '';
                    if (src.indexOf('challenges.cloudflare') !== -1 ||
                        src.indexOf('turnstile') !== -1 ||
                        (iframes[i].id && iframes[i].id.indexOf('cf') !== -1)) {
                        var r = iframes[i].getBoundingClientRect();
                        if (r.width > 0) return {x: r.left, y: r.top, w: r.width, h: r.height};
                    }
                }
                // fallback: first visible iframe
                for (var i = 0; i < iframes.length; i++) {
                    var r = iframes[i].getBoundingClientRect();
                    if (r.width > 0) return {x: r.left, y: r.top, w: r.width, h: r.height};
                }
                return null;
            """)
            if rect and rect.get("w", 0) > 0:
                cx = int(rect["x"] + rect["w"] * 0.15)
                cy = int(rect["y"] + rect["h"] * 0.5)
                for evt in ("mousePressed", "mouseReleased"):
                    driver.execute_cdp_cmd("Input.dispatchMouseEvent", {
                        "type": evt, "x": cx, "y": cy,
                        "button": "left", "clickCount": 1,
                    })
                    time.sleep(0.05)
                print(f" [CF] CDP mouse click at ({cx}, {cy})")
                return
        except Exception as e:
            print(f" [CF] CDP click failed: {e}")

        # 4. JS click inside iframe (same-origin only)
        try:
            driver.execute_script("""
                var iframes = document.querySelectorAll('iframe');
                for (var i = 0; i < iframes.length; i++) {
                    try {
                        var doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                        var cb = doc.querySelector('input[type=checkbox]')
                              || doc.querySelector('[id*=challenge]')
                              || doc.querySelector('label')
                              || doc.querySelector('div[tabindex]');
                        if (cb) { cb.click(); break; }
                    } catch(e) {}
                }
            """)
            print(" [CF] JS fallback click dispatched")
        except Exception as e:
            print(f" [CF] JS fallback failed: {e}")

    t = threading.Thread(target=_do_click, daemon=True)
    t.start()
    t.join(timeout=5.0)


# ===========================================================================
# BROWSER MANAGER
# ===========================================================================

class BrowserManager:
    """Launch and manage a SeleniumBase UC Chrome instance.

    On Linux servers (no display):
      - Starts an Xvfb virtual display before launching Chrome
      - Runs Chrome with headless=False inside Xvfb so Cloudflare's
        Turnstile fingerprinting sees a normal browser environment
      - uc_gui_click_captcha() (pyautogui) targets the Xvfb display

    On macOS / Linux with existing DISPLAY:
      - Same flow, Xvfb skipped since display already exists
    """

    # Chrome flags needed on Linux servers / containers
    _LINUX_ARGS = [
        "--disable-dev-shm-usage",   # /dev/shm too small in containers
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-client-side-phishing-detection",
        "--disable-sync",
        "--metrics-recording-only",
        "--disable-default-apps",
        "--mute-audio",
        "--hide-scrollbars",
    ]

    def __init__(self) -> None:
        self.driver = None
        self._vdisplay = _VirtualDisplay()
        self._display = None

    def launch(self):
        if not _HAS_SELENIUMBASE:
            raise RuntimeError(
                "seleniumbase is not installed. Run: pip install seleniumbase"
            )

        # Start virtual display on Linux before launching Chrome (fallback)
        self._display = self._vdisplay.start()

        os_label = "Linux" if _IS_LINUX else platform.system()
        print(f"[Browser] Launching SeleniumBase UC Chrome ({os_label}, headless2)")

        # Build extra Chrome args for Linux servers/containers
        extra_args = self._LINUX_ARGS if _IS_LINUX else []

        self.driver = _SBDriver(
            browser="chrome",
            uc=True,
            headless=False,   # must be False for UC anti-detection
            headless2=True,   # uses --headless=new (Chrome's modern headless, less detectable)
            no_sandbox=True,
            disable_gpu=True,
            window_size="1920,1080",
            log_cdp=True,     # enables get_log("performance") CDP events
            chromium_arg=extra_args if extra_args else None,
        )
        self.driver.set_page_load_timeout(60)
        time.sleep(2)

        # Enable Network domain so getAllCookies works
        self.driver.execute_cdp_cmd("Network.enable", {})

        print("[Browser] Browser launched successfully")
        return self.driver

    def close(self) -> None:
        if self.driver:
            try:
                self.driver.quit()
                print("[Browser] Browser closed")
            except Exception as exc:
                print(f"[Browser] Error while closing: {exc}")
            finally:
                self.driver = None

        # Always stop the virtual display after Chrome exits
        self._vdisplay.stop()


# ===========================================================================
# PRODUCT HUNT HASH EXTRACTOR
# ===========================================================================

_PH_TARGET_OPERATIONS: tuple[str, ...] = (
    "LeaderboardDailyPage",
    "ProductsPageLayout",
    "ProductAboutPage",
    "ProductBuiltWithPage",
    "ProductComments",
    "DetailedReviewsPage",
    "DetailedReviewsFeedQuery",
)
_PH_CRITICAL_OPERATIONS: tuple[str, ...] = ("LeaderboardDailyPage",)
_PH_EXTRACT_LOCK = threading.Lock()


class ProductHuntHashExtractor:
    def __init__(self) -> None:
        self.browser = BrowserManager()

    def extract(
        self,
        url: str = "https://www.producthunt.com/leaderboard/daily",
        timeout: int = 120,
        return_html: bool = False,
    ) -> tuple:
        with _PH_EXTRACT_LOCK:
            return self._run(url=url, timeout=timeout, return_html=return_html)

    def _run(self, url: str, timeout: int, return_html: bool) -> tuple:
        print("\n[PH Extractor] ================================================")
        print("[PH Extractor]  Product Hunt Hash & Cookie Extractor           ")
        print("[PH Extractor] ================================================")
        print(f"[PH Extractor] URL: {url} | timeout: {timeout}s | OS: {platform.system()}")

        driver = None
        captured_hashes: dict[str, str] = {}
        cookie_string: str = ""
        user_agent: str = ""
        page_html: str = ""

        try:
            driver = self.browser.launch()

            # ----------------------------------------------------------------
            # Navigation strategy:
            #   1. Load homepage — clears Cloudflare for the domain
            #   2. Navigate to the dated leaderboard URL
            # The second navigation is a client-side SPA route change which
            # causes React to fire the LeaderboardDailyPage GraphQL query.
            # ----------------------------------------------------------------
            print("[PH Extractor] Step 1: Loading homepage to establish CF session...")
            driver.get("https://www.producthunt.com/")
            time.sleep(3)

            # Wait for homepage CF to clear (up to 45s)
            hp_deadline = time.time() + 45
            hp_cf_clicks = 0
            hp_last_click = 0.0
            while time.time() < hp_deadline:
                try:
                    title = driver.execute_script("return document.title") or ""
                except Exception:
                    title = ""

                is_cf = any(kw in title.lower() for kw in
                            ("just a moment", "attention required", "access denied"))

                if is_cf:
                    now = time.time()
                    if hp_cf_clicks < 5 and now - hp_last_click >= 4.0:
                        hp_cf_clicks += 1
                        hp_last_click = now
                        print(f"[PH Extractor] CF on homepage (click {hp_cf_clicks}/5)...")
                        _click_cf_checkbox(driver)
                    time.sleep(2)
                elif title and "product hunt" in title.lower():
                    print(f"[PH Extractor] Homepage ready: '{title}'")
                    break
                else:
                    time.sleep(1.5)

            # Inject JS interceptor before navigating to leaderboard
            try:
                driver.execute_cdp_cmd(
                    "Page.addScriptToEvaluateOnNewDocument",
                    {"source": _JS_INTERCEPTOR},
                )
            except Exception:
                pass

            # Navigate to the target leaderboard URL
            print(f"[PH Extractor] Step 2: Navigating to {url} ...")
            driver.get(url)
            time.sleep(2)

            # ----------------------------------------------------------------
            # Main monitoring loop
            # ----------------------------------------------------------------
            deadline = time.time() + timeout
            cf_cleared = False
            cf_cleared_at = 0.0
            last_cf_click = 0.0
            cf_click_count = 0
            CF_MAX_CLICKS = 5
            CF_CLICK_INTERVAL = 4.0
            # How long to keep scanning after the page has loaded.
            # For most operations the query fires within 10s.
            # LeaderboardDailyPage is handled separately via bundle scanning.
            POST_LOAD_SCAN_SECONDS = 15.0

            print(f"[PH Extractor] Monitoring for up to {timeout}s...")

            while time.time() < deadline:
                # Always drain CDP log first
                _parse_hashes_from_cdp_logs(driver, captured_hashes)
                _read_js_hashes(driver, captured_hashes)

                # Early-exit if critical hash already found
                if "LeaderboardDailyPage" in captured_hashes:
                    print("[PH Extractor] LeaderboardDailyPage hash captured — exiting early!")
                    break

                try:
                    title = driver.execute_script("return document.title") or ""
                except Exception:
                    title = ""

                is_cf = any(kw in title.lower() for kw in
                            ("just a moment", "attention required", "access denied"))

                # CF challenge on leaderboard page
                if is_cf:
                    now = time.time()
                    if cf_click_count < CF_MAX_CLICKS and now - last_cf_click >= CF_CLICK_INTERVAL:
                        cf_click_count += 1
                        last_cf_click = now
                        print(f"[PH Extractor] CF on leaderboard "
                              f"(attempt {cf_click_count}/{CF_MAX_CLICKS}) — clicking...")
                        _click_cf_checkbox(driver)

                # Page loaded successfully
                elif title and "product hunt" in title.lower() and not cf_cleared:
                    print(f"[PH Extractor] Leaderboard ready: '{title}'")
                    cf_cleared = True
                    cf_cleared_at = time.time()

                    try:
                        user_agent = driver.execute_script("return navigator.userAgent") or ""
                        print(f"[PH Extractor] UA: {user_agent[:80]}...")
                    except Exception:
                        pass

                    # Trigger lazy-loaded queries via scroll + interaction
                    self._trigger_spa_queries(driver)

                # After page load: keep scanning until POST_LOAD_SCAN_SECONDS
                if cf_cleared:
                    elapsed = time.time() - cf_cleared_at

                    # Periodic re-scrolls to trigger any remaining observers
                    if 8 <= elapsed < 12:
                        self._scroll(driver, 1200)
                    elif 18 <= elapsed < 22:
                        self._scroll(driver, 2400)
                        self._scroll(driver, 0)
                    elif 30 <= elapsed < 34:
                        self._scroll(driver, 800)
                        self._scroll(driver, 0)

                    # Hard stop after scan window
                    if elapsed >= POST_LOAD_SCAN_SECONDS:
                        print(f"[PH Extractor] Scan window ({POST_LOAD_SCAN_SECONDS}s) elapsed.")
                        break

                time.sleep(1.5)

            # Final drain after loop ends
            _parse_hashes_from_cdp_logs(driver, captured_hashes)
            _read_js_hashes(driver, captured_hashes)

            # ----------------------------------------------------------------
            # Bundle scan fallback — runs when LeaderboardDailyPage was NOT
            # captured via network (Apollo SSR cache prevents the request).
            # We scan the Next.js JS bundles that are already loaded in the
            # page using the authenticated browser session.
            # Must run BEFORE page_source / quit so the driver is still alive.
            # ----------------------------------------------------------------
            for op in _PH_CRITICAL_OPERATIONS:
                if op not in captured_hashes:
                    print(f"[PH Extractor] {op} not in network log — trying bundle scan...")
                    sha = self._scan_bundles_for_hash(driver, op)
                    if sha:
                        captured_hashes[op] = sha

            try:
                page_html = driver.page_source or ""
            except Exception:
                pass

            cookie_string = self._read_cookies(driver)

        except Exception as exc:
            print(f"[PH Extractor] ERROR: {exc}")
            import traceback
            traceback.print_exc()
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
            print(f"[PH Extractor] Cookies: {cookie_string[:80]}...")
        print("[PH Extractor] ================================================\n")

        if return_html:
            return captured_hashes, cookie_string, user_agent, page_html
        return captured_hashes, cookie_string, user_agent

    def _scroll(self, driver, y: int) -> None:
        """Scroll to a Y position, silently ignoring errors."""
        try:
            driver.execute_script(f"window.scrollTo(0, {y});")
            time.sleep(0.4)
        except Exception:
            pass

    def _scan_bundles_for_hash(self, driver, operation: str) -> str | None:
        """Extract the persisted query sha256Hash via Apollo force-refetch.

        Intercepts window.fetch, triggers an Apollo network-only refetch,
        and polls for the captured hash — all using synchronous execute_script
        calls to avoid SeleniumBase UC's async script timeout limitation.
        """
        print(f"[PH Extractor] Extracting {operation} hash via Apollo force-refetch...")

        # Step 1: install fetch interceptor (synchronous)
        driver.execute_script("""
        window.__phHashCapture = null;
        var op_name = arguments[0];
        var origFetch = window.fetch;
        window.__origFetch = origFetch;
        window.fetch = function() {
            var url = typeof arguments[0] === 'string' ? arguments[0] : '';
            if (url.includes('frontend/graphql')) {
                try {
                    var u    = new URL(url, window.location.href);
                    var xop  = u.searchParams.get('operationName');
                    var xext = u.searchParams.get('extensions');
                    if (xop === op_name && xext) {
                        var ext = JSON.parse(xext);
                        var sha = ext.persistedQuery && ext.persistedQuery.sha256Hash;
                        if (sha) { window.__phHashCapture = sha; }
                    }
                } catch(e) {}
                // Return a mock response so no real network request fires
                return Promise.resolve(
                    new Response(JSON.stringify({data:{}}),
                        {status:200, headers:{'Content-Type':'application/json'}})
                );
            }
            return origFetch.apply(this, arguments);
        };
        """, operation)

        # Step 2: trigger Apollo refetch (synchronous dispatch, result is async)
        driver.execute_script("""
        var op_name = arguments[0];
        try {
            var client = window.__APOLLO_CLIENT__ || window.apolloClient;
            if (!client) return;
            client.queryManager.queries.forEach(function(entry) {
                try {
                    var doc = entry.document;
                    if (!doc) return;
                    var defName = doc.definitions &&
                                  doc.definitions[0] &&
                                  doc.definitions[0].name &&
                                  doc.definitions[0].name.value;
                    if (defName === op_name) {
                        var opts = entry.observableQuery &&
                                   entry.observableQuery.options;
                        if (opts) {
                            client.query(
                                Object.assign({}, opts, {fetchPolicy: 'network-only'})
                            ).catch(function(){});
                        }
                    }
                } catch(e) {}
            });
        } catch(e) {}
        """, operation)

        # Step 3: poll for the captured hash (up to 5 seconds)
        for _ in range(10):
            time.sleep(0.5)
            sha = driver.execute_script("return window.__phHashCapture || null")
            if sha and len(sha) == 64:
                # Restore real fetch
                driver.execute_script(
                    "if (window.__origFetch) window.fetch = window.__origFetch;"
                )
                print(f" [+] (apollo-refetch) {operation} → {sha}")
                return sha

        # Restore real fetch before giving up
        driver.execute_script(
            "if (window.__origFetch) window.fetch = window.__origFetch;"
        )
        print(f"[PH Extractor] Force-refetch: hash not captured after 5s")
        return None

    def _trigger_spa_queries(self, driver) -> None:
        """Scroll + interact to trigger React lazy-loading and GraphQL queries."""
        print("[PH Extractor] Triggering SPA hydration via scroll + interaction...")
        try:
            for y in (600, 1200, 1800, 2400, 0):
                self._scroll(driver, y)

            # Dispatch mouse events on product cards to trigger React state
            driver.execute_script("""
                var cards = document.querySelectorAll(
                    '[data-test="post-item"], a[href*="/posts/"], [class*="post"]'
                );
                if (cards.length > 0) {
                    cards[0].dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
                    cards[0].dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
                }
                // Also try window resize which can trigger re-renders
                window.dispatchEvent(new Event('resize'));
            """)
            time.sleep(1)
        except Exception as e:
            print(f"[PH Extractor] Interaction warning: {e}")

    def _read_cookies(self, driver) -> str:
        """Read all cookies via CDP, falling back to document.cookie."""
        try:
            result = driver.execute_cdp_cmd("Network.getAllCookies", {})
            cookies = result.get("cookies", [])
            if cookies:
                s = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
                print(f"[PH Extractor] Captured {len(cookies)} cookies via CDP.")
                return s
        except Exception as e:
            print(f"[PH Extractor] CDP cookie read failed: {e}")

        try:
            raw = driver.execute_script("return document.cookie") or ""
            if raw:
                print("[PH Extractor] Cookies via document.cookie (fallback).")
                return raw
        except Exception:
            pass
        return ""


# ===========================================================================
# PRODUCT HUNT AUTH MANAGER  (TTL-based session cache)
# ===========================================================================

_PH_SESSION_FILE = Path("storage/ph_session.json")
_PH_SESSION_TTL = timedelta(hours=10)


class ProductHuntAuthManager:
    def __init__(self) -> None:
        self._extractor = ProductHuntHashExtractor()

    def get_session(self) -> tuple[dict[str, str], str, str]:
        if self._is_cache_valid():
            data = self._load()
            if data:
                print("[PH AuthManager] Using cached session.")
                return data.get("hashes", {}), data.get("cookie_str", ""), data.get("user_agent", "")
        print("[PH AuthManager] Cache missing/expired — running extractor.")
        return self._do_extract()

    def force_refresh(self) -> tuple[dict[str, str], str, str]:
        print("[PH AuthManager] Force refresh.")
        self._delete_cache()
        return self._do_extract()

    def _do_extract(self) -> tuple[dict[str, str], str, str]:
        hashes, cookie_str, user_agent = self._extractor.extract()
        self._save(hashes, cookie_str, user_agent)
        if hashes or cookie_str:
            try:
                update_env_file(
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
                return False
        except Exception:
            return False
        return True

    def _save(self, hashes: dict, cookie_str: str, user_agent: str) -> None:
        _PH_SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(_PH_SESSION_FILE, "w", encoding="utf-8") as fh:
                json.dump({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "hashes": hashes,
                    "cookie_str": cookie_str,
                    "user_agent": user_agent,
                }, fh, indent=4)
            print(f"[PH AuthManager] Session saved ({len(hashes)} hashes).")
        except Exception as exc:
            print(f"[PH AuthManager] Failed to save: {exc}")

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
    timeout: int = 120,
    return_html: bool = False,
) -> tuple:
    """Extract Product Hunt GraphQL hashes and session cookies.

    Uses SeleniumBase UC with a virtual display (Linux) or native display
    (macOS).  Chrome runs with headless=False inside Xvfb so Cloudflare
    Turnstile passes fingerprinting checks.

    Returns:
        (hashes_dict, cookie_string, user_agent_string)
        (hashes_dict, cookie_string, user_agent_string, page_html)  if return_html=True
    """
    if not _HAS_SELENIUMBASE:
        raise RuntimeError(
            "seleniumbase is not installed. Run: pip install seleniumbase"
        )

    print("\n=======================================================")
    print("  UC EXTRACTION (SeleniumBase + Xvfb on Linux)         ")
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
                print("[✓] .env updated from extraction.")
            except Exception as exc:
                print(f"[!] Could not update .env: {exc}")

        if return_html:
            return hashes, cookie_str, user_agent, page_html
        return hashes, cookie_str, user_agent

    except Exception as exc:
        logger.error("[extract_hashes] Extraction error: %s", exc)
        import traceback
        traceback.print_exc()
        empty = ({}, "", "")
        return empty + (("",) if return_html else ())


# ===========================================================================
# .env helper
# ===========================================================================

def update_env_file(leaderboard_hash: str = None, cookie_str: str = None) -> None:
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
