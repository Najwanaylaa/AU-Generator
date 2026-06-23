'use client'

import React from 'react'
import { ChatVideoSettings } from '@/types'
import {
  MESSAGE_POP_SPEED_PRESETS,
  formatVideoDuration,
  resolveMessageDelaySec,
} from '@/lib/chatVideoTimeline'

interface ChatVideoSettingsFormProps {
  settings: ChatVideoSettings
  onSettingsChange: (settings: ChatVideoSettings) => void
  messageCount?: number
  estimatedDurationSec?: number | null
}

export default function ChatVideoSettingsForm({
  settings,
  onSettingsChange,
  messageCount = 0,
  estimatedDurationSec = null,
}: ChatVideoSettingsFormProps) {
  const messageDelaySec = resolveMessageDelaySec(settings)

  const activePreset = MESSAGE_POP_SPEED_PRESETS.find(
    (preset) => Math.abs(preset.delaySec - messageDelaySec) < 0.05
  )

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">Kecepatan Pop-up Chat</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Atur seberapa cepat pesan muncul satu per satu di video. Preview &amp; export mengikuti pengaturan ini.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MESSAGE_POP_SPEED_PRESETS.map((preset) => {
            const isActive = Math.abs(preset.delaySec - messageDelaySec) < 0.05
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSettingsChange({ ...settings, messageDelaySec: preset.delaySec })}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100'
                    : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
                }`}
              >
                <p className="text-xs font-semibold">{preset.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{preset.delaySec}s / pesan</p>
              </button>
            )
          })}
        </div>

        <div>
          <label htmlFor="message-delay-slider" className="text-xs text-slate-400 block mb-2">
            Jeda antar pesan: <span className="text-cyan-300 font-semibold">{messageDelaySec.toFixed(1)} detik</span>
            {activePreset ? ` · ${activePreset.label}` : ' · Kustom'}
          </label>
          <input
            id="message-delay-slider"
            type="range"
            min="0.4"
            max="4"
            step="0.1"
            value={messageDelaySec}
            onChange={(e) =>
              onSettingsChange({ ...settings, messageDelaySec: parseFloat(e.target.value) })
            }
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0.4s (super cepat)</span>
            <span>4s (super lambat)</span>
          </div>
        </div>

        {estimatedDurationSec !== null && (
          <p className="text-xs text-emerald-400/90 bg-emerald-950/30 border border-emerald-900/40 rounded-lg px-3 py-2">
            Estimasi durasi video: ~{formatVideoDuration(estimatedDurationSec)} · {messageCount} pesan
          </p>
        )}
      </div>

      <div className="space-y-3 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">Tampilan Video</h3>

        <div>
          <label className="text-xs text-slate-400 block mb-2">Tema Chat</label>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSettingsChange({ ...settings, theme: t })}
                className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                  settings.theme === t
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-2">
            Ukuran Teks ({settings.fontSize} — ~{Math.round(settings.fontSize * (1080 / 360))}px di 1080p)
          </label>
          <input
            type="range"
            min="14"
            max="28"
            step="1"
            value={settings.fontSize}
            onChange={(e) => onSettingsChange({ ...settings, fontSize: parseInt(e.target.value) })}
            className="w-full accent-cyan-500"
          />
          <div className="flex gap-1 mt-1 flex-wrap">
            {[16, 18, 20, 22, 24].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSettingsChange({ ...settings, fontSize: s })}
                className={`h-6 px-2 rounded text-[10px] font-medium transition-colors ${
                  settings.fontSize === s
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-2">
            Lebar Maks. Bubble ({settings.bubbleMaxWidth}%)
          </label>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={settings.bubbleMaxWidth}
            onChange={(e) =>
              onSettingsChange({ ...settings, bubbleMaxWidth: parseInt(e.target.value) })
            }
            className="w-full accent-cyan-500"
          />
          <div className="flex gap-1 mt-1 flex-wrap">
            {[60, 75, 80, 90, 100].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onSettingsChange({ ...settings, bubbleMaxWidth: w })}
                className={`h-6 px-2 rounded text-[10px] font-medium transition-colors ${
                  settings.bubbleMaxWidth === w
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {w}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-2">Resolusi Video</label>
          <div className="grid grid-cols-3 gap-2">
            {(['480p', '720p', '1080p'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSettingsChange({ ...settings, resolution: r })}
                className={`h-7 rounded text-xs font-medium transition-colors ${
                  settings.resolution === r
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Format vertikal 9:16 untuk Instagram Reels &amp; TikTok · 1080p direkomendasikan
          </p>
        </div>
      </div>
    </div>
  )
}
