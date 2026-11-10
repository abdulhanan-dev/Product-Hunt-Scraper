"""
Repopulate MongoDB profiles by fetching each PH profile page inside
a single authenticated browser session, then parsing with parse_profile_ssr.

Run once after a fresh scrape:
    .venv/bin/python3 repopulate_profiles.py
"""
from __future__ import annotations
import time
from seleniumbase import Driver
from database import get_db, upsert_profile
from parsers import parse_profile_ssr


def run(delay: float = 1.5):
    db = get_db()
    usernames = [p["username"] for p in db.profiles.find({}, {"username": 1, "_id": 0})]
    total = len(usernames)
    print(f"[repopulate] {total} profiles to fetch")

    driver = Driver(
        browser="chrome", uc=True, headless=False,
        no_sandbox=True, headless2=True, window_size="1920,1080",
    )
    driver.set_page_load_timeout(20)

    try:
        # ── Clear Cloudflare on homepage ──
        driver.get("https://www.producthunt.com/")
        for _ in range(6):
            t = driver.execute_script("return document.title") or ""
            if "just a moment" in t.lower():
                print("[repopulate] CF on homepage — clicking...")
                try:
                    driver.uc_gui_click_captcha()
                except Exception:
                    pass
                time.sleep(4)
            elif "product hunt" in t.lower():
                break
            time.sleep(2)
        print(f"[repopulate] Homepage ready: {driver.execute_script('return document.title')}")

        ok = fail = skip = 0

        for i, username in enumerate(usernames, 1):
            try:
                driver.get(f"https://www.producthunt.com/@{username}")
                time.sleep(delay)

                page_title = driver.execute_script("return document.title") or ""

                # CF still showing? click once and retry
                if "just a moment" in page_title.lower():
                    try:
                        driver.uc_gui_click_captcha()
                    except Exception:
                        pass
                    time.sleep(4)
                    page_title = driver.execute_script("return document.title") or ""

                # 404 or redirect
                if "not found" in page_title.lower() or driver.execute_script("return window.location.pathname") == "/404":
                    print(f"  [{i}/{total}] 404 @{username}")
                    skip += 1
                    continue

                html = driver.page_source
                parsed = parse_profile_ssr(html, username)

                if parsed and (parsed.get("headline") or parsed.get("about") or parsed.get("avatar_url") or parsed.get("social_links")):
                    upsert_profile(db, parsed)
                    slinks = list(parsed.get("social_links", {}).keys())
                    print(f"  [{i}/{total}] ✓ @{username} | {parsed['name']} | {parsed['headline'][:50]} | links={slinks}")
                    ok += 1
                else:
                    print(f"  [{i}/{total}] ~ @{username} — no SSR data (title: {page_title[:60]})")
                    skip += 1

            except Exception as exc:
                print(f"  [{i}/{total}] ! @{username}: {exc}")
                fail += 1

        print(f"\n[repopulate] ✓ {ok} fetched  ~ {skip} skipped  ✗ {fail} errors")

    finally:
        try:
            driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    run()
