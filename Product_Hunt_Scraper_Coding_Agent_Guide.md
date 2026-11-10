
# Product Hunt Scraper

## Project Overview and Coding-Agent Implementation Specification


**Document purpose:** Use this file as the project brief and
implementation guide for a coding agent.\
**Project type:** Automated web-data extraction pipeline\
**Primary language:** Python\
**Database:** MongoDB\
**Primary data source:** Product Hunt

------------------------------------------------------------------------

## 1. Project Summary

Build a Python-based scraper that automatically collects Product Hunt's
daily product launches and enriches each launch with detailed product
information, launch discussions, detailed reviews, and public profile
information for associated people.

The scraper should:

1.  Retrieve the previous day's featured daily leaderboard.
2.  Extract every available launch/product entry from the leaderboard,
    including all cursor-paginated pages.
3.  For each product, retrieve detailed product information, media,
    people, pricing, built-with information, comments, and detailed
    reviews.
4.  Collect public profile information for people discovered during
    product extraction.
5.  Store normalized data in MongoDB using separate collections for
    large or independently paginated records.
6.  Store raw source responses for debugging and traceability where
    appropriate.
7.  Track each run and support safe retries, idempotent updates, and
    resuming incomplete work.

The result is a reusable dataset of Product Hunt launches, products,
discussions, reviews, and associated public profiles. It can later
support search, analytics, reporting, or other applications.

> Important: The current scope is the `featured=true` daily leaderboard.
> Do not assume that all leaderboard modes are included.

------------------------------------------------------------------------

## 2. High-Level Workflow

``` text
Start scheduled run
       |
       v
Calculate yesterday's date in America/Los_Angeles
       |
       v
Fetch featured daily leaderboard
       |
       v
Paginate through all leaderboard pages
       |
       v
Save launch records to MongoDB
       |
       v
For each launch/product
       |
       +--> Fetch product layout/details
       |
       +--> Fetch product about/media/makers/pricing
       |
       +--> Fetch built-with/review-related product data
       |
       +--> Fetch launch comments and replies
       |
       +--> Check detailed review count
       |        |
       |        +--> If count > 0, fetch all review pages
       |        |
       |        +--> If count = 0, skip review feed
       |
       +--> Collect associated usernames
                    |
                    v
             Fetch public profiles
                    |
                    v
             Save normalized records
                    |
                    v
             Validate, log, and finish run
```

### Main stages

-   **Stage 1 --- Leaderboard:** Discover the launches for the target
    date.
-   **Stage 2 --- Product enrichment:** Retrieve detailed product data,
    comments, and reviews.
-   **Stage 3 --- Profile enrichment:** Retrieve public profiles for
    associated users.
-   **Finalization:** Validate saved records, record run status, and
    report failures.

------------------------------------------------------------------------

## 3. Stage 1: Daily Leaderboard Extraction

### Objective

Retrieve the previous day's featured Product Hunt leaderboard and
extract every available product launch.

### Date handling

-   Use the IANA timezone `America/Los_Angeles`.
-   Calculate the previous calendar day in that timezone.
-   Do not use a fixed UTC offset because daylight-saving changes affect
    Pacific time.
-   Schedule the daily job after approximately 02:00 Pacific time,
    subject to operational testing.

### GraphQL operation

-   Operation name: `LeaderboardDailyPage`
-   Required variable: `featured=true`
-   Sort: `DAILY_RANK`
-   Date: calculated previous Pacific calendar day
-   Pagination: cursor-based; continue until no next page is available.

The exact GraphQL endpoint, headers, and complete variable shape must be
copied from a real browser Network request. Do not invent missing
request fields.

### Extracted fields

For each leaderboard entry, capture the available fields:

-   `__typename`
-   Rank
-   Product/launch name
-   Tagline
-   Score or points
-   Comment count
-   Topics
-   Post ID
-   Post slug
-   Product ID
-   Product slug
-   Logo UUID or image identifier
-   Shortened URL
-   `featuredAt`
-   Weekly rank
-   Monthly rank

### Filtering and pagination

-   Keep entries whose `__typename` is `Post`.
-   Skip entries whose `__typename` is `Ad`.
-   Continue cursor pagination until the response indicates there is no
    next page.
-   Preserve the original post slug and product slug as separate fields.
-   Do not treat post IDs and product IDs as interchangeable.

