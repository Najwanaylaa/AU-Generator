import type { ChatMessage, ChatVideoProject } from '@/types'
import type { ChatVideoFrameState } from '@/lib/chatVideoTimeline'
import {
  formatContactStatus,
  formatContactTime,
  getProjectVideoDurationMs,
  getVideoFrameStateAtTime,
  resolveMessageDelaySec,
} from '@/lib/chatVideoTimeline'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

const HEADER_COLOR = '#075e54'
const CONTACT_BUBBLE = '#ffffff'
const USER_BUBBLE_TOP = '#dcf8c6'
const USER_BUBBLE_BOTTOM = '#c9f0b2'
const FOOTER_BG_LIGHT = '#f0f2f5'
const FOOTER_BG_DARK = '#1f2937'
const WALLPAPER = '#e5ddd5'
const BODY_DARK = '#111827'

/** Lebar referensi layar HP — UI diskalakan agar terbaca saat video fullscreen di IG/TikTok */
const PHONE_REF_WIDTH = 360

export interface ChatLayoutMetrics {
  scale: number
  fontSize: number
  metaFontSize: number
  paddingX: number
  bubblePaddingH: number
  bubblePaddingV: number
  bubbleRadius: number
  bubbleInnerPad: number
  gap: number
  headerHeight: number
  footerHeight: number
  avatarSize: number
  minBubbleWidth: number
}

export function getChatVideoFontSize(settingsFontSize: number, canvasWidth: number): number {
  const scaled = settingsFontSize * (canvasWidth / PHONE_REF_WIDTH)
  const minimum = canvasWidth * 0.046
  return Math.round(Math.max(scaled, minimum))
}

export function getChatLayoutMetrics(
  width: number,
  height: number,
  settingsFontSize: number
): ChatLayoutMetrics {
  const scale = width / PHONE_REF_WIDTH
  const fontSize = getChatVideoFontSize(settingsFontSize, width)

  return {
    scale,
    fontSize,
    metaFontSize: Math.max(14, Math.round(fontSize * 0.68)),
    paddingX: Math.round(16 * scale),
    bubblePaddingH: Math.round(16 * scale),
    bubblePaddingV: Math.round(12 * scale),
    bubbleRadius: Math.round(20 * scale),
    bubbleInnerPad: Math.round(32 * scale),
    gap: Math.round(12 * scale),
    headerHeight: Math.round(Math.max(96, height * 0.072)),
    footerHeight: Math.round(Math.max(88, height * 0.065)),
    avatarSize: Math.round(44 * scale),
    minBubbleWidth: Math.round(80 * scale),
  }
}

