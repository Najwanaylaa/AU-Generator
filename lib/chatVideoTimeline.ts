import type { ChatMessage, ChatVideoProject, ChatVideoSettings } from '@/types'

export type ChatVideoTimelineEntry = {
  sender: ChatMessage['sender']
  appearAt: number
}

export type MessagePopSpeedPreset = {
  id: string
  label: string
  delaySec: number
  hint: string
}

export const MESSAGE_POP_SPEED_PRESETS: MessagePopSpeedPreset[] = [
  { id: 'very-slow', label: 'Sangat Lambat', delaySec: 3, hint: 'Santai, mudah dibaca' },
  { id: 'slow', label: 'Lambat', delaySec: 2, hint: 'Tenang & jelas' },
  { id: 'normal', label: 'Normal', delaySec: 1.2, hint: 'Seperti chat asli' },
  { id: 'fast', label: 'Cepat', delaySec: 0.7, hint: 'Ringan & dinamis' },
  { id: 'very-fast', label: 'Sangat Cepat', delaySec: 0.4, hint: 'Pesan muncul bertubi-tubi' },
]

export function resolveMessageDelaySec(settings: ChatVideoSettings): number {
  if (typeof settings.messageDelaySec === 'number' && settings.messageDelaySec > 0) {
    return Math.max(0.4, Math.min(4, settings.messageDelaySec))
  }

  switch (settings.speed) {
    case 'slow':
      return 2
    case 'fast':
      return 0.7
    default:
      return 1.2
  }
}

export function getResolutionDimensions(res: string) {
  switch (res) {
    case '480p':
      return { width: 540, height: 960 }
    case '1080p':
      return { width: 1080, height: 1920 }
    default:
      return { width: 720, height: 1280 }
  }
}

/** 9:16 portrait — format standar Instagram Reels / TikTok */
export function isPortraitVideoDimensions(width: number, height: number): boolean {
  const ratio = width / height
  return ratio > 0.55 && ratio < 0.58
}

export function buildMessageSchedule(
  messages: ChatMessage[],
  messageDelaySec: number
): ChatVideoTimelineEntry[] {
  const delaySec = Math.max(0.4, Math.min(4, messageDelaySec))
  const baseDelayMs = Math.round(delaySec * 1000)
  let currentTime = 0

  return messages.map((message) => {
    const textBonus = Math.min(600, message.text.length * 10)
    const delay = Math.max(Math.round(baseDelayMs * 0.65), baseDelayMs + textBonus - Math.round(baseDelayMs * 0.5))
    currentTime += delay
    return {
      sender: message.sender,
      appearAt: currentTime,
    }
  })
}

export function getChatStateAtTime(
  schedule: ChatVideoTimelineEntry[],
  nowMs: number
) {
  let visibleCount = 0
  let nextIndex: number | null = null

  for (let i = 0; i < schedule.length; i++) {
    if (nowMs >= schedule[i].appearAt) {
      visibleCount = i + 1
    } else {
      nextIndex = i
      break
    }
  }

  if (nextIndex !== null && schedule[nextIndex]?.sender !== 'contact') {
    nextIndex = null
  }

  return {
    visibleCount,
    activeTypingIndex: nextIndex,
  }
}

export interface ChatVideoFrameState {
  visibleCount: number
  showTyping: boolean
  showFinalMessage: boolean
  showCta: boolean
}

export interface ChatVideoTimelineOptions {
  finalMessage?: string
  ctaText?: string
}

function getTimingFactor(messageDelaySec: number): number {
  return messageDelaySec / 1.2
}

export function getVideoFrameStateAtTime(
  messages: ChatMessage[],
  messageDelaySec: number,
  nowMs: number,
  options: ChatVideoTimelineOptions = {}
): ChatVideoFrameState {
  const schedule = buildMessageSchedule(messages, messageDelaySec)
  const factor = getTimingFactor(Math.max(0.4, Math.min(4, messageDelaySec)))
  const { visibleCount, activeTypingIndex } = getChatStateAtTime(schedule, nowMs)

  let showTyping =
    activeTypingIndex !== null &&
    schedule[activeTypingIndex]?.sender === 'contact' &&
    nowMs < schedule[activeTypingIndex].appearAt

  let showFinalMessage = false
  let showCta = false

  const lastMessageAt = schedule.length ? schedule[schedule.length - 1].appearAt : 0
  const trimmedFinal = options.finalMessage?.trim()

  if (trimmedFinal && messages.length > 0 && nowMs >= lastMessageAt) {
    const typingStart = lastMessageAt + Math.round(500 * factor)
    const finalStart = typingStart + Math.round(900 * factor)

    if (nowMs >= typingStart && nowMs < finalStart) {
      showTyping = true
    }

    if (nowMs >= finalStart) {
      showFinalMessage = true
      showTyping = false
    }
  }

  const trimmedCta = options.ctaText?.trim()
  if (trimmedCta && showFinalMessage) {
    const finalStart =
      lastMessageAt +
      Math.round(500 * factor) +
      Math.round(900 * factor)
    const ctaStart = finalStart + Math.round(1200 * factor)
    if (nowMs >= ctaStart) {
      showCta = true
    }
  }

  return {
    visibleCount,
    showTyping,
    showFinalMessage,
    showCta,
  }
}

export function getVideoDurationMs(
  messages: ChatMessage[],
  messageDelaySec: number,
  options: ChatVideoTimelineOptions = {}
): number {
  const factor = getTimingFactor(Math.max(0.4, Math.min(4, messageDelaySec)))
  const schedule = buildMessageSchedule(messages, messageDelaySec)
  let end = schedule.length ? schedule[schedule.length - 1].appearAt : 1500

  if (options.finalMessage?.trim() && messages.length > 0) {
    end += Math.round(500 * factor) + Math.round(900 * factor) + Math.round(1800 * factor)
  }

  if (options.ctaText?.trim() && options.finalMessage?.trim()) {
    end += Math.round(2200 * factor)
  }

  return end + 1500
}

export function getProjectVideoDurationMs(project: ChatVideoProject): number {
  return getVideoDurationMs(
    project.messages,
    resolveMessageDelaySec(project.settings),
    {
      finalMessage: project.finalMessage,
      ctaText: project.ctaText,
    }
  )
}

export function formatVideoDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function formatContactTime(time: string): string {
  if (!time) return ''
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return time

  const hours = Number(match[1])
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${period}`
}

export function formatContactStatus(status: string): string {
  switch (status) {
    case 'online':
      return 'online'
    case 'offline':
      return 'offline'
    case 'away':
      return 'away'
    default:
      return status
  }
}
