import OpenAI from 'openai'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const weave = require('weave')

export const WANDB_PROJECT  = 'abhijitbetigeri29-hackathon26/inference'
export const WANDB_BASE_URL = 'https://api.inference.wandb.ai/v1'

// Mirrors the Python pattern:
//   weave.init('abhijitbetigeri29-hackathon26/inference')
//   client = OpenAI(base_url=..., api_key=..., project=...)
let _weaveReady: Promise<void> | null = null
export function weaveReady(): Promise<void> {
  if (!_weaveReady) {
    _weaveReady = weave.init(WANDB_PROJECT).catch(() => { _weaveReady = null })
  }
  return _weaveReady!
}

export const wandbClient = new OpenAI({
  baseURL: WANDB_BASE_URL,
  apiKey: process.env.WANDB_API_KEY!,
  // Passes project context to WandB inference endpoint (equivalent to
  // project=... in the Python OpenAI constructor)
  defaultHeaders: { 'OpenAI-Project': WANDB_PROJECT },
})

// Equivalent to @weave.op — wraps a function so its calls appear as traces
// in the WandB Weave dashboard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function op<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return weave.op(fn) as T
}

export const LLM_MODEL   = process.env.WANDB_LLM_MODEL   ?? 'OpenPipe/Qwen3-14B-Instruct'
export const JUDGE_MODEL = process.env.WANDB_JUDGE_MODEL  ?? 'OpenPipe/Qwen3-14B-Instruct'
