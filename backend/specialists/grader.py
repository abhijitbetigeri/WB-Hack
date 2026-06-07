import os
import json
import re
import asyncio
import weave
from openai import AsyncOpenAI
from agents import Agent, Runner, OpenAIChatCompletionsModel, RunConfig
from redis_store.store import search_kb

_entity = os.getenv("WANDB_ENTITY", "abhijitbetigeri29-hackathon26")
_project = os.getenv("WANDB_PROJECT", "inference")
WANDB_PROJECT = f"{_entity}/{_project}"
MODEL = os.getenv("WANDB_LLM_MODEL", "OpenPipe/Qwen3-14B-Instruct")

_wandb_client = AsyncOpenAI(
    base_url="https://api.inference.wandb.ai/v1",
    api_key=os.getenv("WANDB_API_KEY"),
    default_headers={"OpenAI-Project": WANDB_PROJECT},
)

SYSTEM = """You are CCIP GraderAgent — a HumaneBench v3.0 comment evaluator.

Score a single fan comment across 8 principles using exactly these 4 levels:
+1.0 Exemplary  — genuinely enriches the conversation with specific, substantive value
+0.5 Acceptable — neutral or mildly positive; no harm, no standout contribution
-0.5 Concerning — subtle negativity, passive-aggression, backhanded praise, or filler manipulation
-1.0 Violation  — clear harassment, hate, spam, bot, parasocial abuse, or explicit harm

DEFAULT RULE: Start each principle at +0.5 (Acceptable). Move away only with clear evidence.
Only award +1.0 when the comment genuinely and specifically adds value (not just "nice" comments).
Only assign -0.5 or -1.0 when there is a clear reason — state it in rationale.

PRINCIPLE CODES (evaluate in this exact order):
1. respect_attention       — Respects time; adds real value vs wasting the viewer's/creator's attention
2. meaningful_choices      — Offers genuine insight, alternatives, or options; not empty filler
3. enhance_capabilities    — Helps creator or community grow, learn, or specifically improve
4. dignity_safety          — Respectful; free of harassment, threats, slurs, or any harm
5. healthy_relationships   — Builds positive bonds; no parasocial obsession or overreach
6. longterm_wellbeing      — Serves lasting interests; not short-term manipulation or exploitation
7. transparency_honesty    — Authentic and truthful; no deception, fake engagement, or manipulation
8. equity_inclusion        — Inclusive and welcoming; fair and considerate to all voices

AUTOMATIC VIOLATION RULES (force the listed score):
- Comment is emoji/reaction only (no meaningful text) → respect_attention = -1.0
- Any harassment, hate speech, slurs, or threats → dignity_safety = -1.0
- Parasocial overreach ("you changed my life", "I need you", obsessive attachment) → healthy_relationships = -1.0
- Obvious spam, bot patterns, or copy-paste engagement → transparency_honesty = -1.0
- Unsolicited self-promotion or channel plugging → transparency_honesty = -0.5, meaningful_choices = -0.5
- Generic growth-hack advice ignoring creator's actual context → meaningful_choices = -0.5

Respond ONLY with raw JSON — no markdown, no code fences, no explanation:
{
  "principles": [
    {"name": "respect_attention",       "score": 1.0},
    {"name": "meaningful_choices",      "score": 0.5},
    {"name": "enhance_capabilities",    "score": -0.5, "rationale": "one sentence"},
    {"name": "dignity_safety",          "score": 0.5},
    {"name": "healthy_relationships",   "score": 0.5},
    {"name": "longterm_wellbeing",      "score": 0.5},
    {"name": "transparency_honesty",    "score": 0.5},
    {"name": "equity_inclusion",        "score": 0.5}
  ],
  "globalViolations": [],
  "confidence": 0.85
}
Rules:
- Exactly 8 principles in the order shown above
- Each score MUST be one of: 1.0, 0.5, -0.5, -1.0
- rationale is REQUIRED for any score <= -0.5; omit it for positive scores
- globalViolations: list the principle names of every -1.0 score (empty list if none)
- confidence: float 0.0–1.0 reflecting certainty"""

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

    # Normalise globalViolations — LLM may return objects instead of strings
    raw_violations = parsed.get("globalViolations", [])
    global_violations: list[str] = []
    for v in raw_violations:
        if isinstance(v, str):
            global_violations.append(v)
        elif isinstance(v, dict):
            # e.g. {"principle": "dignity_safety", "violation": "harassment"}
            global_violations.append(
                v.get("violation") or v.get("description") or v.get("principle") or str(v)
            )
        else:
            global_violations.append(str(v))

    return {
        "text": comment,
        "grade": grade,
        "score": round(score, 3),
        "principleScores": principle_scores,
        "principles": principles,
        "globalViolations": global_violations,
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
