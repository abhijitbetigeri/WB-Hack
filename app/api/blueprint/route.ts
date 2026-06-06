import { NextRequest } from 'next/server'
import { fetchContent, CONTENT_KEYS } from '@/lib/tigris'
import { generateVibeBlueprint } from '@/lib/nebius'
import { db, dbInsert, dbUpdate } from '@/lib/insforge'
import type { ContentItem, VibeBlueprint } from '@/lib/insforge'

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform') as 'youtube' | 'x' | null

  if (!platform || !['youtube', 'x'].includes(platform)) {
    return Response.json({ error: 'platform must be youtube or x' }, { status: 400 })
  }

  try {
    // Always use the seeded demo content (matched by tigris_key) for demo buttons
    const tigrisKey = CONTENT_KEYS[platform]

    const { data: cached } = await db.database
      .from('content_items')
      .select()
      .eq('platform', platform)
      .eq('tigris_key', tigrisKey)
      .not('vibe_blueprint', 'is', null)
      .limit(1)

    const hit = (cached ?? []) as ContentItem[]
    if (hit.length > 0 && hit[0].vibe_blueprint) {
      return Response.json({
        contentItemId: hit[0].id,
        creatorHandle: hit[0].creator_handle,
        contentUrl: hit[0].content_url,
        vibeBlueprint: hit[0].vibe_blueprint,
        fromCache: true,
      })
    }

    // Fetch transcript from Tigris
    const transcript = await fetchContent(tigrisKey)

    // Generate Vibe Blueprint
    const vibeBlueprint = await generateVibeBlueprint(transcript)

    // Upsert into InsForge
    const { data: existing } = await db.database
      .from('content_items')
      .select()
      .eq('platform', platform)
      .eq('tigris_key', tigrisKey)
      .limit(1)

    let item: ContentItem
    if ((existing ?? []).length > 0) {
      const updated = await dbUpdate<ContentItem>(
        'content_items',
        { platform, tigris_key: tigrisKey },
        { vibe_blueprint: vibeBlueprint }
      )
      item = updated[0]
    } else {
      item = await dbInsert<ContentItem>('content_items', {
        platform,
        content_url: platform === 'youtube'
          ? 'https://www.youtube.com/watch?v=example_burnout'
          : 'https://x.com/jordanbuilds/status/1234567890',
        creator_handle: platform === 'youtube' ? '@alexcreates' : '@jordanbuilds',
        tigris_key: tigrisKey,
        vibe_blueprint: vibeBlueprint,
      })
    }

    return Response.json({
      contentItemId: item.id,
      creatorHandle: item.creator_handle,
      contentUrl: item.content_url,
      vibeBlueprint: item.vibe_blueprint as VibeBlueprint,
      fromCache: false,
    })
  } catch (err) {
    console.error('[blueprint]', err)
    return Response.json({ error: 'Failed to generate blueprint' }, { status: 500 })
  }
}
