import { GeneratedStory } from '@/types'
import { preloadImageDataUrls } from '@/lib/imageUtils'
import { DEFAULT_PROJECT_SETTINGS, migrateProjectSettings } from '@/lib/projectSettings'

const STORAGE_KEY = 'au-story-slide-project-v2'

interface StoredProject {
  slides: GeneratedStory['slides']
  imageUrls: string[]
  settings?: GeneratedStory['settings']
  sourceStory?: string
  storyTitle?: string
  storySubtitle?: string
  savedAt: number
}

const FORM_DRAFT_KEY = 'au-story-slide-form-draft-v1'

export interface StoryFormDraft {
  storyTitle?: string
  storySubtitle?: string
  story?: string
}

export type SaveProjectResult = { ok: true } | { ok: false; error: string }

export async function saveProject(story: GeneratedStory): Promise<SaveProjectResult> {
  if (typeof window === 'undefined') return { ok: false, error: 'Not available on server' }

  try {
    const imageUrls = story.imageUrls.every((url) => url.startsWith('data:'))
      ? story.imageUrls
      : await preloadImageDataUrls(story.imageUrls)

    const payload: StoredProject = {
      slides: story.slides,
      imageUrls,
      settings: story.settings ?? DEFAULT_PROJECT_SETTINGS,
      sourceStory: story.sourceStory,
      storyTitle: story.storyTitle,
      storySubtitle: story.storySubtitle,
      savedAt: Date.now(),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return { ok: true }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return {
        ok: false,
        error: 'Storage full. Export your slides or use fewer/smaller images.',
      }
    }
    return { ok: false, error: 'Could not save project to browser storage' }
  }
}

export function loadProject(): GeneratedStory | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw) as StoredProject
    if (!data.slides?.length || !data.imageUrls?.length) return null

    return {
      slides: data.slides,
      imageUrls: data.imageUrls,
      totalSlides: data.slides.length,
      settings: migrateProjectSettings(data.settings),
      sourceStory: data.sourceStory,
      storyTitle: data.storyTitle,
      storySubtitle: data.storySubtitle,
    }
  } catch {
    return null
  }
}

export function clearProject(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function saveFormDraft(draft: StoryFormDraft): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Ignore draft save failures
  }
}

export function loadFormDraft(): StoryFormDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(FORM_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoryFormDraft
  } catch {
    return null
  }
}

export function clearFormDraft(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FORM_DRAFT_KEY)
}

export function getProjectSavedAt(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return (JSON.parse(raw) as StoredProject).savedAt ?? null
  } catch {
    return null
  }
}
