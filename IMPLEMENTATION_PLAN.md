# LaunchBase — Implementation Plan

## 1. Project goal

Build **LaunchBase**, a searchable web application that presents data collected by an automated daily Product Hunt scraper.

The application has two primary data areas:

- **Products:** every product collected by the scraper, including its launch details and available public discussion data.
- **Persons:** one unified directory of unique people discovered as product makers or commenters. A person can be connected to many products and can hold more than one role across the dataset.

The UI should follow the supplied LaunchBase visual reference: a light, uncluttered SaaS dashboard with slate/white surfaces and violet/indigo accents. Do not copy Product Hunt's orange branding, logo, typography, or page layout.

## 2. Frontend prototype

`LaunchBase.jsx` is a self-contained React prototype. It currently uses local illustrative arrays and React state so an engineer can run and review the main navigation and screens before connecting APIs.

### Required stack

- React (Vite recommended)
- Tailwind CSS
- `lucide-react` for icons
- React Router for production routing (the prototype uses local state)
- Fetch or Axios for API requests
- Node.js + Express API
- MongoDB with Mongoose

### Run the prototype

1. Create or open a React + Vite application.
2. Install dependencies:
   ```bash
   npm install lucide-react
   ```
3. Configure Tailwind CSS using the setup instructions for the Tailwind version already used by the project.
4. Save `LaunchBase.jsx` in `src/`.
5. Render it from `src/App.jsx`:
   ```jsx
   import LaunchBase from "./LaunchBase";

   export default function App() {
     return <LaunchBase />;
   }
   ```
6. Start the app:
   ```bash
   npm run dev
   ```

The JSX expects Tailwind utility classes to be available globally. It is a UI prototype, not a completed production integration.

## 3. Information architecture and pages

### Main navigation

Keep the left sidebar persistent on desktop:

1. Dashboard
2. Products
3. Persons
4. Scraping History

Settings and Help can be secondary links. On mobile, use a collapsible navigation drawer.

### 3.1 Dashboard

Purpose: give an at-a-glance summary of scraper activity and the dataset.

Include:
- Total products collected
- Total unique persons
- Total comments captured
- Latest scraper run time and status
- Collection activity over the last seven days
- Latest scraping run summary
- A short list of yesterday's top products
- Quick navigation to Products and Scraping History

All dashboard metrics must eventually come from API aggregation endpoints, not hard-coded values.

### 3.2 Products listing

Purpose: browse all products captured by the scraper.

Each product card/row should show:
- Product name and icon/image
- Tagline
- Category and topic tags
- Launch date / scrape date
- Upvote count
- Comment count
- Maker avatars/names
- Link to the product detail page

Required interactions:
- Search by product name, tagline, description, and category
- Filter by launch date / scrape date
- Filter by category or topic
- Sort by upvotes, comments, newest, and oldest
- Pagination or infinite scrolling
- Empty, loading, and error states

Important: clarify the product date semantics. Store both the actual Product Hunt launch date (if available) and the date on which the scraper collected the product. Do not treat them as interchangeable.

### 3.3 Product detail

Purpose: display all information collected for one Product Hunt product.

Suggested sections/tabs:
- **Overview:** name, tagline, description, website, Product Hunt URL, launch date, rank, upvotes, topics, category, and scrape metadata.
- **Comments:** full comment text, author, timestamp, source URL, and parent/reply relationship where available.
- **Makers:** every maker associated with the product, linked to their internal person profile.
- **Reviews:** only use this tab for a distinct review/rating entity if the scraper actually collects one. If Product Hunt data contains only discussions/comments, do not relabel comments as reviews.

The page should link back to the products list and open internal person profiles when a maker or commenter is selected.

### 3.4 Persons directory

Purpose: show every unique person discovered in scraped product pages.

Each person should appear once, regardless of how many products they are connected to or whether they are both a maker and commenter.

Show:
- Display name
- Product Hunt username/handle, if available
- Profile image, if available
- Public profile URL
- Role badges: Maker and/or Commenter
- Number of related products
- Number of comments captured

Required interactions:
- Search by name or username
- Filter: All persons / Makers / Commenters
- Sort by recently seen, most products, or most comments
- Pagination
- Do not create separate duplicate records for maker and commenter roles.

### 3.5 Person profile

Purpose: show a person's public profile details and every relationship discovered by the scraper.

