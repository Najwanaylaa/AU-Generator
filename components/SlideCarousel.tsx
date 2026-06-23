'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Slide, TextStyle, ProjectSettings, MaxCharsPerSlide } from '@/types'
import { resolveProjectSettings } from '@/lib/projectSettings'
import { BackgroundFilter } from '@/components/backgroundFilter'
import SlidePreview from './SlidePreview'
import SlideContentEditor from './SlideContentEditor'
import TextStyleEditor from './TextStyleEditor'
import FullscreenPreview from './FullscreenPreview'
import { DEFAULT_TEXT_STYLE } from '@/lib/slideTextStyle'
import {
  updateSlideAt,
  deleteSlideAt,
  insertSlideAfter,
  duplicateSlideAt,
  reorderSlides,
  moveSlide,
} from '@/lib/slideUtils'

interface SlideCarouselProps {
  slides: Slide[]
  imageUrls: string[]
  projectSettings?: ProjectSettings
  onSlidesUpdate: (slides: Slide[]) => void
  onActiveSlideChange?: (index: number) => void
  onImagesAdd?: (files: FileList) => void
  onSettingsChange?: (settings: ProjectSettings) => void
}

export default function SlideCarousel({
  slides,
  imageUrls,
  projectSettings,
  onSlidesUpdate,
  onActiveSlideChange,
  onImagesAdd,
  onSettingsChange,
}: SlideCarouselProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [editorOpen, setEditorOpen] = useState(true)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [dragEnabled, setDragEnabled] = useState(false)

  useEffect(() => {
    if (currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(Math.max(0, slides.length - 1))
    }
  }, [slides.length, currentSlideIndex])

  useEffect(() => {
    onActiveSlideChange?.(currentSlideIndex)
  }, [currentSlideIndex, onActiveSlideChange])

  const settings = resolveProjectSettings(projectSettings)

  const handleMaxCharsChange = useCallback(
    (maxCharsPerSlide: MaxCharsPerSlide) => {
      onSettingsChange?.({
        ...resolveProjectSettings(projectSettings),
        maxCharsPerSlide,
      })
    },
    [onSettingsChange, projectSettings]
  )

  const currentSlide = slides[currentSlideIndex]
  if (!currentSlide) return null

  const currentImageUrl = imageUrls[currentSlide.imageIndex || 0]
  const currentTextStyle = { ...DEFAULT_TEXT_STYLE, ...currentSlide.textStyle }

  const handleStyleChange = useCallback(
    (newStyle: TextStyle) => {
      onSlidesUpdate(updateSlideAt(slides, currentSlideIndex, { textStyle: newStyle }))
    },
    [currentSlideIndex, slides, onSlidesUpdate]
  )

  const handleApplyToAll = useCallback(() => {
    const styleToApply: TextStyle = { ...currentTextStyle }
    onSlidesUpdate(slides.map((slide) => ({ ...slide, textStyle: { ...styleToApply } })))
  }, [currentTextStyle, slides, onSlidesUpdate])

  const handlePrevious = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }, [slides.length])

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }, [slides.length])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (fullscreenOpen) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') handlePrevious()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePrevious, handleNext, fullscreenOpen])

  const getIndexAfterReorder = (current: number, from: number, to: number) => {
    if (current === from) return to
    if (from < to && current > from && current <= to) return current - 1
    if (from > to && current >= to && current < from) return current + 1
    return current
  }

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return
    const reordered = reorderSlides(slides, dragIndex, toIndex)
    onSlidesUpdate(reordered)
    setCurrentSlideIndex(getIndexAfterReorder(currentSlideIndex, dragIndex, toIndex))
    setDragIndex(null)
  }

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr_minmax(280px,320px)] lg:divide-x lg:divide-slate-800">
      {/* Kolom 1: preview dan thumbnail slides */}
      <div className="p-3 md:p-4 space-y-3 lg:sticky lg:top-20 lg:self-start overflow-y-auto lg:max-h-[calc(100vh-100px)]">
        {/* Slide number dan navigation */}
        <div className="flex items-center justify-between gap-2 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">
            Slide <span className="text-cyan-400 font-semibold">{currentSlideIndex + 1}</span>
            <span className="text-slate-500"> / {slides.length}</span>
          </div>
          <div className="flex gap-1">
            <button 
              type="button" 
              onClick={handlePrevious} 
              className="editor-chip px-1.5"
              aria-label="Previous slide"
            >
              ← 
            </button>
            <button 
              type="button" 
              onClick={handleNext} 
              className="editor-chip px-1.5"
              aria-label="Next slide"
            >
              →
            </button>
          </div>
        </div>

        {/* Main preview */}
        <div className="space-y-2">
          <SlidePreview
            slide={currentSlide}
            imageUrl={currentImageUrl}
            slideDimensions={{ width: 1080, height: 1920 }}
            projectSettings={projectSettings}
            showCharCount={false}
          />

          <button
            type="button"
            onClick={() => setFullscreenOpen(true)}
            className="w-full h-8 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg"
          >
            ⛶ Fullscreen Preview
          </button>
        </div>

        {/* Drag toggle */}
        <div className="flex items-center gap-2 bg-slate-900/30 rounded-lg p-2 border border-slate-800">
          <input
            type="checkbox"
            id="drag-toggle"
            checked={dragEnabled}
            onChange={(e) => setDragEnabled(e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
          />
          <label htmlFor="drag-toggle" className="text-xs text-slate-300 cursor-pointer flex-1">
            Drag to reorder
          </label>
        </div>

        {/* Thumbnail strip */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-slate-500 uppercase px-1">Slides</p>
          <div className="thumb-strip" role="tablist" aria-label="Slide list">
          {slides.map((slide, index) => {
            const imageUrl = imageUrls[slide.imageIndex || 0]
            const isActive = currentSlideIndex === index
            return (
              <button
                key={`${slide.id}-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                draggable={dragEnabled}
                onDragStart={() => dragEnabled && setDragIndex(index)}
                onDragEnd={() => dragEnabled && setDragIndex(null)}
                onDragOver={(e) => dragEnabled && e.preventDefault()}
                onDrop={(e) => { dragEnabled && e.preventDefault(); dragEnabled && handleDrop(index) }}
                onClick={() => setCurrentSlideIndex(index)}
                className={`relative shrink-0 w-12 h-16 rounded-lg overflow-hidden border-2 snap-start transition-all
                  ${isActive ? 'border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20' : 'border-slate-700 hover:border-slate-600'}
                  ${dragEnabled ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer'}
                  ${dragIndex === index ? 'opacity-50' : ''}`}
              >
                <img src={imageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                <span className="absolute inset-x-0 bottom-0 py-0.5 text-[8px] font-bold text-center bg-black/70">
                  {index + 1}
                </span>
              </button>
            )
          })}
          </div>
        </div>
      </div>

      {/* Kolom 2: konten slide */}
      <div className="p-4 md:p-6 border-t lg:border-t-0 border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900/50">
        <div className="space-y-4 max-w-4xl mx-auto">
          <div>
            <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide mb-2">
              {currentSlide.isCover ? 'Cover Slide' : 'Slide Content'}
            </p>
            <SlideContentEditor
          slide={currentSlide}
          slideIndex={currentSlideIndex}
          totalSlides={slides.length}
          imageUrls={imageUrls}
          onTextChange={(text) => onSlidesUpdate(updateSlideAt(slides, currentSlideIndex, { text }))}
          onCoverSubtitleChange={(coverSubtitle) =>
            onSlidesUpdate(
              updateSlideAt(slides, currentSlideIndex, {
                coverSubtitle: coverSubtitle.trim() || undefined,
              })
            )
          }
          onImageSelect={(imageIndex) =>
            onSlidesUpdate(updateSlideAt(slides, currentSlideIndex, { imageIndex }))
          }
          onBackgroundFilterChange={(backgroundFilter: BackgroundFilter) =>
            onSlidesUpdate(updateSlideAt(slides, currentSlideIndex, { backgroundFilter }))
          }
          onDuplicate={() => {
            const next = duplicateSlideAt(slides, currentSlideIndex)
            onSlidesUpdate(next)
            setCurrentSlideIndex(currentSlideIndex + 1)
          }}
          onDelete={() => {
            const next = deleteSlideAt(slides, currentSlideIndex)
            onSlidesUpdate(next)
            setCurrentSlideIndex((i) => Math.min(i, next.length - 1))
          }}
          onAddAfter={() => {
            const next = insertSlideAfter(slides, currentSlideIndex)
            onSlidesUpdate(next)
            setCurrentSlideIndex(currentSlideIndex + 1)
          }}
          onMoveUp={() => {
            const next = moveSlide(slides, currentSlideIndex, -1)
            onSlidesUpdate(next)
            setCurrentSlideIndex(currentSlideIndex - 1)
          }}
          onMoveDown={() => {
            const next = moveSlide(slides, currentSlideIndex, 1)
            onSlidesUpdate(next)
            setCurrentSlideIndex(currentSlideIndex + 1)
          }}
          onImagesAdd={onImagesAdd}
          projectSettings={projectSettings}
        />
          </div>
        </div>
      </div>

      {/* Kolom 3: style controls */}
      <div className="p-4 md:p-6 border-t lg:border-t-0 border-slate-800 bg-gradient-to-br from-slate-950/50 to-slate-900 lg:sticky lg:top-20 lg:self-start overflow-y-auto lg:max-h-[calc(100vh-100px)]">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide">Text & Style</p>
          <TextStyleEditor
          textStyle={currentTextStyle}
          onStyleChange={handleStyleChange}
          onApplyToAll={slides.length > 1 ? handleApplyToAll : undefined}
          totalSlides={slides.length}
          maxCharsPerSlide={onSettingsChange ? settings.maxCharsPerSlide : undefined}
          onMaxCharsPerSlideChange={onSettingsChange ? handleMaxCharsChange : undefined}
          isOpen={editorOpen}
          onToggle={() => setEditorOpen(!editorOpen)}
        />
        </div>
      </div>

      {fullscreenOpen && (
        <FullscreenPreview
          slide={currentSlide}
          imageUrl={currentImageUrl}
          projectSettings={projectSettings}
          slideIndex={currentSlideIndex}
          totalSlides={slides.length}
          onClose={() => setFullscreenOpen(false)}
          onPrevious={slides.length > 1 ? handlePrevious : undefined}
          onNext={slides.length > 1 ? handleNext : undefined}
        />
      )}
    </div>
  )
}
