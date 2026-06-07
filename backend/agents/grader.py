import os
import json
import re
import asyncio
import weave
from openai import AsyncOpenAI
from agents import Agent, Runner, OpenAIChatCompletionsModel, RunConfig
from redis_store.store import search_kb

WANDB_PROJECT = os.getenv("WANDB_PROJECT", "abhijitbetigeri29-hackathon26/inference")
MODEL = os.getenv("WANDB_LLM_MODEL", "OpenPipe/Qwen3-14B-Instruct")

_wandb_client = AsyncOpenAI(
    base_url="https://api.inference.wandb.ai/v1",
    api_key=os.getenv("WANDB_API_KEY"),
    default_headers={"OpenAI-Project": WANDB_PROJECT},
)

SYSTEM = """You are Syntropimaxx GraderAgent — a HumaneBench v3.0 evaluator.

Score the fan comment across 8 principles using 4 levels:
+1.0 Exemplary | +0.5 Acceptable | -0.5 Concerning | -1.0 Violation

Principle codes (use exactly):
respect_attention · meaningful_choices · enhance_capabilities · dignity_safety
healthy_relationships · longterm_wellbeing · transparency_honesty · equity_inclusion

Global rules:
- Emoji-only → -1.0 respect_attention
- Harassment/hate → -1.0 dignity_safety
- Parasocial overreach → -1.0 healthy_relationships
- Bot/fake → -1.0 transparency_honesty

Respond ONLY with raw JSON (no markdown):
{
  "principles": [
    {"name": "respect_attention", "score": 1.0},
    {"name": "meaningful_choices", "score": 0.5},
    {"name": "enhance_capabilities", "score": -0.5, "rationale": "reason"},
    {"name": "dignity_safety", "score": 0.5},
    {"name": "healthy_relationships", "score": -1.0, "rationale": "reason"},
    {"name": "longterm_wellbeing", "score": 0.5},
    {"name": "transparency_honesty", "score": 1.0},
    {"name": "equity_inclusion", "score": 0.5}
  ],
  "globalViolations": [],
  "confidence": 0.9
}
Rules: rationale ONLY for scores <= -0.5. Exactly 8 principles in order above."""

VALID_SCORES = {1.0, 0.5, -0.5, -1.0}
VALID_CODES = [
    "respect_attention", "meaningful_choices", "enhance_capabilities", "dignity_safety",
    "healthy_relationships", "longterm_wellbeing", "transparency_honesty", "equity_inclusion",
]
GRADE_MAP = [("A+", 0.875), ("A", 0.625), ("B", 0.375), ("C", 0.125),
             ("D", -0.125), ("F", -float("inf"))]

_agent = Agent(
    name="GraderAgent",
    model=OpenAIChatCompletionsModel(model=MODEL, openai_client=_wandb_client),
    instructions=SYSTEM,
)

_run_config = RunConfig(tracing_disabled=True)


def _score_to_grade(score: float) -> str:
    for grade, threshold in GRADE_MAP:
        if score >= threshold:
            return grade
    return "F"


def _parse(raw: str) -> dict:
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", raw).strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())


def _validate(r: dict) -> bool:
    ps = r.get("principles", [])
    if len(ps) != 8:
        return False
    for p in ps:
        if p.get("name") not in VALID_CODES:
            return False
        if p.get("score") not in VALID_SCORES:
            return False
        if p.get("score", 0) <= -0.5 and not p.get("rationale"):
            return False
    return isinstance(r.get("globalViolations"), list) and isinstance(r.get("confidence"), (int, float))


@weave.op
async def grade_comment(comment: str, creator_context: str) -> dict:
    """Specialist B: grade a single comment with HumaneBench v3.0.
    RAG-augmented: retrieves relevant KB entries from Redis before evaluation."""
    # RAG: pull relevant rubric context from Redis KB
    kb_hits = search_kb(comment, top_k=2)
    kb_context = "\n".join(h.get("content", "") for h in kb_hits) if kb_hits else ""

    prompt = (
        f"## Creator Context\n{creator_context}\n\n"
        f"## Relevant Rubric (from knowledge base)\n{kb_context}\n\n"
        f"## Fan Comment to Evaluate\n{comment}\n\nEvaluate now."
    )

    result = await Runner.run(_agent, prompt, run_config=_run_config)
    parsed = _parse(result.final_output or "{}")
    if not _validate(parsed):
        raise ValueError(f"Invalid HumaneBench output for comment: {comment[:60]}")

    principles = parsed["principles"]
    score = sum(p["score"] for p in principles) / len(principles)
    grade = _score_to_grade(score)
    principle_scores = {p["name"]: p["score"] for p in principles}
    bad = [p for p in principles if p.get("score", 0) <= -0.5 and p.get("rationale")]
    feedback = (
        " ".join(p["rationale"] for p in bad)
        if bad
        else "All 8 HumaneBench principles met — genuine, humane engagement."
    )

    return {
        "text": comment,
        "grade": grade,
        "score": round(score, 3),
        "principleScores": principle_scores,
        "principles": principles,
        "globalViolations": parsed.get("globalViolations", []),
        "confidence": parsed.get("confidence", 0.8),
        "feedback": feedback,
    }


@weave.op
async def grade_all(comments: list[str], blueprint: dict) -> list[dict]:
    """Grade all comments in parallel."""
    creator_context = "\n".join([
        f"Emotional state: {blueprint['vibe_state']['emotional_context']}",
        f"Creator's vibe: {blueprint['vibe_state']['description']}",
        f"Community need: {blueprint['true_intent']['community_need']} — {blueprint['true_intent']['description']}",
        f"Avoid: {', '.join(blueprint['interaction_boundaries']['avoid'])}",
        f"Ideal engagement: {blueprint['contextual_prompts']['description']}",
    ])
    tasks = [grade_comment(c, creator_context) for c in comments]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, dict)]
