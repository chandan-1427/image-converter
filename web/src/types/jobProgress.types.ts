export type ImageJobStatus = 'queued' | 'processing' | 'done' | 'failed'

export interface ImageProgressEvent {
  imageId: string
  status: ImageJobStatus
  percentage: number
  downloadUrl?: string
  errorMessage?: string
}

export interface JobCompleteEvent {
  jobId: string
  totalImages: number
  succeeded: number
  failed: number
}