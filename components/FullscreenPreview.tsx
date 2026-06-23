'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Slide, ProjectSettings } from '@/types'
import SlidePreview from './SlidePreview'

interface FullscreenPreviewProps {
  slide: Slide
  imageUrl: string
  projectSettings?: ProjectSettings
  slideIndex: number
  totalSlides: number
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  uniformFontSize?: number
}

export default function FullscreenPreview({
  slide,
  imageUrl,
  projectSettings,
  slideIndex,
  totalSlides,
  onClose,
  onPrevious,
  onNext,
  uniformFontSize,
}: FullscreenPreviewProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrevious?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onPrevious, onNext])

  const content = (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen slide preview"
    >
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-800 shrink-0 bg-slate-950/90">
        <p className="text-sm text-slate-300">
          Export preview · slide{' '}
          <span className="text-cyan-400">{slideIndex + 1}</span> / {totalSlides}
          <span className="text-slate-500 ml-2 hidden sm:inline">(1080×1920 · matches PNG export)</span>
        </p>
        <div className="flex items-center gap-2">
          {onPrevious && (
            <button type="button" onClick={onPrevious} className="btn-secondary text-sm min-h-[40px]">
              ← Prev
            </button>
          )}
          {onNext && (
            <button type="button" onClick={onNext} className="btn-secondary text-sm min-h-[40px]">
              Next →
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-primary text-sm min-h-[40px]">
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-3 sm:p-6 flex items-center justify-center">
        <div className="h-full w-full max-w-[min(100%,calc((100vh-8rem)*9/16))] aspect-[9/16] rounded-lg overflow-hidden shadow-2xl ring-1 ring-slate-800">
          <SlidePreview
            slide={slide}
            imageUrl={imageUrl}
            projectSettings={projectSettings}
            showNumber={false}
            showCharCount={false}
            scaleMode="contain"
            className="rounded-lg"
            uniformFontSize={uniformFontSize}
          />
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 pb-3 shrink-0">
        Esc to close · arrow keys to navigate
      </p>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
