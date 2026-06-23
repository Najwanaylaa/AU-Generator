 'use client'

 import React, { useState, useCallback, useEffect } from 'react'
 import StoryUploadForm from '@/components/StoryUploadForm'
 import { useRouter } from 'next/navigation'
 import SlideCarousel from '@/components/SlideCarousel'
 import ExportPanel from '@/components/ExportPanel'
 import ProjectSettingsPanel from '@/components/ProjectSettingsPanel'
 import UndoRedoToolbar from '@/components/UndoRedoToolbar'
 import {
   buildSlidesWithOptionalCover,
   resplitStoryIntoSlidesWithCover,
 } from '@/lib/storyParser'
 import { Slide, ProjectSettings } from '@/types'
 import { ImageFile, createImagePreviews, MAX_IMAGES } from '@/lib/imageUtils'
 import { saveProject, loadProject, clearProject, clearFormDraft } from '@/lib/projectStorage'
 import { DEFAULT_PROJECT_SETTINGS } from '@/lib/projectSettings'
 import { useGeneratedStory } from '@/hooks/useGeneratedStory'

 export default function StoriesPage() {
   const {
     story: generatedStory,
     loadStory,
     patchStory,
     undo,
     redo,
     canUndo,
     canRedo,
   } = useGeneratedStory()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [restoredSession, setRestoredSession] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [uniformFontSize, setUniformFontSize] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!generatedStory) {
      setUniformFontSize(undefined)
      return
    }
    let active = true
    const calculateUniformSize = async () => {
      const { getUniformFontSizeForSlides } = await import('@/lib/slideExport')
      const size = await getUniformFontSizeForSlides(
        generatedStory.slides,
        generatedStory.imageUrls,
        generatedStory.settings
      )
      if (active) {
        setUniformFontSize(size)
      }
    }
    calculateUniformSize()
    return () => {
      active = false
    }
  }, [generatedStory?.slides, generatedStory?.imageUrls, generatedStory?.settings])

  useEffect(() => {
    const saved = loadProject()
    if (saved) {
      loadStory(saved)
      setRestoredSession(true)
    }
    // Restore once on mount; loadStory is stable (depends only on historyReplace)
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
      } catch (err) {
        console.error('Error generating slides:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [loadStory]
  )

  const handleReset = useCallback(() => {
    loadStory(null)
    setError('')
    setRestoredSession(false)
    clearProject()
    setSaveStatus('idle')
    setSaveError('')
  }, [loadStory])

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

  const handleImagesAdd = useCallback(
    async (files: FileList) => {
      if (!generatedStory) return

      const previews = await createImagePreviews(files)
      if (previews.length === 0) return

      const remaining = MAX_IMAGES - generatedStory.imageUrls.length
      if (remaining <= 0) return

      const toAdd = previews.slice(0, remaining).map((img) => img.preview)
      patchStory({ imageUrls: [...generatedStory.imageUrls, ...toAdd] })
    },
    [generatedStory, patchStory]
  )

  if (generatedStory) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn-ghost text-sm mb-2"
          >
            ← Dashboard
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-3">
            <div>
              <h2 className="section-title">Slides ready to edit</h2>
              <p className="section-desc mt-1">
                {generatedStory.totalSlides} slides · {generatedStory.imageUrls.length} images · IG/TikTok story format
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {restoredSession && (
                  <span className="chip text-emerald-400 border-emerald-800/60">Restored from last session</span>
                )}
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
          <button type="button" onClick={handleReset} className="btn-secondary shrink-0 self-start">
            ← New story
          </button>
        </div>

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
            onImagesAdd={handleImagesAdd}
            onSettingsChange={handleSettingsChange}
            uniformFontSize={uniformFontSize}
          />
        </div>

        <ProjectSettingsPanel
          settings={generatedStory.settings ?? DEFAULT_PROJECT_SETTINGS}
          onChange={handleSettingsChange}
        />

        <ExportPanel
          slides={generatedStory.slides}
          imageUrls={generatedStory.imageUrls}
          projectSettings={generatedStory.settings}
          currentSlideIndex={activeSlideIndex}
          uniformFontSize={uniformFontSize}
        />

        <section className="panel panel-section space-y-3" aria-labelledby="video-export-links">
          <div>
            <h3 id="video-export-links" className="section-title">
              Export Video MP4
            </h3>
            <p className="section-desc mt-1">
              Slideshow dan Story Prompter ada di halaman terpisah dengan pengaturan export masing-masing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => router.push('/slideshow')} className="btn-secondary">
              Slideshow MP4 →
            </button>
            <button type="button" onClick={() => router.push('/story-prompt')} className="btn-secondary">
              Story Prompter MP4 →
            </button>
          </div>
        </section>
      </div>
    )
  }

   return (
     <div className="mx-auto max-w-3xl space-y-6">
       <div>
         <button
           type="button"
           onClick={() => router.push('/')}
           className="btn-ghost text-sm mb-2"
         >
           ← Dashboard
         </button>
       </div>
       <section className="space-y-4">
         <p className="section-desc">
           Paste your story, upload background images, and generate editable slides for IG/TikTok story format.
         </p>
         <ul className="flex flex-wrap gap-2" role="list">
           <li><span className="chip">Fast</span></li>
           <li><span className="chip">Story format</span></li>
           <li><span className="chip">PNG · Slideshow · Prompter</span></li>
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

       <aside className="grid sm:grid-cols-3 gap-3 text-sm">
         <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
           <p className="font-medium text-slate-200">1. Cover &amp; story</p>
           <p className="text-slate-500 text-xs leading-relaxed">Add an optional title slide, then paste your story.</p>
         </div>
         <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
           <p className="font-medium text-slate-200">2. Upload images</p>
           <p className="text-slate-500 text-xs leading-relaxed">Pick a background per slide after generating.</p>
         </div>
         <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
           <p className="font-medium text-slate-200">3. Edit &amp; export</p>
           <p className="text-slate-500 text-xs leading-relaxed">Undo mistakes · fullscreen preview · export with progress.</p>
         </div>
       </aside>
     </div>
   )
 }
