'use client'

import { useState, useCallback, useMemo } from 'react'
import { GeneratedStory, Slide, ProjectSettings } from '@/types'
import { DEFAULT_PROJECT_SETTINGS } from '@/lib/projectSettings'
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo'

type EditorSnapshot = {
  slides: Slide[]
  settings: ProjectSettings
  storyTitle?: string
  storySubtitle?: string
}

export function useGeneratedStory() {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [sourceStory, setSourceStory] = useState('')
  const [storyTitle, setStoryTitle] = useState('')
  const [storySubtitle, setStorySubtitle] = useState('')
  const {
    state: historyState,
    set: historySet,
    replace: historyReplace,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useUndoRedo<EditorSnapshot | null>(null)

  const story: GeneratedStory | null = useMemo(() => {
    if (!historyState) return null
    return {
      slides: historyState.slides,
      settings: historyState.settings,
      imageUrls,
      sourceStory: sourceStory || undefined,
      totalSlides: historyState.slides.length,
      storyTitle: storyTitle || undefined,
      storySubtitle: storySubtitle || undefined,
    }
  }, [historyState, imageUrls, sourceStory, storyTitle, storySubtitle])

  const loadStory = useCallback(
    (value: GeneratedStory | null) => {
      if (!value) {
        setImageUrls([])
        setSourceStory('')
        setStoryTitle('')
        setStorySubtitle('')
        historyReplace(null)
        return
      }
      setImageUrls(value.imageUrls)
      setSourceStory(value.sourceStory ?? '')
      setStoryTitle(value.storyTitle ?? '')
      setStorySubtitle(value.storySubtitle ?? '')
      historyReplace({
        slides: structuredClone(value.slides),
        settings: { ...DEFAULT_PROJECT_SETTINGS, ...value.settings },
        storyTitle: value.storyTitle,
        storySubtitle: value.storySubtitle,
      })
    },
    [historyReplace]
  )

  const patchStory = useCallback(
    (patch: {
      slides?: Slide[]
      settings?: ProjectSettings
      imageUrls?: string[]
      sourceStory?: string
      storyTitle?: string
      storySubtitle?: string
    }) => {
      if (patch.imageUrls) setImageUrls(patch.imageUrls)
      if (patch.sourceStory !== undefined) setSourceStory(patch.sourceStory)
      if (patch.storyTitle !== undefined) setStoryTitle(patch.storyTitle)
      if (patch.storySubtitle !== undefined) setStorySubtitle(patch.storySubtitle)
      historySet((prev) => {
        if (!prev) return prev
        return {
          slides: patch.slides ? structuredClone(patch.slides) : prev.slides,
          settings: patch.settings
            ? { ...DEFAULT_PROJECT_SETTINGS, ...patch.settings }
            : prev.settings,
          storyTitle: patch.storyTitle !== undefined ? patch.storyTitle : prev.storyTitle,
          storySubtitle:
            patch.storySubtitle !== undefined ? patch.storySubtitle : prev.storySubtitle,
        }
      })
    },
    [historySet]
  )

  useUndoRedoKeyboard(undo, redo, !!story)

  return {
    story,
    loadStory,
    patchStory,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  }
}