interface BubbleLayout {
  sender: ChatMessage['sender']
  text: string
  timestamp: string
  x: number
  y: number
  width: number
  height: number
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

function measureBubble(
  ctx: CanvasRenderingContext2D,
  message: { sender: ChatMessage['sender']; text: string; timestamp: string },
  canvasWidth: number,
  maxBubbleWidthRatio: number,
  metrics: ChatLayoutMetrics
): { width: number; height: number } {
  const maxBubbleWidth = canvasWidth * (maxBubbleWidthRatio / 100)
  const horizontalPadding = metrics.bubbleInnerPad
  const textMaxWidth = maxBubbleWidth - horizontalPadding
  const isUser = message.sender === 'user'
  const { fontSize, metaFontSize, bubblePaddingV } = metrics

  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  const lines = wrapTextLines(ctx, message.text, textMaxWidth)
  const lineHeight = fontSize * 1.45
  const textHeight = lines.length * lineHeight
  const height = bubblePaddingV * 2 + textHeight + metaFontSize + 8

  let contentWidth = 0
  for (const line of lines) {
    contentWidth = Math.max(contentWidth, ctx.measureText(line).width)
  }

  ctx.font = `${metaFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  const timestampWidth = ctx.measureText(message.timestamp).width
  const metaWidth = isUser ? timestampWidth + ctx.measureText('✓✓').width + 12 : timestampWidth

  const width = Math.min(
    maxBubbleWidth,
    Math.max(metrics.minBubbleWidth, Math.max(contentWidth, metaWidth) + horizontalPadding)
  )

  return { width, height }
}

function buildVisibleMessages(
  project: ChatVideoProject,
  frameState: ChatVideoFrameState
): Array<{ sender: ChatMessage['sender']; text: string; timestamp: string }> {
  const items = project.messages
    .slice(0, frameState.visibleCount)
    .map((message) => ({
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp || formatContactTime(project.contactTime),
    }))

  if (frameState.showFinalMessage && project.finalMessage?.trim()) {
    items.push({
      sender: 'contact',
      text: project.finalMessage.trim(),
      timestamp: formatContactTime(project.contactTime),
    })
  }

  return items
}

function layoutChatContent(
  ctx: CanvasRenderingContext2D,
  project: ChatVideoProject,
  frameState: ChatVideoFrameState,
  width: number,
  bodyTop: number,
  bodyHeight: number,
  metrics: ChatLayoutMetrics
): {
  bubbles: BubbleLayout[]
  typingY: number | null
  scrollTop: number
} {
  const { settings } = project
  const { paddingX, gap } = metrics
  const messages = buildVisibleMessages(project, frameState)
  const bubbles: BubbleLayout[] = []
  let y = bodyTop + gap

  for (const message of messages) {
    const measured = measureBubble(ctx, message, width, settings.bubbleMaxWidth, metrics)
    const x =
      message.sender === 'user'
        ? width - paddingX - measured.width
        : paddingX

    bubbles.push({
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
      x,
      y,
      width: measured.width,
      height: measured.height,
    })

    y += measured.height + gap
  }

  let typingY: number | null = null
  if (frameState.showTyping) {
    typingY = y
    y += Math.round(52 * metrics.scale)
  }

  const contentHeight = y - bodyTop + gap
  const scrollTop = Math.max(0, contentHeight - bodyHeight + 24)

  return { bubbles, typingY, scrollTop }
}

function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isDark: boolean
) {
  ctx.fillStyle = isDark ? BODY_DARK : WALLPAPER
  ctx.fillRect(x, y, width, height)

  if (!isDark) {
    ctx.fillStyle = 'rgba(0,0,0,0.025)'
    const step = 36
    for (let row = 0; row < height + step; row += step) {
      for (let col = 0; col < width + step; col += step) {
        ctx.beginPath()
        ctx.arc(x + col + 6, y + row + 6, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  bubble: BubbleLayout,
  metrics: ChatLayoutMetrics,
  scrollTop: number
) {
  const y = bubble.y - scrollTop
  const isUser = bubble.sender === 'user'
  const { fontSize, metaFontSize, bubblePaddingH, bubblePaddingV, bubbleRadius } = metrics

  ctx.save()
  roundRect(ctx, bubble.x, y, bubble.width, bubble.height, bubbleRadius)
  if (isUser) {
    const gradient = ctx.createLinearGradient(bubble.x, y, bubble.x, y + bubble.height)
    gradient.addColorStop(0, USER_BUBBLE_TOP)
    gradient.addColorStop(1, USER_BUBBLE_BOTTOM)
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = CONTACT_BUBBLE
  }
  ctx.fill()

  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.fillStyle = '#111827'
  ctx.textBaseline = 'top'
  const textMaxWidth = bubble.width - metrics.bubbleInnerPad
  const lines = wrapTextLines(ctx, bubble.text, textMaxWidth)
  const lineHeight = fontSize * 1.45
  let textY = y + bubblePaddingV
  for (const line of lines) {
    ctx.fillText(line, bubble.x + bubblePaddingH, textY)
    textY += lineHeight
  }

  ctx.font = `${metaFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.fillStyle = 'rgba(17,24,39,0.55)'
  const metaY = y + bubble.height - bubblePaddingV - 2
  ctx.fillText(bubble.timestamp, bubble.x + bubblePaddingH, metaY)
  if (isUser) {
    ctx.fillStyle = '#34b7f1'
    ctx.fillText('✓✓', bubble.x + bubble.width - bubblePaddingH - 22, metaY)
  }
  ctx.restore()
}

function drawTypingIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scrollTop: number,
  metrics: ChatLayoutMetrics
) {
  const drawY = y - scrollTop
  const w = Math.round(68 * metrics.scale)
  const h = Math.round(44 * metrics.scale)
  roundRect(ctx, x, drawY, w, h, metrics.bubbleRadius)
  ctx.fillStyle = CONTACT_BUBBLE
  ctx.fill()

  const dotR = Math.max(4, Math.round(5 * metrics.scale))
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.fillStyle = 'rgba(17,24,39,0.45)'
    ctx.arc(x + 18 + i * 14 * metrics.scale, drawY + h / 2, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  project: ChatVideoProject,
  frameState: ChatVideoFrameState,
  width: number,
  metrics: ChatLayoutMetrics
) {
  const { headerHeight, avatarSize, scale } = metrics
  ctx.fillStyle = HEADER_COLOR
  ctx.fillRect(0, 0, width, headerHeight)

  const initials = project.contactName
    ? project.contactName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'WA'

  const avatarX = metrics.paddingX
  const avatarY = Math.round((headerHeight - avatarSize) / 2)
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.fillStyle = HEADER_COLOR
  ctx.font = `700 ${Math.round(15 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2)

  const nameX = avatarX + avatarSize + Math.round(14 * scale)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${Math.round(18 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.fillText(project.contactName || 'Kontak', nameX, avatarY + Math.round(16 * scale))

  const statusText =
    frameState.showTyping && !frameState.showFinalMessage
      ? 'typing…'
      : `${formatContactStatus(project.contactStatus)} • ${formatContactTime(project.contactTime)}`

  ctx.font = `${Math.round(14 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(statusText, nameX, avatarY + Math.round(36 * scale))

  const menuSize = Math.round(32 * scale)
  ctx.textAlign = 'center'
  roundRect(ctx, width - menuSize - metrics.paddingX, avatarY + 4, menuSize, menuSize, Math.round(12 * scale))
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `${Math.round(18 * scale)}px sans-serif`
  ctx.fillText('⋮', width - metrics.paddingX - menuSize / 2, avatarY + menuSize / 2 + 4)
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isDark: boolean,
  metrics: ChatLayoutMetrics
) {
  const { footerHeight, paddingX, scale } = metrics
  const footerTop = height - footerHeight
  ctx.fillStyle = isDark ? FOOTER_BG_DARK : FOOTER_BG_LIGHT
  ctx.fillRect(0, footerTop, width, footerHeight)

  const barX = paddingX
  const barY = footerTop + Math.round(12 * scale)
  const barW = width - paddingX * 2
  const barH = Math.round(48 * scale)
  roundRect(ctx, barX, barY, barW, barH, barH / 2)
  ctx.fillStyle = isDark ? '#111827' : '#ffffff'
  ctx.fill()
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)'
  ctx.font = `${Math.round(16 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Message', barX + Math.round(16 * scale), barY + barH / 2)
}

function drawCtaOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  metrics: ChatLayoutMetrics
) {
  ctx.fillStyle = 'rgba(0,0,0,0.42)'
  ctx.fillRect(0, 0, width, height)

  const cardWidth = Math.min(width * 0.88, 360 * metrics.scale)
  const cardHeight = Math.round(80 * metrics.scale)
  const cardX = (width - cardWidth) / 2
  const cardY = (height - cardHeight) / 2
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, metrics.bubbleRadius)
  const gradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight)
  gradient.addColorStop(0, '#075e54')
  gradient.addColorStop(1, '#0a6c60')
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${Math.round(22 * metrics.scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, cardY + cardHeight / 2, cardWidth - 32)
}

export function drawChatVideoFrame(
  ctx: CanvasRenderingContext2D,
  project: ChatVideoProject,
  frameState: ChatVideoFrameState,
  width: number,
  height: number
) {
  const isDark = project.settings.theme === 'dark'
  const metrics = getChatLayoutMetrics(width, height, project.settings.fontSize)
  const { headerHeight, footerHeight, paddingX } = metrics
  const bodyTop = headerHeight
  const bodyHeight = height - headerHeight - footerHeight

  ctx.clearRect(0, 0, width, height)
  drawWallpaper(ctx, 0, bodyTop, width, bodyHeight, isDark)
  drawHeader(ctx, project, frameState, width, metrics)
  drawFooter(ctx, width, height, isDark, metrics)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, bodyTop, width, bodyHeight)
  ctx.clip()

  const { bubbles, typingY, scrollTop } = layoutChatContent(
    ctx,
    project,
    frameState,
    width,
    bodyTop,
    bodyHeight,
    metrics
  )

  for (const bubble of bubbles) {
    drawBubble(ctx, bubble, metrics, scrollTop)
  }

  if (typingY !== null) {
    drawTypingIndicator(ctx, paddingX, typingY, scrollTop, metrics)
  }

  ctx.restore()

  if (frameState.showCta && project.ctaText?.trim()) {
    drawCtaOverlay(ctx, project.ctaText.trim(), width, height, metrics)
  }
}

const FPS = 30
const ENCODE_QUEUE_LIMIT = 8

function supportsMp4Export(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

async function resolveChatEncoderConfig(
  width: number,
  height: number
): Promise<VideoEncoderConfig> {
  const candidates: VideoEncoderConfig[] = [
    {
      codec: 'avc1.640033',
      width,
      height,
      bitrate: 8_000_000,
      framerate: FPS,
    },
    {
      codec: 'avc1.420028',
      width,
      height,
      bitrate: 8_000_000,
      framerate: FPS,
    },
    {
      codec: 'avc1.42E01E',
      width,
      height,
      bitrate: 8_000_000,
      framerate: FPS,
    },
  ]

  for (const config of candidates) {
    const { supported } = await VideoEncoder.isConfigSupported(config)
    if (supported) return config
  }

  throw new Error('Browser tidak mendukung encoding MP4. Gunakan Chrome atau Edge terbaru.')
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

async function renderChatVideoFrames(
  project: ChatVideoProject,
  width: number,
  height: number,
  onProgress?: (percent: number) => void
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; totalFrames: number; durationMs: number }> {
  await document.fonts.ready

  const frameDurationMs = 1000 / FPS
  const durationMs = getProjectVideoDurationMs(project)
  const totalFrames = Math.max(1, Math.ceil(durationMs / frameDurationMs))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung oleh browser ini.')

  return { canvas, ctx, totalFrames, durationMs }
}

export async function exportChatVideoToMp4(
  project: ChatVideoProject,
  width: number,
  height: number,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (!supportsMp4Export()) {
    throw new Error('Export MP4 membutuhkan browser modern (Chrome/Edge).')
  }

  const { canvas, ctx, totalFrames, durationMs } = await renderChatVideoFrames(
    project,
    width,
    height,
    onProgress
  )

  const frameDurationUs = Math.round(1_000_000 / FPS)
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
  })

  let encoderError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e))
    },
  })

  const encoderConfig = await resolveChatEncoderConfig(width, height)
  encoder.configure(encoderConfig)

  let timestamp = 0

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    await waitForEncoderQueue(encoder)
    if (encoderError) throw encoderError

    const nowMs = Math.min(durationMs, frameIndex * (1000 / FPS))
    const frameState = getVideoFrameStateAtTime(
      project.messages,
      resolveMessageDelaySec(project.settings),
      nowMs,
      {
        finalMessage: project.finalMessage,
        ctaText: project.ctaText,
      }
    )

    drawChatVideoFrame(ctx, project, frameState, width, height)

    const frame = new VideoFrame(canvas, { timestamp })
    try {
      encoder.encode(frame, { keyFrame: frameIndex % (FPS * 2) === 0 })
    } finally {
      frame.close()
    }

    timestamp += frameDurationUs
    onProgress?.(Math.round(((frameIndex + 1) / totalFrames) * 95))
  }

  await waitForEncoderQueue(encoder)
  if (encoderError) throw encoderError
  await encoder.flush()
  encoder.close()
  muxer.finalize()
  onProgress?.(100)

  return new Blob([target.buffer], { type: 'video/mp4' })
}

export async function exportChatVideo(
  project: ChatVideoProject,
  width: number,
  height: number,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; extension: 'mp4' | 'webm' }> {
  if (supportsMp4Export()) {
    const blob = await exportChatVideoToMp4(project, width, height, onProgress)
    return { blob, extension: 'mp4' }
  }

  const blob = await exportChatVideoToWebm(project, width, height, onProgress)
  return { blob, extension: 'webm' }
}

export async function exportChatVideoToWebm(
  project: ChatVideoProject,
  width: number,
  height: number,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  await document.fonts.ready

  const frameRate = 24
  const frameDurationMs = 1000 / frameRate
  const durationMs = getProjectVideoDurationMs(project)
  const totalFrames = Math.max(1, Math.ceil(durationMs / frameDurationMs))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung oleh browser ini.')

  const supportedTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm'

  const stream = canvas.captureStream(frameRate)
  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  })

  const exportPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' }))
    }
    recorder.onerror = () => reject(new Error('MediaRecorder gagal merekam video'))
  })

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  recorder.start(Math.round(frameDurationMs))

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const nowMs = Math.min(durationMs, frameIndex * frameDurationMs)
    const frameState = getVideoFrameStateAtTime(
      project.messages,
      resolveMessageDelaySec(project.settings),
      nowMs,
      {
        finalMessage: project.finalMessage,
        ctaText: project.ctaText,
      }
    )

    drawChatVideoFrame(ctx, project, frameState, width, height)

    const videoTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void }
    videoTrack.requestFrame?.()

    await new Promise((resolve) => setTimeout(resolve, frameDurationMs))
    onProgress?.(Math.round(((frameIndex + 1) / totalFrames) * 95))
  }

  await new Promise((resolve) => setTimeout(resolve, frameDurationMs))
  recorder.stop()
  const blob = await exportPromise
  onProgress?.(100)
  return blob
}