### Output

Save each leaderboard entry to the `launches` collection. Use a stable
unique key such as the combination of target date and post ID.

------------------------------------------------------------------------

## 4. Stage 2: Product Enrichment

For every launch discovered in Stage 1, retrieve the product's detailed
data.

### 4.1 Product layout/details

-   Operation: `ProductsPageLayout`
-   Persisted query SHA-256:
    `2c1bdf022d6d3945357e8933d65d7b1d76435e973d9046b06405928ba5225ca3`
-   Known variables:
    -   Product slug
    -   `includeAlternatives=true`
    -   `launchSlug=null`

Capture available fields including:

-   Product identity and core information
-   Description and tagline
-   Categories
-   Review ratings and review counts
-   `proConTags`
-   Launch ranking and scores
-   `latestLaunch` information and topics
-   Awards
-   Y Combinator information
-   `postsCount`
-   `firstPost`
-   Discussion forum information
-   Social links

Keep product-level review counts distinct from `detailedReviewsCount`.

### 4.2 Product about page

-   Operation: `ProductAboutPage`
-   Persisted query SHA-256:
    `13c8d08dec1bf9edf9ecd53237ab781429bc8fea8016ca025ec9ac82fc6044bb`

Capture available fields including:

-   Product media
-   Makers
-   Hunter
-   Pricing type
-   Primary link

### 4.3 Built-with information

-   Operation: `ProductBuiltWithPage`
-   Persisted query SHA-256:
    `3d3ad8ce5c601c4eeb6bd27a5bd05c28d0809e80540e3082a14db866403b73b1`

Capture available `authoredDetailedReviews` nodes, including:

-   `shoutoutNote`
-   Related product information

Do not assume this data is identical to the product's own reviews.

### 4.4 Comments and launch discussions

-   Operation: `ProductPageLaunchingTodayComments`
-   Persisted query SHA-256:
    `21c7f3277deb31948f8ba9f378076d8ce5aa71d201ab4292de32bba4ac5cb0b7`

**Important identifier rule:** The comments operation uses the
leaderboard `node.slug` (the launch post slug), not the product slug.

Capture available fields:

-   Comment ID
-   Parent comment ID
-   `bodyHtml`
-   `votesCount`
-   `createdAt`
-   URL
-   Badges
-   `isPinned`
-   Author details
-   Nested replies

Pagination requirements:

-   Retrieve page 1 and continue until `hasNextPage=false`.
-   Verify the exact page-2 request behavior using a real captured
    Network request.
-   Verify whether nested replies have their own pagination.
-   Do not guess cursor/page variables or reply pagination behavior.
-   Deduplicate comments by comment ID.

### 4.5 Detailed reviews

First, retrieve the detailed review count:

-   Operation: `DetailedReviewsPage`
-   Persisted query SHA-256:
    `4ad0fcf36959ef43b571d19a2e9c022352956b141b44b12327552dcd520c543d`

Read `detailedReviewsCount`.

-   If the count is zero, skip the detailed review feed.
-   If the count is greater than zero, retrieve all review pages.

Review feed:

-   Operation: `DetailedReviewsFeedQuery`
-   Persisted query SHA-256:
    `10f4714cc0f69c7edad99af5edd7cfe6405edd347b67cb161ce766ba474f2f37`

Capture available fields:

-   Review ID
-   Review type
-   Creation date
-   Ratings
-   Feedback
-   Question-and-answer responses
-   Selected pros and cons
-   Alternative products
-   Vote count
-   Author information
-   Replies

Pagination requirements:

-   Continue through `reviewsPage` until `hasNextPage=false`.
-   Deduplicate by review ID.
-   Preserve nested reply information or store replies separately, using
    a consistent schema.

------------------------------------------------------------------------

## 5. Stage 3: Public Profile Extraction

### Objective

Collect public profile information for usernames discovered in product
data, such as makers, hunters, reviewers, and other associated users.

### Profile URL

``` text
https://www.producthunt.com/@{username}
```

### Extraction method

The profile page contains embedded `ApolloSSRDataTransport` script data.
Parse the relevant entries for:

-   `ProfileLayoutQuery`
-   `ProfileAboutPage`

Extract the relevant `value.data.profile` object.

### Profile fields

Capture available fields including:

