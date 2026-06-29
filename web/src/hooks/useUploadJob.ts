import { useMutation } from '@tanstack/react-query'
import { uploadConversionJob } from '../api/jobs'
import type { UploadedImage } from '../components/ImageUploader/ImageUploader.types'

interface UploadImageWithTarget {
  image: UploadedImage
  targetFormat: string
}

export function useUploadJob() {
  return useMutation({
    mutationFn: (items: UploadImageWithTarget[]) =>
      uploadConversionJob(items),
  })
}