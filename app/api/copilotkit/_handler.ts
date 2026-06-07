import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'
import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: 'https://api.inference.wandb.ai/v1',
  apiKey: process.env.WANDB_API_KEY ?? '',
  defaultHeaders: {
    'OpenAI-Project': 'abhijitbetigeri29-hackathon26/inference',
  },
})

const serviceAdapter = new OpenAIAdapter({
  openai,
  model: process.env.WANDB_LLM_MODEL ?? 'OpenPipe/Qwen3-14B-Instruct',
})

const runtime = new CopilotRuntime()

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter,
  endpoint: '/api/copilotkit',
})

// copilotRuntimeNextJSAppRouterEndpoint returns { handleRequest }, not { GET, POST, OPTIONS }
export const GET = handleRequest
export const POST = handleRequest
export const OPTIONS = handleRequest
