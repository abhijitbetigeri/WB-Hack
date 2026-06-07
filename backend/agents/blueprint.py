import os
import json
import weave
from openai import AsyncOpenAI
from agents import Agent, Runner, OpenAIChatCompletionsModel, RunConfig

WANDB_PROJECT = os.getenv("WANDB_PROJECT", "abhijitbetigeri29-hackathon26/inference")
MODEL = os.getenv("WANDB_LLM_MODEL", "OpenPipe/Qwen3-14B-Instruct")

_wandb_client = AsyncOpenAI(
    base_url="https://api.inference.wandb.ai/v1",
    api_key=os.getenv("WANDB_API_KEY"),
    default_headers={"OpenAI-Project": WANDB_PROJECT},
)

SYSTEM = """You are Syntropimaxx BlueprintAgent. Analyze creator content and return a Vibe Blueprint JSON.

Return ONLY valid JSON — no markdown, no backticks:
{
  "vibe_state": {
    "humanebench_principle": "respect-user-attention",
    "emotional_context": "<humorous|aspirational|technical|creative|exploratory|vulnerable>",
    "description": "<one sentence>"
  },
  "true_intent": {
    "humanebench_principle": "prioritize-long-term-wellbeing",
    "community_need": "<shared narratives|contextual tips|conscientious questions|peer accountability>",
    "description": "<one sentence>"
  },
  "interaction_boundaries": {
    "humanebench_principle": "protect-dignity-and-safety",
    "avoid": ["<2-4 things to avoid>"],
    "description": "<one sentence>"
  },
  "contextual_prompts": {
    "humanebench_principle": "enhance-human-capabilities",
    "prompt_chips": ["<3 actionable prompt chips for fans>"],
    "description": "<one sentence>"
  }
}"""

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
