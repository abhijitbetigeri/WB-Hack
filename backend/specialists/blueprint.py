import os
import json
import weave
from openai import AsyncOpenAI
from agents import Agent, Runner, OpenAIChatCompletionsModel, RunConfig

_entity = os.getenv("WANDB_ENTITY", "abhijitbetigeri29-hackathon26")
_project = os.getenv("WANDB_PROJECT", "inference")
WANDB_PROJECT = f"{_entity}/{_project}"
MODEL = os.getenv("WANDB_LLM_MODEL", "OpenPipe/Qwen3-14B-Instruct")

_wandb_client = AsyncOpenAI(
    base_url="https://api.inference.wandb.ai/v1",
    api_key=os.getenv("WANDB_API_KEY"),
    default_headers={"OpenAI-Project": WANDB_PROJECT},
)

SYSTEM = """You are Syntropimaxx BlueprintAgent. Analyze creator content and generate a Vibe Blueprint JSON.

The Vibe Blueprint captures: emotional state, community need, engagement boundaries, and conversation starters.
It is used by fans to write better HumaneBench-aligned comments and by the GraderAgent as creator context.

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{
  "vibe_state": {
    "humanebench_principle": "respect-user-attention",
    "emotional_context": "<one of: humorous|aspirational|technical|creative|exploratory|vulnerable|motivational|reflective>",
    "description": "<one sentence describing the creator's emotional/creative state in this content>"
  },
  "true_intent": {
    "humanebench_principle": "prioritize-long-term-wellbeing",
    "community_need": "<one of: shared narratives|contextual tips|conscientious questions|peer accountability|creative inspiration|technical depth>",
    "description": "<one sentence on what the creator actually needs from their community right now>"
  },
  "interaction_boundaries": {
    "humanebench_principle": "protect-dignity-and-safety",
    "avoid": ["<2–4 specific things fans should NOT say or do — based on this content>"],
    "description": "<one sentence on the emotional safety boundaries for this creator right now>"
  },
  "contextual_prompts": {
    "humanebench_principle": "enhance-human-capabilities",
    "prompt_chips": ["<3 short, specific, actionable fan comment starters tied to THIS content — not generic>"],
    "description": "<one sentence on how fans should engage to add the most value>"
  }
}

Guidelines:
- emotional_context must be one of the listed options; pick the best fit
- community_need must be one of the listed options; pick the best fit
- avoid[] should be 2–4 items specific to this creator and content (not generic "be nice" advice)
- prompt_chips[] must be 3 specific conversation starters a fan could actually use as a comment
- If content is very short or a transcript is unavailable, infer from title and description
- Keep every description under 20 words"""

# OpenAI Agents SDK specialist — points at WandB inference
_agent = Agent(
    name="BlueprintAgent",
    model=OpenAIChatCompletionsModel(model=MODEL, openai_client=_wandb_client),
    instructions=SYSTEM,
)

_run_config = RunConfig(tracing_disabled=True)  # Weave handles tracing


@weave.op
async def generate_blueprint(primary_text: str) -> dict:
    """Specialist A: generate Vibe Blueprint from transcript/description."""
    result = await Runner.run(
        _agent,
        f"Analyze this creator content and return the Vibe Blueprint JSON:\n\n{primary_text}",
        run_config=_run_config,
    )
    raw = result.final_output or "{}"
    # Strip <think> blocks (chain-of-thought models)
    import re
    raw = re.sub(r"<think>[\s\S]*?</think>", "", raw).strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
