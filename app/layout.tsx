import './globals.css'
import React from 'react'
import Link from 'next/link'
import { fontVariableClassName } from '@/lib/fonts'

export const metadata = {
  title: 'AU Generator',
  description: 'Create story slides from text and images'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`app-shell ${fontVariableClassName}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 btn-primary"
        >
          Skip to main content
        </a>

        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-cyan-400 mb-0.5">Story → Slide</p>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                AU Generator
              </h1>
            </div>

            {/* Navigation removed per request; keep header minimal */}

            <span className="chip hidden sm:inline-flex shrink-0">1080 × 1920</span>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8"
        >
          {children}
        </main>

        <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          AU Generator · by NN
        </footer>
      </body>
    </html>
  )
}
