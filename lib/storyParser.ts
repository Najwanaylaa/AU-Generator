/**
 * Story Parser Utility
 * Splits story text into slides by sentence and character limits
 */

import { MaxCharsPerSlide, Slide, TextStyle } from '@/types'
import { DEFAULT_PROJECT_SETTINGS } from '@/lib/projectSettings'
import { DEFAULT_TEXT_STYLE } from '@/lib/slideTextStyle'

export const COVER_SLIDE_DEFAULT_STYLE: Partial<TextStyle> = {
  fontSize: 72,
  fontWeight: 900,
  textAlign: 'center',
  verticalPosition: 'middle',
  color: '#ffffff',
  textShadow: true,
  boxColor: 'transparent',
  boxOpacity: 0,
  boxBlur: 0,
  boxPadding: 0,
  boxRadius: 0,
  autoFitText: true,
}

export function countChars(text: string): number {
  return text.length
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

/** Keep at most maxChars characters (used when editing a single slide). */
export function clampTextToMaxChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxChars * 0.6) {
    return truncated.slice(0, lastSpace)
  }
  return truncated
}

/**
 * Group sentences into slide-sized chunks respecting a character limit.
 * If a single sentence exceeds the limit, preserve the sentence boundary
 * and allow the slide to exceed the character target rather than split mid-sentence.
 */
interface SentenceChunk {
  text: string
  paragraphBreakBefore: boolean
}

function combineSentenceChunkText(current: string, chunk: SentenceChunk): string {
  if (!current) return chunk.text
  if (chunk.paragraphBreakBefore) return `${current}\n\n${chunk.text}`
  return `${current} ${chunk.text}`
}

function countChunkedSlideLength(currentLength: number, chunk: SentenceChunk): number {
  if (currentLength === 0) return chunk.text.length
  return currentLength + (chunk.paragraphBreakBefore ? 2 : 1) + chunk.text.length
}

function splitTextIntoSentences(text: string): SentenceChunk[] {
  if (!text) return []

  const sentences: string[] = []
  let current = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    current += char

    if (char === '.' || char === '!' || char === '?') {
      // Look ahead to consume trailing brackets/quotes
      let j = i + 1
      while (j < text.length && /[\])"'”’*_~]/.test(text[j])) {
        current += text[j]
        i = j
        j++
      }

      // Check if we should split
      const nextChar = text[i + 1]
      const isNextDotPunct = nextChar && /[.!?]/.test(nextChar)
      const isNextDigit = nextChar && /\d/.test(nextChar)

      if (!isNextDotPunct && !isNextDigit) {
        sentences.push(current)
        current = ''
      }
    }
  }

  if (current) {
    sentences.push(current)
  }

  const mergedSentences: string[] = []
  let currentMerged = ''
  let inDoubleQuote = false
  let inSingleQuote = false

  for (const sentence of sentences) {
    currentMerged = currentMerged ? currentMerged + sentence : sentence

    // Track quote state
    for (let i = 0; i < sentence.length; i++) {
      const char = sentence[i]
      if (char === '"') {
        inDoubleQuote = !inDoubleQuote
      } else if (char === '“') {
        inDoubleQuote = true
      } else if (char === '”') {
        inDoubleQuote = false
      } else if (char === '‘') {
        inSingleQuote = true
      } else if (char === '’') {
        inSingleQuote = false
      }
    }

    if (!inDoubleQuote && !inSingleQuote) {
      mergedSentences.push(currentMerged)
      currentMerged = ''
    }
  }

  if (currentMerged) {
    mergedSentences.push(currentMerged)
  }

  return mergedSentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => ({ text: sentence, paragraphBreakBefore: false }))
}

export function groupSentencesIntoSlides(
  sentences: string[],
  maxCharsPerSlide: number
): string[] {
  const chunks = sentences.map((text) => ({ text, paragraphBreakBefore: false }))
  return groupSentenceChunksIntoSlides(chunks, maxCharsPerSlide)
}

