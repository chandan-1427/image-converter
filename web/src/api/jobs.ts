import { apiClient } from '../lib/axios'
import type { UploadedImage } from '../components/ImageUploader/ImageUploader.types'

export interface JobUploadResponse {
  jobId: string
}

interface UploadImageWithTarget {
  image: UploadedImage
  targetFormat: string
}

export async function uploadConversionJob(
  items: UploadImageWithTarget[]
): Promise<JobUploadResponse> {
  const formData = new FormData()

  const meta = {
    images: items.map(({ image, targetFormat }) => ({
      id: image.id,
      targetFormat,
    })),
  }

  formData.append('meta', JSON.stringify(meta))

  for (const { image } of items) {
    formData.append('files', image.file, image.name)
  }

  const response = await apiClient.post<JobUploadResponse>(
    '/jobs',
    formData
  )

  return response.data
}