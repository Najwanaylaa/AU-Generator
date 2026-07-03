/**
 * Slide Export Service
 */
import { toPng } from 'html-to-image'
import { Slide, ProjectSettings } from '@/types'
import { getBackgroundFilterCss } from '@/components/backgroundFilter'
import { resolveProjectSettings } from '@/lib/projectSettings'
import {
  EXPORT_TEXT_MAX_HEIGHT_RATIO,
  getAdaptiveExportFontSize,
} from '@/lib/previewTextFit'
import {
  buildExportTextCss,
  buildExportTextBoxCss,
  buildParagraphBoxCss,
  buildParagraphTextCss,
  getSlideFlexAlign,
  resolveTextStyle,
  buildCoverTextCss,
  buildCoverSubtitleCss,
} from '@/lib/slideTextStyle'
import { getFontFamily, forceLoadFont, getEmbeddedFontCSS, GOOGLE_FONTS_MAP, FontId } from '@/lib/fonts'

export interface SlideRenderOptions {
  width: number
  height: number
  quality: number
}

export const DEFAULT_SLIDE_OPTIONS: SlideRenderOptions = {
  width: 1080,
  height: 1920,
  quality: 0.95,
}

export const EXPORT_SLIDE_PADDING = 48

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function fitExportSlideText(
  root: HTMLDivElement,
  slide: Slide,
  projectSettings?: ProjectSettings,
  fontSizeOverride?: number
): number {
  if (slide.isCover) {
    return fitCoverSlideText(root, slide)
  }

  const settings = resolveProjectSettings(projectSettings)
  const textStyle = resolveTextStyle(slide.textStyle)
  const textElements = Array.from(root.querySelectorAll('[data-slide-text-content]')) as HTMLElement[]
  const textBoxesContainer = root.querySelector('[data-slide-text-box]') as HTMLElement | null
  
  if (!textElements.length || !textBoxesContainer) return textStyle.fontSize

  if (fontSizeOverride !== undefined) {
    textElements.forEach((el) => {
      el.style.fontSize = `${fontSizeOverride}px`
    })
    return fontSizeOverride
  }

  if (!textStyle.autoFitText) {
    textElements.forEach((el) => {
      el.style.fontSize = `${textStyle.fontSize}px`
    })
    return textStyle.fontSize
  }

  const slideHeight = root.clientHeight || DEFAULT_SLIDE_OPTIONS.height
  const maxTextBoxHeight = slideHeight * EXPORT_TEXT_MAX_HEIGHT_RATIO

  let fontSize = getAdaptiveExportFontSize(
    slide.text,
    settings.maxCharsPerSlide,
    textStyle
  )
  const minSize = Math.max(26, Math.round(fontSize * 0.48))
  textElements.forEach((el) => {
    el.style.fontSize = `${fontSize}px`
  })

  // Use binary search instead of linear search for faster font size fitting
  let low = minSize
  let high = fontSize
  let bestFit = fontSize
  
  textElements.forEach((el) => {
    el.style.fontSize = `${high}px`
  })
  
  if (textBoxesContainer.scrollHeight <= maxTextBoxHeight) {
    return high
  }

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    textElements.forEach((el) => {
      el.style.fontSize = `${mid}px`
    })
    
    if (textBoxesContainer.scrollHeight <= maxTextBoxHeight) {
      bestFit = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  textElements.forEach((el) => {
    el.style.fontSize = `${bestFit}px`
  })

  return bestFit
}

function fitCoverSlideText(root: HTMLDivElement, slide: Slide): number {
  const titleEls = Array.from(root.querySelectorAll('[data-cover-title]')) as HTMLElement[]
  const subtitleEls = Array.from(root.querySelectorAll('[data-cover-subtitle]')) as HTMLElement[]
  if (!titleEls.length) return 72

  const textStyle = resolveTextStyle(slide.textStyle)
  const slideWidth = root.clientWidth || DEFAULT_SLIDE_OPTIONS.width
  const maxTitleWidth = slideWidth - EXPORT_SLIDE_PADDING * 2
  let titleSize = Math.min(96, Math.max(48, textStyle.fontSize))
  const minTitleSize = 36

  const fitsWidth = () =>
    titleEls.every((el) => el.scrollWidth <= maxTitleWidth)

  titleEls.forEach((el) => {
    el.style.fontSize = `${titleSize}px`
  })
  while (!fitsWidth() && titleSize > minTitleSize) {
    titleSize -= 2
    titleEls.forEach((el) => {
      el.style.fontSize = `${titleSize}px`
    })
  }

  const baseTitleSize = Math.min(96, Math.max(48, textStyle.fontSize))
  const subtitleScale = titleSize / baseTitleSize
  const subtitleSize = Math.max(20, Math.round(textStyle.fontSize * subtitleScale))

  subtitleEls.forEach((el) => {
    el.style.fontSize = `${subtitleSize}px`
  })

  return titleSize
}



/**
 * After font loading and size fitting, "bake" the measured text element widths.
 * This prevents html-to-image from re-wrapping text when using a fallback font
 * by setting explicit minimum widths with a generous buffer.
 */
function bakeTextElementWidths(root: HTMLDivElement): void {
  const textElements = Array.from(root.querySelectorAll('[data-slide-text]')) as HTMLElement[]
  textElements.forEach((el) => {
    const span = el.querySelector('[data-slide-text-content]') as HTMLSpanElement | null
    if (!span) return

    // Use Range API to detect how many lines the text actually renders on
    const range = document.createRange()
    range.selectNodeContents(span)
    const lineRects = Array.from(range.getClientRects())

    if (lineRects.length === 0) return

    if (lineRects.length === 1) {
      // Single-line element: force nowrap and set explicit width
      span.style.whiteSpace = 'nowrap'
      const w = Math.ceil(el.getBoundingClientRect().width)
      el.style.width = `${w}px`
      el.style.maxWidth = 'none'
    } else {
      // Multi-line element: fix the container width to prevent re-wrap with wider font.
      // We use the actual measured width + a tiny 6px sub-pixel buffer so the paragraph
      // background bubble fits the text snuggly (per paragraph).
      const measuredWidth = Math.ceil(el.getBoundingClientRect().width)
      const bufferedWidth = measuredWidth + 6
      el.style.width = `${Math.min(bufferedWidth, (root.clientWidth || 1080) - 96)}px`
      el.style.maxWidth = 'none'
    }
  })
}

/**
 * Build + measure export slide in a hidden 1080×1920 container (WYSIWYG sizing).
 */
export async function prepareExportSlideElement(
  slide: Slide,
  imageDataUrl: string,
  dimensions: { width: number; height: number } = {
    width: DEFAULT_SLIDE_OPTIONS.width,
    height: DEFAULT_SLIDE_OPTIONS.height,
  },
  projectSettings?: ProjectSettings,
  fontSizeOverride?: number
): Promise<HTMLDivElement> {
  const root = await buildExportSlideElement(slide, imageDataUrl, dimensions, projectSettings, fontSizeOverride)

  const temp = document.createElement('div')
  temp.style.cssText = `position:fixed;left:-10000px;top:0;width:${dimensions.width}px;height:${dimensions.height}px;opacity:0;pointer-events:none;overflow:hidden`
  document.body.appendChild(temp)
  temp.appendChild(root)
  const textStyle = resolveTextStyle(slide.textStyle)
  await forceLoadFont(textStyle.fontFamily || 'poppins', textStyle.fontWeight || 900)
  await document.fonts.ready
  fitExportSlideText(root, slide, projectSettings, fontSizeOverride)
  // Bake measured widths to prevent html-to-image font-fallback wrapping
  bakeTextElementWidths(root)
  temp.removeChild(root)
  document.body.removeChild(temp)

  return root
}

function waitForImage(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Timed out loading slide background image'))
    }, 20000)

    img.onload = () => {
      window.clearTimeout(timeout)
      resolve()
    }
    img.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('Failed to load slide background image'))
    }
  })
}

