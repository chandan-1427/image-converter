import { updateImageState } from './jobstore.js'

const TOTAL_DURATION_MS = 3500
const TICK_INTERVAL_MS = 350 // updates roughly 10 times over the duration

/**
 * Simulates converting one image by ticking its percentage up over time.
 * Calls onUpdate every tick so the SSE stream can push it to the browser.
 */
export function runFakeConversion(
  jobId: string,
  imageId: string,
  targetFormat: string,
  onUpdate: () => void
): Promise<void> {
  return new Promise((resolve) => {
    let elapsed = 0

    updateImageState(jobId, imageId, { status: 'processing', percentage: 0 })
    onUpdate()

    const interval = setInterval(() => {
      elapsed += TICK_INTERVAL_MS
      const percentage = Math.min(
        100,
        Math.round((elapsed / TOTAL_DURATION_MS) * 100)
      )

      if (percentage >= 100) {
        clearInterval(interval)
        updateImageState(jobId, imageId, {
          status: 'done',
          percentage: 100,
          downloadUrl: `https://dummy-files.example.com/${jobId}/${imageId}.${targetFormat}`,
        })
        onUpdate()
        resolve()
      } else {
        updateImageState(jobId, imageId, { percentage })
        onUpdate()
      }
    }, TICK_INTERVAL_MS)
  })
}