-   User ID and username
-   Name and identity information
-   Maker status
-   Verified status
-   Counts and activity statistics
-   Streak
-   KittyCoin values and rankings
-   Selected byline
-   About text
-   Account creation date
-   Badges
-   Votes
-   Badge groups
-   Voted posts
-   New products
-   Work information
-   Social links

Some social links contain Base64-encoded `encodedUrl` values. Decode
these values safely.

### Parsing safety

-   JavaScript `undefined` values may appear in embedded data.
-   Normalize unsupported values to `null` using a safe parsing
    approach.
-   Do not perform broad text replacements that could modify content
    inside quoted strings.
-   Handle missing profile data gracefully.
-   Avoid fetching the same username repeatedly within a run.
-   Use a stable profile identifier where available; otherwise use
    normalized username.

------------------------------------------------------------------------

## 6. GraphQL and HTTP Request Requirements

### Request pattern

The captured GraphQL requests use persisted queries. The expected
general pattern is:

-   HTTP method: currently expected to be GET; confirm from the browser
    Network request.
-   GraphQL endpoint: must be copied exactly from Network \> Headers.
-   Query parameters:
    -   `operationName`
    -   URL-encoded JSON `variables`
    -   `extensions` containing persisted-query version and SHA-256 hash

Typical persisted-query extension structure:

``` json
{
  "persistedQuery": {
    "version": 1,
    "sha256Hash": "OPERATION_HASH"
  }
}
```

### Authentication and headers

-   Copy the exact required headers from a successful browser request.
-   The user will provide the bearer token locally.
-   Store secrets in an environment file such as `.env`.
-   Never hardcode tokens in source code.
-   Never commit `.env` to version control.
-   Never log authorization headers or tokens.
-   Confirm whether cookies or additional headers are required.

### HTTP client

Use Python `httpx` for HTTP requests.

Implement a reusable GraphQL client that supports:

-   Request construction
-   URL parameter encoding
-   Authentication headers
-   Timeouts
-   Retry handling for transient errors
-   Rate limiting and request delays
-   Response status validation
-   JSON parsing
-   Structured error logging
-   Optional raw-response capture

Do not silently treat GraphQL errors as successful responses. Inspect
both HTTP errors and GraphQL `errors` in the response body.

------------------------------------------------------------------------

## 7. MongoDB Data Model

### Why MongoDB?

The source data is nested and variable:

-   Products have different numbers of comments and reviews.
-   Some products have no detailed reviews.
-   Profiles may have different numbers of badges, links, and associated
    products.
-   API response structures contain nested objects and arrays.

MongoDB's document model is suitable for this flexible data.

However, do not put every record into one enormous product document.
Keep large or independently paginated datasets in separate collections.

### Proposed collections

  -------------------------------------------------------------------------
  Collection              Purpose                 Suggested unique key
  ----------------------- ----------------------- -------------------------
  `scraper_runs`          Run metadata, status,   `run_id`
                          progress, errors        

  `launches`              Daily leaderboard       `target_date + post_id`
                          entries                 

  `products`              Main product details    `product_id`

  `product_media`         Product images, videos, Stable media ID or
                          and media               compound key

  `product_people`        Product-to-person       Product ID + user
                          relationships           ID/username + role

  `product_built_with`    Built-with and related  Stable source ID or
                          product records         compound key

  `comments`              Launch comments and     `comment_id`
                          replies                 

  `reviews`               Detailed product        `review_id`
                          reviews                 

  `review_replies`        Optional separate       Reply ID
                          review reply records    

  `profiles`              Public user profile     User ID or normalized
                          data                    username

  `raw_responses`         Original API response   Request fingerprint or
                          records/metadata        generated ID
  -------------------------------------------------------------------------

The list is a proposed design. The implementation may embed small arrays
(for example, social links or categories) inside product/profile
documents where that is simpler and appropriate.

### Relationships

Use IDs as references between collections:

-   `launches.product_id` references `products.product_id`.
-   `comments.product_id` identifies the product associated with a
    comment.
-   `comments.post_slug` preserves the launch post context.
-   `reviews.product_id` identifies the reviewed product.
-   `product_people.product_id` and `product_people.user_id` connect
    products to people.
-   `profiles.user_id` or normalized username identifies a profile.

Do not assume that a post slug and product slug are the same.

### Example product document

