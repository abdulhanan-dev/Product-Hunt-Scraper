"""
Refresh ALL GraphQL operation hashes by navigating relevant pages and
forcing Apollo network-only refetches to capture the current sha256Hash
for each persisted query.

Run: .venv/bin/python3 refresh_hashes.py
"""
from __future__ import annotations
import time, json, re
from seleniumbase import Driver

# Operations we need and which URL triggers each query
OPERATIONS = {
    "LeaderboardDailyPage":          "https://www.producthunt.com/leaderboard/daily/2026/11/08",
    "ProductsPageLayout":            "https://www.producthunt.com/products/openai",
    "ProductAboutPage":              "https://www.producthunt.com/products/openai",
    "ProductBuiltWithPage":          "https://www.producthunt.com/products/openai",
    "ProductPageLaunchingTodayComments": "https://www.producthunt.com/posts/chatgpt-images-2-6-8",
    "DetailedReviewsPage":           "https://www.producthunt.com/products/openai/reviews",
    "DetailedReviewsFeedQuery":      "https://www.producthunt.com/products/openai/reviews",
}

# Install fetch interceptor JS — captures ALL graphql operation hashes
INTERCEPTOR_JS = """
window.__phHashes = window.__phHashes || {};
var _origFetch = window.__origFetch || window.fetch;
window.__origFetch = _origFetch;
window.fetch = function() {
    var url = typeof arguments[0] === 'string' ? arguments[0]
              : (arguments[0] && arguments[0].url ? arguments[0].url : '');
    if (url && url.includes('frontend/graphql')) {
        try {
            var u = new URL(url, window.location.href);
            var op  = u.searchParams.get('operationName');
            var ext = u.searchParams.get('extensions');
            if (op && ext) {
                var parsed = JSON.parse(ext);
                var sha = parsed.persistedQuery && parsed.persistedQuery.sha256Hash;
                if (sha) window.__phHashes[op] = sha;
            }
        } catch(e) {}
    }
    return _origFetch.apply(this, arguments);
};
"""

# Force Apollo to make network-only refetch for a specific operation
FORCE_REFETCH_JS = """
var op_name = arguments[0];
try {
    var client = window.__APOLLO_CLIENT__ || window.apolloClient;
    if (!client) return;
    var _of = window.__origFetch || window.fetch;
    // Temporarily point fetch to our interceptor mock for this op
    var prev = window.fetch;
    window.fetch = function() {
        var url = typeof arguments[0] === 'string' ? arguments[0] : '';
        if (url.includes('frontend/graphql')) {
            try {
                var u = new URL(url, window.location.href);
                var xop = u.searchParams.get('operationName');
                var xext = u.searchParams.get('extensions');
                if (xop && xext) {
                    var ext = JSON.parse(xext);
                    var sha = ext.persistedQuery && ext.persistedQuery.sha256Hash;
                    if (sha) window.__phHashes[xop] = sha;
                }
            } catch(e) {}
            return Promise.resolve(new Response(JSON.stringify({data:{}}),
                {status:200, headers:{'Content-Type':'application/json'}}));
        }
        return _of.apply(this, arguments);
    };
    client.queryManager.queries.forEach(function(entry) {
        try {
            var doc = entry.document;
            if (!doc) return;
            var defName = doc.definitions && doc.definitions[0] &&
                          doc.definitions[0].name && doc.definitions[0].name.value;
            if (defName === op_name) {
                var opts = entry.observableQuery && entry.observableQuery.options;
                if (opts) {
                    client.query(Object.assign({}, opts, {fetchPolicy:'network-only'}))
                          .catch(function(){});
                }
            }
        } catch(e) {}
    });
    setTimeout(function() { window.fetch = prev; }, 3000);
} catch(e) {}
"""


