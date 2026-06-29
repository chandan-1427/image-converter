import { useEffect, useState } from 'react'
import type { UploadedImage } from '../ImageUploader/ImageUploader.types'
import {
  SUPPORTED_FORMATS,
  FORMAT_LABELS,
  getFormatFromMimeType,
} from '../../constants/imageFormats'

interface ImagePreviewListProps {
  images: UploadedImage[]
  onRemove: (id: string) => void
}

export default function ImagePreviewList({
  images,
  onRemove,
}: ImagePreviewListProps) {
  if (images.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      {images.map((image) => (
        <ImagePreviewRow key={image.id} image={image} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface ImagePreviewRowProps {
  image: UploadedImage
  onRemove: (id: string) => void
}

function ImagePreviewRow({ image, onRemove }: ImagePreviewRowProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    const url = URL.createObjectURL(image.file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [image.file])

  const currentFormat = getFormatFromMimeType(image.type)

  // Show every supported format except whatever the image already is
  const availableTargets = SUPPORTED_FORMATS.filter(
    (format) => format !== currentFormat
  )

  return (
    <div className="flex items-center gap-4 border border-white/20 rounded-lg p-3">
      <img
        src={previewUrl}
        alt={image.name}
        className="w-14 h-14 object-cover rounded"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white-color truncate">
          {image.name}
        </p>
        <p className="text-xs text-gray-500">{image.type}</p>
      </div>

      <select className="border border-gray-600 rounded px-2 py-1 text-sm text-gray-600">
        <option value="" disabled>
          Convert to...
        </option>
        {availableTargets.map((format) => (
          <option key={format} value={format}>
            {FORMAT_LABELS[format]}
          </option>
        ))}
      </select>

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