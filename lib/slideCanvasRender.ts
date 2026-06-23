import { Slide, ProjectSettings } from '@/types'
import { getBackgroundFilterCss } from '@/components/backgroundFilter'
import { getFontFamily } from '@/lib/fonts'
import { resolveProjectSettings } from '@/lib/projectSettings'
import {
  EXPORT_SLIDE_PADDING,
  prepareExportSlideElement,
} from '@/lib/slideExport'
import { resolveTextStyle } from '@/lib/slideTextStyle'

const WIDTH = 1080
const HEIGHT = 1920

export interface SlideLayoutMetrics {
  fontSize: number
  fontFamily: string
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  textAlign: CanvasTextAlign
  color: string
  opacity: number
  textShadow: boolean
  boxX: number
  boxY: number
  boxWidth: number
  boxHeight: number
  boxPadding: number
  boxColor: string
  boxOpacity: number
  boxRadius: number
  boxSpread: number
  lines: string[]
  lineHeightPx: number
  textBlockHeight: number
  scrollRange: number
  coverSubtitleLines?: string[]
  coverSubtitleFontSize?: number
  coverSubtitleLineHeight?: number
  coverTitleSubtitleGap?: number
}

function convertColorToRgba(color: string, opacity: number): string {
  if (!color || color === 'transparent') return 'transparent'
  if (color.startsWith('rgba')) return color
  if (color.startsWith('rgb')) return color
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16)
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(hex.length === 3 ? 1 : 2, hex.length === 3 ? 2 : 4), 16)
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(hex.length === 3 ? 2 : 4, hex.length === 3 ? 3 : 6), 16)
    return `rgba(${r},${g},${b},${opacity})`
  }
  return `rgba(0,0,0,${opacity})`
}

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load slide image'))
    img.src = src
  })
}

