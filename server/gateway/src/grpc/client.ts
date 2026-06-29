import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROTO_PATH = path.join(__dirname, '../../../protos/image_conversion.proto')

const MAX_MESSAGE_SIZE_BYTES = 20 * 1024 * 1024 // matches the worker's setting

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const proto = grpc.loadPackageDefinition(packageDefinition) as any
const ImageConversionService = proto.imageconversion.ImageConversionService

const WORKER_ADDRESS = process.env.WORKER_ADDRESS ?? 'localhost:50051'

export const conversionClient = new ImageConversionService(
  WORKER_ADDRESS,
  grpc.credentials.createInsecure(),
  {
    'grpc.max_send_message_length': MAX_MESSAGE_SIZE_BYTES,
    'grpc.max_receive_message_length': MAX_MESSAGE_SIZE_BYTES,
  }
)