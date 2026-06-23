import { getFontFamily } from '@/lib/fonts'

export interface RunningTextLine {
  text: string
  isGap: boolean
}

export interface RunningTextLayout {
  lines: { y: number; line: RunningTextLine }[]
  totalHeight: number
}

export function layoutRunningText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeightPx: number,
  paragraphGapPx: number
): RunningTextLayout {
  // Split input into lines, preserving paragraph breaks
  const sourceLines = text.split('\n')
  const lines: RunningTextLine[] = []

  for (let i = 0; i < sourceLines.length; i++) {
    const rawLine = sourceLines[i].trim()
    if (rawLine === '') {
      // Add a paragraph gap (only if we didn't just add one, to avoid multiple empty spaces collapsing)
      if (lines.length > 0 && !lines[lines.length - 1].isGap) {
        lines.push({ text: '', isGap: true })
      }
      continue
    }

    // Wrap the line based on maxWidth
    const words = rawLine.split(/\s+/).filter(Boolean)
    if (words.length === 0) continue

    let current = ''
    const paragraphWrappedLines: string[] = []
    
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        paragraphWrappedLines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) {
      paragraphWrappedLines.push(current)
    }

    paragraphWrappedLines.forEach((wl) => {
      lines.push({ text: wl, isGap: false })
    })

    // If there is another line coming and it's not empty, add a small gap
    if (i < sourceLines.length - 1 && sourceLines[i + 1].trim() !== '') {
      lines.push({ text: '', isGap: true })
    }
  }

  // Calculate total height
  let totalHeight = 0
  const linePositions: { y: number; line: RunningTextLine }[] = []
  
  lines.forEach((line) => {
    if (line.isGap) {
      linePositions.push({ y: totalHeight, line })
      totalHeight += paragraphGapPx
    } else {
      linePositions.push({ y: totalHeight, line })
      totalHeight += lineHeightPx
    }
  })

  return {
    lines: linePositions,
    totalHeight,
  }
}

export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (r <= 0) {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.closePath()
    return
  }
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function drawRunningTextFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  bgImage: HTMLImageElement | null,
  settings: {
    fontFamily: string
    fontSize: number
    textColor: string
    highlightType: 'none' | 'rounded' | 'solid'
    highlightColor: string
    lineHeight: number
  },
  scrollOffset: number
): number {
  // 1. Clear background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  // 2. Draw background image if present
  if (bgImage) {
    ctx.save()
    const ir = bgImage.naturalWidth / bgImage.naturalHeight
    const cr = width / height
    let sx = 0
    let sy = 0
    let sw = bgImage.naturalWidth
    let sh = bgImage.naturalHeight

    if (ir > cr) {
      sw = bgImage.naturalHeight * cr
      sx = (bgImage.naturalWidth - sw) / 2
    } else {
      sh = bgImage.naturalWidth / cr
      sy = (bgImage.naturalHeight - sh) / 2
    }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, width, height)
    ctx.restore()
  }

  // 3. Draw gradient overlay
  ctx.save()
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)')
  gradient.addColorStop(0.25, 'rgba(0,0,0,0.45)')
  gradient.addColorStop(0.75, 'rgba(0,0,0,0.45)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.85)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  // 4. Layout Text
  ctx.save()
  ctx.font = `400 ${settings.fontSize}px ${getFontFamily(settings.fontFamily)}`
  ctx.textBaseline = 'top'

  const paddingX = width * 0.08
  const maxWidth = width - paddingX * 2
  const lineHeightPx = settings.fontSize * settings.lineHeight
  const paragraphGapPx = settings.fontSize * 2.0

  const layout = layoutRunningText(ctx, text, maxWidth, settings.fontSize, lineHeightPx, paragraphGapPx)

  // 5. Draw Highlights
  if (settings.highlightType !== 'none') {
    ctx.fillStyle = settings.highlightColor
    const padX = settings.fontSize * 0.4
    const padY = settings.fontSize * 0.15
    const radius = settings.highlightType === 'rounded' ? settings.fontSize * 0.35 : 0

    layout.lines.forEach(({ y: lineY, line }) => {
      if (line.isGap || line.text === '') return

      // Calculate drawing Y position (scrolling from bottom to top)
      const drawY = height - scrollOffset + lineY

      // Skip drawing if out of visible bounds
      if (drawY + lineHeightPx + padY < 0 || drawY - padY > height) return

      const lineWidth = ctx.measureText(line.text).width
      const lx = paddingX + (maxWidth - lineWidth) / 2

      ctx.save()
      drawRoundRect(ctx, lx - padX, drawY - padY, lineWidth + padX * 2, lineHeightPx + padY * 2, radius)
      ctx.fill()
      
      // Draw subtle outline stroke
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    })
  }

  // 6. Draw Text
  ctx.fillStyle = settings.textColor
  ctx.textAlign = 'center'

  // Text Shadow (to make text highly readable over any backgrounds)
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = settings.highlightType === 'none' ? 8 : 2
  ctx.shadowOffsetY = settings.highlightType === 'none' ? 2 : 1

  layout.lines.forEach(({ y: lineY, line }) => {
    if (line.isGap || line.text === '') return

    const drawY = height - scrollOffset + lineY
    if (drawY + lineHeightPx < 0 || drawY > height) return

    ctx.fillText(line.text, width / 2, drawY)
  })

  ctx.restore()

  return layout.totalHeight
}
