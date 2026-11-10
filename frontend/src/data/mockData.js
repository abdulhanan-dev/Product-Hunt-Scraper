/**
 * Product Hunt Scraper — Comprehensive Dynamic Mock Dataset
 * Matches the complete MongoDB schema from IMPLEMENTATION_PLAN.md
 */

export const productsData = [
  {
    id: "prod-1302121",
    sourceId: "1302121",
    name: "Glasshand",
    slug: "glasshand",
    tagline: "Give your AI agent a real iPhone and Mac",
    description: "Glasshand is the first cloud-hosted device infrastructure built specifically for AI agents. It provides programmatic, ultra-low-latency remote control over real, physical iPhones and Macs with full computer-vision inspection, accessibility tree parsing, and keystroke/touch simulation.",
    category: "Developer Tools",
    date: "Nov 6, 2026",
    scrapeDate: "2026-11-06",
    launchDate: "2026-11-05",
    rank: 1,
    upvotes: 1142,
    comments: 184,
    status: "Enriched",
    pricing: "Freemium ($29/mo)",
    websiteUrl: "https://glasshand.io",
    sourceUrl: "https://www.producthunt.com/posts/glasshand",
    badge: "Product of the Day #1",
    color: "from-blue-600 via-indigo-600 to-violet-700",
    initials: "GH",
    topics: ["Artificial Intelligence", "Developer Tools", "Automation", "Mac", "iOS"],
    makers: [
      { id: "u-glass-1", name: "Julian Thorne", handle: "@julianthorne", role: "Maker", title: "Founder & CEO" },
      { id: "u-glass-2", name: "Siddharth Rao", handle: "@siddharthr", role: "Maker", title: "CTO" }
    ],
    builtWith: [
      { name: "WebRTC", category: "Streaming" },
      { name: "Rust", category: "Core Engine" },
      { name: "Python / FastAPI", category: "Backend" },
      { name: "React 19", category: "Frontend" },
      { name: "Swift", category: "macOS / iOS Agent" }
    ],
    media: [
      { type: "image", title: "Remote Mac Dashboard", url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80" },
      { type: "image", title: "iPhone Touch Grid Visualizer", url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80" },
      { type: "image", title: "Python SDK Terminal", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-101",
        author: "Sarah Lindqvist",
        handle: "@sarahlind",
        role: "Commenter",
        avatar: "SL",
        time: "4 hours ago",
        upvotes: 24,
        text: "Controlling a real iPhone from an agent without jailbreaking has been a nightmare for us. How do you handle Apple ID two-factor authentication prompts during test automation?",
        replies: [
          {
            id: "c-101-r1",
            author: "Julian Thorne",
            handle: "@julianthorne",
            role: "Maker",
            avatar: "JT",
            time: "3 hours ago",
            upvotes: 18,
            text: "Great question Sarah! We built an automated SMS/2FA relay vault that injects verification codes into the active session via our webhook API within 800ms."
          }
        ]
      },
      {
        id: "c-102",
        author: "Devon Chen",
        handle: "@devonchen",
        role: "Commenter",
        avatar: "DC",
        time: "2 hours ago",
        upvotes: 12,
        text: "The latency in the demo was astonishingly low (<40ms over WebRTC). Does the macOS instance support Metal hardware acceleration for graphic tasks?"
      }
    ],
    reviews: {
      average: 4.9,
      total: 38,
      distribution: { 5: 35, 4: 3, 3: 0, 2: 0, 1: 0 },
      highlights: ["Insanely fast connection", "API documentation is first class", "Saved our QA team weeks of hardware lab setup"]
    }
  },
  {
    id: "prod-1302122",
    sourceId: "1302122",
    name: "Orbit Notes",
    slug: "orbit-notes",
    tagline: "A calmer workspace for connected thinking and ideas",
    description: "Orbit Notes brings Markdown notes, lightweight tasks, and bi-directional graph connections into one focused desktop app. Capture thoughts instantly, link related concepts without friction, and let local-first AI find serendipitous links between your projects.",
    category: "Productivity",
    date: "Nov 6, 2026",
    scrapeDate: "2026-11-06",
    launchDate: "2026-11-05",
    rank: 2,
    upvotes: 948,
    comments: 142,
    status: "Enriched",
    pricing: "Free / $8 Pro",
    websiteUrl: "https://orbitnotes.app",
    sourceUrl: "https://www.producthunt.com/posts/orbit-notes",
    badge: "Product of the Day #2",
    color: "from-violet-600 via-purple-600 to-indigo-700",
    initials: "ON",
    topics: ["Productivity", "Notes", "Knowledge Management", "Local-First"],
    makers: [
      { id: "u-orbit-1", name: "Maya Chen", handle: "@mayac", role: "Maker", title: "Product Designer & Co-founder" },
      { id: "u-orbit-2", name: "Daniel Brooks", handle: "@danbrooks", role: "Maker", title: "Lead Software Architect" }
    ],
    builtWith: [
      { name: "Tauri v2", category: "Desktop Framework" },
      { name: "React 19", category: "Frontend" },
      { name: "SQLite + CRDT", category: "Local Database" },
      { name: "Ollama Embeddings", category: "Local AI" }
    ],
    media: [
      { type: "image", title: "Connected Graph View", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80" },
      { type: "image", title: "Minimalist Focus Editor", url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-201",
        author: "Alex Morgan",
        handle: "@alexm",
        role: "Commenter",
        avatar: "AM",
        time: "5 hours ago",
        upvotes: 31,
        text: "The graph connection visualization is buttery smooth. Can we self-host the sync server with CouchDB or MinIO?",
        replies: [
          {
            id: "c-201-r1",
            author: "Maya Chen",
            handle: "@mayac",
            role: "Maker",
            avatar: "MC",
            time: "4 hours ago",
            upvotes: 27,
            text: "Yes! Orbit Notes sync protocol is 100% open-source and standard E2EE. You can point the client to any S3-compatible bucket."
          }
        ]
      }
    ],
    reviews: {
      average: 4.8,
      total: 51,
      distribution: { 5: 45, 4: 5, 3: 1, 2: 0, 1: 0 },
      highlights: ["Replaced Notion for personal thinking", "Offline sync never fails", "Cleanest typography on the market"]
    }
  },
  {
    id: "prod-1302123",
    sourceId: "1302123",
    name: "MetricFlow",
    slug: "metricflow",
    tagline: "Understand multi-channel revenue metrics at a glance",
    description: "An intuitive financial analytics workspace that unifies Stripe, Lemon Squeezy, Paddle, and Shopify subscriptions into scheduled daily email digests, predictive churn alerts, and interactive boardroom charts.",
    category: "Analytics",
    date: "Nov 6, 2026",
    scrapeDate: "2026-11-06",
    launchDate: "2026-11-05",
    rank: 3,
    upvotes: 785,
    comments: 98,
    status: "Enriched",
    pricing: "$49/mo flat",
    websiteUrl: "https://metricflow.data",
    sourceUrl: "https://www.producthunt.com/posts/metricflow",
    badge: "Product of the Day #3",
    color: "from-emerald-500 via-teal-600 to-cyan-700",
    initials: "MF",
    topics: ["Analytics", "SaaS", "Finance", "Revenue", "Dashboards"],
    makers: [
      { id: "u-metric-1", name: "Noah Williams", handle: "@noahw", role: "Maker", title: "Founder" }
    ],
    builtWith: [
      { name: "ClickHouse", category: "OLAP Database" },
      { name: "Next.js 15", category: "Web App" },
      { name: "Tailwind CSS", category: "Styling" },
      { name: "Stripe Connect", category: "Billing" }
    ],
    media: [
      { type: "image", title: "MRR Cohort Waterfall", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" },
      { type: "image", title: "Churn Prevention Heatmap", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-301",
        author: "Emma Wilson",
        handle: "@emmaw",
        role: "Commenter",
        avatar: "EW",
        time: "6 hours ago",
        upvotes: 19,
        text: "The cohort retention curve takes 30 seconds to render in our current tool. How fast does MetricFlow process 500k subscription events?",
        replies: [
          {
            id: "c-301-r1",
            author: "Noah Williams",
            handle: "@noahw",
            role: "Maker",
            avatar: "NW",
            time: "5 hours ago",
            upvotes: 22,
            text: "Thanks to ClickHouse under the hood, sub-second queries on 5 million transactions are standard. Try the live demo with mock data!"
          }
        ]
      }
    ],
    reviews: {
      average: 4.9,
      total: 26,
      distribution: { 5: 24, 4: 2, 3: 0, 2: 0, 1: 0 },
      highlights: ["No more manual Google Sheets exports", "Real-time Stripe webhook sync", "Clean Slack notifications"]
    }
  },
  {
    id: "prod-1302124",
    sourceId: "1302124",
    name: "Draftwise AI",
    slug: "draftwise-ai",
    tagline: "Turn rough brain-dumps into executive-ready first drafts",
    description: "Speak or paste fragmented bullet points, voice memos, and messy Slack threads. Draftwise synthesizes them into structured memos, pitch decks, blog posts, and technical design documents with your personal tone.",
    category: "Artificial Intelligence",
    date: "Nov 5, 2026",
    scrapeDate: "2026-11-05",
    launchDate: "2026-11-04",
    rank: 4,
    upvotes: 692,
    comments: 87,
    status: "Enriched",
    pricing: "Freemium ($16/mo)",
    websiteUrl: "https://draftwise.ai",
    sourceUrl: "https://www.producthunt.com/posts/draftwise-ai",
    badge: "Top AI Launch",
    color: "from-amber-500 via-orange-600 to-rose-600",
    initials: "DW",
    topics: ["Writing", "Artificial Intelligence", "Copywriting", "Productivity"],
    makers: [
      { id: "u-draft-1", name: "Sofia Rivera", handle: "@sofiar", role: "Maker", title: "Co-founder" },
      { id: "u-draft-2", name: "Liam Patel", handle: "@liamp", role: "Maker", title: "AI Engineer" }
    ],
    builtWith: [
      { name: "Claude 3.5 Sonnet", category: "LLM" },
      { name: "Whisper Large v3", category: "Voice Transcription" },
      { name: "FastAPI", category: "Backend" },
      { name: "Tailwind CSS", category: "Styling" }
    ],
    media: [
      { type: "image", title: "Voice to PRD Conversion", url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-401",
        author: "Oliver Reed",
        handle: "@oliverreed",
        role: "Commenter",
        avatar: "OR",
        time: "1 day ago",
        upvotes: 14,
        text: "The voice transcription picked up technical jargon flawlessly. Can we define team-specific glossary terms?"
      }
    ],
    reviews: {
      average: 4.7,
      total: 21,
      distribution: { 5: 17, 4: 3, 3: 1, 2: 0, 1: 0 },
      highlights: ["Writing speed 5x faster", "Catches internal jargon", "Intuitive editor"]
    }
  },
  {
    id: "prod-1302125",
    sourceId: "1302125",
    name: "Sprintboard Studio",
    slug: "sprintboard-studio",
    tagline: "A lightweight planning space for high-velocity engineering",
    description: "Say goodbye to 40-click Jira workflows. Sprintboard gives engineering leaders a linear, keyboard-first sprint tracker with automatic GitHub PR linkings and CI/CD status badges.",
    category: "Developer Tools",
    date: "Nov 5, 2026",
    scrapeDate: "2026-11-05",
    launchDate: "2026-11-04",
    rank: 5,
    upvotes: 588,
    comments: 73,
    status: "Enriched",
    pricing: "Free for up to 10 devs",
    websiteUrl: "https://sprintboard.dev",
    sourceUrl: "https://www.producthunt.com/posts/sprintboard",
    badge: "Trending in Dev Tools",
    color: "from-cyan-600 via-blue-600 to-indigo-700",
    initials: "SB",
    topics: ["Developer Tools", "Agile", "GitHub", "Project Management"],
    makers: [
      { id: "u-sprint-1", name: "Ethan Park", handle: "@ethanp", role: "Maker", title: "Founder" }
    ],
    builtWith: [
      { name: "Go (Golang)", category: "Backend" },
      { name: "PostgreSQL", category: "Database" },
      { name: "React 19", category: "Frontend" }
    ],
    media: [
      { type: "image", title: "Keyboard Sprint Board", url: "https://images.unsplash.com/photo-1618401471353-b98aedd04e11?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-501",
        author: "Priya Shah",
        handle: "@priyashah",
        role: "Commenter",
        avatar: "PS",
        time: "1 day ago",
        upvotes: 11,
        text: "The GitHub PR integration is instant. Excited to test this with our team."
      }
    ],
    reviews: {
      average: 4.8,
      total: 19,
      distribution: { 5: 16, 4: 3, 3: 0, 2: 0, 1: 0 },
      highlights: ["Keyboard shortcuts for everything", "Lightning fast page loads"]
    }
  },
  {
    id: "prod-1302126",
    sourceId: "1302126",
    name: "FrameKit 3.0",
    slug: "framekit-3",
    tagline: "Create consistent product screenshots & marketing mockups",
    description: "Effortlessly turn raw web app screenshots into pristine, production-ready App Store visuals, Twitter launch graphics, and animated demo GIFs with 3D tilts and realistic device bezels.",
    category: "Design Tools",
    date: "Nov 4, 2026",
    scrapeDate: "2026-11-04",
    launchDate: "2026-11-03",
    rank: 6,
    upvotes: 512,
    comments: 64,
    status: "Enriched",
    pricing: "$39 Lifetime",
    websiteUrl: "https://framekit.design",
    sourceUrl: "https://www.producthunt.com/posts/framekit-3",
    badge: "Community Favorite",
    color: "from-pink-500 via-rose-500 to-red-600",
    initials: "FK",
    topics: ["Design", "Marketing", "Screenshots", "Mockups"],
    makers: [
      { id: "u-frame-1", name: "Ava Thompson", handle: "@avathompson", role: "Maker", title: "Independent Creator" }
    ],
    builtWith: [
      { name: "WebGL / Three.js", category: "3D Rendering" },
      { name: "Canvas API", category: "Export Engine" },
      { name: "Vue 3", category: "Frontend" }
    ],
    media: [
      { type: "image", title: "Device Bezel Customizer", url: "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-601",
        author: "Noah Williams",
        handle: "@noahw",
        role: "Commenter",
        avatar: "NW",
        time: "2 days ago",
        upvotes: 8,
        text: "Used FrameKit for our MetricFlow launch screenshots. Highly recommended!"
      }
    ],
    reviews: {
      average: 4.9,
      total: 32,
      distribution: { 5: 30, 4: 2, 3: 0, 2: 0, 1: 0 },
      highlights: ["Saved $500 on Figma templates", "4K high-res WebP exports"]
    }
  },
  {
    id: "prod-1302127",
    sourceId: "1302127",
    name: "VectorPulse",
    slug: "vectorpulse",
    tagline: "Real-time vector search observability and embedding debugger",
    description: "Inspect cosine similarity drifts, detect hallucination clusters, and benchmark Pinecone, Qdrant, and pgvector latency across production RAG workloads.",
    category: "Developer Tools",
    date: "Nov 4, 2026",
    scrapeDate: "2026-11-04",
    launchDate: "2026-11-03",
    rank: 7,
    upvotes: 489,
    comments: 53,
    status: "Enriched",
    pricing: "Free Open-Source / $49 Cloud",
    websiteUrl: "https://vectorpulse.dev",
    sourceUrl: "https://www.producthunt.com/posts/vectorpulse",
    badge: "Open Source",
    color: "from-purple-600 via-violet-700 to-indigo-800",
    initials: "VP",
    topics: ["Vector Database", "RAG", "Machine Learning", "Monitoring"],
    makers: [
      { id: "u-vector-1", name: "Marcus Brody", handle: "@marcusb", role: "Maker", title: "ML Infrastructure Engineer" }
    ],
    builtWith: [
      { name: "Rust", category: "Telemetry Daemon" },
      { name: "DuckDB", category: "In-Memory Analytics" },
      { name: "React 19", category: "Dashboard" }
    ],
    media: [
      { type: "image", title: "High-Dimensional Vector Projection", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-701",
        author: "Julian Thorne",
        handle: "@julianthorne",
        role: "Commenter",
        avatar: "JT",
        time: "2 days ago",
        upvotes: 9,
        text: "Crucial tool for anyone running production embeddings at scale."
      }
    ],
    reviews: {
      average: 4.8,
      total: 14,
      distribution: { 5: 12, 4: 2, 3: 0, 2: 0, 1: 0 },
      highlights: ["Found our dead embeddings in 10 minutes", "Easy Docker compose setup"]
    }
  },
  {
    id: "prod-1302128",
    sourceId: "1302128",
    name: "KubeCost Lite",
    slug: "kubecost-lite",
    tagline: "Instant AWS & GCP Kubernetes cost allocation without enterprise bloat",
    description: "Install one single lightweight Helm chart. Within 5 minutes, see exact microservice and pod dollar spend with automated right-sizing recommendations.",
    category: "DevOps",
    date: "Nov 3, 2026",
    scrapeDate: "2026-11-03",
    launchDate: "2026-11-02",
    rank: 8,
    upvotes: 432,
    comments: 48,
    status: "Enriched",
    pricing: "100% Free Core",
    websiteUrl: "https://kubecostlite.io",
    sourceUrl: "https://www.producthunt.com/posts/kubecost-lite",
    badge: "DevOps Tool of the Week",
    color: "from-blue-500 via-sky-600 to-teal-700",
    initials: "KC",
    topics: ["Kubernetes", "DevOps", "Cloud Cost", "AWS", "GCP"],
    makers: [
      { id: "u-kube-1", name: "David Kim", handle: "@davidkim", role: "Maker", title: "Site Reliability Engineer" }
    ],
    builtWith: [
      { name: "Prometheus", category: "Metrics Collection" },
      { name: "Golang", category: "Agent" }
    ],
    media: [
      { type: "image", title: "Cluster Spend Breakdown", url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80" }
    ],
    commentsList: [
      {
        id: "c-801",
        author: "Devon Chen",
        handle: "@devonchen",
        role: "Commenter",
        avatar: "DC",
        time: "3 days ago",
        upvotes: 7,
        text: "Clean charts. Does it calculate spot instance pricing changes dynamically?"
      }
    ],
    reviews: {
      average: 4.7,
      total: 12,
      distribution: { 5: 10, 4: 2, 3: 0, 2: 0, 1: 0 },
      highlights: ["Cut our AWS EKS bill by 28%", "No bloated agent memory foot"]
    }
  }
];

export const peopleData = [
  {
    id: "u-glass-1",
    name: "Julian Thorne",
    handle: "@julianthorne",
    bio: "Building cloud hardware for AI agents at Glasshand. Formerly systems engineer at Apple.",
    avatar: "JT",
    avatarBg: "from-violet-600 to-indigo-600",
    link: "https://producthunt.com/@julianthorne",
    firstSeenAt: "2026-11-04",
    lastSeenAt: "2026-11-06",
    makers: 1,
    commenters: 1,
    products: [
      { id: "prod-1302121", name: "Glasshand", role: "Maker", date: "Nov 6, 2026", upvotes: 1142 },
      { id: "prod-1302127", name: "VectorPulse", role: "Commenter", date: "Nov 4, 2026", upvotes: 489 }
    ],
    commentsHistory: [
      { product: "Glasshand", text: "We built an automated SMS/2FA relay vault that injects verification codes into the active session via webhook.", time: "3h ago" },
      { product: "VectorPulse", text: "Crucial tool for anyone running production embeddings at scale.", time: "2d ago" }
    ]
  },
  {
    id: "u-orbit-1",
    name: "Maya Chen",
    handle: "@mayac",
    bio: "Co-founder & Product Designer at Orbit Notes. Passionate about local-first software and thoughtful productivity.",
    avatar: "MC",
    avatarBg: "from-purple-600 to-pink-600",
    link: "https://producthunt.com/@mayac",
    firstSeenAt: "2026-11-03",
    lastSeenAt: "2026-11-06",
    makers: 1,
    commenters: 2,
    products: [
      { id: "prod-1302122", name: "Orbit Notes", role: "Maker", date: "Nov 6, 2026", upvotes: 948 },
      { id: "prod-1302124", name: "Draftwise AI", role: "Commenter", date: "Nov 5, 2026", upvotes: 692 },
      { id: "prod-1302126", name: "FrameKit 3.0", role: "Commenter", date: "Nov 4, 2026", upvotes: 512 }
    ],
    commentsHistory: [
      { product: "Orbit Notes", text: "Yes! Orbit Notes sync protocol is 100% open-source and standard E2EE.", time: "4h ago" },
      { product: "Draftwise AI", text: "Love the voice to memo synthesis. Super helpful when walking.", time: "1d ago" }
    ]
  },
  {
    id: "u-orbit-2",
    name: "Daniel Brooks",
    handle: "@danbrooks",
    bio: "Distributed systems architect. Building CRDT sync engines and offline-first apps.",
    avatar: "DB",
    avatarBg: "from-blue-600 to-indigo-600",
    link: "https://producthunt.com/@danbrooks",
    firstSeenAt: "2026-11-03",
    lastSeenAt: "2026-11-06",
    makers: 1,
    commenters: 0,
    products: [
      { id: "prod-1302122", name: "Orbit Notes", role: "Maker", date: "Nov 6, 2026", upvotes: 948 }
    ],
    commentsHistory: [
      { product: "Orbit Notes", text: "We optimized the graph physics engine to handle 20,000 nodes at 120fps.", time: "6h ago" }
    ]
  },
  {
    id: "u-metric-1",
    name: "Noah Williams",
    handle: "@noahw",
    bio: "Indie founder building analytics and telemetry tools for bootstrapped SaaS.",
    avatar: "NW",
    avatarBg: "from-emerald-600 to-teal-700",
    link: "https://producthunt.com/@noahw",
    firstSeenAt: "2026-11-02",
    lastSeenAt: "2026-11-06",
    makers: 1,
    commenters: 2,
    products: [
      { id: "prod-1302123", name: "MetricFlow", role: "Maker", date: "Nov 6, 2026", upvotes: 785 },
      { id: "prod-1302126", name: "FrameKit 3.0", role: "Commenter", date: "Nov 4, 2026", upvotes: 512 },
      { id: "prod-1302125", name: "Sprintboard Studio", role: "Commenter", date: "Nov 5, 2026", upvotes: 588 }
    ],
    commentsHistory: [
      { product: "MetricFlow", text: "Thanks to ClickHouse under the hood, sub-second queries on 5 million transactions are standard.", time: "5h ago" },
      { product: "FrameKit 3.0", text: "Used FrameKit for our MetricFlow launch screenshots. Highly recommended!", time: "2d ago" }
    ]
  },
  {
    id: "u-user-alex",
    name: "Alex Morgan",
    handle: "@alexm",
    bio: "Angel investor and early adopter. Obsessed with high-leverage developer tooling and UX.",
    avatar: "AM",
    avatarBg: "from-sky-500 to-blue-600",
    link: "https://producthunt.com/@alexm",
    firstSeenAt: "2026-11-01",
    lastSeenAt: "2026-11-06",
    makers: 0,
    commenters: 4,
    products: [
      { id: "prod-1302121", name: "Glasshand", role: "Commenter", date: "Nov 6, 2026", upvotes: 1142 },
      { id: "prod-1302122", name: "Orbit Notes", role: "Commenter", date: "Nov 6, 2026", upvotes: 948 },
      { id: "prod-1302123", name: "MetricFlow", role: "Commenter", date: "Nov 6, 2026", upvotes: 785 },
      { id: "prod-1302128", name: "KubeCost Lite", role: "Commenter", date: "Nov 3, 2026", upvotes: 432 }
    ],
    commentsHistory: [
      { product: "Orbit Notes", text: "The graph connection visualization is buttery smooth. Can we self-host the sync server with CouchDB?", time: "5h ago" },
      { product: "Glasshand", text: "Game changer for autonomous end-to-end testing.", time: "3h ago" }
    ]
  },
  {
    id: "u-user-priya",
    name: "Priya Shah",
    handle: "@priyashah",
    bio: "Product designer and design systems consultant. Clean UI advocate.",
    avatar: "PS",
    avatarBg: "from-amber-500 to-rose-600",
    link: "https://producthunt.com/@priyashah",
    firstSeenAt: "2026-11-02",
    lastSeenAt: "2026-11-06",
    makers: 0,
    commenters: 3,
    products: [
      { id: "prod-1302122", name: "Orbit Notes", role: "Commenter", date: "Nov 6, 2026", upvotes: 948 },
      { id: "prod-1302124", name: "Draftwise AI", role: "Commenter", date: "Nov 5, 2026", upvotes: 692 },
      { id: "prod-1302125", name: "Sprintboard Studio", role: "Commenter", date: "Nov 5, 2026", upvotes: 588 }
    ],
    commentsHistory: [
      { product: "Sprintboard Studio", text: "The GitHub PR integration is instant. Excited to test this with our team.", time: "1d ago" }
    ]
  },
  {
    id: "u-draft-1",
    name: "Sofia Rivera",
    handle: "@sofiar",
    bio: "Co-founder at Draftwise AI. Exploring voice interfaces and cognitive scaffolding.",
    avatar: "SR",
    avatarBg: "from-rose-500 to-orange-600",
    link: "https://producthunt.com/@sofiar",
    firstSeenAt: "2026-11-03",
    lastSeenAt: "2026-11-05",
    makers: 1,
    commenters: 1,
    products: [
      { id: "prod-1302124", name: "Draftwise AI", role: "Maker", date: "Nov 5, 2026", upvotes: 692 }
    ],
    commentsHistory: [
      { product: "Draftwise AI", text: "Our mission is to eliminate writer's block forever through structured prompts.", time: "1d ago" }
    ]
  },
  {
    id: "u-sprint-1",
    name: "Ethan Park",
    handle: "@ethanp",
    bio: "Full stack developer. Creating unbloated tools for nimble software squads.",
    avatar: "EP",
    avatarBg: "from-teal-600 to-emerald-700",
    link: "https://producthunt.com/@ethanp",
    firstSeenAt: "2026-11-04",
    lastSeenAt: "2026-11-05",
    makers: 1,
    commenters: 0,
    products: [
      { id: "prod-1302125", name: "Sprintboard Studio", role: "Maker", date: "Nov 5, 2026", upvotes: 588 }
    ],
    commentsHistory: [
      { product: "Sprintboard Studio", text: "Keyboard commands: Cmd+K opens the global switcher; Tab navigates swimlanes.", time: "1d ago" }
    ]
  }
];

export const scrapingRuns = [
  {
    id: "run_2026-11-06_a1b94e82",
    date: "Nov 6, 2026",
    startTime: "06:00:12 AM PST",
    endTime: "06:04:44 AM PST",
    targetDate: "2026-11-05",
    duration: "4m 32s",
    status: "Completed",
    totalLaunches: 24,
    launchesSaved: 24,
    newProducts: 21,
    skippedProducts: 3,
    peopleDiscovered: 86,
    newProfilesSaved: 74,
    skippedProfiles: 12,
    commentsSaved: 284,
    mediaSaved: 108,
    peopleRelationships: 96,
    builtWithSaved: 68,
    errorCount: 0,
    logs: [
      "[INFO] Product Hunt Scraper starting (run_id: run_2026-11-06_a1b94e82)",
      "[INFO] Target Pacific date: 2026-11-05 (force=False, limit=None, flush=False)",
      "[INFO] Ensuring MongoDB indexes across 8 collections...",
      "[INFO] Indexes verified successfully.",
      "[INFO] [pre-flight] Leaderboard hash 8a8f3bb6637e present in configuration.",
      "[INFO] Fetching daily leaderboard for date: 2026-11-05 (page 1, cursor=START)",
      "[INFO] Executing GraphQL operation=LeaderboardDailyPage (attempt 1/6)",
      "[INFO] Retrieved 24 featured launches on page 1.",
      "[INFO] Stage 2: Enriching 24 product launches...",
      "[INFO] [1/24] Enriched product 'Glasshand' (upvotes: 1142, comments: 184)",
      "[INFO] [2/24] Enriched product 'Orbit Notes' (upvotes: 948, comments: 142)",
      "[INFO] [3/24] Enriched product 'MetricFlow' (upvotes: 785, comments: 98)",
      "[INFO] Stage 3: Resolving 86 associated people profiles...",
      "[INFO] Scraper run run_2026-11-06_a1b94e82 completed in 272.14s: 24 launches, 21 new products enriched, 3 skipped."
    ]
  },
  {
    id: "run_2026-11-05_5d9445a0",
    date: "Nov 5, 2026",
    startTime: "06:01:05 AM PST",
    endTime: "06:05:58 AM PST",
    targetDate: "2026-11-04",
    duration: "4m 53s",
    status: "Completed",
    totalLaunches: 22,
    launchesSaved: 22,
    newProducts: 19,
    skippedProducts: 3,
    peopleDiscovered: 79,
    newProfilesSaved: 68,
    skippedProfiles: 11,
    commentsSaved: 247,
    mediaSaved: 94,
    peopleRelationships: 84,
    builtWithSaved: 56,
    errorCount: 0,
    logs: [
      "[INFO] Product Hunt Scraper starting (run_id: run_2026-11-05_5d9445a0)",
      "[INFO] Target Pacific date: 2026-11-04",
      "[INFO] Stage 1 Leaderboard: 22 launches collected.",
      "[INFO] Stage 2 Product Enrichment: 19 new products inserted.",
      "[INFO] Stage 3 Profiles: 68 new maker/commenter profiles stored.",
      "[INFO] Run completed successfully."
    ]
  },
  {
    id: "run_2026-11-04_99e312bc",
    date: "Nov 4, 2026",
    startTime: "06:00:44 AM PST",
    endTime: "06:04:18 AM PST",
    targetDate: "2026-11-03",
    duration: "3m 34s",
    status: "Completed",
    totalLaunches: 18,
    launchesSaved: 18,
    newProducts: 16,
    skippedProducts: 2,
    peopleDiscovered: 64,
    newProfilesSaved: 58,
    skippedProfiles: 6,
    commentsSaved: 198,
    mediaSaved: 82,
    peopleRelationships: 70,
    builtWithSaved: 48,
    errorCount: 0,
    logs: [
      "[INFO] Product Hunt Scraper starting (run_id: run_2026-11-04_99e312bc)",
      "[INFO] Target Pacific date: 2026-11-03",
      "[INFO] Run completed in 214s."
    ]
  },
  {
    id: "run_2026-11-03_f204ba11",
    date: "Nov 3, 2026",
    startTime: "06:02:10 AM PST",
    endTime: "06:06:55 AM PST",
    targetDate: "2026-11-02",
    duration: "4m 45s",
    status: "Completed",
    totalLaunches: 20,
    launchesSaved: 20,
    newProducts: 18,
    skippedProducts: 2,
    peopleDiscovered: 72,
    newProfilesSaved: 63,
    skippedProfiles: 9,
    commentsSaved: 215,
    mediaSaved: 88,
    peopleRelationships: 77,
    builtWithSaved: 51,
    errorCount: 0,
    logs: [
      "[INFO] Product Hunt Scraper starting (run_id: run_2026-11-03_f204ba11)",
      "[INFO] Target Pacific date: 2026-11-02",
      "[INFO] Run finished successfully."
    ]
  },
  {
    id: "run_2026-11-02_88aa33dd",
    date: "Nov 2, 2026",
    startTime: "06:00:19 AM PST",
    endTime: "06:01:22 AM PST",
    targetDate: "2026-11-01",
    duration: "1m 03s",
    status: "Failed",
    totalLaunches: 0,
    launchesSaved: 0,
    newProducts: 0,
    skippedProducts: 0,
    peopleDiscovered: 0,
    newProfilesSaved: 0,
    skippedProfiles: 0,
    commentsSaved: 0,
    mediaSaved: 0,
    peopleRelationships: 0,
    builtWithSaved: 0,
    errorCount: 1,
    logs: [
      "[INFO] Product Hunt Scraper starting (run_id: run_2026-11-02_88aa33dd)",
      "[WARNING] [pre-flight] Temporary network connection timeout reaching frontend/graphql.",
      "[ERROR] [pre-flight] Retried 5 times. Failed with HTTP 504 Gateway Timeout.",
      "[ERROR] Run failed after 63s."
    ]
  }
];

export const weeklyActivity = [
  { day: "Mon", date: "Nov 1", count: 19, height: 60, status: "completed" },
  { day: "Tue", date: "Nov 2", count: 20, height: 65, status: "completed" },
  { day: "Wed", date: "Nov 3", count: 18, height: 55, status: "completed" },
  { day: "Thu", date: "Nov 4", count: 22, height: 75, status: "completed" },
  { day: "Fri", date: "Nov 5", count: 24, height: 85, status: "completed" },
  { day: "Sat", date: "Nov 6", count: 26, height: 95, status: "completed" },
  { day: "Sun", date: "Nov 7", count: 21, height: 70, status: "completed" }
];

export const serverSystemStats = {
  host: "contabo-vps-de-fra-01",
  os: "Ubuntu 24.04 LTS (GNU/Linux 6.8.0-45-generic x86_64)",
  ip: "161.97.142.88",
  uptime: "48 days, 14 hours, 22 minutes",
  cpu: { cores: 4, usagePercent: 12.4, model: "AMD EPYC 7282 16-Core Processor" },
  ram: { totalGB: 8.0, usedGB: 2.3, usagePercent: 28.7 },
  disk: { totalGB: 50.0, usedGB: 14.8, usagePercent: 29.6 },
  mongodb: {
    status: "Connected",
    uri: "mongodb+srv://...cluster0.t9rget6.mongodb.net",
    database: "product_hunt_scraper",
    collectionsCount: 8,
    totalDocuments: 24652
  },
  scraperConfig: {
    targetTimezone: "America/Los_Angeles",
    dailyCron: "0 6 * * * (06:00 PST / 14:00 UTC)",
    headlessBrowser: true,
    requestDelaySeconds: 1.2,
    maxRetries: 5,
    requestTimeoutSeconds: 30
  }
};