``` json
{
  "product_id": "12345",
  "name": "Example AI",
  "tagline": "AI-powered productivity tool",
  "description": "A tool that helps users automate tasks.",
  "categories": [
    "Artificial Intelligence",
    "Productivity"
  ],
  "pricing_type": "Freemium",
  "ratings": {
    "average": 4.8,
    "count": 120
  },
  "social_links": {
    "website": "https://example.com"
  },
  "updated_at": "2026-11-06T00:00:00Z"
}
```

This is an illustrative schema, not a literal Product Hunt API response.

### Example comment document

``` json
{
  "comment_id": "comment_001",
  "product_id": "12345",
  "post_slug": "example-ai-launch",
  "parent_comment_id": null,
  "body_html": "This product looks useful!",
  "votes_count": 15,
  "author_username": "john",
  "created_at": "2026-11-05T10:00:00Z"
}
```

### Idempotency and indexes

Use MongoDB upserts so rerunning the scraper updates existing records
instead of creating duplicates.

Create unique indexes for:

-   `launches`: compound unique index on `target_date` and `post_id`
-   `products`: unique index on `product_id`
-   `comments`: unique index on `comment_id`
-   `reviews`: unique index on `review_id`
-   `profiles`: unique index on stable `user_id` where available,
    otherwise normalized username
-   Other collections: use stable source IDs or suitable compound keys.

Create additional non-unique indexes for frequently queried
relationships, such as `product_id`, `post_slug`, `username`, and
`target_date`.

### Raw response storage

Keep original responses for debugging and traceability, but avoid
creating unnecessarily huge MongoDB documents.

For large responses, consider saving compressed JSON files or
object-storage files and storing their path, hash, operation name,
request metadata, and timestamp in `raw_responses`.

Do not store authentication secrets in raw request metadata.

------------------------------------------------------------------------

## 8. Suggested Python Project Structure

Use a modular structure so each scraper stage can be developed and
tested independently.

``` text
product-hunt-scraper/
│
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
│
├── config/
│   ├── settings.py
│   └── operations.py
│
├── src/
│   └── product_hunt_scraper/
│       ├── __init__.py
│       ├── main.py
│       │
│       ├── core/
│       │   ├── graphql_client.py
│       │   ├── http_client.py
│       │   ├── auth.py
│       │   ├── date_utils.py
│       │   ├── rate_limiter.py
│       │   └── exceptions.py
│       │
│       ├── scrapers/
│       │   ├── leaderboard.py
│       │   ├── product_details.py
│       │   ├── product_about.py
│       │   ├── product_built_with.py
│       │   ├── comments.py
│       │   ├── reviews.py
│       │   └── profiles.py
│       │
│       ├── parsers/
│       │   ├── leaderboard_parser.py
│       │   ├── product_parser.py
│       │   ├── comments_parser.py
│       │   ├── reviews_parser.py
│       │   └── profile_parser.py
│       │
│       ├── database/
│       │   ├── mongo.py
│       │   ├── indexes.py
│       │   └── repositories/
│       │       ├── launches.py
│       │       ├── products.py
│       │       ├── comments.py
│       │       ├── reviews.py
│       │       └── profiles.py
│       │
│       ├── pipeline/
│       │   ├── stage_1_leaderboard.py
│       │   ├── stage_2_products.py
│       │   ├── stage_3_profiles.py
│       │   └── runner.py
│       │
│       └── utils/
│           ├── logging.py
│           ├── normalization.py
│           ├── encoding.py
│           └── validation.py
│
├── storage/
│   ├── raw/
│   ├── processed/
│   └── exports/
│
├── tests/
│   ├── fixtures/
│   ├── test_graphql_client.py
│   ├── test_leaderboard.py
│   ├── test_product_details.py
│   ├── test_comments.py
│   ├── test_reviews.py
│   ├── test_profiles.py
│   └── test_mongo_repositories.py
│
└── scripts/
    ├── create_indexes.py
    └── run_scraper.py
```

The coding agent may adjust this structure if it has a clear technical
reason, but it should preserve separation between HTTP requests,
parsing, persistence, and pipeline orchestration.

------------------------------------------------------------------------

## 9. Configuration and Environment Variables

Create `.env.example` with placeholders. Never put real credentials in
it.

