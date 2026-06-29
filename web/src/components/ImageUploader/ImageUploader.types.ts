export interface UploadedImage {
  id: string
  file: File
  name: string
  type: string
  targetFormat: string
}

export interface UploadError {
  fileName: string
  reason: string
}