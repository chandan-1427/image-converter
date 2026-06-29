export const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'gif'] as const

export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number]

export const FORMAT_LABELS: Record<SupportedFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WEBP',
  gif: 'GIF',
}

/**
 * Figures out the normalized format from a file's mime type.
 * Treats "jpg" and "jpeg" as the same format: "jpeg".
 * Returns null if the mime type isn't one of our supported formats.
 */
export function getFormatFromMimeType(mimeType: string): SupportedFormat | null {
  const subtype = mimeType.split('/')[1]?.toLowerCase()

  if (!subtype) return null

  if (subtype === 'jpg' || subtype === 'jpeg') return 'jpeg'
  if (subtype === 'png') return 'png'
  if (subtype === 'webp') return 'webp'
  if (subtype === 'gif') return 'gif'

  return null
}