function groupSentenceChunksIntoSlides(
  chunks: SentenceChunk[],
  maxCharsPerSlide: number
): string[] {
  const slides: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim()) {
      slides.push(current.trim())
      current = ''
    }
  }

  for (const chunk of chunks) {
    const sentenceChars = countChars(chunk.text)

    if (sentenceChars > maxCharsPerSlide) {
      flush()
      slides.push(chunk.text)
      continue
    }

    const combinedLength = countChunkedSlideLength(current.length, chunk)
    if (combinedLength <= maxCharsPerSlide) {
      current = combineSentenceChunkText(current, chunk)
    } else {
      flush()
      current = chunk.text
    }
  }

  flush()
  return slides
}

/**
 * Split story into slide texts using sentence boundaries and max chars per slide.
 */
export function splitStoryIntoSlides(
  story: string,
  maxCharsPerSlide: MaxCharsPerSlide = DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
): string[] {
  const chunks = splitStoryIntoSentenceChunks(story)
  if (chunks.length === 0) return []
  return groupSentenceChunksIntoSlides(chunks, maxCharsPerSlide)
}

function splitStoryIntoSentenceChunks(story: string): SentenceChunk[] {
  if (!story || typeof story !== 'string') {
    return []
  }

  const normalized = story.trim().replace(/\r\n/g, '\n')
  const paragraphs = normalized.split(/\n\s*\n+/)
  const sentenceChunks: SentenceChunk[] = []

  for (const paragraph of paragraphs) {
    const chunks = splitTextIntoSentences(paragraph)
    if (chunks.length === 0) continue
    if (sentenceChunks.length > 0) {
      chunks[0].paragraphBreakBefore = true
    }
    sentenceChunks.push(...chunks)
  }

  return sentenceChunks.filter((chunk) => chunk.text.length > 0)
}

/**
 * Split story into sentences (paragraphs, lines, then punctuation).
 */
export function splitStoryIntoSentences(story: string): string[] {
  return splitStoryIntoSentenceChunks(story).map((chunk) => chunk.text)
}

/**
 * Estimate how many slides a story will produce at a given character limit.
 */
export function estimateSlideCount(
  story: string,
  maxCharsPerSlide: MaxCharsPerSlide = DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
): number {
  return splitStoryIntoSlides(story, maxCharsPerSlide).length
}

/**
 * Create slides from text chunks with image cycling.
 * Reuses styles from existing slides when re-splitting.
 */
export function createSlidesFromSentences(
  slideTexts: string[],
  imageCount: number,
  templateSlides?: Array<Pick<Slide, 'textStyle' | 'backgroundFilter'>>
): Slide[] {
  const fallbackStyle = templateSlides?.[0]?.textStyle
  return slideTexts.map((text, index) => ({
    id: index + 1,
    text,
    imageIndex: imageCount > 0 ? index % imageCount : 0,
    textStyle: templateSlides?.[index]?.textStyle ?? fallbackStyle,
    backgroundFilter: templateSlides?.[index]?.backgroundFilter,
  }))
}

/**
 * Re-split stored story text into fewer/more slides based on character limit.
 */
export function resplitStoryIntoSlides(
  sourceStory: string,
  maxCharsPerSlide: MaxCharsPerSlide,
  imageCount: number,
  templateSlides?: Array<Pick<Slide, 'textStyle' | 'backgroundFilter'>>
): Slide[] {
  const slideTexts = splitStoryIntoSlides(sourceStory, maxCharsPerSlide)
  return createSlidesFromSentences(slideTexts, imageCount, templateSlides)
}

export function createCoverSlide(
  title: string,
  subtitle: string,
  imageCount: number
): Slide {
  const trimmedTitle = title.trim()
  const trimmedSubtitle = subtitle.trim()

  return {
    id: 1,
    text: trimmedTitle,
    coverSubtitle: trimmedSubtitle || undefined,
    isCover: true,
    imageIndex: imageCount > 0 ? 0 : 0,
    textStyle: { ...DEFAULT_TEXT_STYLE, ...COVER_SLIDE_DEFAULT_STYLE },
  }
}

