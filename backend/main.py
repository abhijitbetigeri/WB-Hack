import os
import json
import asyncio
from dotenv import load_dotenv
load_dotenv()

import weave
import wandb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from graph.supervisor import graph, AuditState
from redis_store.kb_seed import seed as seed_kb
from redis_store.store import search_similar_comments, get_audit_result
from pydantic import BaseModel

# ── Observability ──────────────────────────────────────────────────────────────
wandb.login(key=os.getenv("WANDB_API_KEY"))
_entity = os.getenv("WANDB_ENTITY", "abhijitbetigeri29-hackathon26")
_project = os.getenv("WANDB_PROJECT", "inference")
weave.init(f"{_entity}/{_project}")

# ── FastAPI ────────────────────────────────────────────────────────────────────
app = FastAPI(title="CCIP Multi-Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Seed Redis KB on startup ───────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    try:
        seed_kb()
        print("✅ HumaneBench KB seeded in Redis")
    except Exception as e:
        print(f"⚠️  KB seed failed (Redis may be empty): {e}")


# ── SSE pipeline — driven by LangGraph supervisor ─────────────────────────────

@app.get("/run-stream")
async def run_stream(url: str):
    """
    Runs the full multi-agent pipeline through the LangGraph supervisor and
    streams each node's state snapshot as an SSE event.

    Node order: scrape → blueprint → index → grade
    Each node is a specialist agent; grade_node runs GraderAgent × N in parallel.
    """
    async def generate():
        def emit(state: dict) -> str:
            return f"data: {json.dumps(state)}\n\n"

        # Prime the SSE connection immediately so the browser doesn't wait
        yield ": connected\n\n"
        await asyncio.sleep(0)

        initial_state: AuditState = {
            "url": url,
            "stage": "scraping",
            "progress": "ScraperAgent starting — Apify actor can take 30–60 s…",
            "platform": None,
            "title": None,
            "creator_handle": None,
            "primary_text": None,
            "raw_comments": [],
            "comments_unavailable": False,
            "blueprint": None,
            "comment_ids": [],
            "graded_comments": [],
            "analytics": None,
            "error": None,
        }

        # Emit the initial state so the frontend shows the scraping progress bar
        yield emit(dict(initial_state))
        await asyncio.sleep(0)

        try:
            # stream_mode="values" → yields full state snapshot after each node
            async for snapshot in graph.astream(initial_state, stream_mode="values"):
                yield emit(dict(snapshot))
                await asyncio.sleep(0)
        except Exception as e:
            yield emit({"stage": "error", "progress": "", "error": str(e), "url": url})
            await asyncio.sleep(0)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Utility endpoints ──────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    url: str
    query: str
    top_k: int = 5


@app.post("/search")
async def search_comments(req: SearchRequest):
    hits = search_similar_comments(req.url, req.query, req.top_k)
    return {"results": hits}


@app.get("/audit")
async def get_audit(url: str):
    result = get_audit_result(url)
    if not result:
        return {"error": "Not found"}, 404
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}
