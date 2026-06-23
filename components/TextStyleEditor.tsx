'use client'

import React, { useState, useCallback } from 'react'
import { TextStyle, MaxCharsPerSlide } from '@/types'
import { FONT_OPTIONS } from '@/lib/fonts'
import { DEFAULT_TEXT_STYLE, TEXT_COLOR_PRESETS, BOX_COLOR_PRESETS } from '@/lib/slideTextStyle'
import { STYLE_TEMPLATES } from '@/lib/styleTemplates'
import CharsPerSlidePicker from './CharsPerSlidePicker'

interface TextStyleEditorProps {
  textStyle: TextStyle
  onStyleChange: (style: TextStyle) => void
  onApplyToAll?: () => void
  totalSlides?: number
  maxCharsPerSlide?: MaxCharsPerSlide
  onMaxCharsPerSlideChange?: (maxChars: MaxCharsPerSlide) => void
  isOpen?: boolean
  onToggle?: () => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 items-start min-w-0">
      <span className="text-[10px] font-medium text-slate-500 uppercase leading-tight">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Seg({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-7 min-w-[1.75rem] px-1.5 rounded text-[11px] font-medium transition-colors
        ${active ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
    >
      {children}
    </button>
  )
}

export default function TextStyleEditor({
  textStyle,
  onStyleChange,
  onApplyToAll,
  totalSlides = 1,
  maxCharsPerSlide,
  onMaxCharsPerSlideChange,
  isOpen = true,
  onToggle,
}: TextStyleEditorProps) {
  const [appliedFeedback, setAppliedFeedback] = useState(false)

  // Debounce style changes to prevent excessive re-renders
  const handleChange = useCallback((updates: Partial<TextStyle>) => {
    onStyleChange({ ...textStyle, ...updates })
  }, [textStyle, onStyleChange])

  const handleApplyToAllClick = () => {
    onApplyToAll?.()
    setAppliedFeedback(true)
    window.setTimeout(() => setAppliedFeedback(false), 2000)
  }

  const handleResetClick = () => {
    onStyleChange({ ...DEFAULT_TEXT_STYLE })
  }

  if (!isOpen) {
    return (
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Text style</h3>
        {onToggle && (
          <button type="button" onClick={onToggle} className="text-xs text-cyan-400 hover:text-cyan-300">
            Show
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">Text style</h3>
        <div className="flex items-center gap-1.5">
          {onApplyToAll && totalSlides > 1 && (
            <button
              type="button"
              onClick={handleApplyToAllClick}
              className="h-7 px-2 rounded text-[10px] font-medium bg-cyan-600 text-white hover:bg-cyan-500"
              title={`Apply to all ${totalSlides} slides`}
            >
              {appliedFeedback ? '✓' : `All (${totalSlides})`}
            </button>
          )}
          <button
            type="button"
            onClick={handleResetClick}
            className="h-7 px-2 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
          >
            Reset
          </button>
          {onToggle && (
            <button type="button" onClick={onToggle} className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-300">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wide">Presets</p>
        <div className="flex flex-wrap gap-1">
          {STYLE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onStyleChange({ ...t.style })}
              title={t.description}
              className="h-7 px-2 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <Row label="Font">
        <div className="flex gap-1.5 min-w-0">
          <select
            value={textStyle.fontFamily ?? DEFAULT_TEXT_STYLE.fontFamily}
            onChange={(e) => handleChange({ fontFamily: e.target.value as TextStyle['fontFamily'] })}
            className="flex-1 min-w-0 h-7 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-200"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <div className="flex gap-0.5 shrink-0">
            {[400, 700, 900].map((w) => (
              <Seg
                key={w}
                active={textStyle.fontWeight === w}
                onClick={() => handleChange({ fontWeight: w })}
                title={w === 400 ? 'Normal' : w === 700 ? 'Bold' : 'Heavy'}
              >
                {w === 400 ? 'N' : w === 700 ? 'B' : 'H'}
              </Seg>
            ))}
          </div>
        </div>
      </Row>

      <Row label="Size">
        <div className="flex flex-wrap gap-0.5">
          {[24, 32, 48, 64, 96].map((s) => (
            <Seg key={s} active={textStyle.fontSize === s} onClick={() => handleChange({ fontSize: s })}>
              {s}
            </Seg>
          ))}
        </div>
      </Row>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Positioning</p>
        <div className="pl-[3.75rem] space-y-2">
          <div className="flex gap-0.5">
            {(['left', 'center', 'right'] as const).map((a) => (
              <Seg
                key={a}
                active={textStyle.textAlign === a}
                onClick={() => handleChange({ textAlign: a })}
                title={a}
              >
                {a === 'left' ? '◧' : a === 'center' ? '▣' : '◨'}
              </Seg>
            ))}
          </div>
          <div className="flex gap-0.5">
            {(['top', 'middle', 'bottom'] as const).map((p) => (
              <Seg
                key={p}
                active={textStyle.verticalPosition === p}
                onClick={() => handleChange({ verticalPosition: p })}
                title={p}
              >
                {p === 'top' ? '↑' : p === 'middle' ? '—' : '↓'}
              </Seg>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={textStyle.textShadow}
              onChange={(e) => handleChange({ textShadow: e.target.checked })}
              className="w-3 h-3 accent-cyan-500"
            />
            Text Shadow
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={textStyle.autoFitText ?? DEFAULT_TEXT_STYLE.autoFitText}
              onChange={(e) => handleChange({ autoFitText: e.target.checked })}
              className="w-3 h-3 accent-cyan-500"
            />
            Auto-fit text
          </label>
        </div>
      </div>

      <Row label="Color">
        <div className="flex items-center gap-1 flex-wrap">
          {TEXT_COLOR_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.label}
              onClick={() => handleChange({ color: p.value })}
              className={`w-5 h-5 rounded border shrink-0
                ${textStyle.color?.toLowerCase() === p.value.toLowerCase()
                  ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                  : 'border-slate-600'
                }`}
              style={{ backgroundColor: p.value }}
            />
          ))}
          <input
            type="color"
            value={textStyle.color}
            onChange={(e) => handleChange({ color: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
            aria-label="Custom color"
          />
        </div>
      </Row>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Spacing</p>
        <div className="grid grid-cols-2 gap-2 pl-[3.75rem]">
          <div>
            <p className="text-[9px] text-slate-500 mb-1">Line Height</p>
            <div className="flex flex-wrap gap-0.5">
              {[1, 1.2, 1.5, 1.8, 2.0, 2.5].map((v) => (
                <Seg key={v} active={textStyle.lineHeight === v} onClick={() => handleChange({ lineHeight: v })}>
                  {v}
                </Seg>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 mb-1">Letter Space</p>
            <div className="flex flex-wrap gap-0.5">
              {[-2, -1, 0, 2, 4, 8].map((v) => (
                <Seg key={v} active={textStyle.letterSpacing === v} onClick={() => handleChange({ letterSpacing: v })}>
                  {v}
                </Seg>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Effects</p>
        <div className="pl-[3.75rem] space-y-2">
          <Row label="Background">
            <select
              value={textStyle.boxOpacity ?? 0.65}
              onChange={(e) => handleChange({ boxOpacity: parseFloat(e.target.value) })}
              className="w-full h-7 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-200"
            >
              <option value={0}>None</option>
              <option value={0.2}>20%</option>
              <option value={0.4}>40%</option>
              <option value={0.65}>65%</option>
              <option value={0.8}>80%</option>
              <option value={0.95}>95%</option>
            </select>
          </Row>

          <Row label="Background Color">
            <div className="flex items-center gap-1 flex-wrap">
              {BOX_COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => handleChange({ boxColor: p.value })}
                  className={`w-5 h-5 rounded border shrink-0
                    ${(textStyle.boxColor?.toLowerCase() === p.value.toLowerCase() || 
                      (!textStyle.boxColor && p.value === '#000000'))
                      ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                      : 'border-slate-600'
                    }`}
                  style={{ backgroundColor: p.value === 'transparent' ? 'repeating-linear-gradient(45deg, #333 0, #333 10px, #444 10px, #444 20px)' : p.value }}
                />
              ))}
              <input
                type="color"
                value={textStyle.boxColor || '#000000'}
                onChange={(e) => handleChange({ boxColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                aria-label="Custom box color"
              />
            </div>
          </Row>
        </div>
      </div>

      {onMaxCharsPerSlideChange && maxCharsPerSlide !== undefined && (
        <div className="pt-1">
          <CharsPerSlidePicker
            value={maxCharsPerSlide}
            slideCount={totalSlides}
            onChange={onMaxCharsPerSlideChange}
            inline
          />
        </div>
      )}
    </div>
  )
}
