'use client'

import React, { useState } from 'react'

interface AudioTrack {
  name: string
  dataUrl: string
  duration?: number
}

interface Props {
  initial?: AudioTrack | null
  onChange?: (track: AudioTrack | null) => void
}

export default function AudioUploader({ initial = null, onChange }: Props) {
  const [track, setTrack] = useState<AudioTrack | null>(initial)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    try {
      const reader = new FileReader()
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Failed to read audio file'))
        reader.readAsDataURL(file)
      })

      // determine duration
      const audio = document.createElement('audio')
      audio.src = dataUrl
      const duration: number = await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration)
        })
        // fallback if metadata doesn't load in time
        setTimeout(() => resolve(audio.duration || 0), 3000)
      })

      const next = { name: file.name, dataUrl, duration }
      setTrack(next)
      onChange?.(next)
    } catch (err) {
      console.error('Audio upload failed', err)
      onChange?.(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">Audio track (MP3, optional)</label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
          className="text-sm"
        />
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
      </div>
      {track && (
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-200">{track.name} ({Math.round((track.duration||0))}s)</div>
          <audio controls src={track.dataUrl} className="max-w-xs" />
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              setTrack(null)
              onChange?.(null)
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
