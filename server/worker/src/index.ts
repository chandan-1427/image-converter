import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROTO_PATH = path.join(__dirname, '../../protos/image_conversion.proto')

const MAX_MESSAGE_SIZE_BYTES = 20 * 1024 * 1024 // 15MB, matches our agreed cap

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false, // converts snake_case proto fields to camelCase in JS
  longs: String,
  enums: String, // ConversionStage will arrive as string names, not numbers
  defaults: true,
  oneofs: true,
})

const proto = grpc.loadPackageDefinition(packageDefinition) as any
const ImageConversionService = proto.imageconversion.ImageConversionService

const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'gif'] as const
type SupportedFormat = (typeof SUPPORTED_FORMATS)[number]

function isSupportedFormat(value: string): value is SupportedFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(value)
}

function convertImage(
  call: grpc.ServerWritableStream<any, any>
) {
  const { imageId, imageData, targetFormat } = call.request

  // Stage 1: acknowledge receipt
  call.write({
    imageId,
    stage: 'RECEIVED',
  })

  if (!isSupportedFormat(targetFormat)) {
    call.write({
      imageId,
      stage: 'FAILED',
      errorMessage: `Unsupported target format: ${targetFormat}`,
    })
    call.end()
    return
  }

  // Stage 2: actively converting
  call.write({
    imageId,
    stage: 'CONVERTING',
  })

  const buffer = Buffer.from(imageData)

  sharp(buffer)
    .toFormat(targetFormat)
    .toBuffer()
    .then((convertedBuffer) => {
      call.write({
        imageId,
        stage: 'DONE',
        convertedData: convertedBuffer,
      })
      call.end()
    })
    .catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown conversion error'

      call.write({
        imageId,
        stage: 'FAILED',
        errorMessage,
      })
      call.end()
    })
}

function main() {
  const server = new grpc.Server({
    'grpc.max_send_message_length': MAX_MESSAGE_SIZE_BYTES,
    'grpc.max_receive_message_length': MAX_MESSAGE_SIZE_BYTES,
  })

  server.addService(ImageConversionService.service, {
    ConvertImage: convertImage,
  })

  const address = '0.0.0.0:50051'

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) {
      console.error('Failed to bind worker server:', err)
      process.exit(1)
    }
    console.log(`Worker gRPC server listening on ${address}`)
  })

  // Graceful shutdown: let in-flight conversions finish before exiting
  const shutdown = () => {
    console.log('Shutting down worker...')
    server.tryShutdown(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()