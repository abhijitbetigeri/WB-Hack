import OpenAI from 'openai'

export const WANDB_BASE_URL = 'https://api.inference.wandb.ai/v1'

// Shared OpenAI-compatible client pointing at WandB inference
export const wandbClient = new OpenAI({
  baseURL: WANDB_BASE_URL,
  apiKey: process.env.WANDB_API_KEY!,
})

// Override model IDs via env if needed after checking your WandB dashboard
export const LLM_MODEL   = process.env.WANDB_LLM_MODEL   ?? 'meta-llama/Llama-3.1-70B-Instruct'
export const JUDGE_MODEL = process.env.WANDB_JUDGE_MODEL  ?? 'meta-llama/Llama-3.1-70B-Instruct'
