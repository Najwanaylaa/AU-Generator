import {
  Inter,
  Playfair_Display,
  Bebas_Neue,
  Montserrat,
  Poppins,
  Merriweather,
  Oswald,
  Pacifico,
  Dancing_Script,
  Roboto_Slab,
  Lora,
} from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas', display: 'swap' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' })
const poppins = Poppins({ weight: ['400', '600', '700', '800', '900'], subsets: ['latin'], variable: '--font-poppins', display: 'swap' })
const merriweather = Merriweather({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-merriweather', display: 'swap' })
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' })
const pacifico = Pacifico({ weight: '400', subsets: ['latin'], variable: '--font-pacifico', display: 'swap' })
const dancing = Dancing_Script({ subsets: ['latin'], variable: '--font-dancing', display: 'swap' })
const robotoSlab = Roboto_Slab({ subsets: ['latin'], variable: '--font-roboto-slab', display: 'swap' })
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' })

export const fontVariableClassName = [
  inter.variable,
  playfair.variable,
  bebas.variable,
  montserrat.variable,
  poppins.variable,
  merriweather.variable,
  oswald.variable,
  pacifico.variable,
  dancing.variable,
  robotoSlab.variable,
  lora.variable,
].join(' ')

export type FontId =
  | 'inter'
  | 'playfair'
  | 'bebas'
  | 'montserrat'
  | 'poppins'
  | 'merriweather'
  | 'oswald'
  | 'pacifico'
  | 'dancing'
  | 'roboto-slab'
  | 'lora'

export const FONT_OPTIONS: { id: FontId; label: string; family: string }[] = [
  { id: 'inter', label: 'Inter', family: inter.style.fontFamily },
  { id: 'playfair', label: 'Playfair Display', family: playfair.style.fontFamily },
  { id: 'bebas', label: 'Bebas Neue', family: bebas.style.fontFamily },
  { id: 'montserrat', label: 'Montserrat', family: montserrat.style.fontFamily },
  { id: 'poppins', label: 'Poppins', family: poppins.style.fontFamily },
  { id: 'merriweather', label: 'Merriweather', family: merriweather.style.fontFamily },
  { id: 'oswald', label: 'Oswald', family: oswald.style.fontFamily },
  { id: 'pacifico', label: 'Pacifico', family: pacifico.style.fontFamily },
  { id: 'dancing', label: 'Dancing Script', family: dancing.style.fontFamily },
  { id: 'roboto-slab', label: 'Roboto Slab', family: robotoSlab.style.fontFamily },
  { id: 'lora', label: 'Lora', family: lora.style.fontFamily },
]

export const DEFAULT_FONT_ID: FontId = 'inter'

export const GOOGLE_FONTS_MAP: Record<FontId, { familyName: string; importUrl: string }> = {
  inter: {
    familyName: 'Inter',
    importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap',
  },
  playfair: {
    familyName: 'Playfair Display',
    importUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&display=swap',
  },
  bebas: {
    familyName: 'Bebas Neue',
    importUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  },
  montserrat: {
    familyName: 'Montserrat',
    importUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap',
  },
  poppins: {
    familyName: 'Poppins',
    importUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap',
  },
  merriweather: {
    familyName: 'Merriweather',
    importUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap',
  },
  oswald: {
    familyName: 'Oswald',
    importUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap',
  },
  pacifico: {
    familyName: 'Pacifico',
    importUrl: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap',
  },
  dancing: {
    familyName: 'Dancing Script',
    importUrl: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',
  },
  'roboto-slab': {
    familyName: 'Roboto Slab',
    importUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;600;700;900&display=swap',
  },
  lora: {
    familyName: 'Lora',
    importUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
  },
}

export function getFontFamily(id?: FontId | string): string {
  const match = FONT_OPTIONS.find((f) => f.id === id)
  const cleanId = id as FontId
  const googleFont = GOOGLE_FONTS_MAP[cleanId]
  if (googleFont && match) {
    return `"${googleFont.familyName}", ${match.family}, sans-serif`
  }
  return match?.family ?? FONT_OPTIONS[0].family
}

export function getFontLabel(id?: FontId | string): string {
  const match = FONT_OPTIONS.find((f) => f.id === id)
  return match?.label ?? FONT_OPTIONS[0].label
}

export async function forceLoadFont(id: FontId | string, weight: string | number = 'normal'): Promise<void> {
  if (typeof window === 'undefined') return
  const cleanId = id as FontId
  const googleFont = GOOGLE_FONTS_MAP[cleanId]
  
  if (googleFont) {
    const styleId = `google-font-style-${cleanId}`
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.innerHTML = `@import url('${googleFont.importUrl}');`
      document.head.appendChild(styleEl)
    }
  }

  const family = getFontFamily(id)
  const span = document.createElement('span')
  span.style.cssText = `font-family:${family};font-weight:${weight};position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none`
  span.textContent = 'font-load-test'
  document.body.appendChild(span)
  try {
    if (googleFont) {
      // Wrap with a 2-second timeout to prevent UI from hanging if network is slow/blocked
      const loadPromise = document.fonts.load(`${weight} 12px "${googleFont.familyName}"`)
      const timeoutPromise = new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Font load timeout')), 2000))
      await Promise.race([loadPromise, timeoutPromise])
    }
    const readyPromise = document.fonts.ready
    const readyTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Fonts ready timeout')), 2000))
    await Promise.race([readyPromise, readyTimeoutPromise])
  } catch (err) {
    console.warn('forceLoadFont error or timeout:', err)
  } finally {
    document.body.removeChild(span)
  }
}

const fontEmbedCache: Record<string, string> = {}

/**
 * Fetch the Google Fonts CSS for a given font ID and embed all font binary URLs
 * as base64 data URLs. Returns a self-contained CSS string with @font-face rules
 * that can be passed to html-to-image's fontEmbedCSS option.
 */
export async function getEmbeddedFontCSS(id: FontId | string, weight: string | number = 900): Promise<string> {
  const cleanId = id as FontId
  const googleFont = GOOGLE_FONTS_MAP[cleanId]
  if (!googleFont) return ''

  const cacheKey = `${cleanId}-${weight}`
  if (fontEmbedCache[cacheKey]) return fontEmbedCache[cacheKey]

  try {
    // Fetch the Google Fonts CSS with a Chrome user-agent to get WOFF2 format
    const cssResponse = await fetch(googleFont.importUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!cssResponse.ok) return ''

    let cssText = await cssResponse.text()

    // Find all url(...) references in the CSS and replace with base64 data URLs
    const urlRegex = /url\(([^)]+)\)/g
    const urlMatches: string[] = []
    let m: RegExpExecArray | null
    while ((m = urlRegex.exec(cssText)) !== null) {
      const rawUrl = m[1].replace(/['"]/g, '').trim()
      if (!urlMatches.includes(rawUrl)) urlMatches.push(rawUrl)
    }

    await Promise.all(
      urlMatches.map(async (fontUrl) => {
        try {
          const fontResp = await fetch(fontUrl)
          if (!fontResp.ok) return
          const blob = await fontResp.blob()
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          cssText = cssText.replaceAll(`url(${fontUrl})`, `url(${dataUrl})`)
          cssText = cssText.replaceAll(`url('${fontUrl}')`, `url(${dataUrl})`)
          cssText = cssText.replaceAll(`url("${fontUrl}")`, `url(${dataUrl})`)
        } catch {
          // Ignore individual font fetch failures
        }
      })
    )

    fontEmbedCache[cacheKey] = cssText
    return cssText
  } catch {
    return ''
  }
}

