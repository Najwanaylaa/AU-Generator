'use client'

import React from 'react'
import Link from 'next/link'

interface StoryProjectEmptyStateProps {
  title: string
  description: string
}

export default function StoryProjectEmptyState({ title, description }: StoryProjectEmptyStateProps) {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <Link href="/" className="btn-ghost text-sm inline-flex">
        ← Dashboard
      </Link>

      <div className="panel panel-section space-y-4">
        <h2 className="section-title">{title}</h2>
        <p className="section-desc">{description}</p>
        <p className="text-sm text-slate-500">
          Buat dan edit slide terlebih dahulu, lalu kembali ke halaman ini untuk export video.
        </p>
        <Link href="/stories" className="btn-primary inline-flex min-h-[48px] px-8">
          Buat slide dulu
        </Link>
      </div>
    </div>
  )
}
