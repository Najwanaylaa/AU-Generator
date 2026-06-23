'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChatVideoProject } from '@/types'
import ChatScreen from '@/components/ChatScreen'
import {
  getProjectVideoDurationMs,
  getResolutionDimensions,
  getVideoFrameStateAtTime,
  resolveMessageDelaySec,
} from '@/lib/chatVideoTimeline'

interface ChatVideoPreviewProps {
  project: ChatVideoProject
}

const DEFAULT_PREVIEW_MESSAGES = [
  {
    id: 'demo-1',
    sender: 'contact' as const,
    text: 'Hai! Aku sudah siap bantu bikin video chat kamu.',
    timestamp: '20:15',
  },
  {
    id: 'demo-2',
    sender: 'user' as const,
    text: 'Wah mantap, langsung saja ya.',
    timestamp: '20:16',
  },
  {
    id: 'demo-3',
    sender: 'contact' as const,
    text: 'Tunggu sebentar, aku kirimkan detail promonya.',
    timestamp: '20:16',
  },
]

export default function ChatVideoPreview({ project }: ChatVideoPreviewProps) {
  const [nowMs, setNowMs] = useState(0)

  const previewMessages = useMemo(
    () => (project.messages.length > 0 ? project.messages : DEFAULT_PREVIEW_MESSAGES),
    [project.messages]
  )

  const previewProject = useMemo(
    () => ({
      ...project,
      messages: previewMessages,
      finalMessage: project.messages.length > 0 ? project.finalMessage : 'Contoh pesan promosi akhir.',
      ctaText: project.messages.length > 0 ? project.ctaText : 'Buruan Download App!',
    }),
    [project, previewMessages]
  )

  const durationMs = useMemo(
    () => getProjectVideoDurationMs(previewProject),
    [previewProject]
  )

  const messageDelaySec = resolveMessageDelaySec(previewProject.settings)

  const frameState = useMemo(
    () =>
      getVideoFrameStateAtTime(
        previewProject.messages,
        messageDelaySec,
        nowMs,
        {
          finalMessage: previewProject.finalMessage,
          ctaText: previewProject.ctaText,
        }
      ),
    [previewProject, nowMs, messageDelaySec]
  )

  useEffect(() => {
    setNowMs(0)
    if (durationMs <= 0) return undefined

    const startedAt = performance.now()
    let raf = 0

    const tick = (timestamp: number) => {
      const elapsed = (timestamp - startedAt) % durationMs
      setNowMs(elapsed)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationMs, previewProject.messages, previewProject.settings.messageDelaySec, previewProject.finalMessage, previewProject.ctaText])

  const dims = getResolutionDimensions(project.settings.resolution)
  const displayScale = Math.min(1, 240 / dims.width)
  const displayWidth = Math.round(dims.width * displayScale)
  const displayHeight = Math.round(dims.height * displayScale)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-100">HP Preview</p>
          <p className="text-xs text-slate-400">Animasi mengikuti timeline export video.</p>
        </div>
        <div className="badge-pill bg-slate-800/80 text-slate-200">Auto animation</div>
      </div>

      <div
        className="phone-shell mx-auto chat-video-capture"
        style={{ width: displayWidth + 24, height: displayHeight + 28, minHeight: displayHeight + 28 }}
      >
        <div
          className="chat-screen-viewport"
          style={{
            width: displayWidth,
            height: displayHeight,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <ChatScreen
            project={previewProject}
            frameState={frameState}
            width={dims.width}
            height={dims.height}
            messages={previewMessages}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `scale(${displayScale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
    </div>
  )
}