function getWatermarkPositionCss(position: ProjectSettings['watermarkPosition']): string {
  switch (position) {
    case 'top-left':
      return 'top:32px;left:32px;right:auto;bottom:auto;text-align:left'
    case 'top-right':
      return 'top:32px;right:32px;left:auto;bottom:auto;text-align:right'
    case 'bottom-left':
      return 'bottom:32px;left:32px;right:auto;top:auto;text-align:left'
    default:
      return 'bottom:32px;right:32px;left:auto;top:auto;text-align:right'
  }
}

/**
 * Split text into sentences by splitting on . ! ? with proper handling
 */
function appendWatermark(root: HTMLDivElement, settings: ProjectSettings) {
  if (!settings.watermarkEnabled || !settings.watermarkText.trim()) return

  const mark = document.createElement('div')
  mark.textContent = settings.watermarkText.trim()
  mark.style.cssText = [
    'position:absolute',
    'z-index:10',
    getWatermarkPositionCss(settings.watermarkPosition),
    'color:rgba(255,255,255,0.9)',
    'font-size:28px',
    'font-weight:600',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    'text-shadow:0 1px 4px rgba(0,0,0,0.8)',
    'pointer-events:none',
    'max-width:80%',
    'word-break:break-word',
  ].join(';')
  root.appendChild(mark)
}

