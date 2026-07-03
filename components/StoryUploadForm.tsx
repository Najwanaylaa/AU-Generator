'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { validateStory, countChars } from '@/lib/storyParser'
import {
  createImagePreviews,
  cleanupPreviews,
  ImageFile,
  MAX_IMAGES,
} from '@/lib/imageUtils'
import { DEFAULT_PROJECT_SETTINGS } from '@/lib/projectSettings'
import { loadFormDraft, saveFormDraft } from '@/lib/projectStorage'

interface StoryFormProps {
  onGenerate: (
    story: string,
    imageFiles: ImageFile[],
    storyTitle: string,
    storySubtitle: string
  ) => void
  isLoading?: boolean
}

export default function StoryUploadForm({ onGenerate, isLoading = false }: StoryFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      story: '',
      storyTitle: '',
      storySubtitle: '',
    },
  })

  const [imagePreviews, setImagePreviews] = useState<ImageFile[]>([])
  const [slideCount, setSlideCount] = useState(0)
  const [uploadError, setUploadError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxCharsPerSlide = DEFAULT_PROJECT_SETTINGS.maxCharsPerSlide
  const storyValue = watch('story')
  const storyTitleValue = watch('storyTitle')
  const storySubtitleValue = watch('storySubtitle')

  useEffect(() => {
    const saved = loadFormDraft()
    if (!saved) return
    if (saved.story) setValue('story', saved.story)
    if (saved.storyTitle) setValue('storyTitle', saved.storyTitle)
    if (saved.storySubtitle) setValue('storySubtitle', saved.storySubtitle)
  }, [setValue])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveFormDraft({
        story: storyValue,
        storyTitle: storyTitleValue,
        storySubtitle: storySubtitleValue,
      })
    }, 500)

    return () => window.clearTimeout(timer)
  }, [storyValue, storyTitleValue, storySubtitleValue])

  React.useEffect(() => {
    if (storyValue) {
      const validation = validateStory(storyValue, maxCharsPerSlide)
      if (validation.isValid && validation.slideCount) {
        setSlideCount(validation.slideCount)
        setUploadError('')
      } else if (!validation.isValid) {
        setUploadError(validation.error || '')
      }
    } else {
      setSlideCount(0)
      setUploadError('')
    }
  }, [storyValue, maxCharsPerSlide])

  const processFiles = useCallback(async (files: FileList) => {
    try {
      const previews = await createImagePreviews(files)
      if (previews.length === 0) {
        setUploadError('No valid images. Use JPEG, PNG, WebP, or GIF (max 5 MB each).')
        return
      }

      setImagePreviews((prev) => {
        const remaining = MAX_IMAGES - prev.length
        if (remaining <= 0) {
          setUploadError(`Maximum ${MAX_IMAGES} images per project.`)
          return prev
        }

        const toAdd = previews.slice(0, remaining)
        if (toAdd.length < previews.length) {
          setUploadError(`Only ${toAdd.length} image(s) added (max ${MAX_IMAGES}).`)
        } else {
          setUploadError('')
        }

        return [...prev, ...toAdd]
      })
    } catch {
      setUploadError('Failed to upload images. Please try again.')
    }
  }, [])

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    await processFiles(files)
    e.target.value = ''
  }, [processFiles])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (isLoading) return
    if (e.dataTransfer.files.length) await processFiles(e.dataTransfer.files)
  }, [isLoading, processFiles])

  const handleRemoveImage = useCallback((index: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
    setUploadError('')
  }, [])

  const handleClearImages = useCallback(() => {
    setImagePreviews((prev) => {
      cleanupPreviews(prev)
      return []
    })
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const loadDemoData = async () => {
    setValue('storyTitle', 'Test Judul Slide')
    setValue('storySubtitle', 'Oleh Penulis')
    setValue('story', `Part1\n[Assalamualaikum Dek!]\n\nDeg!\nDadaku langsung berdebar kencang. Tiba-tiba banget ada pesan ngajakin nikah. Mana bikin soak banget pas baca nama yang mengirim pesan 'Mas Perwira'. Dia kan duda tua usia tiga puluh lima tahun yang ditinggal meninggal oleh kakakku tujuh tahun lalu alias mantan kakak iparku. Eh, ada mantan kakak ipar gak yah. Entahlah.\n\nHaha!\nAku menepuk pipiku tak percaya. Ku tatap lagi layar ponsel yang aku pegang. Dan lenyap. Pesan dihapus.`)

    try {
      const response = await fetch('/Baground chat WA.jpg')
      const blob = await response.blob()
      const file = new File([blob], 'Baground chat WA.jpg', { type: 'image/jpeg' })
      const preview = URL.createObjectURL(file)
      setImagePreviews([{ file, preview, size: file.size }])
      setUploadError('')
    } catch (e) {
      console.error('Failed to load demo image', e)
    }
  }

  const onSubmit = async (data: { story: string; storyTitle: string; storySubtitle: string }) => {
    const validation = validateStory(data.story, maxCharsPerSlide)
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid story')
      return
    }
    if (imagePreviews.length === 0) {
      setUploadError('Upload at least one image')
      return
    }
    onGenerate(data.story, imagePreviews, data.storyTitle, data.storySubtitle)
  }

  const canSubmit = !isLoading && imagePreviews.length > 0 && slideCount > 0
  const totalChars = storyValue ? countChars(storyValue) : 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="panel-section space-y-6">
      <fieldset className="space-y-3">
        <legend className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <span className="step-badge" aria-hidden="true">1</span>
            <span className="label mb-0">Cover Information</span>
          </div>
          <button
            type="button"
            onClick={loadDemoData}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
          >
            Load Demo Data
          </button>
        </legend>

        <div className="space-y-2">
          <label htmlFor="storyTitle" className="text-sm font-medium text-slate-300">
            Story Title
          </label>
          <input
            id="storyTitle"
            type="text"
            placeholder="Enter story title..."
            {...register('storyTitle')}
            className="input-field"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="storySubtitle" className="text-sm font-medium text-slate-300">
            Subtitle / Author
          </label>
          <textarea
            id="storySubtitle"
            placeholder="Enter subtitle or author name..."
            {...register('storySubtitle')}
            rows={2}
            className="input-field resize-y min-h-[60px] leading-relaxed"
          />
        </div>

        <p className="text-xs text-slate-500">
          Optional cover slide — leave Story Title empty to skip the cover.
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 w-full">
          <span className="step-badge" aria-hidden="true">2</span>
          <span className="label mb-0">Your story</span>
        </legend>
        <textarea
          id="story"
          aria-describedby="story-hint story-count"
          placeholder="Paste your story here…"
          {...register('story', {
            required: 'Story is required',
            minLength: { value: 10, message: 'At least 10 characters' }
          })}
          rows={10}
          className="input-field resize-y min-h-[180px] leading-relaxed"
        />
        <div id="story-hint" className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {errors.story ? (
            <p className="text-red-400" role="alert">{errors.story.message}</p>
          ) : storyValue && slideCount > 0 ? (
            <p id="story-count" className="text-emerald-400">
              {totalChars} characters → ~{slideCount} slide{slideCount > 1 ? 's' : ''}
            </p>
          ) : (
            <p id="story-count" className="text-slate-500">Min. 10 characters</p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 w-full">
          <span className="step-badge" aria-hidden="true">3</span>
          <span className="label mb-0">Background images</span>
        </legend>

        <input
          ref={fileInputRef}
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          disabled={isLoading || imagePreviews.length >= MAX_IMAGES}
          className="sr-only"
        />
        <label
          htmlFor="images"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 min-h-[120px] px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors
            ${isDragging ? 'border-cyan-500 bg-cyan-950/30' : 'border-slate-600 hover:border-slate-500 bg-slate-800/40'}
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <span className="text-2xl" aria-hidden="true">📷</span>
          <span className="font-medium text-slate-200">
            {imagePreviews.length > 0 ? 'Add more images' : 'Click or drag images here'}
          </span>
          <span className="text-xs text-slate-500">
            Select multiple at once or add in batches · max {MAX_IMAGES} images · 5 MB each
          </span>
        </label>

        {imagePreviews.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-sm text-slate-400">
                {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''} selected
              </p>
              <button
                type="button"
                onClick={handleClearImages}
                className="text-xs text-red-300 hover:text-red-200 underline"
              >
                Clear all
              </button>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="list">
              {imagePreviews.map((img, index) => (
                <li key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Image preview ${index + 1}`}
                    className="w-full aspect-[9/16] object-cover rounded-lg border border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute top-2 right-2 min-w-[36px] min-h-[36px] flex items-center justify-center
                      bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg shadow-md"
                  >
                    ✕
                  </button>
                  <span className="absolute bottom-2 left-2 text-xs font-medium bg-black/60 px-2 py-0.5 rounded">
                    {index + 1}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      {uploadError && (
        <div className="error-banner" role="alert">{uploadError}</div>
      )}

      <div className="pt-2 border-t border-slate-800">
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full min-h-[48px] text-base"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating slides…
            </>
          ) : (
            'Generate slides'
          )}
        </button>
        {!canSubmit && !isLoading && (
          <p className="text-xs text-slate-500 text-center mt-2">
            Enter a valid story and upload at least 1 image
          </p>
        )}
      </div>
    </form>
  )
}
