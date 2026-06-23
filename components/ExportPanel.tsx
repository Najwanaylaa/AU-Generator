'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Slide, ProjectSettings } from '@/types'
import {
  downloadImage,
  downloadBlob,
  pickExportDirectory,
  writePngsToFolder,
  FolderPickerCancelledError,
  canSavePngsToFolder,
  generateFileName,
  formatFileSize,
  prepareExportSlideElement,
  exportSlideToPng,
  slideToImage,
  defaultSlideFileName,
  DEFAULT_SLIDE_OPTIONS,
} from '@/lib/slideExport'

import { preloadImageDataUrls } from '@/lib/imageUtils'
import { resolveProjectSettings } from '@/lib/projectSettings'
import ExportProgress from './ExportProgress'

interface ExportPanelProps {
  slides: Slide[]
  imageUrls: string[]
  projectSettings?: ProjectSettings
  currentSlideIndex?: number
}

type ExportFormat = 'png'

interface ExportPanelExtraProps {
  /** Optional initial format selection for embedded editor pages */
  initialFormat?: ExportFormat
  /** Hide the top-level format selector when true */
  hideFormatSelector?: boolean
}

function defaultFolderName(): string {
  const d = new Date()
  const stamp = d.toISOString().slice(0, 10)
  return `story-slides-${stamp}`
}

