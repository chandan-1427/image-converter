import type { UploadedImage, UploadError } from '../components/ImageUploader/ImageUploader.types'

export interface ImageConvertState {
  images: UploadedImage[]
  errors: UploadError[]
}

export const initialImageConvertState: ImageConvertState = {
  images: [],
  errors: [],
}

export type ImageConvertAction =
  | { type: 'ADD_IMAGES'; payload: UploadedImage[] }
  | { type: 'SET_ERRORS'; payload: UploadError[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'REMOVE_IMAGE'; payload: { id: string } }

export function imageConvertReducer(
  state: ImageConvertState,
  action: ImageConvertAction
): ImageConvertState {
  switch (action.type) {
    case 'ADD_IMAGES':
      return {
        ...state,
        images: [...state.images, ...action.payload],
      }
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.payload,
      }
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      }
    case 'REMOVE_IMAGE':
      return {
        ...state,
        images: state.images.filter((img) => img.id !== action.payload.id),
      }
    default:
      return state
  }
}