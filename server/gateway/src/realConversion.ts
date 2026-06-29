import { conversionClient } from './grpcClient.js'
import { updateImageState } from './jobstore.js'
import { saveConvertedFile } from './storage.js'

interface ConvertImageProgressMessage {
  imageId: string
  stage: 'RECEIVED' | 'CONVERTING' | 'DONE' | 'FAILED'
  convertedData?: Buffer
  errorMessage?: string
}

const STAGE_TO_PERCENTAGE: Record<string, number> = {
  RECEIVED: 10,
  CONVERTING: 50,
  DONE: 100,
  FAILED: 0, // overridden below to whatever percentage it failed at
}

/**
 * Calls the worker over gRPC to convert one image, updates the shared
 * job store as progress arrives, and resolves once the image is
 * fully done or failed.
 */
export function runRealConversion(
  jobId: string,
  imageId: string,
  imageBuffer: Buffer,
  sourceMimeType: string,
  targetFormat: string,
  onUpdate: () => void
): Promise<void> {
  return new Promise((resolve) => {
    let lastKnownPercentage = 0

    const call = conversionClient.ConvertImage({
      imageId,
      imageData: imageBuffer,
      sourceMimeType,
      targetFormat,
    })

    call.on('data', async (message: ConvertImageProgressMessage) => {
      const { stage, convertedData, errorMessage } = message

      if (stage === 'DONE' && convertedData) {
        const downloadUrl = await saveConvertedFile(
          imageId,
          targetFormat,
          convertedData
        )
        updateImageState(jobId, imageId, {
          status: 'done',
          percentage: 100,
          downloadUrl,
        })
        onUpdate()
        return
      }

      if (stage === 'FAILED') {
        updateImageState(jobId, imageId, {
          status: 'failed',
          percentage: lastKnownPercentage,
          errorMessage: errorMessage ?? 'Conversion failed',
        })
        onUpdate()
        return
      }

      // RECEIVED or CONVERTING
      const percentage = STAGE_TO_PERCENTAGE[stage] ?? lastKnownPercentage
      lastKnownPercentage = percentage

      updateImageState(jobId, imageId, {
        status: 'processing',
        percentage,
      })
      onUpdate()
    })

    call.on('end', () => {
      resolve()
    })

    call.on('error', (err: Error) => {
      updateImageState(jobId, imageId, {
        status: 'failed',
        percentage: lastKnownPercentage,
        errorMessage: `gRPC connection error: ${err.message}`,
      })
      onUpdate()
      resolve()
    })
  })
}