/**
 * Build an off-screen slide DOM node with a loaded <img> background (export-safe).
 */
export async function buildExportSlideElement(
  slide: Slide,
  imageDataUrl: string,
  dimensions: { width: number; height: number } = { width: 1080, height: 1920 },
  projectSettings?: ProjectSettings,
  fontSizeOverride?: number
): Promise<HTMLDivElement> {
  const { width, height } = dimensions
  const textStyle = resolveTextStyle(slide.textStyle)
  const flexAlign = getSlideFlexAlign(textStyle.verticalPosition)
  const settings = resolveProjectSettings(projectSettings)
  const bgFilter = getBackgroundFilterCss(slide.backgroundFilter)

  const root = document.createElement('div')

  root.style.cssText = [
    `width:${width}px`,
    `height:${height}px`,
    'position:relative',
    'overflow:hidden',
    'display:flex',
    'flex-direction:column',
    `justify-content:${flexAlign}`,
    `padding:${EXPORT_SLIDE_PADDING}px`,
    'box-sizing:border-box',
    'background:#000',
  ].join(';')

  const bg = document.createElement('img')
  bg.src = imageDataUrl
  bg.alt = ''
  bg.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'object-fit:cover',
    'object-position:center',
    'z-index:0',
    'display:block',
    `filter:${bgFilter}`,
  ].join(';')
  root.appendChild(bg)
  await waitForImage(bg)

  const overlay = document.createElement('div')
  overlay.style.cssText = slide.isCover
    ? 'position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.65));z-index:1;pointer-events:none'
    : 'position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.25),rgba(0,0,0,0.55));z-index:1;pointer-events:none'
  root.appendChild(overlay)

  const textBoxesContainer = document.createElement('div')
  textBoxesContainer.style.cssText = [
    'position:relative',
    'z-index:2',
    'display:flex',
    'width:100%',
    'align-items:flex-start',
  ].join(';')

  if (slide.isCover) {
    const coverAlignItems = textStyle.textAlign === 'left' ? 'flex-start' : textStyle.textAlign === 'right' ? 'flex-end' : 'center'
    const titleFontSize = Math.min(96, Math.max(48, textStyle.fontSize))
    const textContainer = document.createElement('div')
    textContainer.setAttribute('data-slide-text-box', '')
    textContainer.style.cssText = [
      'display:flex',
      'flex-direction:column',
      `align-items:${coverAlignItems}`,
      'justify-content:center',
      'gap:24px',
      'width:100%',
      'max-width:920px',
      'margin:0 auto',
      'background:transparent',
      'border:none',
      'padding:0',
      'box-sizing:border-box',
    ].join(';')

    const titleElement = document.createElement('div')
    titleElement.style.cssText = `display:flex;flex-direction:column;gap:${Math.max(6, Math.round(titleFontSize * 0.15))}px;width:100%;align-items:${coverAlignItems}`
    
    // Split title into paragraphs
    const titleLines = slide.text.split(/\r?\n/)
    const titleParagraphs: string[][] = []
    let currentTitlePara: string[] = []
    titleLines.forEach((line) => {
      const trimmed = line.trim()
      if (trimmed.length === 0) {
        if (currentTitlePara.length > 0) {
          titleParagraphs.push(currentTitlePara)
          currentTitlePara = []
        }
        titleParagraphs.push([])
      } else {
        currentTitlePara.push(trimmed)
      }
    })
    if (currentTitlePara.length > 0) titleParagraphs.push(currentTitlePara)

    titleParagraphs.forEach((para) => {
      if (para.length === 0) {
        const spacer = document.createElement('div')
        spacer.style.cssText = `height:${Math.round(titleFontSize * 0.65)}px;width:100%;`
        titleElement.appendChild(spacer)
        return
      }

      const textElement = document.createElement('div')
      textElement.setAttribute('data-slide-text', '')
      textElement.style.cssText = buildParagraphBoxCss(textStyle, titleFontSize)

      const textSpan = document.createElement('span')
      textSpan.setAttribute('data-slide-text-content', '')
      textSpan.setAttribute('data-cover-title', '')
      textSpan.innerHTML = para.map(escapeHtml).join('\n')
      textSpan.style.cssText = buildParagraphTextCss(textStyle, titleFontSize)

      textElement.appendChild(textSpan)
      titleElement.appendChild(textElement)
    })

    textContainer.appendChild(titleElement)

    if (slide.coverSubtitle?.trim()) {
      const subtitleElement = document.createElement('div')
      const subtitleFontSize = textStyle.fontSize
      subtitleElement.style.cssText = `display:flex;flex-direction:column;gap:${Math.max(6, Math.round(subtitleFontSize * 0.15))}px;width:100%;align-items:${coverAlignItems}`

      // Split subtitle into paragraphs
      const subtitleLines = slide.coverSubtitle.split(/\r?\n/)
      const subtitleParagraphs: string[][] = []
      let currentSubPara: string[] = []
      subtitleLines.forEach((line) => {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
          if (currentSubPara.length > 0) {
            subtitleParagraphs.push(currentSubPara)
            currentSubPara = []
          }
          subtitleParagraphs.push([])
        } else {
          currentSubPara.push(trimmed)
        }
      })
      if (currentSubPara.length > 0) subtitleParagraphs.push(currentSubPara)

      subtitleParagraphs.forEach((para) => {
        if (para.length === 0) {
          const spacer = document.createElement('div')
          spacer.style.cssText = `height:${Math.round(subtitleFontSize * 0.65)}px;width:100%;`
          subtitleElement.appendChild(spacer)
          return
        }

        const textElement = document.createElement('div')
        textElement.setAttribute('data-slide-text', '')
        textElement.style.cssText = buildParagraphBoxCss(textStyle, subtitleFontSize)

        const textSpan = document.createElement('span')
        textSpan.setAttribute('data-slide-text-content', '')
        textSpan.setAttribute('data-cover-subtitle', '')
        textSpan.innerHTML = para.map(escapeHtml).join('\n')
        textSpan.style.cssText = buildParagraphTextCss(textStyle, subtitleFontSize)

        textElement.appendChild(textSpan)
        subtitleElement.appendChild(textElement)
      })

      textContainer.appendChild(subtitleElement)
    }

    textBoxesContainer.appendChild(textContainer)
    root.appendChild(textBoxesContainer)
    appendWatermark(root, settings)
    return root
  }

  const exportFontSize = fontSizeOverride ?? getAdaptiveExportFontSize(
    slide.text,
    settings.maxCharsPerSlide,
    textStyle
  )

  const maxTextHeight = Math.round(height * EXPORT_TEXT_MAX_HEIGHT_RATIO)
  const textContainer = document.createElement('div')
  textContainer.setAttribute('data-slide-text-box', '')
  textContainer.style.cssText = `position:relative;z-index:2;width:100%;max-height:${maxTextHeight}px;box-sizing:border-box;text-align:${textStyle.textAlign};display:flex;flex-direction:column;gap:${Math.max(6, Math.round(exportFontSize * 0.15))}px;align-items:${textStyle.textAlign === 'center' ? 'center' : textStyle.textAlign === 'right' ? 'flex-end' : 'flex-start'};overflow:visible;`

  // Split text into paragraphs: blank lines = paragraph separator, consecutive lines = same bubble
  // Each paragraph gets ONE bubble background; lines within a paragraph share that bubble
  const rawLines = slide.text.split(/\r?\n/)
  const paragraphs: string[][] = []
  let currentParagraph: string[] = []

  rawLines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph)
        currentParagraph = []
      }
      paragraphs.push([]) // empty array = spacer sentinel
    } else {
      currentParagraph.push(trimmed)
    }
  })
  if (currentParagraph.length > 0) paragraphs.push(currentParagraph)

  paragraphs.forEach((para) => {
    if (para.length === 0) {
      const spacer = document.createElement('div')
      spacer.style.cssText = `height:${Math.round(exportFontSize * 0.65)}px;width:100%;`
      textContainer.appendChild(spacer)
      return
    }

    // One bubble per paragraph — background goes on the wrapper div
    const textElement = document.createElement('div')
    textElement.setAttribute('data-slide-text', '')
    textElement.style.cssText = buildParagraphBoxCss(textStyle, exportFontSize)

    // Inner span: text styling only (no background), all lines joined with newline
    const textSpan = document.createElement('span')
    textSpan.setAttribute('data-slide-text-content', '')
    textSpan.innerHTML = para.map(escapeHtml).join('\n')
    textSpan.style.cssText = buildParagraphTextCss(textStyle, exportFontSize)

    textElement.appendChild(textSpan)
    textContainer.appendChild(textElement)
  })

  textBoxesContainer.appendChild(textContainer)

  root.appendChild(textBoxesContainer)

  appendWatermark(root, settings)

  return root
}

