import { NextRequest } from 'next/server'
import { db } from '@/lib/insforge'
import type { Comment } from '@/lib/insforge'

export async function GET(request: NextRequest) {
  const contentItemId = request.nextUrl.searchParams.get('contentItemId')

  if (!contentItemId) {
    return Response.json({ error: 'contentItemId required' }, { status: 400 })
  }

  try {
    const { data, error } = await db.database
      .from('comments')
      .select()
      .eq('content_item_id', contentItemId)
      .eq('signal_level', 'high')
      .order('humane_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    const comments = (data ?? []) as Comment[]
    const avgScore =
      comments.length > 0
        ? comments.reduce((sum, c) => sum + c.humane_score, 0) / comments.length
        : 0

    return Response.json({
      comments,
      stats: {
        totalAccepted: comments.length,
        avgCommunityContributionScore: Math.round(avgScore * 100) / 100,
      },
    })
  } catch (err) {
    console.error('[comments]', err)
    return Response.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}
