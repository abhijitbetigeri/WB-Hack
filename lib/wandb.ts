import OpenAI from 'openai'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { init, wrapOpenAI } = require('weave')

export const WANDB_BASE_URL = 'https://api.inference.wandb.ai/v1'

// Initialise Weave here (in addition to instrumentation.ts) so the client is
// always wrapped even if the module is loaded before instrumentation runs.
let _weaveReady: Promise<void> | null = null

function ensureWeave(): Promise<void> {
  if (!_weaveReady) {
    _weaveReady = init('abhijitbetigeri29-hackathon26/inference').catch(() => {
      _weaveReady = null // allow retry on next call if init fails
    })
  }
  return _weaveReady!
}

function makeClient() {
  const raw = new OpenAI({ baseURL: WANDB_BASE_URL, apiKey: process.env.WANDB_API_KEY! })
  try {
    return wrapOpenAI(raw)
  } catch {
    return raw
  }
}

// Lazy singleton — created on first use so Weave has time to initialise.
let _client: OpenAI | null = null

export function getWandbClient(): OpenAI {
  if (!_client) _client = makeClient()
  return _client!
}

// Ensure Weave is initialised before any LLM call.
export async function weaveReady(): Promise<void> {
  await ensureWeave()
}

// Override model IDs via env after checking your WandB inference dashboard
export const LLM_MODEL   = process.env.WANDB_LLM_MODEL   ?? 'meta-llama/Llama-3.1-70B-Instruct'
export const JUDGE_MODEL = process.env.WANDB_JUDGE_MODEL  ?? 'meta-llama/Llama-3.1-70B-Instruct'
