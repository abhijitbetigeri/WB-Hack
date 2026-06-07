// Explicit route — avoids Turbopack [[...path]] lazy compilation on first hit.
import type { NextRequest } from 'next/server'
import { handler } from '../../../_handler'

export const POST = (req: NextRequest) => handler(req)
export const OPTIONS = (req: NextRequest) => handler(req)
