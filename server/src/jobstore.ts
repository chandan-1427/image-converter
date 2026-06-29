import type { Job, ImageJobState } from './types.js'

// In-memory store. Real production setup would use Redis or a database
// so multiple server instances can share job state.
const jobs = new Map<string, Job>()

export function createJob(jobId: string, images: ImageJobState[]): Job {
  const job: Job = {
    jobId,
    images: new Map(images.map((img) => [img.imageId, img])),
    createdAt: Date.now(),
  }
  jobs.set(jobId, job)
  return job
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId)
}

export function updateImageState(
  jobId: string,
  imageId: string,
  update: Partial<ImageJobState>
): void {
  const job = jobs.get(jobId)
  if (!job) return

  const current = job.images.get(imageId)
  if (!current) return

  job.images.set(imageId, { ...current, ...update })
}