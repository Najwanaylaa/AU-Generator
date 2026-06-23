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

export function getFontFamily(id?: FontId | string): string {
  const match = FONT_OPTIONS.find((f) => f.id === id)
  return match?.family ?? FONT_OPTIONS[0].family
}

export function getFontLabel(id?: FontId | string): string {
  const match = FONT_OPTIONS.find((f) => f.id === id)
  return match?.label ?? FONT_OPTIONS[0].label
}
