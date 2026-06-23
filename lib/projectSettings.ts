import { MaxCharsPerSlide, ProjectSettings } from '@/types'

export const MAX_CHARS_PER_SLIDE_OPTIONS: MaxCharsPerSlide[] = [
  100, 200, 300, 400, 500,
]

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  watermarkText: '',
  watermarkEnabled: false,
  watermarkPosition: 'bottom-right',
  secondsPerSlide: 5,
  maxCharsPerSlide: 200,
}

const LEGACY_WORD_TO_CHAR: Record<number, MaxCharsPerSlide> = {
  100: 100,
  200: 200,
  250: 200,
  500: 500,
  750: 500,
  1000: 500,
}

/** Map saved settings from older versions that used word limits. */
export function migrateProjectSettings(
  settings?: Partial<ProjectSettings> & { maxWordsPerSlide?: number }
): ProjectSettings {
  const { maxWordsPerSlide, ...rest } = (settings ?? {}) as Partial<ProjectSettings> & {
    maxWordsPerSlide?: number
  }

  const merged = { ...DEFAULT_PROJECT_SETTINGS, ...rest }

  if (maxWordsPerSlide !== undefined) {
    merged.maxCharsPerSlide =
      LEGACY_WORD_TO_CHAR[maxWordsPerSlide] ?? DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
  }

  if (!MAX_CHARS_PER_SLIDE_OPTIONS.includes(merged.maxCharsPerSlide)) {
    merged.maxCharsPerSlide = DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
  }

  return merged
}

export function resolveProjectSettings(settings?: ProjectSettings): ProjectSettings {
  return migrateProjectSettings(settings)
}
