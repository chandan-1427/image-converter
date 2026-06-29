import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { createJob, getJob } from './jobstore.js'
import { runFakeConversion } from './fetchConversion.js'
import type { ImageJobState } from './types.js'

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

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const initialStates: ImageJobState[] = metaImages.map((img) => ({
    imageId: img.id,
    targetFormat: img.targetFormat,
    status: 'queued',
    percentage: 0,
  }))

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

        const sendProgress = (imageId: string) => {
          const state = job.images.get(imageId)
          if (!state) return

          const payload = JSON.stringify(state)
          controller.enqueue(
            encoder.encode(`event: progress\ndata: ${payload}\n\n`)
          )
        }

        const sendComplete = () => {
          const allStates = Array.from(job.images.values())
          const succeeded = allStates.filter((s) => s.status === 'done').length
          const failed = allStates.filter((s) => s.status === 'failed').length

          const payload = JSON.stringify({
            jobId: job.jobId,
            totalImages: allStates.length,
            succeeded,
            failed,
          })
          controller.enqueue(
            encoder.encode(`event: complete\ndata: ${payload}\n\n`)
          )
          controller.close()
        }

        // Run all image conversions in parallel, fire SSE on every update
        const imageIds = Array.from(job.images.keys())
        const conversionPromises = imageIds.map((imageId) => {
          const state = job.images.get(imageId)!
          return runFakeConversion(jobId, imageId, state.targetFormat, () =>
            sendProgress(imageId)
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

const port = 8080
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Dummy server running at http://localhost:${info.port}`)
})