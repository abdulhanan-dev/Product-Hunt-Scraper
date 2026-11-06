"""Tool to inspect a product's complete scraped data and compare with the live website."""

import argparse
import json
from config import settings
from database import get_db


def inspect_product(slug: str = "") -> None:
    """Fetch and display all scraped records for a product across all collections."""
    db = get_db()

    # Find product
    if slug:
        product = db.products.find_one({"slug": slug}, {"_id": 0})
        if not product:
            product = db.products.find_one({"name": {"$regex": f"^{slug}$", "$options": "i"}}, {"_id": 0})
    else:
        product = db.products.find_one({}, {"_id": 0}, sort=[("updated_at", -1)])

    if not product:
        print(f"\n[!] No product found matching '{slug}'.")
        available = [p.get("slug") for p in db.products.find({}, {"slug": 1}).limit(10)]
        print(f"Available products in DB: {available}\n")
        return

    pid = product.get("product_id")
    pslug = product.get("slug")

    # Fetch associated records
    launch = db.launches.find_one({"$or": [{"product_id": pid}, {"product_slug": pslug}]}, {"_id": 0})
    built_with = list(db.product_built_with.find({"product_id": pid}, {"_id": 0}))
    comments = list(db.comments.find({"product_id": pid}, {"_id": 0}))
    reviews = list(db.reviews.find({"product_id": pid}, {"_id": 0}))

    print("\n" + "=" * 65)
    print(f"       PRODUCT VERIFICATION REPORT: {product.get('name', 'Unknown')}")
    print("=" * 65)
    print(f"Live Website URL: https://www.producthunt.com/products/{pslug}")
    if launch and launch.get("post_slug"):
        print(f"Launch Post URL:  https://www.producthunt.com/posts/{launch.get('post_slug')}")
    print("-" * 65)

    print("\n[1] LEADERBOARD LAUNCH INFO:")
    if launch:
        print(f"  • Daily Rank:      #{launch.get('rank', 'N/A')}")
        print(f"  • Launch Day Score:{launch.get('score', 0)} upvotes")
        print(f"  • Tagline:         {launch.get('tagline', '')}")
        print(f"  • Topics:          {', '.join(launch.get('topics', []))}")
        print(f"  • Target Date:     {launch.get('target_date', '')}")
    else:
        print("  • No launch record found.")

    print("\n[2] CORE PRODUCT DETAILS:")
    print(f"  • Product ID:      {pid}")
    print(f"  • Tagline:         {product.get('tagline', '')}")
    print(f"  • Description:     {product.get('description', '')[:120]}...")
    print(f"  • Categories:      {', '.join(product.get('categories', []))}")
    print(f"  • Pricing Type:    {product.get('pricing_type', 'N/A')}")
    print(f"  • Website Link:    {product.get('primary_link', product.get('social_links', {}).get('website', 'N/A'))}")
    ratings = product.get("ratings", {})
    print(f"  • Reviews Rating:  ⭐ {ratings.get('average', 0)} ({ratings.get('count', 0)} reviews)")
    if product.get("awards"):
        print(f"  • Awards:          {product.get('awards')}")

    print(f"\n[3] BUILT-WITH STACK ({len(built_with)} tools found):")
    for bw in built_with[:5]:
        note = f" — '{bw.get('shoutout_note')}'" if bw.get("shoutout_note") else ""
        print(f"  • {bw.get('related_product_name')} ({bw.get('related_product_slug')}){note}")
    if len(built_with) > 5:
        print(f"    ... and {len(built_with) - 5} more tools")

    print(f"\n[4] COMMENTS & DISCUSSIONS ({len(comments)} saved):")
    for c in comments[:3]:
        author = c.get("author_name") or c.get("author_username")
        votes = c.get("votes_count", 0)
        body = c.get("body_html", "")[:90].replace("<p>", "").replace("</p>", "").strip()
        print(f"  • @{c.get('author_username')} ({author}) [{votes} votes]: {body}...")
    if len(comments) > 3:
        print(f"    ... and {len(comments) - 3} more comments")

    print(f"\n[5] DETAILED REVIEWS ({len(reviews)} saved):")
    for r in reviews[:3]:
        user = r.get("author_username", "anonymous")
        rating = r.get("rating", "N/A")
        feedback = r.get("feedback", "")[:90].strip()
        pros = f" | Pros: {r.get('pros')}" if r.get("pros") else ""
        print(f"  • @{user} rated {rating}/5: '{feedback}'{pros}")
    if len(reviews) > 3:
        print(f"    ... and {len(reviews) - 3} more reviews")

    print("\n" + "=" * 65 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect scraped product data")
    parser.add_argument("--slug", type=str, default="", help="Product slug (e.g. floot, prelulu)")
    args = parser.parse_args()
    inspect_product(slug=args.slug)

