'use client'

import React from 'react'

interface UndoRedoToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function UndoRedoToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="btn-secondary text-sm min-h-[40px] px-4"
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="btn-secondary text-sm min-h-[40px] px-4"
        title="Redo (Ctrl+Shift+Z)"
      >
        Redo
      </button>
      <span className="text-xs text-slate-500 hidden sm:inline">
        Ctrl+Z · Ctrl+Shift+Z
      </span>
    </div>
  )
}
