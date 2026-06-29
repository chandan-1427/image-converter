export type ImageJobStatus = 'queued' | 'processing' | 'done' | 'failed'

export interface ImageJobState {
  imageId: string
  targetFormat: string
  status: ImageJobStatus
  percentage: number
  downloadUrl?: string
  errorMessage?: string
  // Raw file data, kept only until conversion starts
  fileBuffer?: Buffer
  sourceMimeType?: string
}

export interface Job {
  jobId: string
  images: Map<string, ImageJobState>
  createdAt: number
}