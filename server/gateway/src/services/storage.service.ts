import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = path.join(__dirname, '../../temp-storage')

const FILE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000 // check every 1 minute

/**
 * Saves converted image bytes to local temp storage.
 * Returns a URL the browser can use to download it.
 */
export async function saveConvertedFile(
  imageId: string,
  format: string,
  data: Buffer
): Promise<string> {
  const fileName = `${imageId}.${format}`
  const filePath = path.join(STORAGE_DIR, fileName)

  await fs.writeFile(filePath, data)

  return `/api/files/${fileName}`
}

export function getStorageDir(): string {
  return STORAGE_DIR
}

/**
 * Deletes files older than FILE_TTL_MS from temp storage.
 * Skips the .gitkeep placeholder file.
 */
async function cleanupOldFiles(): Promise<void> {
  try {
    const files = await fs.readdir(STORAGE_DIR)

    for (const file of files) {
      if (file === '.gitkeep') continue

      const filePath = path.join(STORAGE_DIR, file)
      const stats = await fs.stat(filePath)
      const age = Date.now() - stats.mtimeMs

      if (age > FILE_TTL_MS) {
        await fs.unlink(filePath)
        console.log(`Cleaned up expired file: ${file}`)
      }
    }
  } catch (error) {
    console.error('Error during temp storage cleanup:', error)
  }
}

/**
 * Starts the background cleanup job. Call this once when the server boots.
 */
export function startCleanupJob(): void {
  setInterval(cleanupOldFiles, CLEANUP_INTERVAL_MS)
  console.log('Temp storage cleanup job started')
}