``` dotenv
PRODUCT_HUNT_GRAPHQL_URL=
PRODUCT_HUNT_BEARER_TOKEN=
PRODUCT_HUNT_COOKIE=

MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=product_hunt_scraper

REQUEST_TIMEOUT_SECONDS=30
MAX_RETRIES=3
REQUEST_DELAY_SECONDS=1.0
MAX_CONCURRENT_REQUESTS=2

LOG_LEVEL=INFO
RAW_RESPONSE_STORAGE=true
```

Only configure cookies if the captured request proves they are required.

Validate required configuration at application startup. If the endpoint
or token is missing, fail with a clear message that does not reveal
secrets.

------------------------------------------------------------------------

## 10. Reliability, Rate Limits, and Error Handling

Implement the following:

-   Low request concurrency; begin with 2 concurrent requests or less
    until behavior is understood.
-   Configurable delay between requests.
-   Connection and read timeouts.
-   Bounded retries with exponential backoff for transient failures.
-   Respect `Retry-After` when supplied.
-   Handle HTTP 429 and temporary 5xx responses carefully.
-   Do not repeatedly retry permanent errors such as invalid variables
    or authorization failures.
-   Log operation name, target product/post ID, attempt number, and
    error category.
-   Never log bearer tokens, cookies, or sensitive headers.
-   Save progress after each successfully processed product or page.
-   Continue processing other products when one product fails, while
    recording the failure.
-   Make the run resumable.
-   Respect Product Hunt's terms, access restrictions, and
    data-retention requirements. Do not bypass access controls.

------------------------------------------------------------------------

## 11. Four-Day Development Plan

### Day 1 --- Foundation and leaderboard

**Tasks**

-   Create the Python project structure.
-   Add configuration loading and `.env.example`.
-   Implement the reusable HTTP/GraphQL client.
-   Confirm the exact endpoint, method, headers, and variables from a
    real browser request.
-   Implement Pacific-time date calculation.
-   Implement `LeaderboardDailyPage`.
-   Implement cursor pagination.
-   Filter `Post` entries and skip `Ad` entries.
-   Connect to MongoDB.
-   Create the database indexes.
-   Save leaderboard entries using upserts.
-   Add unit tests using captured response fixtures.

**Deliverable:** A working scraper that collects all available featured
daily leaderboard entries for a target date and stores them in MongoDB.

### Day 2 --- Product details

**Tasks**

-   Implement `ProductsPageLayout`.
-   Implement `ProductAboutPage`.
-   Implement `ProductBuiltWithPage`.
-   Parse and normalize product data.
-   Store product details, media, makers/hunters, and built-with
    information.
-   Add stable relationships between product and launch records.
-   Add tests using captured API responses.

**Deliverable:** Each discovered product is enriched with its available
core details, about-page information, media, people, and built-with
data.

### Day 3 --- Comments, reviews, and profiles

**Tasks**

-   Implement launch comments and nested replies.
-   Verify page-2 pagination and reply pagination from captured
    requests.
-   Implement detailed-review count checking.
-   Skip review-feed requests when the count is zero.
-   Implement review-feed pagination and review deduplication.
-   Implement profile-page retrieval.
-   Parse `ApolloSSRDataTransport` data.
-   Decode Base64 social URLs.
-   Store profiles and relationships.
-   Add tests for missing fields, pagination, and malformed profile
    data.

**Deliverable:** The scraper collects comments, replies, detailed
reviews, and public profiles.

### Day 4 --- Integration, validation, and automation

**Tasks**

-   Integrate all three stages into one pipeline.
-   Add run tracking and resumability.
-   Add bounded retries, throttling, and structured logs.
-   Validate MongoDB records and relationships.
-   Test a complete run with a small number of products.
-   Test rerunning the same date to confirm no duplicate records.
-   Test recovery after an interrupted run.
-   Add a scheduler or documented scheduled-run command.
-   Document setup, configuration, and operation.

**Deliverable:** An integrated, repeatable scraper with MongoDB
persistence, logging, validation, and daily execution support.

The four-day schedule is a development target. Access/request discovery
and unresolved pagination behavior may affect the timeline.

------------------------------------------------------------------------

## 12. Testing and Acceptance Criteria

The implementation is considered ready when the following checks pass.

### Leaderboard

-   [ ] Uses the previous Pacific calendar day.
-   [ ] Uses the featured daily leaderboard.
-   [ ] Retrieves all cursor pages.
-   [ ] Keeps `Post` entries and skips `Ad` entries.
-   [ ] Preserves post slug and product slug separately.
-   [ ] Saves records with stable unique keys.