export function wrapTextLines(
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

function mapTextAlign(align: string): CanvasTextAlign {
  if (align === 'left') return 'left'
  if (align === 'right') return 'right'
  return 'center'
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
) {
  const ir = img.naturalWidth / img.naturalHeight
  const cr = width / height
  let sx = 0
  let sy = 0
  let sw = img.naturalWidth
  let sh = img.naturalHeight

  if (ir > cr) {
    sw = img.naturalHeight * cr
    sx = (img.naturalWidth - sw) / 2
  } else {
    sh = img.naturalWidth / cr
    sy = (img.naturalHeight - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
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

function getDefaultMetrics(textStyle: ReturnType<typeof resolveTextStyle>): SlideLayoutMetrics {
  return {
    fontSize: textStyle.fontSize,
    fontFamily: getFontFamily(textStyle.fontFamily),
    fontWeight: textStyle.fontWeight,
    lineHeight: textStyle.lineHeight,
    letterSpacing: textStyle.letterSpacing,
    textAlign: mapTextAlign(textStyle.textAlign),
    color: textStyle.color,
    opacity: textStyle.opacity,
    textShadow: textStyle.textShadow,
    boxX: 0,
    boxY: 0,
    boxWidth: WIDTH - EXPORT_SLIDE_PADDING * 2,
    boxHeight: HEIGHT - EXPORT_SLIDE_PADDING * 2,
    boxPadding: textStyle.boxPadding,
    boxColor: textStyle.boxColor ?? '#ffffff',
    boxOpacity: textStyle.boxOpacity,
    boxRadius: textStyle.boxRadius ?? 16,
    boxSpread: textStyle.boxSpread ?? 0,
    lines: [],
    lineHeightPx: textStyle.fontSize * textStyle.lineHeight,
    textBlockHeight: 0,
    scrollRange: 0,
  }
}

/**
 * Measure slide layout using the same export DOM used for PNG (WYSIWYG).
 */
export async function measureSlideLayout(
  slide: Slide,
  imageDataUrl: string,
  projectSettings?: ProjectSettings
): Promise<SlideLayoutMetrics> {
  if (slide.isCover) {
    return measureCoverSlideLayout(slide, imageDataUrl, projectSettings)
  }

  const settings = resolveProjectSettings(projectSettings)
  const textStyle = resolveTextStyle(slide.textStyle)
  const root = await prepareExportSlideElement(
    slide,
    imageDataUrl,
    { width: WIDTH, height: HEIGHT },
    settings
  )

  const temp = document.createElement('div')
  temp.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:${HEIGHT}px;opacity:0;pointer-events:none;overflow:hidden`
  document.body.appendChild(temp)
  temp.appendChild(root)

  const textBox = root.querySelector('[data-slide-text-box]') as HTMLElement | null
  
  if (!textBox) {
    temp.removeChild(root)
    document.body.removeChild(temp)
    return getDefaultMetrics(textStyle)
  }
  
  const boxRect = textBox.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  const textEls = Array.from(root.querySelectorAll('[data-slide-text-content]')) as HTMLElement[]
  const fontSize = textEls.length
    ? parseFloat(textEls[0].style.fontSize) || textStyle.fontSize
    : textStyle.fontSize

  await document.fonts.ready

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.font = `${textStyle.fontWeight} ${fontSize}px ${getFontFamily(textStyle.fontFamily)}`

  const padX = textStyle.boxPadding ? Math.round(textStyle.boxPadding * 0.9) : Math.max(2, Math.round(fontSize * 0.1))
  const parentWidth = textBox.clientWidth > 0 ? textBox.clientWidth : 984
  const innerWidth = Math.max(1, parentWidth * 0.9 - padX * 2)
  const paragraphs = slide.text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0)
  const lines: string[] = []
  paragraphs.forEach((p, idx) => {
    if (idx > 0) lines.push('')
    lines.push(...wrapTextLines(ctx, p, innerWidth))
  })

  const lineHeightPx = fontSize * textStyle.lineHeight
  const textBlockHeight = textBox.scrollHeight
  const scrollRange = Math.max(0, textBox.scrollHeight - textBox.clientHeight)

  const boxX = boxRect.left - rootRect.left
  const boxY = boxRect.top - rootRect.top
  const boxWidth = boxRect.width
  const boxHeight = boxRect.height

  const metrics: SlideLayoutMetrics = {
    fontSize,
    fontFamily: getFontFamily(textStyle.fontFamily),
    fontWeight: textStyle.fontWeight,
    lineHeight: textStyle.lineHeight,
    letterSpacing: textStyle.letterSpacing,
    textAlign: mapTextAlign(textStyle.textAlign),
    color: textStyle.color,
    opacity: textStyle.opacity,
    textShadow: textStyle.textShadow,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    boxPadding: textStyle.boxPadding,
    boxColor: textStyle.boxColor ?? '#ffffff',
    boxOpacity: textStyle.boxOpacity,
    boxRadius: textStyle.boxRadius ?? 16,
    boxSpread: textStyle.boxSpread ?? 0,
    lines,
    lineHeightPx,
    textBlockHeight,
    scrollRange,
  }

  root.remove()
  document.body.removeChild(temp)
  return metrics
}

async function measureCoverSlideLayout(
  slide: Slide,
  imageDataUrl: string,
  projectSettings?: ProjectSettings
): Promise<SlideLayoutMetrics> {
  const settings = resolveProjectSettings(projectSettings)
  const textStyle = resolveTextStyle(slide.textStyle)
  const root = await prepareExportSlideElement(
    slide,
    imageDataUrl,
    { width: WIDTH, height: HEIGHT },
    settings
  )

  const temp = document.createElement('div')
  temp.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:${HEIGHT}px;opacity:0;pointer-events:none;overflow:hidden`
  document.body.appendChild(temp)
  temp.appendChild(root)

  const titleEls = Array.from(root.querySelectorAll('[data-cover-title]')) as HTMLElement[]
  const subtitleEl = root.querySelector('[data-cover-subtitle]') as HTMLElement | null
  const textBox = root.querySelector('[data-slide-text-box]') as HTMLElement | null
  
  if (!titleEls.length || !textBox) {
    temp.removeChild(root)
    document.body.removeChild(temp)
    return getDefaultMetrics(textStyle)
  }
  
  const boxRect = textBox.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  const fontSize = parseFloat(titleEls[0].style.fontSize) || textStyle.fontSize
  const subtitleFontSize = subtitleEl
    ? parseFloat(subtitleEl.style.fontSize) || Math.max(28, Math.round(fontSize * 0.48))
    : 0

  await document.fonts.ready

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.font = `${textStyle.fontWeight} ${fontSize}px ${getFontFamily(textStyle.fontFamily)}`
  const titleLines: string[] = []
  const titleParagraphs = slide.text.split(/\n+/).filter(p => p.trim().length > 0)
  const wrapWidth = boxRect.width > 0 ? boxRect.width : 920
  titleParagraphs.forEach((para, idx) => {
    if (idx > 0) titleLines.push('')
    titleLines.push(...wrapTextLines(ctx, para.trim(), wrapWidth))
  })

  let subtitleLines: string[] = []
  if (slide.coverSubtitle?.trim()) {
    ctx.font = `${Math.max(400, textStyle.fontWeight - 200)} ${subtitleFontSize}px ${getFontFamily(textStyle.fontFamily)}`
    subtitleLines = wrapTextLines(ctx, slide.coverSubtitle.trim(), wrapWidth)
  }

  const titleLineHeight = fontSize * Math.max(1.1, textStyle.lineHeight * 0.85)
  const subtitleLineHeight = subtitleFontSize * 1.35
  const gap = subtitleLines.length > 0 ? 24 : 0
  const textBlockHeight =
    titleLines.length * titleLineHeight +
    gap +
    subtitleLines.length * subtitleLineHeight

  const metrics: SlideLayoutMetrics = {
    fontSize,
    fontFamily: getFontFamily(textStyle.fontFamily),
    fontWeight: textStyle.fontWeight,
    lineHeight: textStyle.lineHeight,
    letterSpacing: textStyle.letterSpacing,
    textAlign: mapTextAlign(textStyle.textAlign),
    color: textStyle.color,
    opacity: textStyle.opacity,
    textShadow: true,
    boxX: boxRect.left - rootRect.left,
    boxY: boxRect.top - rootRect.top,
    boxWidth: boxRect.width,
    boxHeight: Math.max(boxRect.height, textBlockHeight),
    boxPadding: 0,
    boxColor: 'transparent',
    boxOpacity: 0,
    boxRadius: 0,
    boxSpread: 0,
    lines: titleLines,
    lineHeightPx: titleLineHeight,
    textBlockHeight,
    scrollRange: 0,
    coverSubtitleLines: subtitleLines,
    coverSubtitleFontSize: subtitleFontSize,
    coverSubtitleLineHeight: subtitleLineHeight,
    coverTitleSubtitleGap: gap,
  }

  root.remove()
  document.body.removeChild(temp)
  return metrics
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  settings: ProjectSettings
) {
  if (!settings.watermarkEnabled || !settings.watermarkText.trim()) return

  const text = settings.watermarkText.trim()
  const pad = 32
  ctx.save()
  ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1
  ctx.textBaseline = 'top'

  const maxW = WIDTH * 0.8
  const lines = wrapTextLines(ctx, text, maxW)
  const lineH = 34
  const blockH = lines.length * lineH

  let x = pad
  let y = pad
  ctx.textAlign = 'left'

  switch (settings.watermarkPosition) {
    case 'top-right':
      ctx.textAlign = 'right'
      x = WIDTH - pad
      y = pad
      break
    case 'bottom-left':
      y = HEIGHT - pad - blockH
      break
    case 'bottom-right':
      ctx.textAlign = 'right'
      x = WIDTH - pad
      y = HEIGHT - pad - blockH
      break
    default:
      break
  }

  for (const line of lines) {
    ctx.fillText(line, x, y)
    y += lineH
  }
  ctx.restore()
}

export function drawSlideFrame(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  slide: Slide,
  layout: SlideLayoutMetrics,
  scrollOffset: number,
  projectSettings?: ProjectSettings
) {
  if (slide.isCover) {
    drawCoverSlideFrame(ctx, bgImage, slide, layout, projectSettings)
    return
  }

  const settings = resolveProjectSettings(projectSettings)
  const filter = getBackgroundFilterCss(slide.backgroundFilter)
  ctx.save()
  ctx.filter = filter === 'none' ? 'none' : filter
  drawCoverImage(ctx, bgImage, WIDTH, HEIGHT)
  ctx.restore()

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, 'rgba(0,0,0,0.25)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const padX = layout.boxPadding ? Math.round(layout.boxPadding * 0.9) : Math.max(2, Math.round(layout.fontSize * 0.1))
  const padY = layout.boxPadding ? Math.round(layout.boxPadding * 0.3) : Math.max(2, Math.round(layout.fontSize * 0.08))

  const isTransparent = layout.boxColor === 'transparent' || !layout.boxColor

  // Calculate the raw text bounds by stripping off the CSS padding from the measured block rect
  const clipX = layout.boxX + padX
  const clipY = layout.boxY + padY
  const clipW = layout.boxWidth - padX * 2
  const clipH = layout.boxHeight - padY * 2

  // Helper to measure line width with letterSpacing
  const getLineWidth = (line: string): number => {
    if (layout.letterSpacing !== 0) {
      return [...line].reduce((w, ch, i) => {
        const spacing = i > 0 ? layout.letterSpacing : 0
        return w + spacing + ctx.measureText(ch).width
      }, 0)
    }
    return ctx.measureText(line).width
  }

  // Helper to get line X start coordinate
  const getLineX = (lineWidth: number): number => {
    if (layout.textAlign === 'left') return clipX
    if (layout.textAlign === 'right') return clipX + clipW - lineWidth
    return clipX + (clipW - lineWidth) / 2
  }

  // Pass 1: Draw bubble background behind each line (to match CSS inline-highlight block decoration)
  if (!isTransparent || layout.boxRadius > 0 || layout.boxSpread > 0) {
    ctx.save()
    ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${layout.fontFamily}`
    if (layout.boxSpread && layout.boxSpread > 0) {
      ctx.shadowColor = 'rgba(0,0,0,0.18)'
      ctx.shadowBlur = layout.boxSpread
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    let y = clipY - scrollOffset
    for (const line of layout.lines) {
      if (line === '') {
        y += layout.fontSize * 0.6
        continue
      }

      const lineWidth = getLineWidth(line)
      const lx = getLineX(lineWidth)
      
      const rx = lx - padX
      const ry = y - padY
      const rw = lineWidth + 2 * padX
      const rh = layout.lineHeightPx + 2 * padY

      ctx.save()
      roundRect(ctx, rx, ry, rw, rh, layout.boxRadius)
      ctx.fillStyle = convertColorToRgba(layout.boxColor || '#ffffff', layout.boxOpacity)
      ctx.fill()
      ctx.restore()

      // Draw stroke
      ctx.save()
      roundRect(ctx, rx, ry, rw, rh, layout.boxRadius)
      ctx.strokeStyle = isTransparent ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()

      y += layout.lineHeightPx
    }
    ctx.restore()
  }

  // Pass 2: Draw text on top of all bubble backgrounds
  ctx.save()
  // Removing clipping so text is never truncated by box measurement anomalies
  ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${layout.fontFamily}`
  ctx.fillStyle = layout.color
  ctx.globalAlpha = layout.opacity
  ctx.textBaseline = 'top'

  if (layout.textShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
  }

  let y = clipY - scrollOffset
  for (const line of layout.lines) {
    if (line === '') {
      y += layout.fontSize * 0.6
      continue
    }

    ctx.save()
    ctx.textAlign = 'left' // absolute left positioning using calculated x to avoid double alignment shift
    if (layout.letterSpacing !== 0) {
      const lineWidth = getLineWidth(line)
      let x = getLineX(lineWidth)
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        ctx.fillText(ch, x, y)
        x += ctx.measureText(ch).width + (i < line.length - 1 ? layout.letterSpacing : 0)
      }
    } else {
      const lineWidth = getLineWidth(line)
      const x = getLineX(lineWidth)
      ctx.fillText(line, x, y)
    }
    ctx.restore()

    y += layout.lineHeightPx
  }
  ctx.restore()

  drawWatermark(ctx, settings)
}

function drawCoverSlideFrame(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  slide: Slide,
  layout: SlideLayoutMetrics,
  projectSettings?: ProjectSettings
) {
  const settings = resolveProjectSettings(projectSettings)
  const filter = getBackgroundFilterCss(slide.backgroundFilter)

  ctx.save()
  ctx.filter = filter === 'none' ? 'none' : filter
  drawCoverImage(ctx, bgImage, WIDTH, HEIGHT)
  ctx.restore()

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, 'rgba(0,0,0,0.35)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.65)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const subtitleLines = layout.coverSubtitleLines ?? []
  const subtitleFontSize = layout.coverSubtitleFontSize ?? 0
  const subtitleLineHeight = layout.coverSubtitleLineHeight ?? 0
  const gap = layout.coverTitleSubtitleGap ?? 0
  const titleBlockHeight = layout.lines.length * layout.lineHeightPx
  const subtitleBlockHeight = subtitleLines.length * subtitleLineHeight
  const totalHeight = titleBlockHeight + gap + subtitleBlockHeight
  let y = layout.boxY + Math.max(0, (layout.boxHeight - totalHeight) / 2)

  ctx.save()
  ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${layout.fontFamily}`
  ctx.fillStyle = layout.color
  ctx.globalAlpha = layout.opacity
  ctx.textAlign = layout.textAlign
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 2

  const getXForLine = (line: string, spacing: number): number => {
    if (layout.textAlign === 'left') return layout.boxX
    if (layout.textAlign === 'right') {
      if (spacing !== 0) {
        const totalWidth = [...line].reduce((w, ch, i) => {
          const charSpacing = i > 0 ? spacing : 0
          return w + charSpacing + ctx.measureText(ch).width
        }, 0)
        return layout.boxX + layout.boxWidth - totalWidth
      }
      return layout.boxX + layout.boxWidth
    }
    // center
    if (spacing !== 0) {
      const totalWidth = [...line].reduce((w, ch, i) => {
        const charSpacing = i > 0 ? spacing : 0
        return w + charSpacing + ctx.measureText(ch).width
      }, 0)
      return layout.boxX + (layout.boxWidth - totalWidth) / 2
    }
    return layout.boxX + layout.boxWidth / 2
  }

  const drawTextLine = (line: string, currentY: number, spacing: number) => {
    if (spacing !== 0) {
      ctx.textAlign = 'left'
      let x = getXForLine(line, spacing)
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        ctx.fillText(ch, x, currentY)
        x += ctx.measureText(ch).width + (i < line.length - 1 ? spacing : 0)
      }
      ctx.textAlign = layout.textAlign
    } else {
      ctx.fillText(line, getXForLine(line, 0), currentY)
    }
  }

  for (const line of layout.lines) {
    drawTextLine(line, y, layout.letterSpacing)
    y += layout.lineHeightPx
  }

  if (subtitleLines.length > 0) {
    y += gap
    ctx.font = `${Math.max(400, layout.fontWeight - 200)} ${subtitleFontSize}px ${layout.fontFamily}`
    ctx.globalAlpha = Math.min(1, layout.opacity * 0.92)
    const subtitleSpacing = Math.max(0, layout.letterSpacing)
    for (const line of subtitleLines) {
      drawTextLine(line, y, subtitleSpacing)
      y += subtitleLineHeight
    }
  }

  ctx.restore()
  drawWatermark(ctx, settings)
}

export async function loadSlideBackground(src: string): Promise<HTMLImageElement> {
  return loadHtmlImage(src)
}

export interface PrompterLayout {
  fontSize: number
  fontFamily: string
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  textAlign: CanvasTextAlign
  color: string
  opacity: number
  textShadow: boolean
  padX: number
  textWidth: number
  viewportTop: number
  viewportBottom: number
  viewportHeight: number
  /** Y position of the first text line when scroll = 0 */
  startLineY: number
  lines: string[]
  lineHeightPx: number
  textBlockHeight: number
  totalScroll: number
}

const PROMPTER_VIEWPORT_MARGIN = 100
const PROMPTER_SCROLL_PX_PER_SEC = 70

/** Prompter always sits on a photo — force light text when style is dark. */
function resolvePrompterTextColor(color: string): string {
  if (!color || color === '#000000' || color === '#000' || color === 'black') {
    return '#ffffff'
  }
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : hex.slice(0, 6)
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      const luminance = r * 0.299 + g * 0.587 + b * 0.114
      if (luminance < 96) return '#ffffff'
    }
  }
  return color
}

/** Gabung semua slide jadi satu paragraf tanpa jeda antar-slide. */
export function joinSlidesAsParagraph(slides: Slide[]): string {
  return slides
    .filter((slide) => !slide.isCover)
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function estimatePrompterDurationSec(layout: PrompterLayout): number {
  const scrollDuration = layout.totalScroll / PROMPTER_SCROLL_PX_PER_SEC
  return Math.max(8, Math.round(scrollDuration))
}

export async function buildPrompterLayout(
  paragraph: string,
  styleSlide: Slide
): Promise<PrompterLayout> {
  if (!paragraph.trim()) throw new Error('No text for prompter')

  const textStyle = resolveTextStyle(styleSlide.textStyle)
  const padX = EXPORT_SLIDE_PADDING
  const textWidth = WIDTH - padX * 2
  const viewportTop = PROMPTER_VIEWPORT_MARGIN
  const viewportBottom = HEIGHT - PROMPTER_VIEWPORT_MARGIN
  const viewportHeight = viewportBottom - viewportTop

  await document.fonts.ready

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // Measure the prompter viewport area to ensure text fits with readability
  const maxPrompterHeight = viewportHeight
  let fontSize = textStyle.fontSize
  
  // Apply fitting logic for better visibility in prompter mode
  ctx.font = `${textStyle.fontWeight} ${fontSize}px ${getFontFamily(textStyle.fontFamily)}`
  const lines = wrapTextLines(ctx, paragraph.trim(), textWidth)
  let textBlockHeight = lines.length * (fontSize * textStyle.lineHeight)
  
  // If text is very tall, scale down font so more of it is visible at once
  // But keep a minimum size of 32px for readability
  const minFontSize = 32
  while (textBlockHeight > maxPrompterHeight * 3 && fontSize > minFontSize) {
    fontSize -= 2
    ctx.font = `${textStyle.fontWeight} ${fontSize}px ${getFontFamily(textStyle.fontFamily)}`
    const newLines = wrapTextLines(ctx, paragraph.trim(), textWidth)
    textBlockHeight = newLines.length * (fontSize * textStyle.lineHeight)
  }

  // Recalculate lines with final font size
  ctx.font = `${textStyle.fontWeight} ${fontSize}px ${getFontFamily(textStyle.fontFamily)}`
  const finalLines = wrapTextLines(ctx, paragraph.trim(), textWidth)
  const lineHeightPx = fontSize * textStyle.lineHeight
  const finalTextBlockHeight = finalLines.length * lineHeightPx
  const startLineY = viewportTop + Math.round(viewportHeight * 0.38)
  const totalScroll = Math.max(0, startLineY + finalTextBlockHeight - viewportBottom)

  return {
    fontSize,
    fontFamily: getFontFamily(textStyle.fontFamily),
    fontWeight: textStyle.fontWeight,
    lineHeight: textStyle.lineHeight,
    letterSpacing: textStyle.letterSpacing,
    textAlign: mapTextAlign(textStyle.textAlign),
    color: resolvePrompterTextColor(textStyle.color),
    opacity: textStyle.opacity,
    textShadow: true,
    padX,
    textWidth,
    viewportTop,
    viewportBottom,
    viewportHeight,
    startLineY,
    lines: finalLines,
    lineHeightPx,
    textBlockHeight: finalTextBlockHeight,
    totalScroll,
  }
}

function drawPrompterTextLine(
  ctx: CanvasRenderingContext2D,
  layout: PrompterLayout,
  line: string,
  y: number
) {
  const xLeft = layout.padX
  const xCenter = layout.padX + layout.textWidth / 2
  const xRight = layout.padX + layout.textWidth

  if (layout.letterSpacing !== 0) {
    let x =
      layout.textAlign === 'right'
        ? xRight
        : layout.textAlign === 'center'
          ? xCenter
          : xLeft

    if (layout.textAlign === 'center') {
      const totalWidth = [...line].reduce((w, ch, i) => {
        const spacing = i > 0 ? layout.letterSpacing : 0
        return w + spacing + ctx.measureText(ch).width
      }, 0)
      x = xLeft + (layout.textWidth - totalWidth) / 2
    } else if (layout.textAlign === 'right') {
      const totalWidth = [...line].reduce((w, ch, i) => {
        const spacing = i > 0 ? layout.letterSpacing : 0
        return w + spacing + ctx.measureText(ch).width
      }, 0)
      x = xRight - totalWidth
    }

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      ctx.fillText(ch, x, y)
      x += ctx.measureText(ch).width + (i < line.length - 1 ? layout.letterSpacing : 0)
    }
    return
  }

  const x =
    layout.textAlign === 'right' ? xRight : layout.textAlign === 'center' ? xCenter : xLeft
  ctx.fillText(line, x, y)
}

export function drawPrompterFrame(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  slide: Slide,
  layout: PrompterLayout,
  scrollOffset: number,
  projectSettings?: ProjectSettings
) {
  const settings = resolveProjectSettings(projectSettings)
  const filter = getBackgroundFilterCss(slide.backgroundFilter)

  ctx.save()
  ctx.filter = filter === 'none' ? 'none' : filter
  drawCoverImage(ctx, bgImage, WIDTH, HEIGHT)
  ctx.restore()

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)')
  gradient.addColorStop(0.35, 'rgba(0,0,0,0.35)')
  gradient.addColorStop(0.65, 'rgba(0,0,0,0.35)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.65)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Prompter reading band highlight
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, 0, WIDTH, layout.viewportTop)
  ctx.fillRect(0, layout.viewportBottom, WIDTH, HEIGHT - layout.viewportBottom)

  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(layout.padX, layout.viewportTop)
  ctx.lineTo(WIDTH - layout.padX, layout.viewportTop)
  ctx.moveTo(layout.padX, layout.viewportBottom)
  ctx.lineTo(WIDTH - layout.padX, layout.viewportBottom)
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, layout.viewportTop, WIDTH, layout.viewportHeight)
  ctx.clip()

  ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${layout.fontFamily}`
  ctx.fillStyle = layout.color
  ctx.globalAlpha = layout.opacity
  ctx.textAlign = layout.textAlign
  ctx.textBaseline = 'top'

  if (layout.textShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.92)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3
  }

  const blockTop = layout.startLineY - scrollOffset
  let y = blockTop
  for (const line of layout.lines) {
    drawPrompterTextLine(ctx, layout, line, y)
    y += layout.lineHeightPx
  }

  ctx.restore()
  drawWatermark(ctx, settings)
}

export { WIDTH as SLIDE_WIDTH, HEIGHT as SLIDE_HEIGHT, EXPORT_SLIDE_PADDING }
