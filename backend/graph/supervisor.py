from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

from specialists.scraper import scrape
from specialists.blueprint import generate_blueprint
from specialists.indexer import index_and_store, apply_grades
from specialists.grader import grade_all
from redis_store.store import store_audit_result


class AuditState(TypedDict):
    url: str
    stage: str
    progress: str
    platform: Optional[str]
    title: Optional[str]
    creator_handle: Optional[str]
    primary_text: Optional[str]
    raw_comments: list
    comments_unavailable: bool
    blueprint: Optional[dict]
    comment_ids: list
    graded_comments: list
    analytics: Optional[dict]
    error: Optional[str]


def _compute_analytics(graded: list[dict]) -> dict:
    scores = [g["score"] for g in graded]
    n = len(scores)
    if n == 0:
        return {
            "totalGraded": 0, "gradeDistribution": {},
            "avgScore": 0, "communityAlignmentPct": 50,
            "tierDepth": "N/A", "depthVectorPct": 0,
        }
    dist: dict = {}
    for g in graded:
        dist[g["grade"]] = dist.get(g["grade"], 0) + 1
    avg = sum(scores) / n
    GRADE_MAP = [("A+", 0.875), ("A", 0.625), ("B", 0.375),
                 ("C", 0.125), ("D", -0.125), ("F", -999)]
    median_score = sorted(scores)[n // 2]
    tier_depth = next(gr for gr, t in GRADE_MAP if median_score >= t)
    community_pct = round(((avg + 1) / 2) * 100)
    depth_pct = round(sum(1 for s in scores if s >= 0.5) / n * 100)
    return {
        "totalGraded": n,
        "gradeDistribution": dist,
        "avgScore": round(avg, 3),
        "communityAlignmentPct": community_pct,
        "tierDepth": tier_depth,
        "depthVectorPct": depth_pct,
    }


# ── LangGraph nodes ────────────────────────────────────────────────────────────

async def scrape_node(state: AuditState) -> dict:
    try:
        result = await scrape(state["url"])
        return {
            "stage": "blueprint",
            "progress": f"Scraped {len(result['raw_comments'])} comments from {result['title'][:60]}",
            "platform": result["platform"],
            "title": result["title"],
            "creator_handle": result["creator_handle"],
            "primary_text": result["primary_text"],
            "raw_comments": result["raw_comments"],
            "comments_unavailable": result["comments_unavailable"],
        }
    except Exception as e:
        return {"stage": "error", "progress": "", "error": str(e)}


async def blueprint_node(state: AuditState) -> dict:
    if state.get("stage") == "error":
        return {}
    try:
        blueprint = await generate_blueprint(state.get("primary_text") or "")
        return {
            "stage": "indexing",
            "progress": f"BlueprintAgent — {blueprint['vibe_state']['emotional_context']} · {blueprint['vibe_state']['description'][:80]}",
            "blueprint": blueprint,
        }
    except Exception as e:
        return {"stage": "error", "progress": "", "error": str(e)}


async def index_node(state: AuditState) -> dict:
    if state.get("stage") == "error":
        return {}
    comments = state.get("raw_comments", [])
    if not comments:
        return {"stage": "grading", "progress": "No comments to index.", "comment_ids": []}
    try:
        ids = await index_and_store(state["url"], state.get("platform", "youtube"), comments)
        return {
            "stage": "grading",
            "progress": f"IndexerAgent — {len(ids)} comments embedded in Redis VL (HNSW ready)",
            "comment_ids": ids,
        }
    except Exception as e:
        return {"stage": "error", "progress": "", "error": str(e)}


async def grade_node(state: AuditState) -> dict:
    if state.get("stage") == "error":
        return {}
    comments = state.get("raw_comments", [])
    blueprint = state.get("blueprint")
    if not comments or not blueprint:
        return {"stage": "done", "progress": "Done — comments unavailable.", "graded_comments": [], "analytics": _compute_analytics([])}
    try:
        graded = await grade_all(comments, blueprint)
        apply_grades(state.get("comment_ids", []), graded)
        analytics = _compute_analytics(graded)
        store_audit_result(state["url"], {
            "url": state["url"],
            "platform": state.get("platform"),
            "title": state.get("title"),
            "creator_handle": state.get("creator_handle"),
            "blueprint": blueprint,
            "graded_comments": graded,
            "analytics": analytics,
        })
        return {
            "stage": "done",
            "progress": f"GraderAgent × {len(graded)} — avg score {analytics['avgScore']:.2f}",
            "graded_comments": graded,
            "analytics": analytics,
        }
    except Exception as e:
        return {"stage": "error", "progress": "", "error": str(e)}


def route(state: AuditState) -> str:
    s = state.get("stage", "scraping")
    if s == "error":
        return END
    if s == "blueprint":
        return "blueprint"
    if s == "indexing":
        return "index"
    if s == "grading":
        return "grade"
    return END


# ── Build graph ────────────────────────────────────────────────────────────────

def build_graph():
    g = StateGraph(AuditState)
    g.add_node("scrape", scrape_node)
    g.add_node("blueprint", blueprint_node)
    g.add_node("index", index_node)
    g.add_node("grade", grade_node)

    g.set_entry_point("scrape")
    g.add_conditional_edges("scrape",    route, {"blueprint": "blueprint", END: END})
    g.add_conditional_edges("blueprint", route, {"index": "index",         END: END})
    g.add_conditional_edges("index",     route, {"grade": "grade",         END: END})
    g.add_edge("grade", END)

    return g.compile()


graph = build_graph()
