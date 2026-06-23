'use client'

import React, { useMemo, useState } from 'react'
import { Slide, ProjectSettings } from '@/types'
import { downloadBlob, formatFileSize } from '@/lib/slideExport'
import { preloadImageDataUrls } from '@/lib/imageUtils'
import { resolveProjectSettings } from '@/lib/projectSettings'
import { exportSlidesToSlideMp4 } from '@/lib/slideVideoExport'
import ExportProgress from './ExportProgress'

interface SlideshowExportPanelProps {
  slides: Slide[]
  imageUrls: string[]
  projectSettings?: ProjectSettings
  onSettingsChange?: (settings: ProjectSettings) => void
}

export default function SlideshowExportPanel({
  slides,
  imageUrls,
  projectSettings,
  onSettingsChange,
}: SlideshowExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null)
  const [exportStatus, setExportStatus] = useState('')
  const [exportError, setExportError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedSettings, setEditedSettings] = useState<ProjectSettings | null>(null)

  const settings = resolveProjectSettings(projectSettings)
  const currentSettings = editedSettings || settings
  const secondsPerSlide = currentSettings.secondsPerSlide
  const estimatedDurationSec = useMemo(
    () => slides.length * secondsPerSlide,
    [slides.length, secondsPerSlide]
  )

  const handleSettingChange = (key: keyof ProjectSettings, value: any) => {
    const newSettings = { ...currentSettings, [key]: value }
    setEditedSettings(newSettings)
  }

  const handleSaveSettings = () => {
    if (editedSettings && onSettingsChange) {
      onSettingsChange(editedSettings)
    }
    setIsEditing(false)
    setEditedSettings(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedSettings(null)
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportError('')
    setExportStatus('')
    setProgress({ percent: 5, label: 'Preparing images…' })

    try {
      const imageDataUrls = await preloadImageDataUrls(imageUrls)
      let lastSlide = 0

      const blob = await exportSlidesToSlideMp4(
        slides,
        imageDataUrls,
        settings,
        (message) => {
          const match = message.match(/slide (\d+) of (\d+)/i)
          if (match) {
            lastSlide = Number(match[1])
            const total = Number(match[2])
            setProgress({
              percent: Math.round((lastSlide / total) * 90),
              label: message,
            })
          } else {
            setProgress({ percent: 95, label: message })
          }
        }
      )

      const fileName = `slideshow-${Date.now()}.mp4`
      await downloadBlob(blob, fileName)
      setProgress({ percent: 100, label: 'Download complete' })
      setExportStatus(`Slideshow MP4 downloaded (${fileName})`)
    } catch (error) {
      console.error(error)
      setExportError(error instanceof Error ? error.message : 'Export failed')
      setProgress(null)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className="panel panel-section space-y-5" aria-labelledby="slideshow-export-heading">
      <div>
        <h3 id="slideshow-export-heading" className="section-title">
          Export Slideshow MP4
        </h3>
        <p className="section-desc mt-1">
          Setiap slide tampil berurutan seperti story IG/TikTok. Teks panjang otomatis scroll di dalam slide.
        </p>
      </div>

      {!isEditing ? (
        <>
          <ul className="text-sm text-slate-400 space-y-1.5 grid sm:grid-cols-2 gap-x-6">
            <li>
              <span className="text-slate-500">Slides:</span> {slides.length}
            </li>
            <li>
              <span className="text-slate-500">Durasi/slide:</span> {secondsPerSlide}s
            </li>
            <li>
              <span className="text-slate-500">Est. durasi:</span> ~{estimatedDurationSec}s
            </li>
            <li>
              <span className="text-slate-500">Est. size:</span> ~{formatFileSize(estimatedDurationSec * 400000)}
            </li>
          </ul>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ⚙ Edit settings
          </button>
        </>
      ) : (
        <div className="space-y-4 rounded-lg border border-slate-700/50 p-4 bg-slate-900/50">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Durasi per slide (detik)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={currentSettings.secondsPerSlide}
              onChange={(e) => handleSettingChange('secondsPerSlide', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>1s</span>
              <span className="text-cyan-400 font-medium">{currentSettings.secondsPerSlide}s</span>
              <span>10s</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentSettings.watermarkEnabled}
                onChange={(e) => handleSettingChange('watermarkEnabled', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-300">Enable watermark</span>
            </label>
            {currentSettings.watermarkEnabled && (
              <div className="space-y-2 ml-6">
                <div>
                  <label className="text-xs text-slate-400">Text</label>
                  <input
                    type="text"
                    value={currentSettings.watermarkText ?? ''}
                    onChange={(e) => handleSettingChange('watermarkText', e.target.value)}
                    placeholder="Your watermark text"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Position</label>
                  <select
                    value={currentSettings.watermarkPosition}
                    onChange={(e) => handleSettingChange('watermarkPosition', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="btn-primary flex-1"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isExporting && progress && <ExportProgress percent={progress.percent} label={progress.label} />}

      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting || slides.length === 0}
        className="btn-primary w-full min-h-[48px] text-base"
      >
        {isExporting ? 'Exporting slideshow…' : 'Download Slideshow MP4'}
      </button>

      {exportStatus && !isExporting && (
        <div className="success-banner" role="status">
          {exportStatus}
        </div>
      )}
      {exportError && (
        <div className="error-banner" role="alert">
          <div>
            <p className="font-medium">Export failed</p>
            <p className="mt-0.5">{exportError}</p>
          </div>
        </div>
      )}
    </section>
  )
}
