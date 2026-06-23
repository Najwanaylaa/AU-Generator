import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { Slide, ProjectSettings } from '@/types'
import { resolveProjectSettings } from '@/lib/projectSettings'
import { forceLoadFont } from '@/lib/fonts'
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  buildPrompterLayout,
  drawPrompterFrame,
  estimatePrompterDurationSec,
  joinSlidesAsParagraph,
  loadSlideBackground,
} from '@/lib/slideCanvasRender'

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

function assertEncoderReady(encoder: VideoEncoder, encoderError: Error | null): void {
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

/**
 * MP4 prompter mode — seluruh cerita jadi satu paragraf, scroll terus seperti teleprompter.
 */
export async function exportSlidesToPrompterMp4(
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
  const frameDurationUs = Math.round(1_000_000 / FPS)

  onProgress?.('Preparing prompter layout…')
  const styleSlide = slides.find((slide) => !slide.isCover) ?? slides[0]
  const textStyle = styleSlide?.textStyle
  await forceLoadFont(textStyle?.fontFamily || 'poppins', textStyle?.fontWeight || 900)
  await document.fonts.ready

  const paragraph = joinSlidesAsParagraph(slides)
  const layout = await buildPrompterLayout(paragraph, styleSlide)
  const durationSec = estimatePrompterDurationSec(layout)
  const totalFrames = Math.max(2, Math.round(durationSec * FPS))

  onProgress?.('Loading background…')
  const bgImage = await loadSlideBackground(
    imageDataUrls[styleSlide.imageIndex || 0]
  )

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
    const encoderConfig = await resolveEncoderConfig()
    encoder.configure(encoderConfig)

    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create export canvas')

    let timestamp = 0

    for (let f = 0; f < totalFrames; f++) {
      if (f % 30 === 0) {
        const pct = Math.round((f / totalFrames) * 100)
        onProgress?.(`Encoding prompter video… ${pct}%`)
      }

      await waitForEncoderQueue(encoder)
      assertEncoderReady(encoder, encoderError)

      const t = f / (totalFrames - 1)
      const scrollOffset = t * layout.totalScroll

      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      drawPrompterFrame(
        ctx,
        bgImage,
        styleSlide,
        layout,
        scrollOffset,
        settings
      )

      const frame = new VideoFrame(canvas, {
        timestamp,
        duration: frameDurationUs,
      })
      try {
        encoder.encode(frame, { keyFrame: f % FPS === 0 })
      } finally {
        frame.close()
      }

      timestamp += frameDurationUs
      if (encoderError) throw encoderError
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
