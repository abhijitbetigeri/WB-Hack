import os
from dotenv import load_dotenv
load_dotenv()

import weave
import wandb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from copilotkit import CopilotKitSDK, LangGraphAgent
from copilotkit.integrations.fastapi import add_fastapi_endpoint

from graph.supervisor import graph, AuditState
from redis_store.kb_seed import seed as seed_kb
from redis_store.store import search_similar_comments, get_audit_result
from pydantic import BaseModel

# ── Observability ──────────────────────────────────────────────────────────────
wandb.login(key=os.getenv("WANDB_API_KEY"))
weave.init(os.getenv("WANDB_PROJECT", "abhijitbetigeri29-hackathon26/inference"))

# ── FastAPI ────────────────────────────────────────────────────────────────────
app = FastAPI(title="Syntropimaxx Multi-Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CopilotKit — exposes the LangGraph supervisor as an AG-UI agent ────────────
sdk = CopilotKitSDK(
    agents=[
        LangGraphAgent(
            name="audit_agent",
            description="Multi-agent pipeline: scrape → blueprint → index → grade comments",
            graph=graph,
        )
    ]
)
add_fastapi_endpoint(app, sdk, "/copilotkit")


# ── Seed Redis KB on startup ───────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    try:
        seed_kb()
        print("✅ HumaneBench KB seeded in Redis")
    except Exception as e:
        print(f"⚠️  KB seed failed (Redis may be empty): {e}")


# ── Utility endpoints ──────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    url: str
    query: str
    top_k: int = 5


@app.post("/search")
async def search_comments(req: SearchRequest):
    """Semantic search over a video's indexed comments."""
    hits = search_similar_comments(req.url, req.query, req.top_k)
    return {"results": hits}


@app.get("/audit")
async def get_audit(url: str):
    """Retrieve a cached audit result from Redis."""
    result = get_audit_result(url)
    if not result:
        return {"error": "Not found"}, 404
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}