def cf_clear(driver, timeout=45):
    for _ in range(timeout // 4):
        t = driver.execute_script("return document.title") or ""
        if "just a moment" in t.lower():
            try: driver.uc_gui_click_captcha()
            except: pass
            time.sleep(4)
        elif "product hunt" in t.lower() or "product" in t.lower():
            return True
        time.sleep(1.5)
    return False


def run():
    driver = Driver(browser="chrome", uc=True, headless=False,
                    no_sandbox=True, headless2=True, log_cdp=True,
                    window_size="1920,1080")
    driver.set_page_load_timeout(30)
    driver.execute_cdp_cmd("Network.enable", {})

    captured = {}

    try:
        # 1. Homepage to clear CF
        print("Loading homepage...")
        driver.get("https://www.producthunt.com/")
        cf_clear(driver)
        driver.execute_script(INTERCEPTOR_JS)

        # Track which URL we're already on to avoid redundant navigations
        current_url = "https://www.producthunt.com/"
        visited_urls = set()

        ops_by_url: dict[str, list[str]] = {}
        for op, url in OPERATIONS.items():
            ops_by_url.setdefault(url, []).append(op)

        for url, ops in ops_by_url.items():
            if url != current_url:
                print(f"\nNavigating to {url}...")
                driver.get(url)
                cf_clear(driver, timeout=30)
                time.sleep(3)
                driver.execute_script(INTERCEPTOR_JS)
                current_url = url

            # Drain CDP logs first
            _drain_cdp(driver, captured)
            _drain_js(driver, captured)

            # Force refetch for each op on this page
            for op in ops:
                if op not in captured:
                    print(f"  Force-refetching {op}...")
                    driver.execute_script(FORCE_REFETCH_JS, op)
                    time.sleep(2.5)
                    _drain_cdp(driver, captured)
                    _drain_js(driver, captured)
                    if op in captured:
                        print(f"  ✓ {op} → {captured[op][:16]}...")
                    else:
                        print(f"  ~ {op} not captured yet")

        # Final drains
        _drain_cdp(driver, captured)
        _drain_js(driver, captured)

    finally:
        driver.quit()

    print("\n=== CAPTURED HASHES ===")
    for op, sha in captured.items():
        print(f"  {op}: {sha}")

    return captured


def _drain_cdp(driver, captured):
    from urllib.parse import parse_qs, urlparse
    try:
        logs = driver.get_log("performance")
    except Exception:
        return
    for entry in logs:
        try:
            msg = json.loads(entry["message"])["message"]
            if msg.get("method") != "Network.requestWillBeSent": continue
            url = msg.get("params", {}).get("request", {}).get("url", "")
            if "frontend/graphql" not in url: continue
            qs = parse_qs(urlparse(url).query)
            op  = qs.get("operationName", [None])[0]
            ext = qs.get("extensions", [None])[0]
            if op and ext:
                sha = json.loads(ext).get("persistedQuery", {}).get("sha256Hash")
                if sha and op not in captured:
                    captured[op] = sha
                    print(f"  [CDP] {op} → {sha}")
        except: pass


def _drain_js(driver, captured):
    try:
        js_hashes = driver.execute_script("return window.__phHashes || {}")
        for op, sha in (js_hashes or {}).items():
            if op and sha and op not in captured:
                captured[op] = sha
                print(f"  [JS]  {op} → {sha}")
    except: pass


if __name__ == "__main__":
    hashes = run()

    if not hashes:
        print("No hashes captured — check browser output")
        exit(1)

    # Update config.py with fresh hashes
    import os
    config_path = os.path.join(os.path.dirname(__file__), "config.py")
    with open(config_path) as f:
        content = f.read()

    HASH_MAP = {
        "HASH_LEADERBOARD_DAILY":   "LeaderboardDailyPage",
        "HASH_PRODUCTS_PAGE_LAYOUT":"ProductsPageLayout",
        "HASH_PRODUCT_ABOUT_PAGE":  "ProductAboutPage",
        "HASH_PRODUCT_BUILT_WITH_PAGE": "ProductBuiltWithPage",
        "HASH_PRODUCT_COMMENTS":    "ProductPageLaunchingTodayComments",
        "HASH_DETAILED_REVIEWS_PAGE": "DetailedReviewsPage",
        "HASH_DETAILED_REVIEWS_FEED": "DetailedReviewsFeedQuery",
    }

    updated = 0
    for const_name, op_name in HASH_MAP.items():
        sha = hashes.get(op_name)
        if not sha:
            print(f"  MISSING: {op_name}")
            continue
        # Replace the constant value in config.py
        new_line = f'{const_name} = "{sha}"'
        content = re.sub(rf'^{const_name}\s*=\s*"[^"]*"', new_line,
                         content, flags=re.MULTILINE)
        updated += 1
        print(f"  Updated {const_name} = {sha[:16]}...")

    with open(config_path, "w") as f:
        f.write(content)

    print(f"\nconfig.py updated with {updated} hashes.")
