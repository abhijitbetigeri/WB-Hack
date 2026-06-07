from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from agents.scraper import scrape
from agents.blueprint import generate_blueprint
from agents.indexer import index_and_store, apply_grades
from agents.grader import grade_all
from redis_store.store import store_audit_result


class AuditState(TypedDict):
    # Input
    url: str
    # Stage tracking (streamed to CopilotKit frontend)
    stage: str
    progress: str
    # Scraped
    platform: Optional[str]
    title: Optional[str]
    creator_handle: Optional[str]
    primary_text: Optional[str]
    raw_comments: list
    comments_unavailable: bool
    # Generated
    blueprint: Optional[dict]
    comment_ids: list
    graded_comments: list
    analytics: Optional[dict]
    # Error
    error: Optional[str]


def _compute_analytics(graded: list[dict]) -> dict:
    if not graded:
        return {"totalComments": 0, "gradeDistribution": {}, "averageScore": 0,
                "highSignalRatio": 0, "trueAudienceSentiment": 0, "medianGrade": "N/A"}
    scores = [g["score"] for g in graded]
    grades = [g["grade"] for g in graded]
    dist: dict = {}
    for g in grades:
        dist[g] = dist.get(g, 0) + 1
    avg = sum(scores) / len(scores)
    high_signal = sum(1 for s in scores if s >= 0.5) / len(scores)
    positive = sum(1 for s in scores if s >= 0) / len(scores)
    sorted_scores = sorted(scores)
    mid = len(sorted_scores) // 2
    median_score = sorted_scores[mid]
    GRADE_MAP = [("A+", 0.875), ("A", 0.625), ("B", 0.375), ("C", 0.125), ("D", -0.125), ("F", -999)]
    median_grade = next(g for g, t in GRADE_MAP if median_score >= t)
    return {
        "totalComments": len(graded),
        "gradeDistribution": dist,
        "averageScore": round(avg, 3),
        "highSignalRatio": round(high_signal, 3),
        "trueAudienceSentiment": round(positive, 3),
        "medianGrade": median_grade,
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
        blueprint = await generate_blueprint(state["primary_text"] or "")
        return {
            "stage": "indexing",
            "progress": f"Vibe Blueprint generated — emotional context: {blueprint['vibe_state']['emotional_context']}",
            "blueprint": blueprint,
        }
    except Exception as e:
        return {"stage": "error", "progress": "", "error": str(e)}


async def index_node(state: AuditState) -> dict:
    if state.get("stage") == "error":
        return {}
    comments = state.get("raw_comments", [])
    if not comments:
        return {"stage": "grading", "progress": "No comments to index — skipping.", "comment_ids": []}
    try:
        ids = await index_and_store(state["url"], state.get("platform", "youtube"), comments)
        return {
            "stage": "grading",
            "progress": f"Indexed {len(ids)} comments in Redis VL (semantic search ready)",
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
        analytics = _compute_analytics([])
        return {"stage": "done", "progress": "Done — comments unavailable.", "graded_comments": [], "analytics": analytics}
    try:
        graded = await grade_all(comments, blueprint)
        apply_grades(state.get("comment_ids", []), graded)
        analytics = _compute_analytics(graded)
        # Persist full result to Redis
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
            "progress": f"Graded {len(graded)} comments — avg score {analytics['averageScore']:.2f}",
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
    g.add_conditional_edges("scrape", route, {"blueprint": "blueprint", END: END})
    g.add_conditional_edges("blueprint", route, {"index": "index", END: END})
    g.add_conditional_edges("index", route, {"grade": "grade", END: END})
    g.add_edge("grade", END)

    return g.compile()


graph = build_graph()
