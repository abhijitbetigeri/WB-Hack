import { createClient } from '@insforge/sdk'

const db = createClient({
  baseUrl: process.env.INSFORGE_URL!,
  anonKey: process.env.INSFORGE_API_KEY!,
})

export { db }

// Typed helper: insert a row and return it
export async function dbInsert<T>(
  table: string,
  values: Record<string, unknown>
): Promise<T> {
  const { data, error } = await db.database.from(table).insert([values]).select()
  if (error) throw new Error(`InsForge insert(${table}): ${error.message}`)
  return (data as T[])[0]
}

// Typed helper: run a select query with filters
export async function dbSelect<T>(
  table: string,
  filters: Record<string, unknown> = {},
  options: { orderBy?: string; orderDesc?: boolean; limit?: number } = {}
): Promise<T[]> {
  let q = db.database.from(table).select()
  for (const [col, val] of Object.entries(filters)) {
    q = q.eq(col, val as string)
  }
  if (options.orderBy) {
    q = q.order(options.orderBy, { ascending: !options.orderDesc })
  }
  if (options.limit) {
    q = q.limit(options.limit)
  }
  const { data, error } = await q
  if (error) throw new Error(`InsForge select(${table}): ${error.message}`)
  return (data ?? []) as T[]
}

// Typed helper: update rows matching a filter
export async function dbUpdate<T>(
  table: string,
  filter: Record<string, unknown>,
  values: Record<string, unknown>
): Promise<T[]> {
  let q = db.database.from(table).update(values)
  for (const [col, val] of Object.entries(filter)) {
    q = q.eq(col, val as string)
  }
  const { data, error } = await q.select()
  if (error) throw new Error(`InsForge update(${table}): ${error.message}`)
  return (data ?? []) as T[]
}

export interface ContentItem {
  id: string
  platform: string
  content_url: string
  creator_handle: string
  tigris_key: string
  vibe_blueprint: VibeBlueprint | null
  created_at: string
}

export interface Comment {
  id: string
  content_item_id: string
  raw_text: string
  humane_score: number
  principle_scores: Record<string, number>  // 8 HumaneBench principle scores
  global_violations: string[]
  confidence: number
  signal_level: 'high' | 'low'
  prompt_chips: string[]
  created_at: string
}

export interface VibeBlueprint {
  vibe_state: {
    humanebench_principle: string
    emotional_context: string
    description: string
  }
  true_intent: {
    humanebench_principle: string
    community_need: string
    description: string
  }
  interaction_boundaries: {
    humanebench_principle: string
    avoid: string[]
    description: string
  }
  contextual_prompts: {
    humanebench_principle: string
    prompt_chips: string[]
    description: string
  }
}
