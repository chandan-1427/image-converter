import { conversionClient } from '../grpc/client.js'
import { updateImageState } from '../store/jobStore.js'
import { saveConvertedFile } from './storage.service.js'

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
  FAILED: 0,
}

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
    let pendingWork: Promise<void> = Promise.resolve()

    const call = conversionClient.ConvertImage({
      imageId,
      imageData: imageBuffer,
      sourceMimeType,
      targetFormat,
    })

    call.on('data', (message: ConvertImageProgressMessage) => {
      // Chain each data event's handling onto pendingWork, so 'end'
      // can wait for the LAST one to actually finish before resolving.
      pendingWork = pendingWork.then(async () => {
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

        const percentage = STAGE_TO_PERCENTAGE[stage] ?? lastKnownPercentage
        lastKnownPercentage = percentage

        updateImageState(jobId, imageId, {
          status: 'processing',
          percentage,
        })
        onUpdate()
      })
    })

    call.on('end', async () => {
      await pendingWork
      resolve()
    })

    call.on('error', async (err: Error) => {
      await pendingWork
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