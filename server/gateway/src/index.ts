import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { createJob, getJob } from './jobstore.js'
import { runRealConversion } from './realConversion.js'
import type { ImageJobState } from './types.js'
import { getStorageDir } from './storage.js'
import path from 'node:path'

const app = new Hono()

// CORS: only allow our actual frontend origin, with credentials off.
// (Loose wildcard CORS with credentials is a real vulnerability — see
// the hono/cors security fix we looked up earlier.)
app.use(
  '/*',
  cors({
    origin: 'http://localhost:5173',
    allowMethods: ['GET', 'POST'],
  })
)

interface UploadMetaImage {
  id: string
  targetFormat: string
}

app.post('/api/jobs', async (c) => {
  const formData = await c.req.formData()

  const metaRaw = formData.get('meta')
  if (typeof metaRaw !== 'string') {
    return c.json({ error: 'Missing meta field' }, 400)
  }

  let metaImages: UploadMetaImage[]
  try {
    metaImages = JSON.parse(metaRaw).images
  } catch {
    return c.json({ error: 'Invalid meta JSON' }, 400)
  }

  if (!Array.isArray(metaImages) || metaImages.length === 0) {
    return c.json({ error: 'No images provided' }, 400)
  }

  const files = formData.getAll('files')

  if (files.length !== metaImages.length) {
    return c.json(
      { error: 'Mismatch between number of files and metadata entries' },
      400
    )
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const initialStates: ImageJobState[] = []

  for (let i = 0; i < metaImages.length; i++) {
    const meta = metaImages[i]
    const file = files[i]

    if (!(file instanceof File)) {
      return c.json({ error: 'Invalid file entry' }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    initialStates.push({
      imageId: meta.id,
      targetFormat: meta.targetFormat,
      status: 'queued',
      percentage: 0,
      fileBuffer,
      sourceMimeType: file.type,
    })
  }

  createJob(jobId, initialStates)

  return c.json({ jobId })
})

app.get('/api/jobs/:jobId/progress', (c) => {
  const jobId = c.req.param('jobId')
  const job = getJob(jobId)

  if (!job) {
    return c.json({ error: 'Job not found' }, 404)
  }

  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        let isStreamClosed = false

        const sendProgress = (imageId: string) => {
          if (isStreamClosed) return

          const state = job.images.get(imageId)
          if (!state) return

          const payload = JSON.stringify(state)
          try {
            controller.enqueue(
              encoder.encode(`event: progress\ndata: ${payload}\n\n`)
            )
          } catch (err) {
            console.error('Failed to send progress event:', err)
          }
        }

        const sendComplete = () => {
          if (isStreamClosed) return

          const allStates = Array.from(job.images.values())
          const succeeded = allStates.filter((s) => s.status === 'done').length
          const failed = allStates.filter((s) => s.status === 'failed').length

          const payload = JSON.stringify({
            jobId: job.jobId,
            totalImages: allStates.length,
            succeeded,
            failed,
          })

          try {
            controller.enqueue(
              encoder.encode(`event: complete\ndata: ${payload}\n\n`)
            )
          } catch (err) {
            console.error('Failed to send complete event:', err)
          }

          isStreamClosed = true
          controller.close()
        }

        // Run all image conversions in parallel, fire SSE on every update
        const imageIds = Array.from(job.images.keys())
        const conversionPromises = imageIds.map((imageId) => {
          const state = job.images.get(imageId)!
          return runRealConversion(
            jobId,
            imageId,
            state.fileBuffer!,
            state.sourceMimeType!,
            state.targetFormat,
            () => sendProgress(imageId)
          )
        })

        Promise.all(conversionPromises).then(sendComplete)
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  )
})

app.get('/api/files/:fileName', async (c) => {
  const fileName = c.req.param('fileName')

  // Prevent path traversal — reject anything trying to escape the storage folder
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return c.json({ error: 'Invalid file name' }, 400)
  }

  const filePath = path.join(getStorageDir(), fileName)

  try {
    const file = await import('node:fs/promises').then((fs) =>
      fs.readFile(filePath)
    )
    return new Response(file, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch {
    return c.json({ error: 'File not found or expired' }, 404)
  }
})

const port = 8080
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Dummy server running at http://localhost:${info.port}`)
})