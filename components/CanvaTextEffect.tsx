'use client'

import React, { CSSProperties } from 'react'

interface CanvaTextEffectProps {
  text: string
  roundness: number
  spread: number
  backgroundColor: string
  textColor: string
  fontSize?: number
  fontWeight?: number
  lineHeight?: number
  fontFamily?: string
  className?: string
}

/**
 * Reusable component that mimics Canva's "Background" text effect.
 * - Rounded background behind text
 * - Adjustable border radius (roundness)
 * - Adjustable padding (spread)
 * - Multi-line text support
 * - Auto-size background based on content
 */
export default function CanvaTextEffect({
  text,
  roundness,
  spread,
  backgroundColor,
  textColor,
  fontSize = 56,
  fontWeight = 900,
  lineHeight = 1.5,
  fontFamily = 'poppins, sans-serif',
  className = '',
}: CanvaTextEffectProps) {
  const containerStyle: CSSProperties = {
    display: 'inline-block',
    backgroundColor,
    borderRadius: `${roundness}px`,
    padding: `${spread}px`,
    color: textColor,
    fontSize: `${fontSize}px`,
    fontWeight,
    lineHeight,
    fontFamily,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxWidth: '920px',
    transition: 'all 0.2s ease',
  }

  return (
    <div className={className} style={containerStyle}>
      {text}
    </div>
  )
}
