'use client'

import React from 'react'
import Link from 'next/link'

const tools = [
  {
    href: '/stories',
    title: 'Buat Slide',
    description: 'Tulis story, upload gambar, edit slide, dan export PNG ke folder.',
    badge: 'Editor',
    accent: 'border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/35',
  },
  {
    href: '/slideshow',
    title: 'Slideshow MP4',
    description: 'Video story slide-by-slide — setiap slide tampil berurutan dengan durasi yang bisa diatur.',
    badge: 'Video',
    accent: 'border-violet-500/40 bg-violet-950/20 hover:bg-violet-950/35',
  },
  {
    href: '/story-prompt',
    title: 'Story Prompter',
    description: 'Video teleprompter — seluruh cerita jadi satu teks yang scroll otomatis.',
    badge: 'Video',
    accent: 'border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/35',
  },
  {
    href: '/chat-video',
    title: 'Chat Video',
    description: 'Buat video chat ala WhatsApp dengan animasi pop-up pesan.',
    badge: 'Chat',
    accent: 'border-amber-500/40 bg-amber-950/20 hover:bg-amber-950/35',
  },
]

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400">
          Selamat datang! Pilih jenis konten yang ingin kamu buat
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className={`panel block p-5 border transition-colors ${tool.accent}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-slate-100">{tool.title}</h2>
              <span className="chip text-xs shrink-0">{tool.badge}</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{tool.description}</p>
            <p className="text-sm text-cyan-400 mt-4 font-medium">Buka →</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
