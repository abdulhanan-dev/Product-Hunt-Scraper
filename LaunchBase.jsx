import React, { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, CalendarDays,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown,
  CircleHelp, Clock3, Command, ExternalLink, Filter, Globe2, LayoutDashboard,
  Link2, ListFilter, MessageCircle, MoreHorizontal, Package, Plus, Search,
  Settings, ShieldCheck, Sparkles, Star, Tags, Users, UserRound, X
} from "lucide-react";

/**
 * LaunchBase — Product Hunt data explorer UI prototype
 *
 * Requirements:
 * - React
 * - Tailwind CSS
 * - lucide-react
 *
 * This is a frontend prototype with illustrative local data. Replace the
 * sample arrays and local state with API requests when integrating the backend.
 */

const products = [
  {
    id: "p1", name: "Orbit Notes", tagline: "A calmer workspace for connected thinking",
    description: "Orbit Notes brings notes, tasks, and lightweight knowledge management into one focused workspace. Capture ideas quickly, connect related notes, and turn them into action without a complicated setup.",
    category: "Productivity", date: "Nov 6, 2026", upvotes: 842, comments: 126,
    makers: ["Maya Chen", "Daniel Brooks"], website: "https://example.com/orbit",
    topics: ["Notes", "AI", "Productivity"], rank: 1, status: "Scraped",
    image: "ON", color: "from-violet-500 to-indigo-600",
    commentsPreview: [
      { person: "Alex Morgan", role: "Commenter", time: "2h ago", text: "The linking workflow is surprisingly smooth. Is offline mode on the roadmap?" },
      { person: "Maya Chen", role: "Maker", time: "1h ago", text: "Yes! Offline-first support is one of the next improvements we're working on." },
      { person: "Priya Shah", role: "Commenter", time: "45m ago", text: "Love the focused interface. This feels much lighter than my current setup." }
    ]
  },
  {
    id: "p2", name: "MetricFlow", tagline: "Understand your business metrics at a glance",
    description: "A simple analytics workspace that combines key business metrics, scheduled reports, and shareable dashboards for small teams.",
    category: "Analytics", date: "Nov 6, 2026", upvotes: 691, comments: 94,
    makers: ["Noah Williams"], website: "https://example.com/metricflow",
    topics: ["Analytics", "Dashboards", "SaaS"], rank: 2, status: "Scraped",
    image: "MF", color: "from-cyan-500 to-blue-600",
    commentsPreview: [
      { person: "Noah Williams", role: "Maker", time: "3h ago", text: "Thanks for checking it out. We would love to hear which integrations matter most." },
      { person: "Emma Wilson", role: "Commenter", time: "2h ago", text: "The scheduled reports could save our team a lot of time." }
    ]
  },
  {
    id: "p3", name: "Draftwise", tagline: "Turn rough ideas into polished first drafts",
    description: "Draftwise helps teams shape early ideas into clear documents with reusable writing workflows and shared feedback.",
    category: "Writing", date: "Nov 6, 2026", upvotes: 573, comments: 81,
    makers: ["Sofia Rivera", "Liam Patel"], website: "https://example.com/draftwise",
    topics: ["Writing", "Collaboration", "AI"], rank: 3, status: "Scraped",
    image: "Dw", color: "from-amber-500 to-orange-600",
    commentsPreview: [
      { person: "Sofia Rivera", role: "Maker", time: "4h ago", text: "Our goal was to make the blank page feel less intimidating." },
      { person: "Oliver Reed", role: "Commenter", time: "3h ago", text: "Would be useful to have team templates. Great launch!" }
    ]
  },
  {
    id: "p4", name: "Sprintboard", tagline: "A lightweight planning space for small teams",
    description: "A clean team planning tool for prioritizing work, tracking progress, and keeping weekly goals visible.",
    category: "Developer Tools", date: "Nov 5, 2026", upvotes: 468, comments: 62,
    makers: ["Ethan Park"], website: "https://example.com/sprintboard",
    topics: ["Planning", "Teams"], rank: 4, status: "Scraped",
    image: "SB", color: "from-emerald-500 to-teal-600",
    commentsPreview: [{ person: "Ethan Park", role: "Maker", time: "1d ago", text: "Appreciate the feedback. We are keeping the product intentionally simple." }]
  },
  {
    id: "p5", name: "FrameKit", tagline: "Create consistent product visuals in minutes",
    description: "A toolkit for generating polished product screenshots and visual assets with reusable layouts.",
    category: "Design Tools", date: "Nov 5, 2026", upvotes: 392, comments: 49,
    makers: ["Ava Thompson"], website: "https://example.com/framekit",
    topics: ["Design", "Images"], rank: 5, status: "Scraped",
    image: "FK", color: "from-pink-500 to-rose-600",
    commentsPreview: [{ person: "Ava Thompson", role: "Maker", time: "1d ago", text: "We are adding more export presets this week." }]
  }
];

