const BASE_URL = process.env.RTRVR_BASE_URL ?? 'https://api.rtrvr.ai'
const API_KEY = process.env.RTRVR_API_KEY!

export interface ScrapeResult {
  url: string
  text: string
  title?: string
  author?: string
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const res = await fetch(`${BASE_URL}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ url, format: 'text' }),
  })

  if (!res.ok) {
    throw new Error(`rtrvr scrape failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  return {
    url,
    text: data.text ?? data.content ?? '',
    title: data.title,
    author: data.author,
  }
}

export async function scrapeXThread(tweetUrl: string): Promise<ScrapeResult> {
  const res = await fetch(`${BASE_URL}/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      url: tweetUrl,
      prompt: 'Extract the full tweet thread text, author handle, and date. Return all thread posts in order.',
    }),
  })

  if (!res.ok) {
    throw new Error(`rtrvr agent failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  return {
    url: tweetUrl,
    text: data.result ?? data.text ?? '',
    title: data.title,
    author: data.author,
  }
}
