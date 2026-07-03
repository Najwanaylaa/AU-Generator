'use client'

import React, { useRef } from 'react'
import { Slide, ProjectSettings } from '@/types'
import { MAX_IMAGES } from '@/lib/imageUtils'
import { resolveProjectSettings } from '@/lib/projectSettings'
import { clampTextToMaxChars } from '@/lib/storyParser'
import { getFontFamily } from '@/lib/fonts'
import { resolveTextStyle } from '@/lib/slideTextStyle'

interface SlideContentEditorProps {
  slide: Slide
  slideIndex: number
  totalSlides: number
  imageUrls: string[]
  onTextChange: (text: string) => void
  onCoverSubtitleChange?: (subtitle: string) => void
  onImageSelect: (imageIndex: number) => void
  onBackgroundFilterChange?: (filter: import('@/components/backgroundFilter').BackgroundFilter) => void
  onDuplicate: () => void
  onDelete: () => void
  onAddAfter: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onImagesAdd?: (files: FileList) => void
  projectSettings?: ProjectSettings
}

export default function SlideContentEditor({
  slide,
  slideIndex,
  totalSlides,
  imageUrls,
  onTextChange,
  onCoverSubtitleChange,
  onImageSelect,
  onDuplicate,
  onDelete,
  onAddAfter,
  onMoveUp,
  onMoveDown,
  onImagesAdd,
  projectSettings,
}: SlideContentEditorProps) {
  const addImagesInputRef = useRef<HTMLInputElement>(null)
  const selectedImage = slide.imageIndex ?? 0
  const canAddImages = !!onImagesAdd && imageUrls.length < MAX_IMAGES
  const settings = resolveProjectSettings(projectSettings)
  const maxChars = settings.maxCharsPerSlide
  const isCover = slide.isCover
  const textStyle = resolveTextStyle(slide.textStyle)
  const currentFontFamily = getFontFamily(textStyle.fontFamily)

  return (
    <div className="space-y-4">
      {isCover ? (
        <>
          <div className="space-y-2">
            <label htmlFor="cover-title-edit" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Story Title
            </label>
            <input
              id="cover-title-edit"
              type="text"
              value={slide.text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Enter story title..."
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100
                focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all hover:border-slate-600"
              style={{ fontFamily: currentFontFamily }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="cover-subtitle-edit" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Subtitle / Author
            </label>
            <textarea
              id="cover-subtitle-edit"
              value={slide.coverSubtitle ?? ''}
              onChange={(e) => onCoverSubtitleChange?.(e.target.value)}
              placeholder="Enter subtitle or author name..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 resize-y leading-relaxed
                focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all hover:border-slate-600"
              style={{ minHeight: '80px', fontFamily: currentFontFamily }}
            />
            <p className="text-xs text-slate-500">Leave empty to show only the title on the cover slide.</p>
          </div>
        </>
      ) : (
      <div className="space-y-2">
        <label htmlFor="slide-text-edit" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Slide Text
        </label>
        <textarea
          id="slide-text-edit"
          value={slide.text}
          onChange={(e) => onTextChange(clampTextToMaxChars(e.target.value, maxChars))}
          rows={4}
          placeholder="Enter slide text…"
          className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 resize-none leading-relaxed
            focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all hover:border-slate-600"
          style={{ minHeight: '120px', fontFamily: currentFontFamily }}
        />
        <p className="text-xs text-slate-500">
          {slide.text.length} / {maxChars} characters
        </p>
      </div>
      )}

      {/* Background Image Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Background Image</label>
          {canAddImages && (
            <>
              <input
                ref={addImagesInputRef}
                id={`add-slide-images-${slideIndex}`}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files
                  if (files?.length) onImagesAdd!(files)
                  e.target.value = ''
                }}
              />
              <label
                htmlFor={`add-slide-images-${slideIndex}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium transition-colors"
              >
                + Add image
              </label>
            </>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {imageUrls.map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onImageSelect(index)}
              aria-label={`Image ${index + 1}`}
              aria-pressed={selectedImage === index}
              className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all group
                ${selectedImage === index ? 'border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20' : 'border-slate-700 hover:border-slate-600 hover:shadow-md'}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
              <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/80 px-1.5 py-0.5 rounded">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Slide Controls */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Slide Actions</p>
        <div className="grid grid-cols-3 gap-2">
          <button 
            type="button" 
            onClick={onMoveUp} 
            disabled={slideIndex === 0} 
            className="editor-chip w-full justify-center py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all" 
            title="Move slide up"
          >
            ↑ Up
          </button>
          <button 
            type="button" 
            onClick={onMoveDown} 
            disabled={slideIndex >= totalSlides - 1} 
            className="editor-chip w-full justify-center py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all" 
            title="Move slide down"
          >
            ↓ Down
          </button>
          <button 
            type="button" 
            onClick={onDuplicate} 
            className="editor-chip w-full justify-center py-2 hover:bg-slate-700 transition-all" 
            title="Duplicate slide"
          >
            ⧉ Copy
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button" 
            onClick={onAddAfter} 
            className="editor-chip w-full justify-center py-2 bg-cyan-700/20 border-cyan-600/30 text-cyan-400 hover:bg-cyan-700/30 transition-all" 
            title="Add slide after"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={totalSlides <= 1}
            className="editor-chip w-full justify-center py-2 text-red-400 border-red-600/30 bg-red-700/20 hover:bg-red-700/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Delete slide"
          >
            ✕ Delete
          </button>
        </div>
      </div>
    </div>
  )
}
