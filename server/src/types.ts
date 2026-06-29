export type ImageJobStatus = 'queued' | 'processing' | 'done' | 'failed'

export interface ImageJobState {
  imageId: string
  targetFormat: string
  status: ImageJobStatus
  percentage: number
  downloadUrl?: string
  errorMessage?: string
}

export interface Job {
  jobId: string
  images: Map<string, ImageJobState>
  createdAt: number
}