export default function ExportPanel({
  slides,
  imageUrls,
  projectSettings,
  currentSlideIndex = 0,
  initialFormat,
  hideFormatSelector = false,
}: ExportPanelProps & ExportPanelExtraProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [exportError, setExportError] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    initialFormat ?? 'png'
  )
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null)
  const [folderName, setFolderName] = useState(defaultFolderName)
  const [fileNames, setFileNames] = useState<string[]>(() =>
    slides.map((_, i) => defaultSlideFileName(i))
  )

  const settings = resolveProjectSettings(projectSettings)
  const router = useRouter()

  useEffect(() => {
    setFileNames(slides.map((_, i) => defaultSlideFileName(i)))
  }, [slides.length])

  const reportProgress = (step: number, total: number, label: string) => {
    setProgress({
      percent: total > 0 ? (step / total) * 100 : 0,
      label,
    })
    setExportStatus(label)
  }

  const renderAllSlidePngs = async (
    imageDataUrls: string[],
    onStep: (step: number, total: number, label: string) => void
  ) => {
    const total = slides.length
    const images: Array<{ dataUrl: string; fileName: string }> = []

    const tempContainer = document.createElement('div')
    tempContainer.style.cssText =
      'position:fixed;left:0;top:0;width:1080px;height:1920px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden'
    document.body.appendChild(tempContainer)

    try {
      for (let i = 0; i < slides.length; i++) {
        onStep(i + 1, total, `Rendering slide ${i + 1} of ${slides.length}…`)

        const slide = slides[i]
        const imageDataUrl = imageDataUrls[slide.imageIndex || 0]

        const slideEl = await prepareExportSlideElement(
          slide,
          imageDataUrl,
          { width: DEFAULT_SLIDE_OPTIONS.width, height: DEFAULT_SLIDE_OPTIONS.height },
          settings
        )
        tempContainer.appendChild(slideEl)

        const dataUrl = await slideToImage(slideEl)
        images.push({
          dataUrl,
          fileName: fileNames[i] || defaultSlideFileName(i),
        })

        tempContainer.removeChild(slideEl)
      }
      return images
    } finally {
      document.body.removeChild(tempContainer)
    }
  }

  const handleExportPNG = async () => {
    setIsExporting(true)
    setExportError('')
    const totalSteps = slides.length + 3

    try {
      reportProgress(0, totalSteps, 'Choose destination folder…')
      const parentDirectory = await pickExportDirectory()

      reportProgress(1, totalSteps, 'Preparing images…')
      const imageDataUrls = await preloadImageDataUrls(imageUrls)

      const images = await renderAllSlidePngs(imageDataUrls, (step, _total, label) => {
        reportProgress(step + 1, totalSteps, label)
      })

      reportProgress(slides.length + 2, totalSteps, 'Saving to folder…')
      const savedFolder = await writePngsToFolder(
        parentDirectory,
        folderName,
        images,
        (current, total) => {
          reportProgress(
            slides.length + 2,
            totalSteps,
            `Saving file ${current} of ${total}…`
          )
        }
      )

      setProgress({ percent: 100, label: 'Done' })
      setExportStatus(
        `${images.length} PNGs saved to folder "${savedFolder}"`
      )
      setTimeout(() => {
        setExportStatus('')
        setProgress(null)
      }, 5000)
    } catch (error) {
      if (error instanceof FolderPickerCancelledError) {
        setExportStatus('')
        setProgress(null)
        return
      }
      console.error('Export error:', error)
      setExportError(error instanceof Error ? error.message : 'Export failed')
      setExportStatus('')
      setProgress(null)
    } finally {
      setIsExporting(false)
    }
  }


  const handleExportCurrentSlide = async () => {
    setIsExporting(true)
    setExportStatus('Exporting current slide…')
    setProgress({ percent: 50, label: 'Rendering slide…' })
    setExportError('')

    try {
      const slide = slides[currentSlideIndex]
      if (!slide) throw new Error('No slide selected')

      const imageDataUrls = await preloadImageDataUrls(imageUrls)
      const dataUrl = await exportSlideToPng(
        slide,
        imageDataUrls[slide.imageIndex || 0],
        settings
      )
      const name = fileNames[currentSlideIndex] || defaultSlideFileName(currentSlideIndex)
      await downloadImage(dataUrl, name.endsWith('.png') ? name : `${name}.png`)
      setProgress({ percent: 100, label: 'Download complete' })
      setExportStatus('Slide downloaded')
      setTimeout(() => {
        setExportStatus('')
        setProgress(null)
      }, 3000)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
      setExportStatus('')
      setProgress(null)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = () => {
    handleExportPNG()
  }

  const updateFileName = (index: number, value: string) => {
    setFileNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <section className="panel panel-section space-y-5" aria-labelledby="export-heading">
      <div>
        <h3 id="export-heading" className="section-title">Export</h3>
        <p className="section-desc mt-1">
          Save PNGs to a folder
        </p>
      </div>

      {selectedFormat === 'png' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div>
            <label htmlFor="export-folder-name" className="label">
              Folder name
            </label>
            <input
              id="export-folder-name"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={isExporting}
              className="input-field text-sm"
              placeholder="story-slides-2026-06-05"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {canSavePngsToFolder()
                ? 'On export, pick a folder on your computer. This subfolder is created automatically with all PNGs.'
                : 'This browser cannot save to a folder. Use the latest Chrome or Edge.'}
            </p>
          </div>

          <div>
            <p className="label">File names</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {slides.map((slide, index) => (
                <li key={slide.id} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-6 shrink-0">{index + 1}.</span>
                  <input
                    type="text"
                    value={fileNames[index] ?? ''}
                    onChange={(e) => updateFileName(index, e.target.value)}
                    disabled={isExporting}
                    aria-label={`File name for slide ${index + 1}`}
                    className="input-field text-sm min-h-[40px] py-2"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ul className="text-sm text-slate-400 space-y-1.5 grid sm:grid-cols-2 gap-x-6">
        <li><span className="text-slate-500">Slides:</span> {slides.length}</li>
        <li><span className="text-slate-500">Est. size:</span> ~{formatFileSize(slides.length * 300000)}</li>
      </ul>



      {isExporting && progress && (
        <ExportProgress percent={progress.percent} label={progress.label} />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || slides.length === 0}
          className="btn-primary flex-1 min-h-[48px] text-base"
        >
          {isExporting ? 'Exporting…' : 'Save to folder'}
        </button>
        <button
          type="button"
          onClick={handleExportCurrentSlide}
          disabled={isExporting || slides.length === 0}
          className="btn-secondary min-h-[48px] shrink-0"
        >
          This slide only
        </button>
      </div>

      {exportStatus && !isExporting && (
        <div className="success-banner" role="status">{exportStatus}</div>
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
