'use client'

import React from 'react'
import { MaxCharsPerSlide } from '@/types'
import { MAX_CHARS_PER_SLIDE_OPTIONS } from '@/lib/projectSettings'

interface CharsPerSlidePickerProps {
  value: MaxCharsPerSlide
  slideCount: number
  onChange: (maxChars: MaxCharsPerSlide) => void
  compact?: boolean
  hideLegend?: boolean
  inline?: boolean
}

export default function CharsPerSlidePicker({
  value,
  slideCount,
  onChange,
  compact = false,
  hideLegend = false,
  inline = false,
}: CharsPerSlidePickerProps) {
  const buttons = (
    <div
      className={`grid gap-1 ${
        inline ? 'grid-cols-6' : compact ? 'grid-cols-3 gap-1.5' : 'grid-cols-3 sm:grid-cols-6 gap-2'
      }`}
    >
      {MAX_CHARS_PER_SLIDE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`font-semibold border transition-colors
            ${inline ? 'h-7 rounded text-[10px]' : compact ? 'min-h-[34px] rounded-md text-xs' : 'min-h-[40px] rounded-xl text-sm'}
            ${value === option
              ? 'bg-cyan-600 border-cyan-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
            }`}
        >
          {option}
        </button>
      ))}
    </div>
  )

  if (inline) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide shrink-0 w-14">Max</span>
        <div className="flex-1 min-w-0">{buttons}</div>
        {slideCount > 0 && (
          <span className="text-[10px] text-slate-500 shrink-0">~{slideCount} slides</span>
        )}
      </div>
    )
  }

  const content = (
    <>
      {!hideLegend && (
        <legend className={`label mb-0 ${compact ? 'text-xs' : ''}`}>Chars per slide</legend>
      )}
      {!compact && (
        <p className="text-xs text-slate-500 leading-relaxed">
          Each slide fills up to this character limit. Higher = fewer slides; lower = more slides.
        </p>
      )}
      {buttons}
      {slideCount > 0 && !compact && (
        <p className="text-sm text-slate-400">
          ~{slideCount} slide{slideCount !== 1 ? 's' : ''} · max {value} characters each
        </p>
      )}
    </>
  )

  const className = `min-w-0 ${compact ? 'space-y-1.5' : 'space-y-3'}`

  if (hideLegend) {
    return <div className={className}>{content}</div>
  }

  return <fieldset className={className}>{content}</fieldset>
}