Include:
- Name, username, profile image, bio, and public profile URL
- Product relationships
- Role on each product: Maker, Commenter, or both
- Comments made by the person, with product links and timestamps
- First seen and last seen timestamps

A person can be a maker on Product A and a commenter on Product B. The UI must represent roles at the **person-product relationship level**, not as one permanent global role on the person.

### 3.6 Scraping history

Purpose: make daily collection runs observable.

Each run should show:
- Started and completed timestamps
- Status: Running / Completed / Failed / Partial
- Products discovered
- New products inserted
- Existing products updated
- Unique people discovered
- New people inserted
- Comments captured
- Duration
- Error summary or logs link

Allow an operator to inspect a run's details. Do not expose secrets, cookies, session tokens, or other scraper credentials in the UI.

## 4. Data model

Use stable source identifiers wherever possible. Do not deduplicate people using display name alone: two people may share a name, and one person may change their display name.

### 4.1 `products`

Suggested fields:

```js
{
  _id: ObjectId,
  source: "producthunt",
  sourceId: String,              // stable Product Hunt product ID
  name: String,
  slug: String,
  tagline: String,
  description: String,
  websiteUrl: String,
  sourceUrl: String,
  imageUrl: String,
  category: String,
  topics: [String],
  launchDate: Date,
  sourceRank: Number,
  upvoteCount: Number,
  commentCount: Number,
  firstScrapedAt: Date,
  lastScrapedAt: Date,
  scrapeDate: Date,               // date this daily run collected the product
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- Unique compound index on `{ source, sourceId }`
- Index on `launchDate`
- Index on `scrapeDate`
- Text/search index on name, tagline, and description as appropriate

### 4.2 `persons`

Suggested fields:

```js
{
  _id: ObjectId,
  source: "producthunt",
  sourceId: String,              // stable source user ID, when available
  username: String,
  displayName: String,
  bio: String,
  avatarUrl: String,
  profileUrl: String,
  firstSeenAt: Date,
  lastSeenAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- Unique compound index on `{ source, sourceId }` when `sourceId` exists
- Secondary index on normalized username
- Search index on display name and username

If the source does not provide a stable person ID, define a documented fallback identity strategy. Prefer a canonical profile URL or normalized username over display name. Keep unresolved identities reviewable rather than silently merging people with similar names.

### 4.3 `product_persons` relationship collection

This is the key to the application's data integrity. Store roles on the relationship, because a person may have different roles on different products.

```js
{
  _id: ObjectId,
  productId: ObjectId,
  personId: ObjectId,
  roles: ["maker", "commenter"],
  firstSeenAt: Date,
  lastSeenAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Rules:
- One relationship document per unique `{ productId, personId }`.
- Use a unique compound index on `{ productId, personId }`.
- `roles` is a set of values from `maker` and `commenter`.
- If a person is both maker and commenter for the same product, store both roles in the same relationship document.
- Upsert relationships during every scrape; merge roles rather than overwriting existing roles.
- The Persons directory filters should query relationships, then return unique persons.

### 4.4 `comments`

Suggested fields:

```js
{
  _id: ObjectId,
  source: "producthunt",
  sourceId: String,              // stable comment ID, if available
  productId: ObjectId,
  personId: ObjectId,
  parentCommentId: ObjectId,     // nullable; for replies
  body: String,
  sourceUrl: String,
  postedAt: Date,
  firstScrapedAt: Date,
  lastScrapedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- Unique compound index on `{ source, sourceId }` where a stable ID exists
- Index on `{ productId, postedAt }`
- Index on `{ personId, postedAt }`

If a comment has no identifiable author, preserve the comment with a null `personId` and an explicit unknown-author state. Do not invent a person record.

### 4.5 `reviews` (optional)

Only create this collection if the scraper captures a distinct review/rating structure.

```js
{
  _id: ObjectId,
  source: "producthunt",
  sourceId: String,
  productId: ObjectId,
  personId: ObjectId,
  rating: Number,
  title: String,
  body: String,
  postedAt: Date,
  sourceUrl: String
}
```

If the source data has no distinct reviews, omit this collection and show an explanatory empty state in the Reviews tab.

### 4.6 `scraping_runs`

Suggested fields:

```js
{
  _id: ObjectId,
  jobKey: String,
  status: "running" | "completed" | "failed" | "partial",
  startedAt: Date,
  finishedAt: Date,
  durationMs: Number,
  productsFound: Number,
  productsInserted: Number,
  productsUpdated: Number,
  personsFound: Number,
  personsInserted: Number,
  commentsFound: Number,
  errors: [{ stage: String, message: String, occurredAt: Date }],
  metadata: Object,
  createdAt: Date
}
```

Store safe operational metadata only. Never store scraper credentials or authentication cookies in run documents.

## 5. Relationship and ingestion workflow

For each daily scrape:

1. Create a `scraping_runs` document with status `running`.
2. Parse each product and upsert it using `{ source, sourceId }`.
3. For every maker:
   - Upsert the person using the stable source user ID.
   - Upsert `{ productId, personId }` in `product_persons`.
   - Add `maker` to the relationship's `roles` set.
4. For every comment:
   - Upsert the commenter person when identifiable.
   - Upsert the comment using its stable source comment ID.
   - Upsert the product-person relationship and add `commenter` to `roles`.
   - Preserve parent/reply relationships when the source provides them.
5. Update `firstSeenAt` only when creating the person/relationship; update `lastSeenAt` on subsequent observations.
6. Update product counters and scrape timestamps.
7. Mark the run `completed`, `partial`, or `failed` and persist counts/errors.
8. Make ingestion idempotent: re-running the same scrape must not create duplicate products, people, comments, or relationships.

Use MongoDB bulk writes where practical. Use `$addToSet` to merge role values and avoid duplicate roles.

## 6. Suggested REST API

Base path: `/api/v1`

### Dashboard
- `GET /dashboard/summary`
- `GET /dashboard/activity?days=7`
- `GET /dashboard/latest-products?limit=5`
- `GET /dashboard/latest-run`

### Products
- `GET /products?page=1&limit=20&search=&category=&topic=&sort=upvotes&dateFrom=&dateTo=`
- `GET /products/:productId`
- `GET /products/:productId/comments?page=1&limit=20`
- `GET /products/:productId/makers`
- `GET /products/:productId/persons`
- `GET /products/:productId/reviews?page=1&limit=20` (only if reviews exist)

### Persons
- `GET /persons?page=1&limit=20&search=&role=all&sort=recent`
- `GET /persons/:personId`
- `GET /persons/:personId/products`
- `GET /persons/:personId/comments?page=1&limit=20`

The role filter should use relationship documents:
- `role=maker`: person has at least one product relationship containing `maker`.
- `role=commenter`: person has at least one product relationship containing `commenter`.
- A person can appear in both filters.

### Scraping history
- `GET /scraping-runs?page=1&limit=20&status=`
- `GET /scraping-runs/:runId`

### API response conventions

Use consistent response shapes and include pagination metadata:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Return clear validation and error responses. Add server-side pagination; do not load the full database into the browser.

## 7. Frontend component structure

Suggested structure:

```text
src/
  app/
    App.jsx
    router.jsx
  components/
    layout/
      AppShell.jsx
      Sidebar.jsx
      Topbar.jsx
      MobileNavigation.jsx
    common/
      Badge.jsx
      Avatar.jsx
      SearchInput.jsx
      StatCard.jsx
      Pagination.jsx
      EmptyState.jsx
      LoadingState.jsx
      ErrorState.jsx
    products/
      ProductCard.jsx
      ProductTable.jsx
      ProductFilters.jsx
      ProductHeader.jsx
      ProductOverview.jsx
      ProductComments.jsx
      ProductMakers.jsx
      ProductReviews.jsx
    persons/
      PersonRow.jsx
      PersonFilters.jsx
      PersonHeader.jsx
      PersonRelationships.jsx
      PersonComments.jsx
    dashboard/
      SummaryCards.jsx
      ActivityChart.jsx
      LatestRunCard.jsx
      LatestProducts.jsx
    scraping/
      RunsTable.jsx
      RunDetails.jsx
  pages/
    DashboardPage.jsx
    ProductsPage.jsx
    ProductDetailPage.jsx
    PersonsPage.jsx
    PersonDetailPage.jsx
    ScrapingHistoryPage.jsx
  services/
    api.js
    products.service.js
    persons.service.js
    dashboard.service.js
    scraping.service.js
  hooks/
    useProducts.js
    usePersons.js
    useDashboard.js
    useScrapingRuns.js
  styles/
    index.css
```

Use React Router routes such as:
- `/`
- `/products`
- `/products/:productId`
- `/persons`
- `/persons/:personId`
- `/scraping-history`

## 8. Visual design system

### Design direction

- Light-mode SaaS application
- White cards on a very light cool-gray page background
- Slate text and muted slate secondary labels
- Violet/indigo as the primary accent
- Subtle borders and restrained shadows
- Rounded corners around 12–16px
- Generous whitespace and compact, readable data tables
- No Product Hunt orange branding

### Suggested tokens

| Token | Value |
|---|---|
| Page background | `#F7F8FC` |
| Surface | `#FFFFFF` |
| Primary text | `#0F172A` |
| Secondary text | `#64748B` |
| Border | `#E2E8F0` |
| Primary accent | `#6D5CE8` |
| Accent tint | `#F3F0FF` |
| Success | `#059669` |
| Info | `#2563EB` |
| Warning | `#D97706` |

Use the JSX prototype as the visual baseline. Keep spacing, hierarchy, card proportions, and page composition consistent when splitting it into production components.

## 9. Important product decisions to confirm

Before finalizing scraper/API behavior, confirm:

1. **Visibility:** Is LaunchBase a private internal dashboard, a public directory, or both? If public, add access control for admin-only scraper history and operational information.
2. **Reviews:** Does the scraper collect actual ratings/reviews, or only comments and replies? Do not fabricate a review feature.
3. **Date behavior:** Should the Products page default to yesterday's products, show all history, or provide both with a date filter? Recommended: show all history, default the date filter to the latest completed scrape date, and provide an archive/date picker.
4. **Identity resolution:** Which stable person identifiers are available in the scraper output? Prefer Product Hunt user IDs; otherwise use canonical profile URLs or usernames with a duplicate-review mechanism.
5. **Product ranking:** Confirm whether rank is the Product Hunt daily rank, scraper ordering, or another metric.

## 10. Non-functional requirements

- Responsive layout for desktop, tablet, and mobile.
- Server-side pagination and filtering.
- Debounced search.
- Loading, empty, and error states on every data-driven page.
- Accessible labels, keyboard navigation, and visible focus states.
- Safe rendering of scraped user-generated text; never render scraped HTML as trusted markup.
- Validate and normalize URLs before rendering external links.
- Add rate limiting and appropriate access control to admin endpoints.
- Keep scraper execution separate from ordinary web requests.
- Log errors without leaking secrets.
- Use environment variables for database credentials and API configuration.
- Add tests for identity deduplication, relationship role merging, and idempotent ingestion.

## 11. Recommended implementation sequence

### Phase 1 — Foundation
- Create React/Vite frontend and Express API.
- Configure Tailwind, routing, shared layout, and design tokens.
- Configure MongoDB and Mongoose models.
- Add environment configuration and health endpoint.

### Phase 2 — Ingestion and data integrity
- Connect the existing scraper output to the API/database ingestion service.
- Implement product, person, relationship, comment, optional review, and scraping-run upserts.
- Add indexes and idempotency tests.
- Validate duplicate person handling and multiple roles.

### Phase 3 — Products
- Implement products list, search, filters, sorting, pagination.
- Implement product detail and comments/makers sections.
- Add links between products and person profiles.

### Phase 4 — Persons
- Implement unique persons directory.
- Add role filters driven by `product_persons`.
- Implement person profile with all associated products, roles, and comments.
- Test a person who is a maker on one product and commenter on another.

### Phase 5 — Dashboard and scraper observability
- Implement dashboard aggregation endpoints and UI.
- Implement scraping history and run details.
- Add status/error handling and scheduler health indicators.

### Phase 6 — Quality and deployment
- Responsive and accessibility pass.
- Security review for scraped content and external links.
- API and UI tests.
- Production build, deployment, monitoring, and backup strategy.

## 12. Acceptance criteria

The implementation is ready when:

- [ ] A product appears once even if it is seen in multiple daily runs.
- [ ] A person appears once even if they comment on multiple products and make another product.
- [ ] A person can have both Maker and Commenter roles on the same product.
- [ ] A person's profile lists every known product relationship and role.
- [ ] Product details show the fields and public discussion data actually captured by the scraper.
- [ ] Comments link to the correct product and identifiable person.
- [ ] Re-running the same scraper data does not create duplicates.
- [ ] Products and Persons pages support search, filters, sorting, and pagination.
- [ ] Scraping history accurately reflects each run's status and counts.
- [ ] The interface follows the LaunchBase design direction and does not copy Product Hunt branding.
- [ ] The UI clearly distinguishes real backend data from unavailable or not-yet-collected information.
- [ ] No placeholder metrics or sample names remain in production.
