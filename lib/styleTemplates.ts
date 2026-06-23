import { TextStyle } from '@/types'
import { DEFAULT_TEXT_STYLE } from '@/lib/slideTextStyle'

export interface StyleTemplate {
  id: string
  name: string
  description: string
  style: TextStyle
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean white text, subtle box',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: 'inter',
      fontSize: 40,
      fontWeight: 500,
      color: '#ffffff',
      boxOpacity: 0.45,
      boxBlur: 4,
      boxPadding: 28,
      boxRadius: 8,
      textShadow: true,
    },
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Big heavy type for impact',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: 'poppins',
      fontSize: 72,
      fontWeight: 900,
      letterSpacing: 0,
      color: '#000000',
      boxOpacity: 1,
      boxBlur: 0,
      boxPadding: 22,
      boxRadius: 6,
      verticalPosition: 'middle',
    },
  },
  {
    id: 'bubble-heavy',
    name: 'Bubble Heavy',
    description: 'Thick rounded type inside bubble (story style)',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: 'poppins',
      fontSize: 56,
      fontWeight: 900,
      lineHeight: 1.15,
      letterSpacing: 0,
      color: '#000000',
      boxOpacity: 1,
      boxBlur: 0,
      boxPadding: 24,
      boxRadius: 20, // Set roundness to 20!
      verticalPosition: 'bottom',
    },
  },
  {
    id: 'romance',
    name: 'Romance AU',
    description: 'Soft serif, warm cream text',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: 'playfair',
      fontSize: 44,
      fontWeight: 700,
      color: '#fef3c7',
      lineHeight: 1.6,
      boxOpacity: 0.55,
      boxBlur: 12,
      boxPadding: 36,
      boxRadius: 16,
      verticalPosition: 'bottom',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Bright cyan on dark box',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: 'oswald',
      fontSize: 56,
      fontWeight: 700,
      color: '#22d3ee',
      textAlign: 'center',
      boxOpacity: 0.85,
      boxBlur: 0,
      boxPadding: 20,
      boxRadius: 8,
      textShadow: true,
    },
  },
  {
    id: 'handwritten',
    name: 'Handwritten',
    description: 'Casual script vibe',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: 'dancing',
      fontSize: 52,
      fontWeight: 400,
      color: '#ffffff',
      lineHeight: 1.4,
      boxOpacity: 0.5,
      boxBlur: 8,
      boxPadding: 20,
      boxRadius: 12,
      verticalPosition: 'bottom',
    },
  },
]
