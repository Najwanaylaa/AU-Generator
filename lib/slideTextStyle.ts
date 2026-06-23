import type { CSSProperties } from 'react'
import { TextStyle } from '@/types'
import { DEFAULT_FONT_ID, getFontFamily } from '@/lib/fonts'

export const DEFAULT_TEXT_COLOR = '#000000'
export const DEFAULT_BOX_COLOR = '#ffffff'

export const TEXT_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Pink', value: '#f472b6' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Lime', value: '#a3e635' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Purple', value: '#c084fc' },
  { label: 'Cream', value: '#fef3c7' },
]

export const BOX_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Lime', value: '#a3e635' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Pink', value: '#f472b6' },
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#1f2937' },
  { label: 'Navy', value: '#001a4d' },
  { label: 'Dark Blue', value: '#0d47a1' },
  { label: 'Dark Red', value: '#7f1d1d' },
  { label: 'Dark Purple', value: '#3f0f5c' },
  { label: 'Dark Teal', value: '#0d3b66' },
  { label: 'Dark Green', value: '#1b4332' },
  { label: 'Transparent', value: 'transparent' },
]

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'poppins',
  fontSize: 56,
  fontWeight: 900,
  textAlign: 'left',
  verticalPosition: 'bottom',
  opacity: 1,
  lineHeight: 1.45,
  letterSpacing: 0,
  textShadow: true,
  color: DEFAULT_TEXT_COLOR,
  boxColor: DEFAULT_BOX_COLOR,
  boxOpacity: 1,
  boxBlur: 0,
  boxPadding: 24,
  boxRadius: 20,
  boxSpread: 0,
  autoFitText: true,
}

// Memoization caches for performance
const styleCache = new Map<string, TextStyle>()
const cssCache = new Map<string, string>()

function getStyleCacheKey(style?: TextStyle): string {
  if (!style) return 'default'
  return JSON.stringify(style)
}
 
export function getTextBoxInlineStyle(style?: TextStyle, scale = 1): CSSProperties {
  const s = resolveTextStyle(style)
  const bgColor = s.boxColor === 'transparent' ? 'transparent' : convertToRgba(s.boxColor ?? '', s.boxOpacity)
  const isTransparent = bgColor === 'transparent'
  const padX = Math.max(0, Math.round(s.boxPadding)) * scale
  const padY = Math.max(0, Math.round(s.boxPadding)) * scale
  const radiusVal = Math.max(0, s.boxRadius ?? 0)
  const spread = s.boxSpread ?? 0
  const textStroke = isTransparent ? '1px rgba(0,0,0,0.8)' : 'none'
  const textShadowValue = s.textShadow
    ? isTransparent
      ? '0 2px 12px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
    : 'none'
  return {
    backgroundColor: bgColor,
    backdropFilter: s.boxBlur > 0 ? `blur(${s.boxBlur}px)` : 'none',
    WebkitBackdropFilter: s.boxBlur > 0 ? `blur(${s.boxBlur}px)` : 'none',
    padding: `${Math.round(padY)}px ${Math.round(padX)}px`,
    borderRadius: `${Math.round(radiusVal * scale)}px`,
    border: isTransparent ? 'none' : '1px solid rgba(255,255,255,0.15)',
    boxShadow: spread > 0 ? `0 0 ${Math.round(spread * scale)}px rgba(0,0,0,0.18)` : undefined,
    display: 'inline',
    width: 'auto',
    boxSizing: 'border-box',
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
    textAlign: s.textAlign as any,
    WebkitTextStroke: textStroke,
    textShadow: textShadowValue as any,
  }
}

function convertToRgba(color: string, opacity: number): string {
  if (color === 'transparent') return 'transparent'
  if (color.startsWith('rgba')) return color
  if (color.startsWith('rgb')) return color
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    return `rgba(${r},${g},${b},${opacity})`
  }
  return `rgba(0,0,0,${opacity})`
}

export function buildExportTextBoxCss(style?: TextStyle): string {
  const key = `textBoxCss-${getStyleCacheKey(style)}`
  if (cssCache.has(key)) {
    return cssCache.get(key)!
  }
  const s = resolveTextStyle(style)
  const alignItems = s.textAlign === 'left' ? 'flex-start' : s.textAlign === 'right' ? 'flex-end' : 'center'
  const css = [
    'position:relative',
    'z-index:2',
    'display:flex',
    'flex-direction:column',
    'gap:6px',
    'width:100%',
    'box-sizing:border-box',
    `align-items:${alignItems}`,
  ].join(';')
  cssCache.set(key, css)
  return css
}

export function resolveTextStyle(style?: TextStyle): TextStyle {
  const key = getStyleCacheKey(style)
  if (styleCache.has(key)) {
    return styleCache.get(key)!
  }
  const resolved = { ...DEFAULT_TEXT_STYLE, ...style }
  if (resolved.boxRadius === 0) {
    resolved.boxRadius = 20
  }
  styleCache.set(key, resolved)
  return resolved
}

export function getSlideFlexAlign(verticalPosition: TextStyle['verticalPosition']): string {
  switch (verticalPosition) {
    case 'top':
      return 'flex-start'
    case 'middle':
      return 'center'
    default:
      return 'flex-end'
  }
}

