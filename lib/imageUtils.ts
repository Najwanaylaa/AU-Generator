/**
 * Image Utilities
 * Handle image upload validation and conversion
 */

export interface ImageFile {
  file: File
  preview: string
  size: number
}

/**
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Maximum number of background images per project
 */
export const MAX_IMAGES = 30

/**
 * Supported image formats
 */
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Validate uploaded image file
 */
export function validateImageFile(file: File): {
  isValid: boolean
  error?: string
} {
  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported format. Supported formats: JPEG, PNG, WebP, GIF`
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed (5MB)`
    }
  }

  return { isValid: true }
}

/**
 * Create preview URLs from FileList
 */
export async function createImagePreviews(
  fileList: FileList | null
): Promise<ImageFile[]> {
  if (!fileList || fileList.length === 0) {
    return []
  }

  const previews: ImageFile[] = []

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    const validation = validateImageFile(file)

    if (!validation.isValid) {
      console.warn(`Image ${file.name}: ${validation.error}`)
      continue
    }

    const preview = URL.createObjectURL(file)
    previews.push({
      file,
      preview,
      size: file.size
    })
  }

  return previews
}

/**
 * Convert blob/object URL or remote URL to a data URL for reliable export/canvas use.
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to read image for export')
  }

  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to encode image for export'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Preload multiple image URLs as data URLs (cached by index).
 */
export async function preloadImageDataUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map((url) => imageUrlToDataUrl(url)))
}

/**
 * Clean up preview URLs to prevent memory leaks
 */
export function cleanupPreviews(previews: ImageFile[]): void {
  previews.forEach(preview => {
    URL.revokeObjectURL(preview.preview)
  })
}

/**
 * Convert File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Convert multiple files to base64
 */
export async function filesToBase64(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) {
    return []
  }

  const results: string[] = []
  for (let i = 0; i < files.length; i++) {
    try {
      const base64 = await fileToBase64(files[i])
      results.push(base64)
    } catch (error) {
      console.error(`Error converting file ${i}:`, error)
    }
  }

  return results
}

/**
 * Resize image to specific dimensions
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          'image/jpeg',
          0.95
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = event.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}
