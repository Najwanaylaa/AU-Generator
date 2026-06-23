import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { Slide, ProjectSettings } from '@/types'
import { resolveProjectSettings } from '@/lib/projectSettings'
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  loadSlideBackground,
} from '@/lib/slideCanvasRender'
import { getUniformFontSizeForSlides, exportSlideToPng } from '@/lib/slideExport'

const WIDTH = SLIDE_WIDTH
const HEIGHT = SLIDE_HEIGHT
const FPS = 30
const ENCODE_QUEUE_LIMIT = 8

function supportsVideoExport(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

async function resolveEncoderConfig(): Promise<VideoEncoderConfig> {
  const candidates: VideoEncoderConfig[] = [
    {
      codec: 'avc1.640033',
      width: WIDTH,
      height: HEIGHT,
      bitrate: 10_000_000,
      framerate: FPS,
    },
    {
      codec: 'avc1.420028',
      width: WIDTH,
      height: HEIGHT,
      bitrate: 10_000_000,
      framerate: FPS,
    },
    {
      codec: 'avc1.42E01E',
      width: WIDTH,
      height: HEIGHT,
      bitrate: 10_000_000,
      framerate: FPS,
    },
  ]

  for (const config of candidates) {
    const { supported } = await VideoEncoder.isConfigSupported(config)
    if (supported) return config
  }

  throw new Error(
    'This browser cannot encode 1080×1920 video. Try Chrome or Edge, or export as PNG.'
  )
}

async function waitForEncoderQueue(encoder: VideoEncoder): Promise<void> {
  while (encoder.encodeQueueSize > ENCODE_QUEUE_LIMIT) {
    await new Promise<void>((resolve) => {
      if (encoder.encodeQueueSize <= ENCODE_QUEUE_LIMIT) {
        resolve()
        return
      }
      encoder.addEventListener('dequeue', () => resolve(), { once: true })
    })
  }
}

function assertEncoderReady(
  encoder: VideoEncoder,
  encoderError: Error | null
): void {
  if (encoderError) throw encoderError
  if (encoder.state === 'closed') {
    throw (
      encoderError ??
      new Error('Video encoder closed unexpectedly. Try PNG export instead.')
    )
  }
  if (encoder.state !== 'configured') {
    throw new Error(`Video encoder is not ready (state: ${encoder.state})`)
  }
}

/** Ease-in-out for smooth prompt-style scroll (Deprecated/Unused) */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * MP4 slideshow — tiap slide tampil berurutan secara statis (teks tidak bergulir).
 * Rendered via canvas.
 */
export async function exportSlidesToSlideMp4(
  slides: Slide[],
  imageDataUrls: string[],
  projectSettings?: ProjectSettings,
  onProgress?: (message: string) => void
): Promise<Blob> {
  if (!supportsVideoExport()) {
    throw new Error(
      'MP4 export needs a modern browser (Chrome, Edge, or Safari 16.4+). Try PNG export instead.'
    )
  }

  if (slides.length === 0) {
    throw new Error('No slides to export')
  }

  const settings = resolveProjectSettings(projectSettings)
  const seconds = Math.max(1, Math.min(10, settings.secondsPerSlide))
  const framesPerSlide = Math.round(seconds * FPS)
  const frameDurationUs = Math.round(1_000_000 / FPS)

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: WIDTH,
      height: HEIGHT,
      frameRate: FPS,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  })

  let encoderError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e))
    },
  })

  try {
    await document.fonts.ready
    const encoderConfig = await resolveEncoderConfig()
    encoder.configure(encoderConfig)

    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create export canvas')

    let timestamp = 0

    onProgress?.('Calculating consistent font sizes…')
    const uniformFontSize = await getUniformFontSizeForSlides(slides, imageDataUrls, settings)

    for (let s = 0; s < slides.length; s++) {
      onProgress?.(`Encoding slide ${s + 1} of ${slides.length}…`)
      const slide = slides[s]
      const imageDataUrl = imageDataUrls[slide.imageIndex || 0]

      const slidePngUrl = await exportSlideToPng(
        slide,
        imageDataUrl,
        settings,
        { width: WIDTH, height: HEIGHT },
        slide.isCover ? undefined : uniformFontSize
      )
      const slideImage = await loadSlideBackground(slidePngUrl)

      for (let f = 0; f < framesPerSlide; f++) {
        await waitForEncoderQueue(encoder)
        assertEncoderReady(encoder, encoderError)

        ctx.clearRect(0, 0, WIDTH, HEIGHT)
        ctx.drawImage(slideImage, 0, 0, WIDTH, HEIGHT)

        const frame = new VideoFrame(canvas, {
          timestamp,
          duration: frameDurationUs,
        })
        try {
          encoder.encode(frame, { keyFrame: f === 0 && s === 0 })
        } finally {
          frame.close()
        }

        timestamp += frameDurationUs
        if (encoderError) throw encoderError
      }
    }

    onProgress?.('Finalizing video…')
    await waitForEncoderQueue(encoder)
    assertEncoderReady(encoder, encoderError)
    await encoder.flush()
    muxer.finalize()

    if (encoderError) throw encoderError

    return new Blob([target.buffer], { type: 'video/mp4' })
  } finally {
    if (encoder.state !== 'closed') {
      try {
        encoder.close()
      } catch {
        /* already closed */
      }
    }
  }
}

/** @deprecated Use exportSlidesToSlideMp4 */
export const exportSlidesToMp4 = exportSlidesToSlideMp4