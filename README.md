# Product Hunt Scraper

A Python automation pipeline that collects Product Hunt's daily featured product launches, enriches each product with detailed metadata, comments, and reviews, extracts public user profiles, and stores the resulting dataset in MongoDB with idempotency.

---

## Architecture & Features

- **Flat & Simple Structure:** No deeply nested subdirectories; all source files are organized cleanly in the root directory.
- **Stage 1 — Daily Leaderboard:**
  - Queries `LeaderboardDailyPage` with cursor pagination.
  - Automatically targets yesterday's calendar date in Pacific Time (`America/Los_Angeles`).
  - Filters out ads (`__typename == "Ad"`) and retains launch posts (`__typename == "Post"`).
  - Preserves `post_slug` and `product_slug` separately.
- **Stage 2 — Product Enrichment:**
  - `ProductsPageLayout`: Core product overview, tagline, categories, ratings, and awards.
  - `ProductAboutPage`: Media items, makers, hunters, pricing, and links.
  - `ProductBuiltWithPage`: Stack tools and shoutout notes.
  - `ProductPageLaunchingTodayComments`: Launch discussions and nested replies using `postSlug`.
  - `DetailedReviewsPage` & `DetailedReviewsFeedQuery`: Review count gate (skips feed if count is 0) and paginated review feed.
- **Stage 3 — Public User Profiles:**
  - Collects usernames from makers, hunters, commenters, and reviewers.
  - Parses Apollo SSR data from `https://www.producthunt.com/@username`.
  - Safely decodes Base64 social URLs.
- **MongoDB Persistence & Idempotency:**
  - Uses upserts across all collections with unique compound indexes.
  - Interrupted runs can be resumed with `--resume`.
  - Tracks status and statistics in `scraper_runs`.

---

## File Structure

```text
Product-Hunt-Scraper/
├── .env                # Local secrets (MongoDB URI, Cookies, Hashes) [Ignored by git]
├── .env.example        # Environment variable template
├── .gitignore          # Git exclusion rules
├── requirements.txt    # Python dependencies
├── config.py           # Configuration loader & persisted query SHA-256 hashes
├── utils.py            # Pacific time date calculation, safe logging, Base64 decoding
├── database.py         # MongoDB connection, unique indexes, and upsert repositories
├── client.py           # Reusable GraphQL & HTTP client with backoff retries & rate limiting
├── parsers.py          # Parsers for leaderboard, products, comments, reviews, and profiles
├── scraper.py          # Stage 1, 2, and 3 extraction routines
├── main.py             # CLI entry point to run the pipeline
├── validate.py         # Database report & referential integrity checker
├── test_scraper.py     # Unit test suite
└── README.md           # Project documentation
```

---

## Setup & Installation

### 1. Prerequisites
- Python 3.10+
- MongoDB instance (local or MongoDB Atlas)

### 2. Virtual Environment Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration
Copy `.env.example` to `.env` and fill in your connection details:
```bash
cp .env.example .env
```

Example `.env`:
```dotenv
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=product_hunt_scraper

# Product Hunt GraphQL API
PRODUCT_HUNT_GRAPHQL_URL=https://www.producthunt.com/frontend/graphql
PRODUCT_HUNT_LEADERBOARD_HASH=8a8f3bb6637e2cccfdc7898eb071e994f64e6f8e49c73475363da7858d919bd3

# Optional: Cookie for HTML profile extraction
PRODUCT_HUNT_COOKIE=

# Scraper Settings
REQUEST_TIMEOUT_SECONDS=30
MAX_RETRIES=3
REQUEST_DELAY_SECONDS=1.0
LOG_LEVEL=INFO
```

---

## Usage

### Run Daily Scraper (Scheduled / Manual)
Pulls featured launches for yesterday in Pacific Time:
```bash
.venv/bin/python main.py
```

### Run for a Specific Date
```bash
.venv/bin/python main.py --date 2026-11-04
```

### Run with a Test Limit
Limit the number of products to enrich (e.g. first 5 launches):
```bash
.venv/bin/python main.py --date 2026-11-04 --limit 5
```

### Resume an Interrupted Run
Skips products that have already been enriched in MongoDB:
```bash
.venv/bin/python main.py --date 2026-11-04 --resume
```

### Inspect Database Data & Statistics
Print a live report of records saved in MongoDB:
```bash
.venv/bin/python validate.py
```

---

## Running Tests

Run the full pytest test suite:
```bash
.venv/bin/pytest test_scraper.py
```
All unit tests run offline using mock fixtures and verify date calculations, parsers, pagination, and database upserts.