const people = [
  { id: "u1", name: "Maya Chen", handle: "@mayac", bio: "Co-founder building calmer productivity tools.", products: [{ name: "Orbit Notes", role: "Maker" }], comments: 3, makers: 1, commenters: 2, link: "https://example.com/maya", initials: "MC" },
  { id: "u2", name: "Daniel Brooks", handle: "@danbrooks", bio: "Product builder interested in connected knowledge.", products: [{ name: "Orbit Notes", role: "Maker" }], comments: 1, makers: 1, commenters: 0, link: "https://example.com/daniel", initials: "DB" },
  { id: "u3", name: "Alex Morgan", handle: "@alexm", bio: "Founder and early-stage product enthusiast.", products: [{ name: "Orbit Notes", role: "Commenter" }, { name: "MetricFlow", role: "Commenter" }], comments: 7, makers: 0, commenters: 2, link: "https://example.com/alex", initials: "AM" },
  { id: "u4", name: "Noah Williams", handle: "@noahw", bio: "Building analytics products for growing teams.", products: [{ name: "MetricFlow", role: "Maker" }], comments: 2, makers: 1, commenters: 1, link: "https://example.com/noah", initials: "NW" },
  { id: "u5", name: "Priya Shah", handle: "@priyashah", bio: "Designer exploring better ways to work.", products: [{ name: "Orbit Notes", role: "Commenter" }, { name: "Draftwise", role: "Commenter" }], comments: 5, makers: 0, commenters: 2, link: "https://example.com/priya", initials: "PS" },
  { id: "u6", name: "Sofia Rivera", handle: "@sofiar", bio: "Co-founder focused on thoughtful writing tools.", products: [{ name: "Draftwise", role: "Maker" }], comments: 2, makers: 1, commenters: 1, link: "https://example.com/sofia", initials: "SR" },
  { id: "u7", name: "Emma Wilson", handle: "@emmaw", bio: "Startup operator and curious maker.", products: [{ name: "MetricFlow", role: "Commenter" }], comments: 4, makers: 0, commenters: 1, link: "https://example.com/emma", initials: "EW" },
  { id: "u8", name: "Ethan Park", handle: "@ethanp", bio: "Developer creating tools for focused teams.", products: [{ name: "Sprintboard", role: "Maker" }], comments: 1, makers: 1, commenters: 0, link: "https://example.com/ethan", initials: "EP" }
];

const runs = [
  { date: "Nov 7, 2026", time: "06:05 AM", status: "Completed", products: 18, people: 74, comments: 231, duration: "04m 32s" },
  { date: "Nov 6, 2026", time: "06:04 AM", status: "Completed", products: 21, people: 89, comments: 286, duration: "05m 11s" },
  { date: "Nov 5, 2026", time: "06:03 AM", status: "Completed", products: 16, people: 62, comments: 194, duration: "03m 58s" },
  { date: "Nov 4, 2026", time: "06:04 AM", status: "Completed", products: 19, people: 81, comments: 247, duration: "04m 49s" },
  { date: "Nov 3, 2026", time: "06:02 AM", status: "Completed", products: 14, people: 57, comments: 166, duration: "03m 41s" }
];

const cn = (...classes) => classes.filter(Boolean).join(" ");

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-slate-100 text-slate-600",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700"
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

function Avatar({ initials, size = "md" }) {
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-14 w-14 text-sm" };
  return <div className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 font-semibold text-indigo-700", sizes[size])}>{initials}</div>;
}

