// AU Story Slide Generator Types

import type { FontId } from '@/lib/fonts'
import type { BackgroundFilter } from '@/components/backgroundFilter'

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type MaxCharsPerSlide = 100 | 200 | 300 | 400 | 500

export interface ProjectSettings {
  watermarkText: string
  watermarkEnabled: boolean
  watermarkPosition: WatermarkPosition
  /** Seconds each slide is shown in MP4 export */
  secondsPerSlide: number
  /** Maximum characters allowed per slide when splitting story text */
  maxCharsPerSlide: MaxCharsPerSlide
}

// Text styling configuration
export interface TextStyle {
  fontFamily?: FontId       // preset font id
  fontSize: number          // in pixels
  fontWeight: number        // 400, 700, 900, etc
  textAlign: 'left' | 'center' | 'right'
  verticalPosition: 'top' | 'middle' | 'bottom'
  opacity: number           // 0-1
  lineHeight: number        // multiplier like 1.2, 1.5, 2
  letterSpacing: number     // in pixels
  textShadow: boolean
  color: string             // hex, e.g. #ffffff
  boxColor?: string         // text box background color, hex or rgba
  boxOpacity: number        // 0-1 text box background
  boxBlur: number           // px backdrop blur
  boxPadding: number        // px padding inside text box
  boxRadius?: number        // px border radius for text box
  boxSpread?: number        // px spread for text box shadow/effect
  autoFitText?: boolean     // shrink text to fit if needed
}

// Slide structure for AU Story
export interface Slide {
  id: number
  text: string
  imageIndex?: number
  imageUrl?: string
  textStyle?: TextStyle
  backgroundFilter?: BackgroundFilter
  isCover?: boolean
  coverSubtitle?: string
}

// Upload form data structure
export interface StoryFormData {
  story: string
  images: FileList | null
}

// Generated story with metadata
export interface GeneratedStory {
  slides: Slide[]
  imageUrls: string[]
  totalSlides: number
  settings?: ProjectSettings
  /** Original story text — used to re-split slides when character limit changes */
  sourceStory?: string
  storyTitle?: string
  storySubtitle?: string
}

// Export options
export interface ExportOptions {
  format: 'png' | 'mp4'
  quality?: number
  duration?: number // Duration per slide in seconds (for video)
}

// Export result
export interface ExportResult {
  success: boolean
  message: string
  downloadUrl?: string
  fileName?: string
}

// Chat message
export interface ChatMessage {
  id: string
  sender: 'user' | 'contact'
  text: string
  timestamp?: string
}

// Chat video settings
export interface ChatVideoSettings {
  theme: 'light' | 'dark'
  /** @deprecated use messageDelaySec — kept for saved projects */
  speed?: 'slow' | 'normal' | 'fast'
  /** Seconds between each chat message popping in (0.4 – 4) */
  messageDelaySec: number
  fontSize: number
  bubbleMaxWidth: number // percentage
  resolution: '480p' | '720p' | '1080p'
}

export type Settings = ChatVideoSettings

// Chat video project
export interface ChatVideoProject {
  id: string
  contactName: string
  contactTime: string
  contactStatus: 'online' | 'offline' | 'away'
  contactImage?: string
  messages: ChatMessage[]
  finalMessage?: string
  ctaText?: string
  settings: ChatVideoSettings
}

// Legacy types for backward compatibility
export type SlideItem = {
  title: string
  content: string
  bullets: string[]
  layout?: string
}

export type Outline = {
  slides: SlideItem[]
}
