import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { drawRunningTextFrame } from './storyRunningTextRender'
import { getFontFamily, forceLoadFont } from '@/lib/fonts'

const FPS = 30
const ENCODE_QUEUE_LIMIT = 8

function supportsVideoExport(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

async function resolveEncoderConfig(width: number, height: number): Promise<VideoEncoderConfig> {
  const candidates: VideoEncoderConfig[] = [
    {
      codec: 'avc1.640033',
      width,
      height,
      bitrate: 6_000_000,
      framerate: FPS,
    },
    {
      codec: 'avc1.420028',
      width,
      height,
      bitrate: 6_000_000,
      framerate: FPS,
    },
    {
      codec: 'avc1.42E01E',
      width,
      height,
      bitrate: 6_000_000,
      framerate: FPS,
    },
  ]

  for (const config of candidates) {
    const { supported } = await VideoEncoder.isConfigSupported(config)
    if (supported) return config
  }

  throw new Error(
    `This browser cannot encode ${width}x${height} video. Try Chrome or Edge.`
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
      new Error('Video encoder closed unexpectedly.')
    )
  }
  if (encoder.state !== 'configured') {
    throw new Error(`Video encoder is not ready (state: ${encoder.state})`)
  }
}

export function getSpeedPxPerSec(speed: string, targetWidth: number): number {
  let baseSpeed = 25
  if (speed === 'very-slow') baseSpeed = 8
  else if (speed === 'slow') baseSpeed = 15
  else if (speed === 'normal') baseSpeed = 25
  else if (speed === 'fast') baseSpeed = 40
  else if (speed === 'very-fast') baseSpeed = 60
  
  return baseSpeed * (targetWidth / 360)
}

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load background image'))
    img.src = src
  })
}

export async function exportRunningTextToMp4(
  text: string,
  bgImageSrc: string | null,
  settings: {
    fontFamily: string
    fontSize: number // Size relative to 360px width layout
    textColor: string
    highlightType: 'none' | 'rounded' | 'solid'
    highlightColor: string
    speed: string
    resolution: '480p' | '720p'
  },
  onProgress?: (message: string) => void
): Promise<Blob> {
  if (!supportsVideoExport()) {
    throw new Error(
      'MP4 export needs a modern browser (Chrome, Edge, or Safari 16.4+).'
    )
  }

  // 1. Resolve resolution dimensions
  let width = 720
  let height = 1280
  if (settings.resolution === '480p') {
    width = 480
    height = 854
  }

  const frameDurationUs = Math.round(1_000_000 / FPS)

  onProgress?.('Preparing running text layout…')
  await forceLoadFont(settings.fontFamily, 400)
  await document.fonts.ready

  // 2. Load background image if present
  let bgImage: HTMLImageElement | null = null
  if (bgImageSrc) {
    onProgress?.('Loading background image…')
    try {
      bgImage = await loadHtmlImage(bgImageSrc)
    } catch (e) {
      console.warn('Failed to load background image, rendering with solid background instead.', e)
    }
  }

  // 3. Create offscreen canvas to compute text layout and draw frames
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create export canvas')

  // Calculate layout to estimate duration
  // FontSize is scaled from base preview layout (360px wide) to targetWidth
  const scaledFontSize = Math.round(settings.fontSize * (width / 360))
  const renderSettings = {
    fontFamily: settings.fontFamily,
    fontSize: scaledFontSize,
    textColor: settings.textColor,
    highlightType: settings.highlightType,
    highlightColor: settings.highlightColor,
    lineHeight: 1.2,
  }

  ctx.font = `400 ${scaledFontSize}px ${getFontFamily(settings.fontFamily)}`
  const paddingX = width * 0.08
  const maxWidth = width - paddingX * 2
  const lineHeightPx = scaledFontSize * 1.2
  const paragraphGapPx = scaledFontSize * 2.0
  
  const { totalHeight } = await import('./storyRunningTextRender').then((m) =>
    m.layoutRunningText(ctx, text, maxWidth, scaledFontSize, lineHeightPx, paragraphGapPx)
  )

  const speedPxPerSec = getSpeedPxPerSec(settings.speed, width)
  const totalScroll = height + totalHeight
  const durationSec = Math.max(3, totalScroll / speedPxPerSec)
  const totalFrames = Math.round(durationSec * FPS)

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
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
    const encoderConfig = await resolveEncoderConfig(width, height)
    encoder.configure(encoderConfig)

    let timestamp = 0

    for (let f = 0; f < totalFrames; f++) {
      if (f % 15 === 0) {
        const pct = Math.round((f / totalFrames) * 100)
        onProgress?.(`Encoding video… ${pct}%`)
      }

      await waitForEncoderQueue(encoder)
      assertEncoderReady(encoder, encoderError)

      const t = f / (totalFrames - 1)
      const scrollOffset = t * totalScroll

      ctx.clearRect(0, 0, width, height)
      drawRunningTextFrame(
        ctx,
        width,
        height,
        text,
        bgImage,
        renderSettings,
        scrollOffset
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

    onProgress?.('Finalizing video file…')
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
        // already closed
      }
    }
  }
}
