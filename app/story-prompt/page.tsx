'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FONT_OPTIONS, getFontFamily } from '@/lib/fonts'
import { drawRunningTextFrame } from '@/lib/storyRunningTextRender'
import { exportRunningTextToMp4, getSpeedPxPerSec } from '@/lib/storyRunningTextExport'

const COLOR_PRESETS = [
  { value: '#ffffff', label: 'Putih', border: 'border-slate-300' },
  { value: '#000000', label: 'Hitam', border: 'border-slate-800' },
  { value: '#facc15', label: 'Kuning', border: 'border-yellow-500' },
  { value: '#ef4444', label: 'Merah', border: 'border-red-500' },
  { value: '#3b82f6', label: 'Biru', border: 'border-blue-500' },
  { value: '#22c55e', label: 'Hijau', border: 'border-green-500' },
]

const SPEED_OPTIONS = [
  { value: 'very-slow', label: 'Sangat Lambat' },
  { value: 'slow', label: 'Lambat' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Cepat' },
  { value: 'very-fast', label: 'Sangat Cepat' },
]

export default function StoryPromptPage() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [text, setText] = useState<string>('')
  const [fontFamily, setFontFamily] = useState<string>('poppins')
  const [speed, setSpeed] = useState<string>('normal')
  const [textColor, setTextColor] = useState<string>('#ffffff')
  const [textZoom, setTextZoom] = useState<number>(18)
  const [highlightType, setHighlightType] = useState<'none' | 'rounded' | 'solid'>('solid')
  const [highlightColor, setHighlightColor] = useState<string>('#facc15')
  const [videoResolution, setVideoResolution] = useState<'480p' | '720p'>('720p')

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportProgress, setExportProgress] = useState<{ percent: number; label: string } | null>(null)
  const [exportError, setExportError] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  // Refs for 60fps canvas animation loop to bypass React re-render lags while typing
  const textRef = useRef(text)
  const fontFamilyRef = useRef(fontFamily)
  const fontSizeRef = useRef(textZoom)
  const textColorRef = useRef(textColor)
  const highlightTypeRef = useRef(highlightType)
  const highlightColorRef = useRef(highlightColor)
  const isPlayingRef = useRef(isPlaying)
  const scrollOffsetRef = useRef(0)
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const speedRef = useRef(speed)
  const totalHeightRef = useRef<number>(1000)

  // Sync state values with refs for high-performance rendering loop
  useEffect(() => { textRef.current = text }, [text])
  useEffect(() => { fontFamilyRef.current = fontFamily }, [fontFamily])
  useEffect(() => { fontSizeRef.current = textZoom }, [textZoom])
  useEffect(() => { textColorRef.current = textColor }, [textColor])
  useEffect(() => { highlightTypeRef.current = highlightType }, [highlightType])
  useEffect(() => { highlightColorRef.current = highlightColor }, [highlightColor])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { speedRef.current = speed }, [speed])

  // Process and cache background image
  useEffect(() => {
    if (!backgroundImage) {
      bgImageRef.current = null
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      bgImageRef.current = img
    }
    img.src = backgroundImage
  }, [backgroundImage])

  // Canvas animation & rendering loop
  useEffect(() => {
    let lastTime = performance.now()

    const renderLoop = (time: number) => {
      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(renderLoop)
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(renderLoop)
        return
      }

      // Compute delta time
      const dt = (time - lastTime) / 1000
      lastTime = time

      // Scroll physics
      if (isPlayingRef.current) {
        const speedPx = getSpeedPxPerSec(speedRef.current, canvas.width)
        scrollOffsetRef.current += speedPx * dt
      }

      const renderSettings = {
        fontFamily: fontFamilyRef.current,
        fontSize: fontSizeRef.current,
        textColor: textColorRef.current,
        highlightType: highlightTypeRef.current,
        highlightColor: highlightColorRef.current,
        lineHeight: 1.2,
      }

      const totalHeight = drawRunningTextFrame(
        ctx,
        canvas.width,
        canvas.height,
        textRef.current || 'PREVIEW RUNNING TEXT AKAN MUNCUL SETELAH VIDEO DIGENERATE.',
        bgImageRef.current,
        renderSettings,
        scrollOffsetRef.current
      )
      totalHeightRef.current = totalHeight

      // Loop back to start if scrolled fully off the top
      const scrollLimit = canvas.height + totalHeight
      if (scrollOffsetRef.current > scrollLimit) {
        scrollOffsetRef.current = 0
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleClearBackground = () => {
    setBackgroundImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerateVideo = async () => {
    const textToExport = text.trim()
    if (!textToExport) return

    setIsExporting(true)
    setExportError('')
    setExportProgress({ percent: 5, label: 'Mempersiapkan render video…' })

    try {
      const blob = await exportRunningTextToMp4(
        textToExport,
        backgroundImage,
        {
          fontFamily,
          fontSize: textZoom,
          textColor,
          highlightType,
          highlightColor,
          speed,
          resolution: videoResolution,
        },
        (progressMessage) => {
          const match = progressMessage.match(/(\d+)%/)
          setExportProgress({
            percent: match ? Math.min(98, parseInt(match[1])) : 50,
            label: progressMessage,
          })
        }
      )

      const fileName = `running-text-${Date.now()}.mp4`
      const { downloadBlob } = await import('@/lib/slideExport')
      await downloadBlob(blob, fileName)
      setExportProgress({ percent: 100, label: 'Download video berhasil!' })
      setTimeout(() => setExportProgress(null), 3000)
    } catch (e) {
      console.error(e)
      setExportError(e instanceof Error ? e.message : 'Gagal mengekspor video')
      setExportProgress(null)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Force load font for Canvas */}
      <div className="sr-only" style={{ fontFamily: getFontFamily(fontFamily) }}>
        Force Load Font
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700/60 shadow transition-colors"
            title="Kembali ke Dashboard"
          >
            <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-white tracking-tight leading-none">
              Video Running Text
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1.5 uppercase tracking-wider">
              Rebuild: Perbaikan bug tombol generate dan resolusi video.
            </p>
          </div>
        </div>

        {/* Export Progress & Error Alert */}
        {exportProgress && (
          <div className="panel p-5 space-y-2.5 animate-pulse">
            <div className="flex justify-between text-sm font-semibold text-slate-350">
              <span>{exportProgress.label}</span>
              <span>{exportProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {exportError && (
          <div className="error-banner">
            <span aria-hidden="true" className="font-bold">⚠</span>
            <div>
              <p className="font-semibold">Proses Ekspor Gagal</p>
              <p className="mt-0.5 opacity-90">{exportError}</p>
            </div>
          </div>
        )}

        {/* 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Column 1: Background & Naskah */}
          <div className="space-y-6">
            {/* Background Card */}
            <div className="panel p-6">
              <span className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3.5">
                Background
              </span>

              {backgroundImage ? (
                <div className="relative rounded-2xl overflow-hidden group aspect-[16/9] border border-slate-800">
                  <img
                    src={backgroundImage}
                    alt="Background Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm"
                    >
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={handleClearBackground}
                      className="bg-red-700 hover:bg-red-650 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/20 transition-all rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer bg-slate-900/30 text-center"
                >
                  <svg className="w-8 h-8 text-slate-500 mb-2.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-400">Pilih Gambar Latar (Opsional)</span>
                </div>
              )}
            </div>

            {/* Naskah Novel Card */}
            <div className="panel p-6">
              <span className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3">
                Naskah Novel
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tempel naskah novel di sini..."
                className="w-full h-80 p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-none text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Column 2: Customization Controls */}
          <div className="panel p-6 space-y-6">

            {/* Jenis Font */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                Jenis Font
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all font-semibold text-sm appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 14px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.id} value={font.id} className="bg-slate-900 text-slate-200">
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Kecepatan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                Kecepatan
              </label>
              <select
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all font-semibold text-sm appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 14px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
              >
                {SPEED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Warna Teks */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                Warna Teks
              </label>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setTextColor(color.value)}
                    className={`w-9 h-9 rounded-full border border-slate-800 relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {textColor === color.value && (
                      <span className={`w-2.5 h-2.5 rounded-full ${color.value === '#ffffff' ? 'bg-black' : 'bg-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Teks */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                <span>Zoom Teks</span>
                <span className="text-cyan-400 font-bold">{textZoom}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="48"
                value={textZoom}
                onChange={(e) => setTextZoom(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
              />
            </div>

            {/* Highlight Teks */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                Highlight Teks
              </label>
              <div className="flex rounded-xl bg-slate-950/60 p-1 border border-slate-800">
                {(['none', 'rounded', 'solid'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHighlightType(type)}
                    className={`flex-1 py-2 text-center text-[10px] font-bold rounded-lg transition-all ${highlightType === type
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {type === 'none' ? 'TANPA' : type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Warna Highlight */}
            {highlightType !== 'none' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                  Warna Highlight
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setHighlightColor(color.value)}
                      className={`w-9 h-9 rounded-full border border-slate-800 relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      {highlightColor === color.value && (
                        <span className={`w-2.5 h-2.5 rounded-full ${color.value === '#ffffff' ? 'bg-black' : 'bg-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resolusi Video */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                Resolusi Video
              </label>
              <div className="flex rounded-xl bg-slate-950/60 p-1 border border-slate-800">
                {(['480p', '720p'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setVideoResolution(res)}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${videoResolution === res
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Video Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isExporting || !text.trim()}
                className="w-full min-h-[50px] bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                <span>{isExporting ? 'GENERATING...' : 'GENERATE VIDEO'}</span>
              </button>
            </div>

          </div>

          {/* Column 3: Interactive Video Preview */}
          <div className="flex flex-col items-center">
            {/* Phone Shell */}
            <div className="w-[310px] aspect-[9/16] bg-black rounded-[46px] border-[10px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 pb-6">

              {/* Inner screen content */}
              <div className="absolute inset-0 z-0">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={640}
                  className="w-full h-full block"
                />
              </div>

              {/* Pause/Play Preview overlay controls */}
              <div className="z-10 w-full flex flex-col items-center mt-auto gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-slate-900/85 hover:bg-slate-800/85 text-white text-[10px] tracking-wider font-extrabold uppercase py-2.5 px-6 rounded-full shadow-md backdrop-blur-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      <span>Pause Preview</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Play Preview</span>
                    </>
                  )}
                </button>

                {/* Resolution Indicator Badge */}
                <span className="bg-slate-900/60 text-[9px] tracking-widest text-slate-300 font-black uppercase py-1 px-3 rounded-full backdrop-blur-sm select-none border border-slate-800/30">
                  {videoResolution.toUpperCase()} • CENTER VERTICAL
                </span>
              </div>

            </div>

            {/* Bottom Caption */}
            <span className="text-center text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-4">
              Preview 9:16 Vertikal
            </span>
          </div>

        </div>

      </div>
    </div>
  )
}