export async function exportSlideToPng(
  slide: Slide,
  imageDataUrl: string,
  projectSettings?: ProjectSettings,
  options: Partial<SlideRenderOptions> = {},
  fontSizeOverride?: number
): Promise<string> {
  const opts = { ...DEFAULT_SLIDE_OPTIONS, ...options }
  const el = await prepareExportSlideElement(slide, imageDataUrl, {
    width: opts.width,
    height: opts.height,
  }, projectSettings, fontSizeOverride)

  const textStyle = resolveTextStyle(slide.textStyle)
  const fontEmbedCSS = await getEmbeddedFontCSS(textStyle.fontFamily || 'poppins', textStyle.fontWeight || 900)

  const temp = document.createElement('div')
  temp.style.cssText = `position:fixed;left:-10000px;top:0;width:${opts.width}px;height:${opts.height}px;opacity:0;pointer-events:none;overflow:hidden`
  document.body.appendChild(temp)
  temp.appendChild(el)

  try {
    return await slideToImage(el, opts, fontEmbedCSS || undefined)
  } finally {
    temp.removeChild(el)
    document.body.removeChild(temp)
  }
}

export async function slideToImage(
  element: HTMLElement,
  options: Partial<SlideRenderOptions> = {},
  fontEmbedCSS?: string
): Promise<string> {
  const opts = { ...DEFAULT_SLIDE_OPTIONS, ...options }

  try {
    return await toPng(element, {
      width: opts.width,
      height: opts.height,
      pixelRatio: 1,
      cacheBust: false,
      includeQueryParams: true,
      backgroundColor: '#000000',
      ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    })
  } catch (error) {
    console.error('Error converting slide to image:', error)
    throw new Error('Failed to convert slide to image')
  }
}

