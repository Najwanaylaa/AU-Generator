'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StoryUploadForm from '@/components/StoryUploadForm'
import SlideshowExportPanel from '@/components/SlideshowExportPanel'
import StoryProjectEmptyState from '@/components/StoryProjectEmptyState'
import SlideCarousel from '@/components/SlideCarousel'
import ProjectSettingsPanel from '@/components/ProjectSettingsPanel'
import UndoRedoToolbar from '@/components/UndoRedoToolbar'
import {
  buildSlidesWithOptionalCover,
  resplitStoryIntoSlidesWithCover,
} from '@/lib/storyParser'
import { loadProject, saveProject, clearProject, clearFormDraft } from '@/lib/projectStorage'
import { DEFAULT_PROJECT_SETTINGS } from '@/lib/projectSettings'
import { useGeneratedStory } from '@/hooks/useGeneratedStory'
import { Slide, ProjectSettings } from '@/types'
import { ImageFile, createImagePreviews } from '@/lib/imageUtils'

export default function SlideshowPage() {
  const router = useRouter()
  const {
    story: generatedStory,
    loadStory,
    patchStory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGeneratedStory()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [restoredSession, setRestoredSession] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const saved = loadProject()
    if (saved) loadStory(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!generatedStory) {
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    const timer = window.setTimeout(async () => {
      const result = await saveProject(generatedStory)
      if (result.ok) {
        setSaveStatus('saved')
        setSaveError('')
      } else {
        setSaveStatus('error')
        setSaveError(result.error)
      }
    }, 800)

    return () => window.clearTimeout(timer)
  }, [generatedStory])

  const handleSlidesUpdate = useCallback(
    (updatedSlides: Slide[]) => {
      const coverSlide = updatedSlides.find((slide) => slide.isCover)
      patchStory({
        slides: updatedSlides,
        ...(coverSlide
          ? {
              storyTitle: coverSlide.text.trim() || undefined,
              storySubtitle: coverSlide.coverSubtitle?.trim() || undefined,
            }
          : {}),
      })
    },
    [patchStory]
  )

  const handleSettingsChange = useCallback(
    (settings: ProjectSettings) => {
      if (!generatedStory) return

      const prevMax =
        generatedStory.settings?.maxCharsPerSlide ??
        DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
      const maxChanged = settings.maxCharsPerSlide !== prevMax

      if (!maxChanged) {
        patchStory({ settings })
        return
      }

      const storyText =
        generatedStory.sourceStory ||
        generatedStory.slides
          .filter((slide) => !slide.isCover)
          .map((slide) => slide.text.trim())
          .filter(Boolean)
          .join('\n\n')

      if (!storyText.trim()) {
        patchStory({ settings })
        return
      }

      const slides = resplitStoryIntoSlidesWithCover(
        storyText,
        settings.maxCharsPerSlide,
        generatedStory.imageUrls.length,
        generatedStory.slides,
        generatedStory.storyTitle,
        generatedStory.storySubtitle
      )

      patchStory({
        slides,
        settings,
        sourceStory: generatedStory.sourceStory || storyText,
      })
      setActiveSlideIndex(0)
    },
    [generatedStory, patchStory]
  )

  const handleGenerateSlides = useCallback(
    async (
      story: string,
      imageFiles: ImageFile[],
      storyTitle: string,
      storySubtitle: string
    ) => {
      const maxCharsPerSlide = DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
      setIsLoading(true)
      setError('')
      setRestoredSession(false)

      try {
        const { slides, storyTitle: title, storySubtitle: subtitle } = buildSlidesWithOptionalCover(
          story,
          maxCharsPerSlide,
          imageFiles.length,
          storyTitle,
          storySubtitle
        )

        if (slides.length === 0) {
          throw new Error('Could not parse any sentences from the story')
        }

        const imageUrls = imageFiles.map((img) => img.preview)

        const result = {
          slides,
          imageUrls,
          totalSlides: slides.length,
          settings: { ...DEFAULT_PROJECT_SETTINGS, maxCharsPerSlide },
          sourceStory: story,
          storyTitle: title,
          storySubtitle: subtitle,
        }

        loadStory(result)
        await saveProject(result)
        clearFormDraft()
        setSaveStatus('saved')
        setShowForm(false)
      } catch (err) {
        console.error('Error generating slides:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [loadStory]
  )

  if (!generatedStory) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/" className="btn-ghost text-sm mb-2 inline-flex">
            ← Dashboard
          </Link>
        </div>
        <section className="space-y-4">
          <div>
            <h2 className="section-title">Slideshow MP4</h2>
            <p className="section-desc mt-1">
              Buat slide story yang diexport sebagai video slideshow — setiap slide tampil berurutan dengan durasi yang bisa diatur.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2" role="list">
            <li><span className="chip">Slideshow format</span></li>
            <li><span className="chip">1080×1920</span></li>
            <li><span className="chip">Auto-save</span></li>
            <li><span className="chip">Undo / Redo</span></li>
          </ul>
        </section>

        <div className="panel">
          <StoryUploadForm onGenerate={handleGenerateSlides} isLoading={isLoading} />
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <span aria-hidden="true">⚠</span>
            <div>
              <p className="font-medium">Failed to generate slides</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const previewSlide = generatedStory.slides[0]
  const previewImage = generatedStory.imageUrls[previewSlide?.imageIndex || 0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-3">
          <Link href="/" className="btn-ghost text-sm mb-2 inline-flex">
            ← Dashboard
          </Link>
          <div>
            <h2 className="section-title">Slideshow MP4</h2>
            <p className="section-desc mt-1">
              {generatedStory.totalSlides} slides · edit dan export video story format 1080×1920
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {saveStatus === 'saving' && <span className="chip text-slate-400">Saving…</span>}
              {saveStatus === 'saved' && (
                <span className="chip text-cyan-400/90">Saved to browser</span>
              )}
              {saveStatus === 'error' && (
                <span className="chip text-red-300 border-red-800/60" title={saveError}>
                  Save failed
                </span>
              )}
            </div>
          </div>
          <UndoRedoToolbar canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={showForm ? 'btn-primary shrink-0' : 'btn-secondary shrink-0'}
          >
            {showForm ? '✕ Tutup Form' : '✦ Generate Ulang'}
          </button>
          <button type="button" onClick={() => router.push('/story-prompt')} className="btn-secondary shrink-0">
            Story Prompter →
          </button>
        </div>
      </div>

      {showForm && (
        <div className="panel space-y-6">
          <StoryUploadForm onGenerate={handleGenerateSlides} isLoading={isLoading} />
          {error && (
            <div className="error-banner" role="alert">
              <span aria-hidden="true">⚠</span>
              <div>
                <p className="font-medium">Failed to generate slides</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {saveStatus === 'error' && saveError && (
        <div className="error-banner" role="alert">{saveError}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Slides</p>
          <p className="text-2xl font-bold text-cyan-400">{generatedStory.totalSlides}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Images</p>
          <p className="text-2xl font-bold text-slate-200">{generatedStory.imageUrls.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Size</p>
          <p className="text-lg font-bold text-slate-200">1080×1920</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Quality</p>
          <p className="text-2xl font-bold text-slate-200">2×</p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <SlideCarousel
          slides={generatedStory.slides}
          imageUrls={generatedStory.imageUrls}
          projectSettings={generatedStory.settings}
          onSlidesUpdate={handleSlidesUpdate}
          onActiveSlideChange={setActiveSlideIndex}
          onSettingsChange={handleSettingsChange}
        />
      </div>

      <ProjectSettingsPanel
        settings={generatedStory.settings ?? DEFAULT_PROJECT_SETTINGS}
        onChange={handleSettingsChange}
      />

      <SlideshowExportPanel
        slides={generatedStory.slides}
        imageUrls={generatedStory.imageUrls}
        projectSettings={generatedStory.settings ?? DEFAULT_PROJECT_SETTINGS}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}
