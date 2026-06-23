'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

const MAX_STACK = 40

function clone<T>(value: T): T {
  if (value === null || value === undefined) return value
  return structuredClone(value)
}

export function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState<T>(initial)
  const pastRef = useRef<T[]>([])
  const futureRef = useRef<T[]>([])
  const skipHistoryRef = useRef(false)
  const [historyMeta, setHistoryMeta] = useState({ canUndo: false, canRedo: false })

  const syncMeta = useCallback(() => {
    setHistoryMeta({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    })
  }, [])

  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
        if (!skipHistoryRef.current) {
          pastRef.current = [...pastRef.current.slice(-MAX_STACK + 1), clone(prev)]
          futureRef.current = []
        }
        skipHistoryRef.current = false
        queueMicrotask(syncMeta)
        return next
      })
    },
    [syncMeta]
  )

  const replace = useCallback(
    (value: T) => {
      skipHistoryRef.current = true
      setState(value)
      pastRef.current = []
      futureRef.current = []
      syncMeta()
    },
    [syncMeta]
  )

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    setState((current) => {
      const previous = pastRef.current.pop()!
      futureRef.current.push(clone(current))
      skipHistoryRef.current = true
      queueMicrotask(syncMeta)
      return clone(previous)
    })
  }, [syncMeta])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    setState((current) => {
      const next = futureRef.current.pop()!
      pastRef.current.push(clone(current))
      skipHistoryRef.current = true
      queueMicrotask(syncMeta)
      return clone(next)
    })
  }, [syncMeta])

  const resetHistory = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    syncMeta()
  }, [syncMeta])

  return {
    state,
    set,
    replace,
    undo,
    redo,
    resetHistory,
    canUndo: historyMeta.canUndo,
    canRedo: historyMeta.canRedo,
  }
}

export function useUndoRedoKeyboard(
  undo: () => void,
  redo: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, enabled])
}