export function prependCoverSlide(coverSlide: Slide, storySlides: Slide[]): Slide[] {
  const renumbered = storySlides.map((slide, index) => ({ ...slide, id: index + 2 }))
  return [{ ...coverSlide, id: 1 }, ...renumbered]
}

export function buildSlidesWithOptionalCover(
  story: string,
  maxCharsPerSlide: MaxCharsPerSlide,
  imageCount: number,
  title?: string,
  subtitle?: string
): {
  slides: Slide[]
  storyTitle?: string
  storySubtitle?: string
} {
  const slideTexts = splitStoryIntoSlides(story, maxCharsPerSlide)
  const storySlides = createSlidesFromSentences(slideTexts, imageCount)
  const trimmedTitle = title?.trim() ?? ''

  if (!trimmedTitle) {
    return { slides: storySlides }
  }

  const trimmedSubtitle = subtitle?.trim() ?? ''
  const coverSlide = createCoverSlide(trimmedTitle, trimmedSubtitle, imageCount)

  return {
    slides: prependCoverSlide(coverSlide, storySlides),
    storyTitle: trimmedTitle,
    storySubtitle: trimmedSubtitle || undefined,
  }
}

export function resplitStoryIntoSlidesWithCover(
  sourceStory: string,
  maxCharsPerSlide: MaxCharsPerSlide,
  imageCount: number,
  existingSlides?: Slide[],
  storyTitle?: string,
  storySubtitle?: string
): Slide[] {
  const coverSlide = existingSlides?.find((slide) => slide.isCover)
  const storyTemplates = existingSlides?.filter((slide) => !slide.isCover)
  const storySlides = resplitStoryIntoSlides(
    sourceStory,
    maxCharsPerSlide,
    imageCount,
    storyTemplates
  )

  const title = storyTitle?.trim() || coverSlide?.text.trim()
  if (!title) return storySlides

  const subtitle = storySubtitle?.trim() || coverSlide?.coverSubtitle?.trim() || ''
  const nextCover = coverSlide
    ? {
        ...coverSlide,
        text: title,
        coverSubtitle: subtitle || undefined,
      }
    : createCoverSlide(title, subtitle, imageCount)

  return prependCoverSlide(nextCover, storySlides)
}

/**
 * Validate story text
 */
export function validateStory(
  story: string,
  maxCharsPerSlide: MaxCharsPerSlide = DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
): {
  isValid: boolean
  error?: string
  sentenceCount?: number
  slideCount?: number
} {
  if (!story || typeof story !== 'string') {
    return {
      isValid: false,
      error: 'Story is required'
    }
  }

  const trimmed = story.trim()
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Story cannot be empty'
    }
  }

  if (trimmed.length < 10) {
    return {
      isValid: false,
      error: 'Story must be at least 10 characters'
    }
  }

  const sentences = splitStoryIntoSentences(story)
  if (sentences.length === 0) {
    return {
      isValid: false,
      error: 'Story must contain at least one sentence'
    }
  }

  const slides = splitStoryIntoSlides(story, maxCharsPerSlide)

  return {
    isValid: true,
    sentenceCount: sentences.length,
    slideCount: slides.length,
  }
}

/**
 * Estimate reading time for slides (in seconds)
 * Average reading speed: ~200 words per minute
 */
export function estimateReadingTime(
  slides: Array<{ text: string }>,
  wordsPerMinute: number = 200
): number {
  const totalWords = slides.reduce((sum, slide) => {
    return sum + slide.text.split(/\s+/).length
  }, 0)

  const timeInMinutes = totalWords / wordsPerMinute
  return Math.ceil(timeInMinutes * 60) // Return in seconds
}
