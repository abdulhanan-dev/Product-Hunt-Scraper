"""Check what's actually in the ApolloSSR data for Xavier's profile page."""
from seleniumbase import Driver
import time, json, re

driver = Driver(browser='chrome', uc=True, headless=False, no_sandbox=True,
                headless2=True, window_size='1920,1080')
driver.set_page_load_timeout(25)

driver.get('https://www.producthunt.com/')
for _ in range(6):
    t = driver.execute_script('return document.title') or ''
    if 'just a moment' in t.lower():
        try: driver.uc_gui_click_captcha()
        except: pass
        time.sleep(4)
    elif 'product hunt' in t.lower():
        break
    time.sleep(2)

driver.get('https://www.producthunt.com/@0x47xavier')
time.sleep(5)

html = driver.page_source
driver.quit()

# Parse with our updated function
from parsers import parse_profile_ssr
result = parse_profile_ssr(html, '0x47xavier')
print("Parsed result:")
print(json.dumps(result, indent=2, default=str))

# Also manually search the HTML for social links
print("\n\nSearching HTML for 'links', 'encodedUrl', 'twitterUsername', 'websiteUrl':")
for term in ['encodedUrl', 'twitterUsername', 'websiteUrl', '"links"']:
    idx = html.find(term)
    if idx > -1:
        print(f"\n  '{term}' at {idx}:")
        print(f"  {repr(html[max(0,idx-100):idx+200])[:300]}")
    else:
        print(f"\n  '{term}': NOT FOUND in page HTML")
