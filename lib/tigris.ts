import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
})

const BUCKET = process.env.TIGRIS_BUCKET_NAME!

export async function uploadContent(key: string, body: string, contentType = 'text/plain') {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

export async function fetchContent(key: string): Promise<string> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  )
  return response.Body!.transformToString()
}

export async function listContent(prefix: string) {
  const response = await client.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
  )
  return response.Contents ?? []
}

export type ContentKey = `transcripts/youtube/${string}` | `transcripts/x/${string}`

export const CONTENT_KEYS = {
  youtube: 'transcripts/youtube/burnout-video.txt' as ContentKey,
  x: 'transcripts/x/build-in-public-thread.txt' as ContentKey,
}