function StatCard({ label, value, change, icon: Icon, tone = "violet" }) {
  const iconTone = tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "green" ? "bg-emerald-50 text-emerald-600" : tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
      <div className="flex items-start justify-between">
        <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div>
        <div className={cn("rounded-xl p-3", iconTone)}><Icon size={19} /></div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600"><ArrowUpRight size={14} />{change}<span className="text-slate-400">vs. previous day</span></div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}</div>{action}</div>;
}

function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-50" /></div>;
}

function ProductMark({ product, size = "md" }) {
  const sizes = size === "lg" ? "h-16 w-16 rounded-2xl text-lg" : "h-12 w-12 rounded-xl text-sm";
  return <div className={cn("flex shrink-0 items-center justify-center bg-gradient-to-br font-bold text-white shadow-sm", product.color, sizes)}>{product.image}</div>;
}

function Sidebar({ page, setPage }) {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: Package, count: "18" },
    { id: "persons", label: "Persons", icon: Users, count: "74" },
    { id: "history", label: "Scraping History", icon: Clock3 }
  ];
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
    <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"><Sparkles size={19} /></div><div><p className="text-[15px] font-bold tracking-tight text-slate-900">LaunchBase</p><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Data Explorer</p></div></div>
    <div className="px-4 pt-7"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p><nav className="space-y-1">{nav.map(item => <button key={item.id} onClick={() => setPage(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition", page === item.id ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}><item.icon size={18} /><span className="flex-1">{item.label}</span>{item.count && <span className={cn("rounded-md px-2 py-0.5 text-[11px]", page === item.id ? "bg-white text-violet-700" : "bg-slate-100 text-slate-500")}>{item.count}</span>}</button>)}</nav></div>
    <div className="mt-auto p-4"><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck size={16} className="text-violet-600" />Data collection</div><p className="mt-2 text-xs leading-5 text-slate-500">Your daily Product Hunt collection is running automatically.</p><div className="mt-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-medium text-emerald-700">Scheduler active</span></div></div><button className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"><Settings size={17} />Settings</button><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"><CircleHelp size={17} />Help & support</button></div>
  </aside>;
}

function Topbar({ title, mobileMenu }) {
  return <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button onClick={mobileMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Command size={18} /></button><div className="hidden text-sm text-slate-400 sm:block">Workspace <span className="mx-2">/</span></div><span className="text-sm font-medium text-slate-700">{title}</span></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 md:flex"><Search size={13} />Quick search <kbd className="ml-3 rounded border border-slate-200 px-1.5 py-0.5">⌘ K</kbd></div><button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-500" /></button><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">LB</div></div></header>;
}

function Dashboard({ setPage, openProduct }) {
  return <div>
    <SectionHeading eyebrow="Overview" title="Good morning, welcome back" description="Here is what's happening with your Product Hunt data." action={<button onClick={() => setPage("history")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><CalendarDays size={16} />View scraping history</button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Products collected" value="1,284" change="+12.8%" icon={Package} />
      <StatCard label="Unique persons" value="6,492" change="+8.4%" icon={Users} tone="blue" />
      <StatCard label="Comments captured" value="18,306" change="+16.2%" icon={MessageCircle} tone="green" />
      <StatCard label="Latest run" value="06:05 AM" change="Completed today" icon={Activity} tone="amber" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Collection activity</h2><p className="mt-1 text-xs text-slate-500">Products collected over the last 7 days</p></div><Badge tone="green">+14.6% this week</Badge></div>
        <div className="mt-7 flex h-48 items-end justify-between gap-3 border-b border-slate-100 px-2">
          {[42, 66, 52, 78, 60, 88, 72].map((v, i) => <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-violet-600 to-indigo-400 transition hover:opacity-80" style={{ height: `${v}%` }} /><span className="mb-[-25px] text-[10px] text-slate-400">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span></div>)}
        </div>
        <div className="mt-9 flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-sm bg-violet-500" />Products collected <span className="ml-auto">Illustrative activity</span></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Latest scraping run</h2><p className="mt-1 text-xs text-slate-500">Daily automated collection</p></div><Badge tone="green"><CheckCircle2 size={12} className="mr-1" />Completed</Badge></div>
        <div className="mt-6 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">November 7, 2026</span><span className="text-xs font-medium text-slate-700">06:05 AM</span></div><div className="mt-4 grid grid-cols-3 gap-2"><div><p className="text-xl font-semibold text-slate-900">18</p><p className="text-[11px] text-slate-500">Products</p></div><div><p className="text-xl font-semibold text-slate-900">74</p><p className="text-[11px] text-slate-500">Persons</p></div><div><p className="text-xl font-semibold text-slate-900">231</p><p className="text-[11px] text-slate-500">Comments</p></div></div></div>
        <div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-500">Run duration</span><span className="font-medium text-slate-700">4m 32s</span></div><button onClick={() => setPage("history")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">See all runs <ChevronRight size={15} /></button>
      </div>
    </div>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Yesterday's top products</h2><p className="mt-1 text-xs text-slate-500">A quick look at the latest collected launches</p></div><button onClick={() => setPage("products")} className="text-sm font-medium text-violet-700 hover:text-violet-900">View all products <ArrowUpRight size={14} className="ml-1 inline" /></button></div>
      <div className="divide-y divide-slate-100">{products.slice(0, 3).map(p => <button key={p.id} onClick={() => openProduct(p)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50/70"><ProductMark product={p} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{p.name}</p><p className="truncate text-xs text-slate-500">{p.tagline}</p></div><div className="hidden items-center gap-4 text-xs text-slate-500 sm:flex"><span className="flex items-center gap-1"><ArrowUpRight size={13} />{p.upvotes}</span><span className="flex items-center gap-1"><MessageCircle size={13} />{p.comments}</span></div><ChevronRight size={16} className="text-slate-300" /></button>)}</div>
    </div>
  </div>;
}

function ProductsPage({ openProduct }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const filtered = useMemo(() => products.filter(p => (p.name + p.tagline + p.category).toLowerCase().includes(query.toLowerCase()) && (category === "All categories" || p.category === category)), [query, category]);
  const categories = ["All categories", ...new Set(products.map(p => p.category))];
  return <div>
    <SectionHeading eyebrow="Discovery" title="Products" description="Browse every product collected by your daily Product Hunt scraper." action={<Badge tone="violet">1,284 total products</Badge>} />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"><div className="flex-1"><SearchBox value={query} onChange={setQuery} placeholder="Search products by name, description or category..." /></div><select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-violet-300"><option>All categories</option>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><Filter size={15} />Filters</button></div>
    <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {filtered.length} sample products</span><button className="inline-flex items-center gap-1">Sort: Most upvoted <ChevronDown size={13} /></button></div>
    <div className="grid gap-4 xl:grid-cols-2">{filtered.map(p => <button key={p.id} onClick={() => openProduct(p)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-100/60 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><div className="flex items-start gap-3"><ProductMark product={p} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{p.name}</h3><Badge tone="violet">{p.category}</Badge></div><p className="mt-1 text-sm text-slate-500">{p.tagline}</p></div><MoreHorizontal size={18} className="text-slate-400" /></div><div className="mt-4 flex flex-wrap gap-2">{p.topics.map(t => <Badge key={t}>{t}</Badge>)}</div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><div className="flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><ArrowUpRight size={14} />{p.upvotes} upvotes</span><span className="flex items-center gap-1"><MessageCircle size={14} />{p.comments} comments</span></div><span className="text-xs text-slate-400">{p.date}</span></div><div className="mt-3 flex items-center justify-between"><div className="flex -space-x-2">{p.makers.slice(0, 3).map((m, i) => <div key={m} title={m} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[9px] font-semibold text-indigo-700">{m.split(" ").map(x => x[0]).join("")}</div>)}</div><span className="text-xs font-medium text-violet-700">View product details <ChevronRight size={13} className="ml-1 inline" /></span></div></button>)}</div>
    {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No products match your search.</div>}
  </div>;
}

function ProductDetail({ product, goBack, openPerson }) {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "Comments", "Makers", "Reviews"];
  return <div>
    <button onClick={goBack} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700"><ChevronLeft size={16} />Back to products</button>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row"><ProductMark product={product} size="lg" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone="violet">{product.category}</Badge><Badge tone="green">Scraped</Badge><span className="text-xs text-slate-400">Launched {product.date}</span></div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{product.name}</h1><p className="mt-1 text-sm text-slate-500">{product.tagline}</p><div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600"><span className="flex items-center gap-1.5"><ArrowUpRight size={16} />{product.upvotes} upvotes</span><span className="flex items-center gap-1.5"><MessageCircle size={16} />{product.comments} comments</span><span className="flex items-center gap-1.5"><Users size={16} />{product.makers.length} makers</span></div></div><a href={product.website} target="_blank" rel="noreferrer" className="inline-flex h-fit items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">Visit website <ExternalLink size={14} /></a></div>
      <div className="mt-7 flex gap-6 overflow-x-auto border-b border-slate-100">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 pb-3 text-sm font-medium", tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-800")}>{t}</button>)}</div>
      {tab === "Overview" && <div className="grid gap-8 py-6 lg:grid-cols-[1.5fr_1fr]"><div><h3 className="font-semibold text-slate-900">About this product</h3><p className="mt-3 text-sm leading-7 text-slate-600">{product.description}</p><h3 className="mt-7 font-semibold text-slate-900">Topics</h3><div className="mt-3 flex flex-wrap gap-2">{product.topics.map(t => <Badge key={t} tone="violet">{t}</Badge>)}</div><h3 className="mt-7 font-semibold text-slate-900">Recent discussion</h3><div className="mt-3 space-y-3">{product.commentsPreview.slice(0, 2).map((c, i) => <div key={i} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-800">{c.person}</span><span className="text-xs text-slate-400">{c.time}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{c.text}</p></div>)}</div></div><div><h3 className="font-semibold text-slate-900">Makers</h3><div className="mt-3 space-y-3">{product.makers.map(name => <button key={name} onClick={() => openPerson(people.find(p => p.name === name) || people[0])} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200"><Avatar initials={name.split(" ").map(x => x[0]).join("")} /><div className="flex-1"><p className="text-sm font-medium text-slate-800">{name}</p><p className="text-xs text-slate-400">Product maker</p></div><Badge tone="violet">Maker</Badge></button>)}</div><div className="mt-6 rounded-xl bg-violet-50 p-4"><p className="text-sm font-semibold text-violet-900">Source information</p><p className="mt-1 text-xs leading-5 text-violet-700">Collected from the public product listing and its available discussion data.</p><p className="mt-3 text-xs text-violet-700">Product Hunt URL <ExternalLink size={12} className="ml-1 inline" /></p></div></div></div>}
      {tab === "Comments" && <div className="space-y-3 py-6">{product.commentsPreview.map((c, i) => <div key={i} className="flex gap-3 rounded-xl border border-slate-100 p-4"><Avatar initials={c.person.split(" ").map(x => x[0]).join("")} size="sm" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-800">{c.person}</p><Badge tone={c.role === "Maker" ? "violet" : "blue"}>{c.role}</Badge><span className="ml-auto text-xs text-slate-400">{c.time}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{c.text}</p></div></div>)}</div>}
      {tab === "Makers" && <div className="grid gap-3 py-6 sm:grid-cols-2">{product.makers.map(name => <button key={name} onClick={() => openPerson(people.find(p => p.name === name) || people[0])} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 text-left hover:border-violet-200"><Avatar initials={name.split(" ").map(x => x[0]).join("")} /><div className="flex-1"><p className="text-sm font-semibold text-slate-800">{name}</p><p className="text-xs text-slate-400">Public profile available</p></div><Badge tone="violet">Maker</Badge></button>)}</div>}
      {tab === "Reviews" && <div className="py-12 text-center"><Star size={25} className="mx-auto text-amber-400" /><h3 className="mt-3 font-semibold text-slate-800">Review data</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Connect this tab to review or rating data if your scraper captures a distinct review type. Product Hunt discussions are shown in the Comments tab.</p></div>}
    </div>
  </div>;
}

function PersonsPage({ openPerson }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All persons");
  const filtered = people.filter(p => (p.name + p.handle + p.bio).toLowerCase().includes(query.toLowerCase()) && (role === "All persons" || (role === "Makers" ? p.makers > 0 : p.commenters > 0)));
  return <div>
    <SectionHeading eyebrow="Community" title="Persons" description="A unified directory of unique makers and commenters found across collected products." action={<Badge tone="blue">6,492 unique persons</Badge>} />
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 md:flex-row"><div className="flex-1"><SearchBox value={query} onChange={setQuery} placeholder="Search people by name or username..." /></div><div className="flex rounded-xl bg-slate-100 p-1">{["All persons", "Makers", "Commenters"].map(r => <button key={r} onClick={() => setRole(r)} className={cn("rounded-lg px-3 py-2 text-xs font-medium transition", role === r ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800")}>{r}</button>)}</div></div></div>
    <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>{filtered.length} sample profiles</span><span>Sorted by recently active</span></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/60"><div className="hidden grid-cols-[1.5fr_1fr_1fr_100px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400 md:grid"><span>Person</span><span>Product relationships</span><span>Activity</span><span></span></div>{filtered.map(p => <button key={p.id} onClick={() => openPerson(p)} className="grid w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-0 hover:bg-slate-50/70 md:grid-cols-[1.5fr_1fr_1fr_100px] md:items-center md:gap-4"><div className="flex items-center gap-3"><Avatar initials={p.initials} /><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{p.name}</p><p className="text-xs text-slate-400">{p.handle}</p></div></div><div className="flex flex-wrap gap-1.5">{p.makers > 0 && <Badge tone="violet">Maker · {p.makers}</Badge>}{p.commenters > 0 && <Badge tone="blue">Commenter · {p.commenters}</Badge>}</div><div className="text-xs text-slate-500"><span className="font-medium text-slate-700">{p.products.length}</span> products <span className="mx-1 text-slate-300">·</span><span className="font-medium text-slate-700">{p.comments}</span> comments</div><span className="text-xs font-medium text-violet-700">View profile <ChevronRight size={13} className="ml-1 inline" /></span></button>)}</div>
    {filtered.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No people match your search.</div>}
  </div>;
}

function PersonDetail({ person, goBack, openProduct }) {
  return <div>
    <button onClick={goBack} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700"><ChevronLeft size={16} />Back to persons</button>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><Avatar initials={person.initials} size="lg" /><div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{person.name}</h1><p className="mt-1 text-sm text-slate-500">{person.handle}</p><p className="mt-2 text-sm text-slate-600">{person.bio}</p><div className="mt-3 flex flex-wrap gap-2">{person.makers > 0 && <Badge tone="violet">Maker</Badge>}{person.commenters > 0 && <Badge tone="blue">Commenter</Badge>}</div></div><a href={person.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Public profile <ExternalLink size={14} /></a></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Products associated</p><p className="mt-1 text-2xl font-semibold text-slate-900">{person.products.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Maker relationships</p><p className="mt-1 text-2xl font-semibold text-slate-900">{person.makers}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Comments captured</p><p className="mt-1 text-2xl font-semibold text-slate-900">{person.comments}</p></div></div>
      <div className="mt-8"><div className="mb-4"><h2 className="font-semibold text-slate-900">Product relationships</h2><p className="mt-1 text-xs text-slate-500">A person can have multiple roles across multiple products.</p></div><div className="space-y-3">{person.products.map((rel, i) => { const p = products.find(x => x.name === rel.name); return <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{rel.name.split(" ").map(x => x[0]).join("")}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{rel.name}</p><p className="text-xs text-slate-400">{rel.role === "Maker" ? "Created / launched this product" : "Participated in the product discussion"}</p></div><Badge tone={rel.role === "Maker" ? "violet" : "blue"}>{rel.role}</Badge>{p && <button onClick={() => openProduct(p)} className="text-xs font-medium text-violet-700 hover:text-violet-900">Open <ChevronRight size={13} className="inline" /></button>}</div>; })}</div></div>
    </div>
  </div>;
}

function HistoryPage() {
  return <div>
    <SectionHeading eyebrow="Automation" title="Scraping history" description="Monitor daily collection runs and review how much data was captured." action={<Badge tone="green"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />Scheduler active</Badge>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Successful runs" value="30" change="100% success rate" icon={CheckCircle2} tone="green" /><StatCard label="Products this month" value="524" change="+9.2%" icon={Package} /><StatCard label="People discovered" value="2,108" change="+11.7%" icon={Users} tone="blue" /></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/60"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-900">Recent runs</h2><p className="mt-1 text-xs text-slate-500">Most recent scraper executions</p></div><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"><ListFilter size={14} />Filter</button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-slate-50/70 text-[10px] uppercase tracking-[0.13em] text-slate-400"><tr>{["Run date", "Status", "Products", "Persons", "Comments", "Duration", ""].map(h => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{runs.map((r, i) => <tr key={i} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="text-sm font-medium text-slate-800">{r.date}</p><p className="mt-0.5 text-xs text-slate-400">{r.time}</p></td><td className="px-5 py-4"><Badge tone="green"><CheckCircle2 size={12} className="mr-1" />{r.status}</Badge></td><td className="px-5 py-4 text-sm text-slate-600">{r.products}</td><td className="px-5 py-4 text-sm text-slate-600">{r.people}</td><td className="px-5 py-4 text-sm text-slate-600">{r.comments}</td><td className="px-5 py-4 text-sm text-slate-600">{r.duration}</td><td className="px-5 py-4 text-right"><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500"><span>Showing 5 of 30 runs</span><div className="flex gap-2"><button className="rounded-lg border border-slate-200 p-1.5"><ChevronLeft size={14} /></button><button className="rounded-lg border border-slate-200 p-1.5"><ChevronRight size={14} /></button></div></div></div>
  </div>;
}

export default function LaunchBase() {
  const [page, setPage] = useState("dashboard");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const openProduct = product => { setSelectedProduct(product); setSelectedPerson(null); setPage("product-detail"); };
  const openPerson = person => { setSelectedPerson(person); setSelectedProduct(null); setPage("person-detail"); };
  const goBackProducts = () => { setSelectedProduct(null); setPage("products"); };
  const goBackPersons = () => { setSelectedPerson(null); setPage("persons"); };
  const pageTitle = ({ dashboard: "Dashboard", products: "Products", persons: "Persons", history: "Scraping History", "product-detail": "Product details", "person-detail": "Person profile" })[page];

  return <div className="min-h-screen bg-[#f7f8fc] font-sans text-slate-900">
    <Sidebar page={page} setPage={setPage} />
    {mobileNav && <div className="fixed inset-0 z-50 bg-slate-900/30 lg:hidden" onClick={() => setMobileNav(false)}><div className="h-full w-72 bg-white p-5" onClick={e => e.stopPropagation()}><div className="mb-6 flex items-center justify-between"><span className="font-bold">LaunchBase</span><button onClick={() => setMobileNav(false)}><X size={18} /></button></div>{[{id:"dashboard",label:"Dashboard"},{id:"products",label:"Products"},{id:"persons",label:"Persons"},{id:"history",label:"Scraping History"}].map(n => <button key={n.id} onClick={() => {setPage(n.id);setMobileNav(false);}} className={cn("block w-full rounded-xl px-3 py-3 text-left text-sm",page===n.id?"bg-violet-50 text-violet-700":"text-slate-600")}>{n.label}</button>)}</div></div>}
    <div className="lg:pl-64"><Topbar title={pageTitle} mobileMenu={() => setMobileNav(true)} /><main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8 sm:py-9">
      {page === "dashboard" && <Dashboard setPage={setPage} openProduct={openProduct} />}
      {page === "products" && <ProductsPage openProduct={openProduct} />}
      {page === "product-detail" && selectedProduct && <ProductDetail product={selectedProduct} goBack={goBackProducts} openPerson={openPerson} />}
      {page === "persons" && <PersonsPage openPerson={openPerson} />}
      {page === "person-detail" && selectedPerson && <PersonDetail person={selectedPerson} goBack={goBackPersons} openProduct={openProduct} />}
      {page === "history" && <HistoryPage />}
      <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row"><span>© 2026 LaunchBase · Product Hunt Data Explorer</span><span>Prototype interface · Sample data for demonstration</span></footer>
    </main></div>
  </div>;
}
