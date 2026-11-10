"""FastAPI backend for Product Hunt Scraper — serves real MongoDB data and live streaming logs."""

from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timezone
import json
import logging
import os
import subprocess
import sys
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pymongo import MongoClient, ASCENDING, DESCENDING

from utils import get_pacific_yesterday

# ---------------------------------------------------------------------------
# DB connection
# ---------------------------------------------------------------------------
_MONGODB_URI = os.getenv("MONGODB_URI", "")
_MONGODB_DB  = os.getenv("MONGODB_DATABASE", "product_hunt_scraper")

if not _MONGODB_URI:
    from dotenv import dotenv_values
    _env = dotenv_values(".env")
    _MONGODB_URI = _env.get("MONGODB_URI", "mongodb://localhost:27017")
    _MONGODB_DB  = _env.get("MONGODB_DATABASE", "product_hunt_scraper")

_client = MongoClient(_MONGODB_URI, serverSelectionTimeoutMS=5000)
_db     = _client[_MONGODB_DB]

# ---------------------------------------------------------------------------
# App & Real-Time Log Hub
# ---------------------------------------------------------------------------
class LogHub:
    """In-memory event hub and broadcast queue for live logs across scraper, backend, and frontend."""

    def __init__(self, maxlen: int = 500):
        self.subscribers: set[asyncio.Queue] = set()
        self.history: deque = deque(maxlen=maxlen)
        self._counter = 0

    def push(self, source: str, level: str, text: str, meta: Optional[dict] = None) -> dict:
        self._counter += 1
        entry = {
            "id": self._counter,
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "source": source.lower(),  # "scraper", "backend", "frontend", "system"
            "level": level.upper(),    # "INFO", "SUCCESS", "WARNING", "ERROR"
            "text": text,
            "meta": meta or {},
        }
        self.history.append(entry)

        # Notify active SSE subscribers
        for q in list(self.subscribers):
            try:
                q.put_nowait(entry)
            except Exception:
                pass
        return entry

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self.subscribers.discard(q)

log_hub = LogHub()


class HubLogHandler(logging.Handler):
    """Bridges standard python log messages to the real-time LogHub."""
    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = record.getMessage()
            name = record.name.lower()
            if any(k in name for k in ["scraper", "parsers", "main", "client", "extract", "test"]):
                source = "scraper"
            elif any(k in name for k in ["uvicorn", "fastapi", "api"]):
                source = "backend"
            else:
                source = "backend"

            lvl = record.levelname
            if lvl == "WARN":
                lvl = "WARNING"

            log_hub.push(source=source, level=lvl, text=msg)
        except Exception:
            pass

# Attach hub handler to root logger
_hub_handler = HubLogHandler()
_hub_handler.setLevel(logging.INFO)
logging.getLogger().addHandler(_hub_handler)
logging.getLogger("uvicorn.error").addHandler(_hub_handler)
logging.getLogger("uvicorn.access").addHandler(_hub_handler)

app = FastAPI(title="Product Hunt Scraper API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    path = request.url.path
    if path in {"/api/logs/stream", "/api/health"}:
        return await call_next(request)

    start = time.time()
    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)
        level = "ERROR" if response.status_code >= 500 else "WARNING" if response.status_code >= 400 else "INFO"
        log_hub.push(
            source="backend",
            level=level,
            text=f"{request.method} {path} [{response.status_code}] ({duration_ms}ms)",
        )
        return response
    except Exception as exc:
        duration_ms = round((time.time() - start) * 1000, 1)
        log_hub.push(
            source="backend",
            level="ERROR",
            text=f"{request.method} {path} failed: {exc} ({duration_ms}ms)",
        )
        raise

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _clean(doc: dict) -> dict:
    """Remove MongoDB _id and convert ObjectId to str."""
    if doc is None:
        return {}
    doc.pop("_id", None)
    return doc


def _clean_list(docs: list) -> list:
    for d in docs:
        d.pop("_id", None)
    return docs


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "db": _MONGODB_DB}


