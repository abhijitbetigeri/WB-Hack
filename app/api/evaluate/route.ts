import { NextRequest } from 'next/server'
import { evaluateComment } from '@/lib/evaluator'
import { db, dbInsert } from '@/lib/insforge'
import type { VibeBlueprint, ContentItem } from '@/lib/insforge'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { comment, contentItemId } = body as { comment: string; contentItemId: string }

  if (!comment?.trim() || !contentItemId) {
    return Response.json({ error: 'comment and contentItemId required' }, { status: 400 })
  }

  try {
    const { data } = await db.database
      .from('content_items')
      .select()
      .eq('id', contentItemId)
      .limit(1)

    const items = (data ?? []) as ContentItem[]
    if (!items.length || !items[0].vibe_blueprint) {
      return Response.json({ error: 'Content item not found or blueprint missing' }, { status: 404 })
    }

    const blueprint = items[0].vibe_blueprint as VibeBlueprint
    const evalResult = await evaluateComment(comment, blueprint)
    const promptChips: string[] = blueprint.contextual_prompts.prompt_chips

    if (evalResult.signalLevel === 'high') {
      await dbInsert('comments', {
        content_item_id: contentItemId,
        raw_text: comment,
        humane_score: evalResult.score,
        principle_scores: evalResult.principleScores,
        global_violations: evalResult.globalViolations,
        confidence: evalResult.confidence,
        signal_level: evalResult.signalLevel,
        prompt_chips: promptChips,
      })
    }

    return Response.json({
      signalLevel: evalResult.signalLevel,
      score: evalResult.score,
      principleScores: evalResult.principleScores,
      principles: evalResult.principles,
      globalViolations: evalResult.globalViolations,
      confidence: evalResult.confidence,
      reasoning: evalResult.reasoning,
      promptChips: evalResult.signalLevel === 'low' ? promptChips : null,
    })
  } catch (err) {
    console.error('[evaluate]', err)
    return Response.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}