### Product details

-   [ ] Retrieves product layout information.
-   [ ] Retrieves about-page information.
-   [ ] Retrieves media and people information where available.
-   [ ] Retrieves built-with information where available.
-   [ ] Handles missing optional fields without crashing.

### Comments

-   [ ] Uses the launch post slug, not product slug.
-   [ ] Retrieves all verified comment pages.
-   [ ] Handles nested replies.
-   [ ] Deduplicates by comment ID.

### Reviews

-   [ ] Checks `detailedReviewsCount`.
-   [ ] Skips the feed when the count is zero.
-   [ ] Retrieves all review pages when reviews exist.
-   [ ] Deduplicates by review ID.
-   [ ] Preserves author and reply information.

### Profiles

-   [ ] Fetches each discovered username at most once per run.
-   [ ] Parses the relevant embedded profile data.
-   [ ] Handles missing and malformed values safely.
-   [ ] Decodes encoded social URLs where possible.
-   [ ] Saves profile data using a stable unique key.

### MongoDB and operations

-   [ ] Creates the required indexes.
-   [ ] Uses upserts to prevent duplicate records.
-   [ ] Records run status and errors.
-   [ ] Supports resuming incomplete work.
-   [ ] Does not store credentials in database logs or source control.
-   [ ] A repeated run does not create duplicate records.
-   [ ] A complete run can be validated against the captured source
    data.

------------------------------------------------------------------------

## 13. Open Questions and Dependencies

These must be resolved from actual browser Network captures or test
responses. Do not guess.

1.  What is the exact Product Hunt GraphQL endpoint URL?
2.  Is the request method GET for every operation, or do any operations
    require POST?
3.  Which authorization headers and cookies are required?
4.  What is the exact complete variable structure for each persisted
    operation?
5.  How does the comments operation request page 2?
6.  Do nested comment replies have independent pagination?
7.  Does the review feed expose `hasNextPage` and a cursor in the
    expected structure?
8.  What exact embedded profile script format is returned for the target
    pages?
9.  Are all required profile fields present for private, deleted, or
    incomplete profiles?
10. Is an additional non-featured or all-leaderboard mode required? It
    is not part of the confirmed current scope.

Keep these items in a configuration/operation registry where practical.
Add captured response fixtures to tests without including live tokens or
cookies.

------------------------------------------------------------------------

## 14. Instructions for the Coding Agent

Use this document as the implementation source of truth.

### Development approach

1.  Inspect the repository before changing files.
2.  Report the existing project structure and identify what is already
    implemented.
3.  Create a concise implementation checklist based on this
    specification.
4.  Implement incrementally, starting with configuration, MongoDB
    connection, and the reusable GraphQL client.
5.  Use captured API responses as fixtures for parser and pagination
    tests.
6.  Keep request logic, parsing, persistence, and orchestration in
    separate modules.
7.  Use type hints, clear function names, and small testable functions.
8.  Validate required configuration at startup.
9.  Do not invent endpoint URLs, request headers, variables, response
    fields, or pagination behavior.
10. If a required request detail is unknown, create a clearly documented
    placeholder and ask for the exact captured request rather than
    guessing.
11. Never hardcode or print credentials.
12. Use MongoDB upserts and unique indexes for idempotency.
13. Add tests as each module is implemented.
14. Do not mark a stage complete until its acceptance criteria pass.
15. At the end of each development day, summarize files changed, tests
    run, completed work, blockers, and next tasks.

### First implementation milestone

Start with:

-   Project skeleton
-   Environment/configuration handling
-   MongoDB connection and indexes
-   Reusable HTTP/GraphQL client
-   Pacific-time target-date utility
-   Leaderboard request and parser
-   Leaderboard pagination
-   `launches` upsert repository
-   Unit tests using a saved leaderboard response

Do not begin high-volume scraping until the endpoint, authentication,
request variables, and rate behavior have been verified with a small
test request.

------------------------------------------------------------------------

## 15. Final One-Sentence Description

**The Product Hunt Scraper is a Python automation pipeline that collects
daily product launches, enriches them with product details, comments,
reviews, and public user profiles, and stores the resulting structured
dataset in MongoDB for future use.**
