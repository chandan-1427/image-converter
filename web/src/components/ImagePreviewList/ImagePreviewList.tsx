import { useEffect, useState } from 'react'
import type { UploadedImage } from '../ImageUploader/ImageUploader.types'
import {
  SUPPORTED_FORMATS,
  FORMAT_LABELS,
  getFormatFromMimeType,
} from '../../constants/imageFormats'
import type { ImageProgressEvent } from '../../types/jobProgress.types'

interface ImagePreviewListProps {
  images: UploadedImage[]
  onRemove: (id: string) => void
  onTargetFormatChange: (id: string, targetFormat: string) => void
  progressByImageId: Record<string, ImageProgressEvent>
}

export default function ImagePreviewList({
  images,
  onRemove,
  onTargetFormatChange,
  progressByImageId,
}: ImagePreviewListProps) {
  if (images.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      {images.map((image) => (
        <ImagePreviewRow 
          key={image.id} 
          image={image} 
          onRemove={onRemove} 
          onTargetFormatChange={onTargetFormatChange}  
          progress={progressByImageId[image.id]}
        />
      ))}
    </div>
  )
}

interface ImagePreviewRowProps {
  image: UploadedImage
  onRemove: (id: string) => void
  onTargetFormatChange: (id: string, targetFormat: string) => void
  progress?: ImageProgressEvent
}

function ImagePreviewRow({ 
  image, 
  onRemove, 
  onTargetFormatChange,
  progress, 
}: ImagePreviewRowProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    const url = URL.createObjectURL(image.file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [image.file])

  const currentFormat = getFormatFromMimeType(image.type)

  const availableTargets = SUPPORTED_FORMATS.filter(
    (format) => format !== currentFormat
  )

  const isLocked = !!progress

  return (
    <div className="flex items-center gap-4 border border-white/20 rounded-lg p-3">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={image.name}
          className="w-14 h-14 object-cover rounded"
        />
      ) : (
        <div className="w-14 h-14 rounded bg-gray-200" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white-color truncate">
          {image.name}
        </p>
        <p className="text-xs text-gray-500">{image.type}</p>
        
        {progress && (
          <div className="mt-1">
            <div className="w-full bg-gray-200 rounded h-1.5">
              <div
                className={`h-1.5 rounded transition-all ${
                  progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {progress.status === 'failed'
                ? `Failed: ${progress.errorMessage ?? 'Unknown error'}`
                : progress.status === 'done'
                ? 'Done'
                : `${progress.status} — ${progress.percentage}%`}
            </p>
          </div>
        )}
      </div>

      <select 
        value={image.targetFormat}
        onChange={(e) => onTargetFormatChange(image.id, e.target.value)}
        disabled={isLocked}
        className="border border-gray-600 rounded px-2 py-1 text-sm text-gray-600"
      >
        {availableTargets.map((format) => (
          <option key={format} value={format}>
            {FORMAT_LABELS[format]}
          </option>
        ))}
      </select>

      {progress?.status === 'done' && progress.downloadUrl && (
        <a
          href={progress.downloadUrl}
          download
          className="text-blue-600 hover:text-blue-800 text-sm px-2"
        >
          Download
        </a>
      )}

      <button
        onClick={() => onRemove(image.id)}
        className="text-red-500 hover:text-red-700 text-sm px-2"
        aria-label={`Remove ${image.name}`}
      >
        ✕
      </button>
    </div>
  )
}