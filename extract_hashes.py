"""Helper script to launch a visible Chrome browser and automatically extract
Product Hunt GraphQL persisted query sha256 hashes and cookies.

You can click any Cloudflare challenge manually in the visible browser window.
"""

import json
import time
from urllib.parse import parse_qs, unquote, urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from utils import get_logger

logger = get_logger("extract_hashes")


def extract_hashes_and_cookies(
    url: str = "https://www.producthunt.com/leaderboard/daily", timeout: int = 60
) -> tuple[dict[str, str], str]:
    """Launch visible browser, wait for user to interact, and capture GraphQL hashes.

    Returns:
        tuple: (captured_hashes_dict, cookie_string)
    """
    print("\n=======================================================")
    print("      PRODUCT HUNT HASH & COOKIE EXTRACTION HELPER     ")
    print("=======================================================")
    print("Launching visible Chrome browser...")
    print("-> If a Cloudflare challenge appears, please solve it directly in the browser window.")
    print("-> Once the page loads, GraphQL hashes and cookies will be captured automatically.\n")

    chrome_options = Options()
    # Visible browser window
    chrome_options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--start-maximized")

    driver = None
    captured_hashes = {}
    captured_cookies = ""

    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)

        start_time = time.time()
        print(f"Monitoring network traffic for up to {timeout} seconds...")

        while time.time() - start_time < timeout:
            # 1. Read network performance logs
            logs = driver.get_log("performance")
            for entry in logs:
                try:
                    msg = json.loads(entry["message"])["message"]
                    method = msg.get("method")
                    if method == "Network.requestWillBeSent":
                        req = msg.get("params", {}).get("request", {})
                        req_url = req.get("url", "")

                        if "frontend/graphql" in req_url:
                            # Check URL query parameters
                            parsed = urlparse(req_url)
                            qs = parse_qs(parsed.query)

                            op_name = qs.get("operationName", [None])[0]
                            extensions_raw = qs.get("extensions", [None])[0]

                            if op_name and extensions_raw:
                                ext = json.loads(extensions_raw)
                                sha = ext.get("persistedQuery", {}).get("sha256Hash")
                                if sha and op_name not in captured_hashes:
                                    captured_hashes[op_name] = sha
                                    print(f" [+] Captured Operation: {op_name} -> {sha}")

                            # Check POST body if any
                            post_data = req.get("postData")
                            if post_data:
                                try:
                                    post_json = json.loads(post_data)
                                    op_name = post_json.get("operationName")
                                    sha = (
                                        post_json.get("extensions", {})
                                        .get("persistedQuery", {})
                                        .get("sha256Hash")
                                    )
                                    if op_name and sha and op_name not in captured_hashes:
                                        captured_hashes[op_name] = sha
                                        print(f" [+] Captured Operation (POST): {op_name} -> {sha}")
                                except Exception:
                                    pass

                except Exception:
                    continue

            # Check if Leaderboard hash is found
            if "LeaderboardDailyPage" in captured_hashes:
                print("\n[✓] Successfully captured LeaderboardDailyPage hash!")
                break

            time.sleep(1.0)

        # 2. Extract cookies
        cookies = driver.get_cookies()
        if cookies:
            captured_cookies = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
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

    # Offer to update .env
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
    return captured_hashes, captured_cookies


def update_env_file(leaderboard_hash: str = None, cookie_str: str = None) -> None:
    """Helper to update PRODUCT_HUNT_LEADERBOARD_HASH and PRODUCT_HUNT_COOKIE in .env."""
    lines = []
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


if __name__ == "__main__":
    extract_hashes_and_cookies()