export function buildExportTextCss(style?: TextStyle, fontSizeOverride?: number): string {
  const key = `textCss-${getStyleCacheKey(style)}-${fontSizeOverride ?? 'default'}`
  if (cssCache.has(key)) {
    return cssCache.get(key)!
  }
  const s = resolveTextStyle(style)
  const fontSize = fontSizeOverride ?? s.fontSize
  const isTransparent = s.boxColor === 'transparent'
  const shadow = s.textShadow
    ? isTransparent
      ? '0 2px 12px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
    : 'none'
  const spread = s.boxSpread ?? 0

  const bg = isTransparent ? 'transparent' : convertToRgba(s.boxColor ?? '', s.boxOpacity)
  // Dynamic padding based on boxPadding setting (horizontal ~3x vertical ratio for bubble look)
  const padX = s.boxPadding ? Math.round(s.boxPadding * 0.9) : Math.max(2, Math.round(fontSize * 0.1))
  const padY = s.boxPadding ? Math.round(s.boxPadding * 0.3) : Math.max(2, Math.round(fontSize * 0.08))
  const radiusVal = Math.max(0, s.boxRadius ?? 20)

  const css = [
    `color:${s.color}`,
    `font-size:${fontSize}px`,
    `font-weight:${s.fontWeight}`,
    `font-family:${getFontFamily(s.fontFamily)}`,
    `line-height:${s.lineHeight}`,
    `letter-spacing:${s.letterSpacing}px`,
    `opacity:${s.opacity}`,
    `text-align:${s.textAlign}`,
    'margin:0',
    `text-shadow:${shadow}`,
    `-webkit-text-stroke:${isTransparent ? '1px rgba(0,0,0,0.8)' : 'none'}`,
    `background:${bg}`,
    `padding:${padY}px ${padX}px`,
    `border-radius:${radiusVal}px`,
    `box-shadow:${spread > 0 ? `0 0 ${spread}px rgba(0,0,0,0.18)` : 'none'}`,
    `border:${isTransparent ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.15)'}`,
    'display:inline',
    'box-decoration-break:clone',
    `-webkit-box-decoration-break:clone`,
    `backdrop-filter:${s.boxBlur > 0 ? `blur(${s.boxBlur}px)` : 'none'}`,
    `-webkit-backdrop-filter:${s.boxBlur > 0 ? `blur(${s.boxBlur}px)` : 'none'}`,
    'white-space:pre-wrap',
  ].join(';')
  cssCache.set(key, css)
  return css
}

/**
 * CSS for the outer paragraph bubble wrapper — background box styling only.
 * Used when rendering whole paragraphs as a single bubble.
 */
export function buildParagraphBoxCss(style?: TextStyle, fontSizeOverride?: number): string {
  const key = `paraBoxCss-${getStyleCacheKey(style)}-${fontSizeOverride ?? 'default'}`
  if (cssCache.has(key)) return cssCache.get(key)!

  const s = resolveTextStyle(style)

  const css = [
    'background:transparent',
    'border:none',
    'padding:0',
    'box-shadow:none',
    'backdrop-filter:none',
    '-webkit-backdrop-filter:none',
    'box-sizing:border-box',
    'width:fit-content',
    'max-width:90%',
    `text-align:${s.textAlign}`,
  ].join(';')
  cssCache.set(key, css)
  return css
}

/**
 * CSS for the inner text span — font and color styling only, no background.
 * Used inside a paragraph bubble wrapper so the whole paragraph shares one bubble.
 */
export function buildParagraphTextCss(style?: TextStyle, fontSizeOverride?: number): string {
  const key = `paraTextCss-${getStyleCacheKey(style)}-${fontSizeOverride ?? 'default'}`
  if (cssCache.has(key)) return cssCache.get(key)!

  const s = resolveTextStyle(style)
  const fontSize = fontSizeOverride ?? s.fontSize
  const isTransparent = s.boxColor === 'transparent'
  const shadow = s.textShadow
    ? isTransparent
      ? '0 2px 12px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
    : 'none'
  const spread = s.boxSpread ?? 0

  const bg = isTransparent ? 'transparent' : convertToRgba(s.boxColor ?? '', s.boxOpacity)
  // Dynamic padding based on boxPadding setting (horizontal ~3x vertical ratio for bubble look)
  const padX = s.boxPadding ? Math.round(s.boxPadding * 0.9) : Math.max(2, Math.round(fontSize * 0.1))
  const padY = s.boxPadding ? Math.round(s.boxPadding * 0.3) : Math.max(2, Math.round(fontSize * 0.08))
  const radiusVal = Math.max(0, s.boxRadius ?? 20)

  const css = [
    `color:${s.color}`,
    `font-size:${fontSize}px`,
    `font-weight:${s.fontWeight}`,
    `font-family:${getFontFamily(s.fontFamily)}`,
    `line-height:${s.lineHeight}`,
    `letter-spacing:${s.letterSpacing}px`,
    `opacity:${s.opacity}`,
    `text-align:${s.textAlign}`,
    'margin:0',
    `text-shadow:${shadow}`,
    `-webkit-text-stroke:${isTransparent ? '1px rgba(0,0,0,0.8)' : 'none'}`,
    `background:${bg}`,
    `padding:${padY}px ${padX}px`,
    `border-radius:${radiusVal}px`,
    `box-shadow:${spread > 0 ? `0 0 ${spread}px rgba(0,0,0,0.18)` : 'none'}`,
    `border:${isTransparent ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.15)'}`,
    'display:inline',
    'box-decoration-break:clone',
    `-webkit-box-decoration-break:clone`,
    `backdrop-filter:${s.boxBlur > 0 ? `blur(${s.boxBlur}px)` : 'none'}`,
    `-webkit-backdrop-filter:${s.boxBlur > 0 ? `blur(${s.boxBlur}px)` : 'none'}`,
    'white-space:pre-wrap',
  ].join(';')
  cssCache.set(key, css)
  return css
}

