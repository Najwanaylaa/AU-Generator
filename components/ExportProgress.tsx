'use client'

import React from 'react'

interface ExportProgressProps {
  percent: number
  label: string
}

export default function ExportProgress({ percent, label }: ExportProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex justify-between text-sm gap-4">
        <span className="text-slate-300 truncate">{label}</span>
        <span className="text-cyan-400 font-medium shrink-0">{Math.round(clamped)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
