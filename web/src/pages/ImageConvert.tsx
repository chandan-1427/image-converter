import { useReducer, useState } from 'react'
import ImageUploader from '../components/ImageUploader/ImageUploader'
import ImagePreviewList from '../components/ImagePreviewList/ImagePreviewList'
import {
  imageConvertReducer,
  initialImageConvertState,
} from '../state/imageConvert.reducer'
import { useUploadJob } from '../hooks/useUploadJob'
import { useJobProgress } from '../hooks/useJobProgress'

const MAX_FILES = 5

export default function ImageConvert() {
  const [state, dispatch] = useReducer(
    imageConvertReducer,
    initialImageConvertState
  )
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const uploadMutation = useUploadJob()
  const progress = useJobProgress(activeJobId)

  const handleConvertClick = async () => {
    const items = state.images.map((image) => ({
      image,
      targetFormat: image.targetFormat,
    }))

    const result = await uploadMutation.mutateAsync(items)
    setActiveJobId(result.jobId)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <ImageUploader
        currentCount={state.images.length}
        maxFiles={MAX_FILES}
        onFilesValidated={(images, errors) => {
          if (errors.length > 0) {
            dispatch({ type: 'SET_ERRORS', payload: errors })
          } else {
            dispatch({ type: 'CLEAR_ERRORS' })
          }
          if (images.length > 0) {
            dispatch({ type: 'ADD_IMAGES', payload: images })
          }
        }}
        onErrorsExpired={() => dispatch({ type: 'CLEAR_ERRORS' })}
      />

      {state.errors.length > 0 && (
        <div className="mt-3 space-y-1">
          {state.errors.map((err, idx) => (
            <p key={idx} className="text-sm text-red-600">
              {err.fileName}: {err.reason}
            </p>
          ))}
        </div>
      )}

      <ImagePreviewList
        images={state.images}
        onRemove={(id) => dispatch({ type: 'REMOVE_IMAGE', payload: { id } })}
        onTargetFormatChange={(id, targetFormat) =>
          dispatch({ type: 'SET_TARGET_FORMAT', payload: { id, targetFormat } })
        }
        progressByImageId={progress.imageProgress}
      />

      {state.images.length > 0 && (
        <button
          onClick={handleConvertClick}
          disabled={uploadMutation.isPending || !!activeJobId}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {uploadMutation.isPending ? 'Starting...' : 'Convert'}
        </button>
      )}

      {progress.connectionError && (
        <p className="mt-2 text-sm text-red-600">{progress.connectionError}</p>
      )}

      {progress.completeInfo && (
        <p className="mt-2 text-sm text-green-700">
          Done: {progress.completeInfo.succeeded} succeeded,{' '}
          {progress.completeInfo.failed} failed.
        </p>
      )}
    </div>
  )
}