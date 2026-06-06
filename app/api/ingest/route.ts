import { NextRequest } from 'next/server'
import { scrapeContent, detectPlatform, isYouTubeVideo, isXPost } from '@/lib/apify'
import { uploadContent } from '@/lib/tigris'
import { generateVibeBlueprint } from '@/lib/nebius'
import { dbInsert } from '@/lib/insforge'
import type { ContentItem } from '@/lib/insforge'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { url } = body as { url: string }

  if (!url?.trim()) {
    return Response.json({ error: 'url is required' }, { status: 400 })
  }

  const platform = detectPlatform(url)
  if (!platform) {
    return Response.json(
      { error: 'Unsupported URL. Paste a YouTube video or X/Twitter post link.' },
      { status: 400 }
    )
  }

  if (platform === 'youtube' && !isYouTubeVideo(url)) {
    return Response.json(
      { error: 'Paste a specific YouTube video link (e.g. youtube.com/watch?v=...), not a channel or profile page.' },
      { status: 400 }
    )
  }

  if (platform === 'x' && !isXPost(url)) {
    return Response.json(
      { error: 'Paste a specific X/Twitter post link (e.g. x.com/user/status/...), not a profile page.' },
      { status: 400 }
    )
  }

  try {
    const content = await scrapeContent(url)

    const tigrisKey = `transcripts/${platform}/${Date.now()}.txt`
    await uploadContent(tigrisKey, content.primaryText)

    const vibeBlueprint = await generateVibeBlueprint(content.primaryText)

    const item = await dbInsert<ContentItem>('content_items', {
      platform,
      content_url: url,
      creator_handle: content.creatorHandle,
      tigris_key: tigrisKey,
      vibe_blueprint: vibeBlueprint,
    })

    return Response.json({
      contentItemId: item.id,
      creatorHandle: content.creatorHandle,
      title: content.title,
      platform,
      contentUrl: url,
      vibeBlueprint,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed'
    console.error('[ingest]', err)
    return Response.json({ error: message }, { status: 500 })
  }
}
