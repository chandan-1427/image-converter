import { useEffect, useRef, useState } from 'react'
import type { ImageProgressEvent, JobCompleteEvent } from '../types/jobProgress.types'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface JobProgressState {
  imageProgress: Record<string, ImageProgressEvent>
  completeInfo: JobCompleteEvent | null
  connectionError: string | null
}

export function useJobProgress(jobId: string | null) {
  const [state, setState] = useState<JobProgressState>({
    imageProgress: {},
    completeInfo: null,
    connectionError: null,
  })

  const retryCountRef = useRef(0)

  useEffect(() => {
    if (!jobId) return

    let eventSource: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let isCompleted = false

    function connect() {
      eventSource = new EventSource(`/api/jobs/${jobId}/progress`)

      eventSource.addEventListener('progress', (event) => {
        const data: ImageProgressEvent = JSON.parse(event.data)
        retryCountRef.current = 0 // reset retry count once we get real data

        setState((prev) => ({
          ...prev,
          imageProgress: {
            ...prev.imageProgress,
            [data.imageId]: data,
          },
          connectionError: null,
        }))
      })

      eventSource.addEventListener('complete', (event) => {
        const data: JobCompleteEvent = JSON.parse(event.data)
        isCompleted = true

        setState((prev) => ({
          ...prev,
          completeInfo: data,
        }))

        eventSource?.close()
      })

      eventSource.onerror = () => {
        eventSource?.close()

        // Don't retry if the job already finished normally
        if (isCompleted) return

        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1
          retryTimeout = setTimeout(connect, RETRY_DELAY_MS)
        } else {
          setState((prev) => ({
            ...prev,
            connectionError:
              'Lost connection to the server. Please try again.',
          }))
        }
      }
    }

    connect()

    return () => {
      eventSource?.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [jobId])

  return state
}