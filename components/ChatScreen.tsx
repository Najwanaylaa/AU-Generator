'use client'

import React, { useEffect, useRef } from 'react'
import { ChatVideoProject } from '@/types'
import {
  ChatVideoFrameState,
  formatContactStatus,
  formatContactTime,
} from '@/lib/chatVideoTimeline'
import { getChatVideoFontSize } from '@/lib/chatVideoCanvasRender'

export interface ChatScreenProps {
  project: ChatVideoProject
  frameState: ChatVideoFrameState
  width: number
  height: number
  messages: ChatVideoProject['messages']
  className?: string
  style?: React.CSSProperties
  autoScroll?: boolean
}

export default function ChatScreen({
  project,
  frameState,
  width,
  height,
  messages,
  className = '',
  style,
  autoScroll = true,
}: ChatScreenProps) {
  const chatListRef = useRef<HTMLDivElement>(null)
  const { settings } = project
  const themeClass = settings.theme === 'dark' ? 'chat-theme-dark' : 'chat-theme-light'
  const exportFontSize = getChatVideoFontSize(settings.fontSize, width)
  const initials = project.contactName
    ? project.contactName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'WA'

  useEffect(() => {
    if (!autoScroll || !chatListRef.current) return
    const list = chatListRef.current
    list.scrollTop = list.scrollHeight
  }, [
    autoScroll,
    frameState.visibleCount,
    frameState.showTyping,
    frameState.showFinalMessage,
    frameState.showCta,
  ])

  return (
    <div
      className={`chat-screen ${themeClass} ${className}`.trim()}
      style={{ width, height, ...style }}
    >
      <div className="chat-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="avatar">
            {project.contactImage ? (
              <img
                src={project.contactImage}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="contact-name truncate">{project.contactName || 'Kontak'}</p>
            <p className="contact-status truncate">
              {frameState.showTyping && !frameState.showFinalMessage
                ? 'typing…'
                : `${formatContactStatus(project.contactStatus)} • ${formatContactTime(project.contactTime)}`}
            </p>
          </div>
        </div>
        <button className="icon-btn shrink-0" type="button" aria-label="Menu">
          ⋮
        </button>
      </div>

      <div className="chat-body">
        <div ref={chatListRef} className="chat-list px-4 py-3">
          {messages.map((msg, index) => {
            const isVisible = index < frameState.visibleCount
            return (
              <div
                key={msg.id}
                data-message-index={index}
                className={`chat-row ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ display: isVisible ? 'flex' : 'none' }}
              >
                <div
                  className={`wa-bubble ${
                    msg.sender === 'user' ? 'wa-bubble--user' : 'wa-bubble--contact'
                  } ${isVisible ? 'message-enter' : ''}`}
                  style={{
                    maxWidth: `${settings.bubbleMaxWidth}%`,
                    fontSize: `${exportFontSize}px`,
                  }}
                >
                  <div className="message-text">{msg.text}</div>
                  <div className="message-meta">
                    <span className="wa-timestamp">{msg.timestamp}</span>
                    {msg.sender === 'user' && <span className="wa-tick read">✓✓</span>}
                  </div>
                </div>
              </div>
            )
          })}

          <div
            className="typing-row"
            data-typing-row
            style={{ display: frameState.showTyping ? 'flex' : 'none' }}
          >
            <div className="wa-typing">
              <span className="wa-typing-dot" />
              <span className="wa-typing-dot" />
              <span className="wa-typing-dot" />
            </div>
          </div>

          <div
            className="chat-row justify-start"
            data-final-message
            style={{ display: frameState.showFinalMessage ? 'flex' : 'none' }}
          >
            <div
              className="wa-bubble wa-bubble--contact message-enter"
              style={{
                maxWidth: `${settings.bubbleMaxWidth}%`,
                fontSize: `${exportFontSize}px`,
              }}
            >
              <div className="message-text">{project.finalMessage?.trim() || ''}</div>
              <div className="message-meta">
                <span className="wa-timestamp">{formatContactTime(project.contactTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-footer">
        <div className="chat-input-bar" aria-hidden="true">
          <span className="chat-input-placeholder">Message</span>
          <span className="chat-input-icons">🎤</span>
        </div>
      </div>

      <div
        className="chat-cta-overlay"
        data-cta-overlay
        style={{ display: frameState.showCta ? 'flex' : 'none' }}
      >
        <div className="chat-cta-card message-enter">
          <p className="chat-cta-text">{project.ctaText?.trim() || ''}</p>
        </div>
      </div>
    </div>
  )
}
