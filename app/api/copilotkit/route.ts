/**
 * Base CopilotKit route.
 *
 * Handles two cases:
 *  1. AG-UI "rest" transport auto-detect: GET /api/copilotkit → runtime info
 *  2. AG-UI "single-route" fallback transport: POST /api/copilotkit { method, params, body }
 *     → unwrap the envelope and forward to the correct sub-path handler
 *
 * Why this exists alongside [[...path]]/route.ts:
 * Next.js App Router's optional catch-all [[...path]] does NOT match the bare
 * base path /api/copilotkit. CopilotKit auto-detects transport by trying
 * GET /info first (rest), then falling back to POST base-url (single). If the
 * GET fails (e.g. Turbopack lazy compilation on first request), the client
 * locks into single-route mode and all subsequent requests — including agent
 * runs — come here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { handler } from './_handler'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// Static runtime info — matches what GET /api/copilotkit/info returns.
const RUNTIME_INFO = {
  version: '1.59.5',
  agents: {
    default: {
      name: 'default',
      description: '',
      className: 'BuiltInAgent',
      capabilities: {
        tools: { supported: true, clientProvided: true },
        transport: { streaming: true },
      },
    },
  },
  audioFileTranscriptionEnabled: false,
  mode: 'sse',
  a2uiEnabled: false,
  openGenerativeUIEnabled: false,
  telemetryDisabled: false,
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// AG-UI rest transport auto-detect: GET → return info
export function GET() {
  return NextResponse.json(RUNTIME_INFO, { headers: CORS_HEADERS })
}

// Single-route fallback: POST { method, params?, body? }
export async function POST(req: NextRequest) {
  let envelope: { method?: string; params?: Record<string, string>; body?: unknown } = {}
  try {
    envelope = await req.json()
  } catch {
    // empty body — treat as info
  }

  const { method = 'info', params = {}, body } = envelope

  // Info request
  if (method === 'info') {
    return NextResponse.json(RUNTIME_INFO, { headers: CORS_HEADERS })
  }

  // Agent run — forward to /api/copilotkit/agent/:id/run
  if (method === 'agent/run') {
    const agentId = params.agentId ?? 'default'
    const url = new URL(req.url)
    url.pathname = `/api/copilotkit/agent/${agentId}/run`
    const forwarded = new NextRequest(url.toString(), {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body ?? {}),
    })
    return handler(forwarded)
  }

  // Agent connect (streaming setup) — forward to /api/copilotkit/agent/:id/connect
  if (method === 'agent/connect') {
    const agentId = params.agentId ?? 'default'
    const url = new URL(req.url)
    url.pathname = `/api/copilotkit/agent/${agentId}/connect`
    const forwarded = new NextRequest(url.toString(), {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body ?? {}),
    })
    return handler(forwarded)
  }

  // Agent stop — forward to /api/copilotkit/agent/:id/stop/:threadId
  if (method === 'agent/stop') {
    const agentId = params.agentId ?? 'default'
    const threadId = params.threadId ?? ''
    const url = new URL(req.url)
    url.pathname = `/api/copilotkit/agent/${agentId}/stop/${threadId}`
    const forwarded = new NextRequest(url.toString(), {
      method: 'DELETE',
      headers: req.headers,
    })
    return handler(forwarded)
  }

  return NextResponse.json(
    { error: `Unknown single-route method: "${method}"` },
    { status: 400, headers: CORS_HEADERS },
  )
}
