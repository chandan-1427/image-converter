import { Hono } from 'hono'
import { createJob } from '../store/jobStore.js'
import type { ImageJobState } from '../types/job.types.js'

interface UploadMetaImage {
  id: string
  targetFormat: string
}

export const jobsRoutes = new Hono()

jobsRoutes.post('/', async (c) => {
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