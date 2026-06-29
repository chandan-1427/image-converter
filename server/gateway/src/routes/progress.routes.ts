import { Hono } from 'hono'
import { getJob } from '../store/jobStore.js'
import { runRealConversion } from '../services/conversion.service.js'

export const progressRoutes = new Hono()

progressRoutes.get('/:jobId/progress', (c) => {
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