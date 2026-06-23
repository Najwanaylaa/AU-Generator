'use client'

import React from 'react'
import { ProjectSettings, WatermarkPosition } from '@/types'
interface ProjectSettingsPanelProps {
  settings: ProjectSettings
  onChange: (settings: ProjectSettings) => void
}

const POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: 'top-left', label: 'Top left' },
  { id: 'top-right', label: 'Top right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-right', label: 'Bottom right' },
]

export default function ProjectSettingsPanel({
  settings,
  onChange,
}: ProjectSettingsPanelProps) {
  const patch = (partial: Partial<ProjectSettings>) => onChange({ ...settings, ...partial })

  return (
    <section className="panel panel-section space-y-5" aria-labelledby="project-settings-heading">
      <div>
        <h3 id="project-settings-heading" className="section-title">Project settings</h3>
        <p className="section-desc mt-1">Watermark settings</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="label">Watermark</legend>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={settings.watermarkEnabled}
            onChange={(e) => patch({ watermarkEnabled: e.target.checked })}
            className="w-5 h-5 rounded accent-cyan-500"
          />
          <span className="text-sm text-slate-200">Show watermark on slides</span>
        </label>
        <input
          type="text"
          value={settings.watermarkText}
          onChange={(e) => patch({ watermarkText: e.target.value })}
          placeholder="@yourusername"
          disabled={!settings.watermarkEnabled}
          className="input-field text-sm disabled:opacity-50"
        />
        <div className="grid grid-cols-2 gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos.id}
              type="button"
              disabled={!settings.watermarkEnabled}
              onClick={() => patch({ watermarkPosition: pos.id })}
              className={`min-h-[40px] px-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40
                ${settings.watermarkPosition === pos.id
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
