'use client'

import React, { useRef, useState, useEffect, useLayoutEffect, memo } from 'react'
import { Slide, ProjectSettings } from '@/types'
import { resolveProjectSettings } from '@/lib/projectSettings'
import { getTextLengthStatus } from '@/lib/slideValidation'
import { countChars } from '@/lib/storyParser'
import { prepareExportSlideElement, DEFAULT_SLIDE_OPTIONS } from '@/lib/slideExport'
import { resolveTextStyle } from '@/lib/slideTextStyle'

interface SlidePreviewProps {
  slide: Slide
  imageUrl: string
  slideDimensions?: { width: number; height: number }
  showNumber?: boolean
  showCharCount?: boolean
  projectSettings?: ProjectSettings
  /** 'width' = scale to container width (sidebar). 'contain' = fit inside box (fullscreen). */
  scaleMode?: 'width' | 'contain'
  className?: string
}

function SlidePreview({
  slide,
  imageUrl,
  slideDimensions = { width: 1080, height: 1920 },
  showNumber = true,
  showCharCount = true,
  projectSettings,
  scaleMode = 'width',
  className = '',
}: SlidePreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(scaleMode === 'contain' ? 0.3 : 280 / 1080)
  const [isLoading, setIsLoading] = useState(true)
  const [renderError, setRenderError] = useState<string>('')

  const settings = resolveProjectSettings(projectSettings)

  const textStyle = resolveTextStyle(slide.textStyle)
  const maxChars = settings.maxCharsPerSlide
  const charCount = countChars(slide.text)
  const textStatus = getTextLengthStatus(slide.text, maxChars)

  const exportWidth = slideDimensions.width || DEFAULT_SLIDE_OPTIONS.width
  const exportHeight = slideDimensions.height || DEFAULT_SLIDE_OPTIONS.height

  const styleKey = JSON.stringify({
    text: slide.text,
    coverSubtitle: slide.coverSubtitle,
    isCover: slide.isCover,
    textStyle,
    backgroundFilter: slide.backgroundFilter,
    imageIndex: slide.imageIndex,
    maxChars: settings.maxCharsPerSlide,
    watermarkEnabled: settings.watermarkEnabled,
    watermarkText: settings.watermarkText,
    watermarkPosition: settings.watermarkPosition,
  })

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateScale = () => {
      const { clientWidth, clientHeight } = viewport
      if (clientWidth <= 0) return

      if (scaleMode === 'contain') {
        const h = clientHeight > 0 ? clientHeight : clientWidth * (exportHeight / exportWidth)
        setScale(Math.min(clientWidth / exportWidth, h / exportHeight))
      } else {
        setScale(clientWidth / exportWidth)
      }
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [exportWidth, exportHeight, scaleMode])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let cancelled = false
    setIsLoading(true)
    setRenderError('')

    ;(async () => {
      try {
        if (!imageUrl) {
          throw new Error('Missing slide background image')
        }

        const el = await prepareExportSlideElement(
          slide,
          imageUrl,
          { width: exportWidth, height: exportHeight },
          settings
        )
        if (cancelled) {
          el.remove()
          return
        }
        mount.replaceChildren(el)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Preview render failed'
        console.error('Preview render failed:', err)
        if (!cancelled) {
          setRenderError(msg)
          mount.replaceChildren(
            (() => {
              const fallback = document.createElement('div')
              fallback.style.cssText = [
                'position:absolute',
                'inset:0',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'background:rgba(15,23,42,0.85)',
                'color:rgba(226,232,240,0.95)',
                'font-size:12px',
                'padding:12px',
                'text-align:center',
                'line-height:1.3',
              ].join(';')
              fallback.textContent = `Preview unavailable\n${msg}`
              return fallback
            })()
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slide, imageUrl, exportWidth, exportHeight, styleKey, settings])


  const scaledWidth = exportWidth * scale
  const scaledHeight = exportHeight * scale
  const isContain = scaleMode === 'contain'

  return (
    <div
      ref={viewportRef}
      className={`relative overflow-hidden bg-slate-900 ${
        isContain
          ? 'w-full h-full flex items-center justify-center'
          : 'rounded-xl border border-slate-700 mx-auto w-full'
      } ${className}`}
      style={isContain ? undefined : { height: scaledHeight }}
      id={`slide-${slide.id}`}
      aria-label={`Slide preview ${slide.id}`}
    >
      <div
        className={isContain ? 'relative' : 'relative mx-auto'}
        style={{
          width: scaledWidth,
          height: scaledHeight,
          flexShrink: 0,
        }}
      >
        <div
          ref={mountRef}
          className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}
          style={{
            width: exportWidth,
            height: exportHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <span className="text-xs text-slate-500">Loading preview…</span>
        </div>
      )}

      {!isLoading && renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 px-3">
          <div className="text-center">
            <div className="text-xs font-semibold text-red-200">Preview unavailable</div>
            <div className="text-[10px] text-slate-300 mt-1 whitespace-pre-line">{renderError}</div>
          </div>
        </div>
      )}


      <div className="absolute top-3 left-3 right-3 z-30 flex items-start justify-between gap-2 pointer-events-none">
        {showCharCount && !slide.isCover && slide.text.trim() ? (
          <span
            className={`font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
              isContain ? 'text-xs' : 'text-[9px]'
            } ${
              textStatus === 'over'
                ? 'bg-red-950/85 text-red-200 border-red-800/60'
                : textStatus === 'warn'
                  ? 'bg-amber-950/85 text-amber-200 border-amber-800/60'
                  : 'bg-black/60 text-slate-200 border-white/10'
            }`}
          >
            {charCount}/{maxChars} chars
          </span>
        ) : (
          <span />
        )}
        {showNumber && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-semibold bg-black/50 text-slate-200 px-2.5 py-1 rounded-full border border-white/10">
              {slide.isCover ? 'Cover' : `#${slide.id}`}
            </span>
            {!slide.isCover && textStatus !== 'ok' && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  textStatus === 'over'
                    ? 'bg-red-950/80 text-red-300 border-red-800/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                }`}
              >
                {textStatus === 'over' ? 'Too long' : 'Almost full'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(SlidePreview)
