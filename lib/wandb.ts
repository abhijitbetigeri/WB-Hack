import OpenAI from 'openai'

export const WANDB_PROJECT  = 'abhijitbetigeri29-hackathon26/inference'
export const WANDB_BASE_URL = 'https://api.inference.wandb.ai/v1'

// OpenAI-compatible client pointing at WandB inference.
// The `project` header routes usage tracking to the correct WandB project —
// equivalent to project=... in the Python OpenAI constructor.
export const wandbClient = new OpenAI({
  baseURL: WANDB_BASE_URL,
  apiKey: process.env.WANDB_API_KEY!,
  defaultHeaders: { 'OpenAI-Project': WANDB_PROJECT },
})

export const LLM_MODEL   = process.env.WANDB_LLM_MODEL   ?? 'OpenPipe/Qwen3-14B-Instruct'
export const JUDGE_MODEL = process.env.WANDB_JUDGE_MODEL  ?? 'OpenPipe/Qwen3-14B-Instruct'
