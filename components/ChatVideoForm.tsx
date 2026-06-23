'use client'

import React, { useState } from 'react'
import { ChatVideoProject, ChatMessage } from '@/types'

interface ChatVideoFormProps {
  project: ChatVideoProject
  onProjectChange: (project: ChatVideoProject) => void
}

export default function ChatVideoForm({ project, onProjectChange }: ChatVideoFormProps) {
  const [newMessage, setNewMessage] = useState('')

  const determineSenderAndText = (line: string): { sender: 'user' | 'contact'; text: string } => {
    const trimmed = line.trim()
    if (!trimmed) return { sender: 'user', text: '' }

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex > 0) {
      const prefix = trimmed.slice(0, colonIndex).trim()
      const rest = trimmed.slice(colonIndex + 1).trim()
      const contactName = (project.contactName || '').toLowerCase()
      const prefixLower = prefix.toLowerCase()

      if (contactName && prefixLower === contactName) {
        return { sender: 'contact', text: rest }
      }

      if (['anda', 'aku', 'saya', 'me', 'you'].includes(prefixLower)) {
        return { sender: 'user', text: rest }
      }
    }

    return { sender: 'user', text: trimmed }
  }

  const getNextTimestamp = (index: number): string => {
    const base = project.contactTime || '20:15'
    const match = base.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return base

    const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + index
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const handleAddMessage = () => {
    if (!newMessage.trim()) return

    const lines = newMessage.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    const now = Date.now()
    const baseIndex = project.messages.length
    const messagesToAdd: ChatMessage[] = lines.map((line, i) => {
      const parsed = determineSenderAndText(line)
      return {
        id: String(now + i),
        sender: parsed.sender,
        text: parsed.text,
        timestamp: getNextTimestamp(baseIndex + i),
      }
    })

    onProjectChange({
      ...project,
      messages: [...project.messages, ...messagesToAdd],
    })
    setNewMessage('')
  }

  const handleDeleteMessage = (id: string) => {
    onProjectChange({
      ...project,
      messages: project.messages.filter((m) => m.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      {/* Contact Info */}
      <div className="space-y-3 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">Konten Chat</h3>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Nama Kontak Utama</label>
          <input
            type="text"
            value={project.contactName}
            onChange={(e) => onProjectChange({ ...project, contactName: e.target.value })}
            className="w-full h-8 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-100"
            placeholder="Nama kontak..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Jam Awal Chat</label>
            <input
              type="time"
              value={project.contactTime}
              onChange={(e) => onProjectChange({ ...project, contactTime: e.target.value })}
              className="w-full h-8 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Status</label>
            <select
              value={project.contactStatus}
              onChange={(e) =>
                onProjectChange({ ...project, contactStatus: e.target.value as any })
              }
              className="w-full h-8 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-100"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="away">Away</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">Naskah Percakapan</h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {project.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded text-xs border ${
                msg.sender === 'user'
                  ? 'bg-blue-900/30 border-blue-700 text-blue-100 flex justify-between items-start'
                  : 'bg-slate-700 border-slate-600 text-slate-200 flex justify-between items-start'
              }`}
            >
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  {msg.sender === 'user' ? 'Anda' : project.contactName}
                </span>
                <p className="break-words">{msg.text}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteMessage(msg.id)}
                className="ml-2 text-[10px] hover:text-red-400 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-700">
          {/* Sender selection removed — messages will be inferred automatically.
              To add a contact's message, start the line with "ContactName: " (e.g. "Mas Raka: Halo"). */}

          <div className="flex items-center gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddMessage()
                }
              }}
              placeholder={`${project.contactName || 'Kontak'}: Halo...\nAnda: Balasan kamu...`}
              className="flex-1 h-16 px-4 py-2 rounded-2xl text-sm bg-white/90 text-black resize-none placeholder:text-slate-400"
            />

            <button
              type="button"
              onClick={handleAddMessage}
              className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-500 transition-colors"
              aria-label="Kirim"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* CTA & Final Message */}
      <div className="space-y-3 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">CTA Akhir / Promosi</h3>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Teks CTA (Ajakan Aksi)</label>
          <input
            type="text"
            value={project.ctaText}
            onChange={(e) => onProjectChange({ ...project, ctaText: e.target.value })}
            className="w-full h-8 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-100"
            placeholder="Misal: Buruan Download App!"
          />
        </div>
      </div>
    </div>
  )
}
