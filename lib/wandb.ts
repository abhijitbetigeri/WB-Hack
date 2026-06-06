import OpenAI from 'openai'
import * as weave from 'weave'

export const WANDB_PROJECT  = 'abhijitbetigeri29-hackathon26/inference'
export const WANDB_BASE_URL = 'https://api.inference.wandb.ai/v1'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wandbClient = weave.wrapOpenAI(new OpenAI({
  baseURL: WANDB_BASE_URL,
  apiKey: process.env.WANDB_API_KEY!,
  defaultHeaders: { 'OpenAI-Project': WANDB_PROJECT },
}) as any) as OpenAI

// Re-export op so callers can wrap functions as @weave.op traces
export const op = weave.op

export const LLM_MODEL   = process.env.WANDB_LLM_MODEL   ?? 'OpenPipe/Qwen3-14B-Instruct'
export const JUDGE_MODEL = process.env.WANDB_JUDGE_MODEL  ?? 'OpenPipe/Qwen3-14B-Instruct'
