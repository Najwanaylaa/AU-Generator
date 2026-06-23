import { Slide } from '@/types'

export function normalizeSlideIds(slides: Slide[]): Slide[] {
  return slides.map((slide, index) => ({ ...slide, id: index + 1 }))
}

export function updateSlideAt(slides: Slide[], index: number, patch: Partial<Slide>): Slide[] {
  return slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
}

export function deleteSlideAt(slides: Slide[], index: number): Slide[] {
  if (slides.length <= 1) return slides
  return normalizeSlideIds(slides.filter((_, i) => i !== index))
}

export function insertSlideAfter(slides: Slide[], index: number): Slide[] {
  const template = slides[index]
  const newSlide: Slide = {
    id: 0,
    text: '',
    imageIndex: template?.imageIndex ?? 0,
    textStyle: template?.textStyle ? { ...template.textStyle } : undefined,
    backgroundFilter: template?.backgroundFilter
      ? { ...template.backgroundFilter }
      : undefined,
  }
  const next = [...slides]
  next.splice(index + 1, 0, newSlide)
  return normalizeSlideIds(next)
}

export function duplicateSlideAt(slides: Slide[], index: number): Slide[] {
  const template = slides[index]
  if (!template) return slides

  const copy: Slide = {
    id: 0,
    text: template.text,
    imageIndex: template.imageIndex ?? 0,
    textStyle: template.textStyle ? { ...template.textStyle } : undefined,
    backgroundFilter: template.backgroundFilter
      ? { ...template.backgroundFilter }
      : undefined,
  }

  const next = [...slides]
  next.splice(index + 1, 0, copy)
  return normalizeSlideIds(next)
}

export function reorderSlides(slides: Slide[], fromIndex: number, toIndex: number): Slide[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return slides
  if (fromIndex >= slides.length || toIndex >= slides.length) return slides

  const next = [...slides]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return normalizeSlideIds(next)
}

export function moveSlide(slides: Slide[], index: number, direction: -1 | 1): Slide[] {
  const target = index + direction
  if (target < 0 || target >= slides.length) return slides
  return reorderSlides(slides, index, target)
}
