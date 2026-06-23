import { MaxCharsPerSlide, TextStyle } from '@/types'
import { countChars } from '@/lib/storyParser'
import { resolveTextStyle } from '@/lib/slideTextStyle'

/** Share of slide height available for the text block (preview + export) */
export const PREVIEW_TEXT_MAX_HEIGHT_RATIO = 0.46
export const EXPORT_TEXT_MAX_HEIGHT_RATIO = PREVIEW_TEXT_MAX_HEIGHT_RATIO

/** Preview width vs export width (sidebar ~280px / 1080px) */
export const PREVIEW_WIDTH_RATIO = 280 / 1080

function charFillRatio(text: string, maxChars: MaxCharsPerSlide): number {
  if (maxChars <= 0) return 0
  return countChars(text) / maxChars
}

/**
 * Starting font size for preview before DOM measurement shrinks further.
 */
export function getInitialPreviewFontSize(
  text: string,
  maxChars: MaxCharsPerSlide,
  textStyle?: TextStyle,
  widthRatio = PREVIEW_WIDTH_RATIO
): number {
  const style = resolveTextStyle(textStyle)
  const ratio = charFillRatio(text, maxChars)

  let scale = widthRatio
  if (ratio > 0.35) {
    const t = Math.min(1, (ratio - 0.35) / 0.65)
    scale *= 1 - t * 0.38
  }
  if (ratio > 1) {
    scale *= Math.max(0.68, 1 - (ratio - 1) * 0.12)
  }

  return Math.max(8, style.fontSize * scale)
}

/**
 * Scale padding/line-height in preview when text approaches the character limit.
 */
export function getPreviewTextMetrics(
  text: string,
  maxChars: MaxCharsPerSlide,
  textStyle?: TextStyle,
  boxScale = 0.5
): { padding: number; lineHeight: number } {
  const style = resolveTextStyle(textStyle)
  const ratio = charFillRatio(text, maxChars)
  const compact = ratio > 0.45 ? Math.max(0.62, 1 - (ratio - 0.45) * 0.55) : 1

  return {
    padding: Math.round(style.boxPadding * boxScale * compact),
    lineHeight: ratio > 0.7 ? Math.max(1.2, style.lineHeight - (ratio - 0.7) * 0.4) : style.lineHeight,
  }
}

/**
 * Export font size — shrink long slides so PNG/MP4 match preview proportions.
 */
export function getAdaptiveExportFontSize(
  text: string,
  maxChars: MaxCharsPerSlide,
  textStyle?: TextStyle
): number {
  const style = resolveTextStyle(textStyle)
  const ratio = charFillRatio(text, maxChars)

  if (ratio <= 0.55) return style.fontSize

  let size = style.fontSize
  const t = Math.min(1, (ratio - 0.55) / 0.45)
  size *= 1 - t * 0.28

  if (ratio > 1) {
    size *= Math.max(0.62, 1 - (ratio - 1) * 0.14)
  }

  return Math.max(26, Math.round(size))
}
