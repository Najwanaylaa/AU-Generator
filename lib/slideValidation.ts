import { MaxCharsPerSlide } from '@/types'
import { countChars } from '@/lib/storyParser'

export type TextLengthStatus = 'ok' | 'warn' | 'over'

export function getTextLengthStatus(
  text: string,
  maxChars: MaxCharsPerSlide
): TextLengthStatus {
  const chars = countChars(text)
  const warnAt = Math.max(1, Math.floor(maxChars * 0.85))
  if (chars > maxChars) return 'over'
  if (chars > warnAt) return 'warn'
  return 'ok'
}

export function getTextLengthMessage(
  text: string,
  maxChars: MaxCharsPerSlide
): string | null {
  const status = getTextLengthStatus(text, maxChars)
  const chars = countChars(text)
  if (status === 'over') {
    return `Text is too long (${chars}/${maxChars} characters). Shorten it for better readability on story slides.`
  }
  if (status === 'warn') {
    return `Text is getting long (${chars}/${maxChars} characters). Consider shortening for IG/TikTok stories.`
  }
  return null
}
