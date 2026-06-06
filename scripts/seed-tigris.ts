#!/usr/bin/env tsx
// Uploads hardcoded content to Tigris and seeds InsForge content_items.
// Run once before demo: npm run seed
// Uses direct REST/S3 calls to avoid ESM issues with @insforge/sdk in tsx.

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Load .env.local manually (dotenv not installed)
function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // file doesn't exist, skip
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

const INSFORGE_URL = process.env.INSFORGE_URL!
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY!
const TIGRIS_ENDPOINT = process.env.TIGRIS_ENDPOINT!
const TIGRIS_ACCESS_KEY_ID = process.env.TIGRIS_ACCESS_KEY_ID!
const TIGRIS_SECRET_ACCESS_KEY = process.env.TIGRIS_SECRET_ACCESS_KEY!
const TIGRIS_BUCKET_NAME = process.env.TIGRIS_BUCKET_NAME!

const CONTENT_KEYS = {
  youtube: 'transcripts/youtube/burnout-video.txt',
  x: 'transcripts/x/build-in-public-thread.txt',
}

const s3 = new S3Client({
  endpoint: TIGRIS_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: TIGRIS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
})

async function uploadToTigris(key: string, content: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: TIGRIS_BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    })
  )
}

async function insforgeQuery(sql: string) {
  const res = await fetch(`${INSFORGE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: INSFORGE_API_KEY,
      Authorization: `Bearer ${INSFORGE_API_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

async function insforgeSelect(table: string) {
  const res = await fetch(`${INSFORGE_URL}/api/database/records/${table}`, {
    headers: {
      apikey: INSFORGE_API_KEY,
      Authorization: `Bearer ${INSFORGE_API_KEY}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`InsForge select failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function insforgeInsert(table: string, record: Record<string, unknown>) {
  const res = await fetch(`${INSFORGE_URL}/api/database/records/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: INSFORGE_API_KEY,
      Authorization: `Bearer ${INSFORGE_API_KEY}`,
    },
    body: JSON.stringify(record),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`InsForge insert failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function main() {
  const youtubeContent = readFileSync(resolve(process.cwd(), 'data/youtube-transcript.txt'), 'utf-8')
  const xContent = readFileSync(resolve(process.cwd(), 'data/x-thread.txt'), 'utf-8')

  console.log('⏳ Uploading YouTube transcript to Tigris...')
  await uploadToTigris(CONTENT_KEYS.youtube, youtubeContent)
  console.log(`✅ ${CONTENT_KEYS.youtube}`)

  console.log('⏳ Uploading X thread to Tigris...')
  await uploadToTigris(CONTENT_KEYS.x, xContent)
  console.log(`✅ ${CONTENT_KEYS.x}`)

  // Check if already seeded
  const existing = await insforgeSelect('content_items', {}).catch(() => [])
  const tigrisKeys = (existing as Record<string, string>[]).map((r) => r.tigris_key)
  const alreadySeeded =
    tigrisKeys.includes(CONTENT_KEYS.youtube) && tigrisKeys.includes(CONTENT_KEYS.x)

  if (!alreadySeeded) {
    if (!tigrisKeys.includes(CONTENT_KEYS.youtube)) {
      await insforgeInsert('content_items', {
        platform: 'youtube',
        content_url: 'https://www.youtube.com/watch?v=example_burnout',
        creator_handle: '@alexcreates',
        tigris_key: CONTENT_KEYS.youtube,
      })
      console.log('✅ Seeded YouTube content_item')
    }
    if (!tigrisKeys.includes(CONTENT_KEYS.x)) {
      await insforgeInsert('content_items', {
        platform: 'x',
        content_url: 'https://x.com/jordanbuilds/status/1234567890',
        creator_handle: '@jordanbuilds',
        tigris_key: CONTENT_KEYS.x,
      })
      console.log('✅ Seeded X content_item')
    }
  } else {
    console.log('ℹ️  content_items already seeded, skipping')
  }

  console.log('\n🚀 Seed complete. Ready to demo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
