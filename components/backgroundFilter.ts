export interface BackgroundFilter {
  brightness: number
  contrast: number
  saturate: number
}

export const DEFAULT_BACKGROUND_FILTER: BackgroundFilter = {
  brightness: 0.7,
  contrast: 1.05,
  saturate: 1.1,
}

export function resolveBackgroundFilter(filter?: BackgroundFilter): BackgroundFilter {
  return { ...DEFAULT_BACKGROUND_FILTER, ...filter }
}

export function getBackgroundFilterCss(filter?: BackgroundFilter): string {
  const f = resolveBackgroundFilter(filter)
  return `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate})`
}
