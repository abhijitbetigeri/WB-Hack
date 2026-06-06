import OpenAI from 'openai'

export const WANDB_BASE_URL = 'https://api.inference.wandb.ai/v1'

// OpenAI-compatible client pointing at WandB inference.
// Weave auto-patches this client after instrumentation.ts calls weave.init(),
// so all chat.completions calls are automatically traced in the WandB dashboard.
export const wandbClient = new OpenAI({
  baseURL: WANDB_BASE_URL,
  apiKey: process.env.WANDB_API_KEY!,
})

// Override model IDs via env after checking your WandB inference dashboard
export const LLM_MODEL   = process.env.WANDB_LLM_MODEL   ?? 'meta-llama/Llama-3.1-70B-Instruct'
export const JUDGE_MODEL = process.env.WANDB_JUDGE_MODEL  ?? 'meta-llama/Llama-3.1-70B-Instruct'