export async function downloadImage(dataUrl: string, fileName: string): Promise<void> {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
  return trimmed || 'slide'
}

function ensurePngExtension(name: string): string {
  return name.toLowerCase().endsWith('.png') ? name : `${name}.png`
}

export function canSavePngsToFolder(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).showDirectoryPicker === 'function'
  )
}

export class FolderPickerCancelledError extends Error {
  constructor() {
    super('Folder selection cancelled')
    this.name = 'FolderPickerCancelledError'
  }
}

/** Ask the user where PNGs should be saved (parent directory). */
export async function pickExportDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!canSavePngsToFolder()) {
    throw new Error(
      'Your browser does not support saving directly to a folder. Try the latest Chrome or Edge.'
    )
  }

  try {
    // `showDirectoryPicker` is an optional File System Access API method.
    // Cast to `any` to call it and assert the returned handle to the expected type.
    return (await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads',
    })) as FileSystemDirectoryHandle
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new FolderPickerCancelledError()
    }
    throw err
  }
}

/** Write PNG files into a new subfolder inside the chosen directory. */
export async function writePngsToFolder(
  parentDirectory: FileSystemDirectoryHandle,
  folderName: string,
  images: Array<{ dataUrl: string; fileName: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const safeFolder = sanitizeFileName(folderName)
  const folderHandle = await parentDirectory.getDirectoryHandle(safeFolder, { create: true })

  for (let i = 0; i < images.length; i++) {
    onProgress?.(i + 1, images.length)
    const fileName = ensurePngExtension(sanitizeFileName(images[i].fileName))
    const blob = dataUrlToBlob(images[i].dataUrl)
    const fileHandle = await folderHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
  }

  return safeFolder
}

export function defaultSlideFileName(index: number): string {
  return `slide-${String(index + 1).padStart(3, '0')}.png`
}

export function generateFileName(baseFileName: string, extension: string): string {
  const timestamp = new Date().getTime()
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${baseFileName}-${timestamp}-${randomStr}.${extension}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export async function getUniformFontSizeForSlides(
  slides: Slide[],
  imageDataUrls: string[],
  projectSettings?: ProjectSettings
): Promise<number | undefined> {
  let minFittedSize = 999
  const nonCoverSlides = slides.filter(s => !s.isCover)
  for (const slide of nonCoverSlides) {
    const imageUrl = imageDataUrls[slide.imageIndex || 0]
    if (!imageUrl) continue
    const el = await prepareExportSlideElement(slide, imageUrl, { width: 1080, height: 1920 }, projectSettings)
    const textEls = Array.from(el.querySelectorAll('[data-slide-text-content]')) as HTMLElement[]
    const size = textEls.length ? parseFloat(textEls[0].style.fontSize) : undefined
    el.remove()
    if (size && size < minFittedSize) {
      minFittedSize = size
    }
  }
  return minFittedSize < 999 ? minFittedSize : undefined
}
