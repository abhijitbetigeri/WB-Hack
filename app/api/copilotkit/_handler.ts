// Shared CopilotKit runtime + handler — imported by both route.ts and [[...path]]/route.ts
import { CopilotRuntime, BuiltInAgent, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { NextRequest } from 'next/server'

const wandb = createOpenAICompatible({
  name: 'wandb',
  baseURL: 'https://api.inference.wandb.ai/v1',
  apiKey: process.env.WANDB_API_KEY ?? '',
  headers: { 'OpenAI-Project': 'abhijitbetigeri29-hackathon26/inference' },
})

const model = wandb(process.env.WANDB_LLM_MODEL ?? 'OpenPipe/Qwen3-14B-Instruct')

const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({ model }),
  },
})

export const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: '/api/copilotkit',
  cors: {
    origin: '*',
    allowHeaders: ['*'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
})

export type Handler = (req: NextRequest) => Promise<Response>
