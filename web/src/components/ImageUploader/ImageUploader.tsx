import { useRef, useEffect } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import type { UploadedImage, UploadError } from './ImageUploader.types'
import { SUPPORTED_FORMATS, getFormatFromMimeType } from '../../constants/imageFormats'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

interface ImageUploaderProps {
  currentCount: number
  maxFiles: number
  onFilesValidated: (images: UploadedImage[], errors: UploadError[]) => void
  onErrorsExpired: () => void
}

export default function ImageUploader({
  currentCount,
  maxFiles,
  onFilesValidated,
  onErrorsExpired,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  const validateFiles = (fileList: FileList) => {
    const incomingFiles = Array.from(fileList)
    const errors: UploadError[] = []
    const validImages: UploadedImage[] = []

    for (const file of incomingFiles) {
      if (currentCount + validImages.length >= maxFiles) {
        errors.push({
          fileName: file.name,
          reason: `Limit reached. Max ${maxFiles} images allowed.`,
        })
        continue
      }

      if (!file.type.startsWith('image/')) {
        errors.push({
          fileName: file.name,
          reason: 'Not an image file.',
        })
        continue
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          fileName: file.name,
          reason: 'File too large. Max 10MB allowed.',
        })
        continue
      }

      const currentFormat = getFormatFromMimeType(file.type)
      const defaultTarget =
        SUPPORTED_FORMATS.find((format) => format !== currentFormat) ??
        SUPPORTED_FORMATS[0]

      validImages.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        type: file.type,
        targetFormat: defaultTarget,
      })
    }

    onFilesValidated(validImages, errors)

    if (errors.length > 0) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => {
        onErrorsExpired()
        errorTimerRef.current = null
      }, 10_000)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFiles(e.target.files)
    }
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleBrowseClick = () => {
    inputRef.current?.click()
  }

  const isMaxReached = currentCount >= maxFiles

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={!isMaxReached ? handleBrowseClick : undefined}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isMaxReached
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
            : 'border-gray-400 hover:border-blue-500 hover:bg-blue-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          disabled={isMaxReached}
          className="hidden"
        />
        <p className="text-gray-600">
          {isMaxReached
            ? `Maximum ${maxFiles} images reached`
            : 'Drag & drop images here, or click to browse'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Up to {maxFiles} images, max 10MB each
        </p>
      </div>
    </div>
  )
}