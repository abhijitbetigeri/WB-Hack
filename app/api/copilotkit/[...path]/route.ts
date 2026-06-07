// AG-UI multi-route (REST) transport: /info, /agent/:id/run, /agent/:id/connect, etc.
import type { NextRequest } from 'next/server'
import { handler } from '../_handler'

export const GET = (req: NextRequest) => handler(req)
export const POST = (req: NextRequest) => handler(req)
export const DELETE = (req: NextRequest) => handler(req)
export const OPTIONS = (req: NextRequest) => handler(req)
