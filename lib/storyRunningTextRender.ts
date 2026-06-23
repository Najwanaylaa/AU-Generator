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
  const sourceLines = text.split(/\r?\n/)
  const lines: RunningTextLine[] = []

  // Group consecutive non-empty lines into paragraphs
  const paragraphs: string[][] = []
  let currentParagraph: string[] = []

  sourceLines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph)
        currentParagraph = []
      }
      paragraphs.push([]) // empty array = paragraph break sentinel
    } else {
      currentParagraph.push(trimmed)
    }
  })
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph)
  }

  paragraphs.forEach((para) => {
    if (para.length === 0) {
      // Paragraph break spacer gap
      if (lines.length > 0 && !lines[lines.length - 1].isGap) {
        lines.push({ text: '', isGap: true })
      }
      return
    }

    // Process the paragraph's lines
    para.forEach((rawLine) => {
      const words = rawLine.split(/\s+/).filter(Boolean)
      if (words.length === 0) return

      let current = ''
      const wrapped: string[] = []
      for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && current) {
          wrapped.push(current)
          current = word
        } else {
          current = test
        }
      }
      if (current) {
        wrapped.push(current)
      }

      wrapped.forEach((wl) => {
        lines.push({ text: wl, isGap: false })
      })
    })
  })

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

export function drawCustomRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  corners: { tl: boolean; tr: boolean; br: boolean; bl: boolean }
) {
  if (r <= 0) {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.closePath()
    return
  }
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  
  // Top-left
  if (corners.tl) {
    ctx.moveTo(x + radius, y)
  } else {
    ctx.moveTo(x, y)
  }

  // Top-right
  if (corners.tr) {
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  } else {
    ctx.lineTo(x + w, y)
  }

  // Bottom-right
  if (corners.br) {
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  } else {
    ctx.lineTo(x + w, y + h)
  }

  // Bottom-left
  if (corners.bl) {
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  } else {
    ctx.lineTo(x, y + h)
  }

  // Back to Top-left
  if (corners.tl) {
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
  } else {
    ctx.lineTo(x, y)
  }

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
  ctx.textBaseline = 'middle'

  const paddingX = width * 0.08
  const maxWidth = width - paddingX * 2
  const lineHeightPx = settings.fontSize * settings.lineHeight
  const paragraphGapPx = settings.fontSize * 2.0

  const layout = layoutRunningText(ctx, text, maxWidth, settings.fontSize, lineHeightPx, paragraphGapPx)

  // 5. Draw Highlights
  if (settings.highlightType !== 'none') {
    ctx.fillStyle = settings.highlightColor
    // Generous capsule padding so bubble is noticeably wider/taller than the text (padX = 0.7, padY = 0.28)
    const padX = settings.fontSize * 0.7
    const padY = settings.fontSize * 0.28
    const boxH = settings.fontSize + padY * 2
    // Perfect capsule pill shape (radius = half of height)
    const radius = settings.highlightType === 'rounded' ? boxH / 2 : 0
    // lineHeightPx centers each line within the layout row
    const lineCenter = lineHeightPx / 2

    layout.lines.forEach(({ y: lineY, line }) => {
      if (line.isGap || line.text === '') return

      // Calculate drawing Y position (scrolling from bottom to top)
      const drawY = height - scrollOffset + lineY
      // Box is centered in the line slot
      const boxCenterY = drawY + lineCenter
      const boxY = boxCenterY - boxH / 2

      // Skip drawing if out of visible bounds
      if (boxY + boxH < 0 || boxY > height) return

      const lineWidth = ctx.measureText(line.text).width
      const lx = paddingX + (maxWidth - lineWidth) / 2

      ctx.save()
      drawRoundRect(ctx, lx - padX, boxY, lineWidth + padX * 2, boxH, radius)
      ctx.fill()
      ctx.restore()
    })
  }

  // 6. Draw Text — baseline='middle' so Y is vertical center of each line slot
  ctx.fillStyle = settings.textColor
  ctx.textAlign = 'center'

  // Text Shadow (to make text highly readable over any backgrounds)
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = settings.highlightType === 'none' ? 8 : 2
  ctx.shadowOffsetY = settings.highlightType === 'none' ? 2 : 1
  const lineCenter = lineHeightPx / 2

  layout.lines.forEach(({ y: lineY, line }) => {
    if (line.isGap || line.text === '') return

    const drawY = height - scrollOffset + lineY
    const textY = drawY + lineCenter
    if (textY < -settings.fontSize || textY > height + settings.fontSize) return

    ctx.fillText(line.text, width / 2, textY)
  })

  ctx.restore()

  return layout.totalHeight
}