@app.get("/api/stats")
def get_stats():
    """Dashboard summary stats from real collections."""
    try:
        launches_count   = _db.launches.count_documents({})
        products_count   = _db.products.count_documents({})
        comments_count   = _db.comments.count_documents({})
        reviews_count    = _db.reviews.count_documents({})
        profiles_count   = _db.profiles.count_documents({})
        runs_count       = _db.scraper_runs.count_documents({})
        runs_ok          = _db.scraper_runs.count_documents({"status": "SUCCESS"})

        # Unique scraped dates
        dates = _db.launches.distinct("target_date")

        # Latest run
        latest_run = _db.scraper_runs.find_one(
            {}, sort=[("started_at", DESCENDING)]
        )
        if latest_run:
            _clean(latest_run)

        return {
            "launches":  launches_count,
            "products":  products_count,
            "comments":  comments_count,
            "reviews":   reviews_count,
            "profiles":  profiles_count,
            "runs":      runs_count,
            "runs_success": runs_ok,
            "dates_scraped": sorted(dates, reverse=True),
            "latest_run": latest_run,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dates")
def get_scraped_dates():
    """Return all dates that have scraped data, sorted newest first."""
    try:
        dates = sorted(_db.launches.distinct("target_date"), reverse=True)
        # Return with launch counts per date
        result = []
        for d in dates:
            count = _db.launches.count_documents({"target_date": d})
            result.append({"date": d, "count": count})
        return {"dates": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/products")
def get_products(
    date: Optional[str] = Query(None, description="YYYY-MM-DD target date"),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    sort: str = Query("rank"),   # rank | score | comments
):
    """Get products for a specific date, ranked."""
    try:
        # Build launch query
        launch_query: Dict[str, Any] = {}
        if date:
            launch_query["target_date"] = date

        launches = list(
            _db.launches.find(launch_query)
            .skip(skip)
            .limit(limit * 3)  # over-fetch to sort correctly after int conversion
        )
        _clean_list(launches)

        # Sort correctly — rank/weekly_rank are stored as strings in some runs
        def _int_or_big(v):
            try: return int(v)
            except: return 9999

        if sort == "rank":
            launches.sort(key=lambda x: _int_or_big(x.get("rank")))
        elif sort == "score":
            launches.sort(key=lambda x: -(x.get("score") or 0))
        else:
            launches.sort(key=lambda x: -(x.get("comments_count") or 0))

        launches = launches[:limit]

        # Enrich each launch with product details
        enriched = []
        for launch in launches:
            product_id = launch.get("product_id")
            product_slug = launch.get("product_slug") or launch.get("post_slug")

            product = None
            if product_id:
                product = _db.products.find_one({"product_id": str(product_id)})
            if not product and product_slug:
                product = _db.products.find_one({"slug": product_slug})

            if product:
                _clean(product)

            makers = []
            if product_id:
                makers = list(_db.product_people.find(
                    {"product_id": str(product_id), "role": "maker"},
                    {"username": 1, "name": 1, "avatar_url": 1, "headline": 1, "_id": 0}
                ))

            enriched.append({
                **launch,
                "product": product or {},
                "makers": makers,
            })

        total = _db.launches.count_documents(launch_query)
        return {"products": enriched, "total": total, "date": date}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/products/{slug}")
def get_product_detail(slug: str):
    """Full product detail — product, launch info, makers, comments (nested), reviews (all)."""
    try:
        # Find product by slug or post_slug
        product = _db.products.find_one({"slug": slug})
        if not product:
            # try matching via launches post_slug
            launch_match = _db.launches.find_one({"$or": [{"post_slug": slug}, {"product_slug": slug}]})
            if launch_match:
                pid = launch_match.get("product_id")
                if pid:
                    product = _db.products.find_one({"product_id": str(pid)})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product '{slug}' not found")
        _clean(product)

        product_id = product.get("product_id", "")

        # Latest launch record
        launch = _db.launches.find_one(
            {"$or": [
                {"product_id": str(product_id)},
                {"product_slug": slug},
                {"post_slug": slug},
            ]},
            sort=[("target_date", DESCENDING)]
        )
        if launch:
            _clean(launch)

        # Makers & hunters
        people = list(_db.product_people.find({"product_id": str(product_id)}, {"_id": 0}))

        # Media
        media = list(_db.product_media.find({"product_id": str(product_id)}, {"_id": 0}))

        # Built with
        built_with = list(_db.product_built_with.find({"product_id": str(product_id)}, {"_id": 0}))

        # --- ALL comments, nested into a tree ---
        # Fetch every comment for this product (no limit)
        all_comments_flat = list(_db.comments.find(
            {"product_id": str(product_id)},
            {"_id": 0}
        ).sort("votes_count", DESCENDING))

        # Build id→comment map and thread tree
        comment_map: Dict[str, Any] = {}
        for c in all_comments_flat:
            c["replies"] = []
            comment_map[str(c["comment_id"])] = c

        top_level = []
        for c in all_comments_flat:
            parent_id = c.get("parent_comment_id")
            if parent_id and str(parent_id) in comment_map:
                comment_map[str(parent_id)]["replies"].append(c)
            else:
                top_level.append(c)

        # Sort top-level by votes desc
        top_level.sort(key=lambda x: -(x.get("votes_count") or 0))

        # --- ALL reviews (no limit) ---
        all_reviews = list(_db.reviews.find(
            {"product_id": str(product_id)},
            {"_id": 0}
        ).sort("votes_count", DESCENDING))

        # Summary stats
        ratings = [r["rating"] for r in all_reviews if r.get("rating")]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0
        dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r in ratings:
            k = max(1, min(5, int(round(r))))
            dist[k] = dist.get(k, 0) + 1

        return {
            "product":        product,
            "launch":         launch or {},
            "people":         people,
            "media":          media,
            "built_with":     built_with,
            "comments":       top_level,
            "comments_total": len(all_comments_flat),
            "reviews":        all_reviews,
            "reviews_total":  len(all_reviews),
            "reviews_avg":    avg_rating,
            "reviews_dist":   dist,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profiles/{username}")
def get_profile(username: str):
    """Full profile detail — profile + products they made + comments they wrote."""
    try:
        profile = _db.profiles.find_one(
            {"username": username.lower()}, {"_id": 0}
        )
        if not profile:
            raise HTTPException(status_code=404, detail=f"Profile '{username}' not found")

        user_id = profile.get("user_id", "")

        # Products this person made (role = maker in product_people)
        made = list(_db.product_people.find(
            {"username": username.lower(), "role": "maker"},
            {"product_id": 1, "_id": 0}
        ))
        product_ids = [m["product_id"] for m in made if m.get("product_id")]

        made_products = []
        for pid in product_ids[:20]:
            # Get launch record for upvote score + rank
            launch = _db.launches.find_one(
                {"product_id": str(pid)},
                {"name": 1, "tagline": 1, "score": 1, "rank": 1,
                 "logo_uuid": 1, "product_slug": 1, "post_slug": 1,
                 "topics": 1, "target_date": 1, "_id": 0}
            )
            if launch:
                made_products.append(launch)

        # Comments written by this user (top 20 by votes)
        comments = list(_db.comments.find(
            {"author_username": username.lower()},
            {"body_html": 1, "votes_count": 1, "post_slug": 1,
             "product_id": 1, "created_at": 1, "_id": 0}
        ).sort("votes_count", DESCENDING).limit(20))

        return {
            "profile":       profile,
            "made_products": made_products,
            "comments":      comments,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/runs")
def get_runs(limit: int = Query(20, le=100)):
    """Return scraper run history."""
    try:
        runs = list(
            _db.scraper_runs.find({}, {"_id": 0})
            .sort("started_at", DESCENDING)
            .limit(limit)
        )
        return {"runs": runs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/runs/{run_id}")
def get_run_detail(run_id: str):
    """Return a single scraper run by ID."""
    try:
        run = _db.scraper_runs.find_one({"run_id": run_id}, {"_id": 0})
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        return run
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profiles")
def get_profiles(
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    search: Optional[str] = Query(None),
):
    """Return people/profiles."""
    try:
        query: Dict[str, Any] = {}
        if search:
            query["$or"] = [
                {"username": {"$regex": search, "$options": "i"}},
                {"name":     {"$regex": search, "$options": "i"}},
            ]
        profiles = list(
            _db.profiles.find(query, {"_id": 0})
            .sort("username", ASCENDING)
            .skip(skip)
            .limit(limit)
        )
        total = _db.profiles.count_documents(query)
        return {"profiles": profiles, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Real-Time Logs & Scraper Streaming
# ---------------------------------------------------------------------------
_scraper_process: Optional[asyncio.subprocess.Process] = None
_scraper_lock = asyncio.Lock()
_scraper_start_time: Optional[float] = None
_scraper_target_date: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    log_hub.push("backend", "SUCCESS", f"Backend server initialized on port 8000 (PID {os.getpid()})")
    asyncio.create_task(_tail_live_stream_file())


async def _tail_live_stream_file():
    """Tails storage/live_stream.log so CLI terminal scraper runs are also broadcast live."""
    root_dir = os.path.dirname(os.path.abspath(__file__))
    log_file = os.path.join(root_dir, "storage", "live_stream.log")
    try:
        pos = os.path.getsize(log_file) if os.path.exists(log_file) else 0
    except Exception:
        pos = 0

    while True:
        try:
            await asyncio.sleep(0.4)
            if not os.path.exists(log_file):
                continue
            size = os.path.getsize(log_file)
            if size > pos:
                with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                    f.seek(pos)
                    new_lines = f.readlines()
                    pos = f.tell()

                for line in new_lines:
                    text = line.rstrip()
                    if not text:
                        continue
                    level = "INFO"
                    if "[ERROR]" in text: level = "ERROR"
                    elif "[WARNING]" in text: level = "WARNING"
                    elif "[SUCCESS]" in text: level = "SUCCESS"

                    # Avoid duplicate echoing if currently streaming directly from child process
                    if not (_scraper_process and _scraper_process.returncode is None):
                        log_hub.push(source="scraper", level=level, text=text)
            elif size < pos:
                pos = 0
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(2.0)


async def _stream_process_output(process: asyncio.subprocess.Process):
    global _scraper_process, _scraper_start_time
    assert process.stdout is not None
    try:
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            if not text:
                continue

            level = "INFO"
            text_upper = text.upper()
            if "ERROR" in text_upper or "FAILED" in text_upper or "TRACEBACK" in text_upper:
                level = "ERROR"
            elif "WARNING" in text_upper or "WARN" in text_upper:
                level = "WARNING"
            elif "SUCCESS" in text_upper or "COMPLETE" in text_upper or "STAGE" in text_upper:
                level = "SUCCESS"

            log_hub.push(source="scraper", level=level, text=text)

        ret = await process.wait()
        elapsed = round(time.time() - (_scraper_start_time or time.time()), 1)
        if ret == 0:
            log_hub.push("scraper", "SUCCESS", f"Scraper execution finished successfully in {elapsed}s (code 0).")
        else:
            log_hub.push("scraper", "ERROR", f"Scraper process terminated with exit code {ret} after {elapsed}s.")
    except Exception as exc:
        log_hub.push("scraper", "ERROR", f"Subprocess read error: {exc}")
    finally:
        _scraper_process = None
        _scraper_start_time = None


@app.get("/api/logs/stream")
async def stream_logs():
    """SSE endpoint streaming live unified logs from scraper, backend, and frontend."""
    q = log_hub.subscribe()

    async def event_generator():
        try:
            # Replay recent history on connection
            for entry in list(log_hub.history)[-80:]:
                yield f"data: {json.dumps(entry)}\n\n"

            while True:
                try:
                    entry = await asyncio.wait_for(q.get(), timeout=12.0)
                    yield f"data: {json.dumps(entry)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            log_hub.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/logs/client")
async def receive_client_log(payload: Dict[str, Any]):
    """Accept frontend activity logs to display alongside backend and scraper logs."""
    text = str(payload.get("text", "")).strip()
    level = str(payload.get("level", "INFO")).upper()
    meta = payload.get("meta") or {}
    if text:
        log_hub.push(source="frontend", level=level, text=text, meta=meta)
    return {"status": "ok"}


@app.post("/api/scraper/trigger")
async def trigger_scraper(payload: Optional[Dict[str, Any]] = None):
    """Trigger the real Python scraper pipeline and stream logs live in real time."""
    global _scraper_process, _scraper_start_time, _scraper_target_date
    payload = payload or {}

    async with _scraper_lock:
        if _scraper_process and _scraper_process.returncode is None:
            return {
                "status": "already_running",
                "pid": _scraper_process.pid,
                "message": "Scraper is already running",
            }

        target_date = payload.get("date")
        limit = payload.get("limit")
        force = payload.get("force", False)

        root_dir = os.path.dirname(os.path.abspath(__file__))
        venv_python = os.path.join(root_dir, ".venv", "bin", "python")
        python_bin = venv_python if os.path.exists(venv_python) else sys.executable

        cmd = [python_bin, "-u", "main.py"]
        if target_date:
            cmd.extend(["--date", str(target_date)])
        if limit:
            cmd.extend(["--limit", str(limit)])
        if force:
            cmd.append("--force")

        resolved_date = target_date or get_pacific_yesterday()
        _scraper_target_date = resolved_date
        _scraper_start_time = time.time()

        log_hub.push(
            source="scraper",
            level="INFO",
            text=f"Launching pipeline process: {' '.join(cmd)} (target={resolved_date})",
        )

        _scraper_process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=root_dir,
        )

        asyncio.create_task(_stream_process_output(_scraper_process))

        return {
            "status": "started",
            "pid": _scraper_process.pid,
            "target_date": _scraper_target_date,
        }


@app.post("/api/scraper/stop")
async def stop_scraper():
    """Cancel and terminate currently active scraper execution."""
    global _scraper_process
    async with _scraper_lock:
        if _scraper_process and _scraper_process.returncode is None:
            try:
                _scraper_process.terminate()
                log_hub.push("scraper", "WARNING", f"User requested termination of scraper PID {_scraper_process.pid}")
                return {"status": "stopped"}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        return {"status": "not_running"}


@app.get("/api/scraper/status")
async def get_scraper_status():
    """Check whether a scraper pipeline execution is actively running."""
    global _scraper_process, _scraper_start_time, _scraper_target_date
    is_running = _scraper_process is not None and _scraper_process.returncode is None
    elapsed = round(time.time() - _scraper_start_time, 1) if (is_running and _scraper_start_time) else None
    return {
        "is_running": is_running,
        "pid": _scraper_process.pid if is_running else None,
        "elapsed_seconds": elapsed,
        "target_date": _scraper_target_date if is_running else None,
    }


# ---------------------------------------------------------------------------
# Run directly
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
