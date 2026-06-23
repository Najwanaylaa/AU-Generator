const story = `Suatu sore, Aira menemukan sebuah buku tua di sudut perpustakaan sekolah.

Sampulnya berdebu dan tidak memiliki judul.

Aira membukanya dengan penasaran.`

function countChars(text) {
  return text.length
}

function splitTextIntoSentences(text) {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (!cleaned) return []

  const parts = cleaned.split(/([.!?]+)/)
  const sentences = []

  for (let i = 0; i < parts.length; i += 2) {
    const sentenceText = parts[i]?.trim()
    if (!sentenceText) continue
    const punct = parts[i + 1] || ''
    sentences.push((sentenceText + punct).trim())
  }

  if (sentences.length === 0) {
    sentences.push(cleaned)
  }

  return sentences
}

function splitStoryIntoSentenceChunks(story) {
  if (!story || typeof story !== 'string') return []

  const normalized = story.trim().replace(/\r\n/g, '\n')
  const paragraphs = normalized.split(/\n\s*\n+/)
  const chunks = []

  for (const paragraph of paragraphs) {
    const sentences = splitTextIntoSentences(paragraph)
    if (sentences.length === 0) continue
    if (chunks.length > 0) {
      sentences[0] = `\n\n${sentences[0]}`
    }
    chunks.push(...sentences)
  }

  return chunks.filter((chunk) => chunk.length > 0)
}

function groupSentenceChunksIntoSlides(chunks, maxCharsPerSlide) {
  const slides = []
  let current = ''

  const flush = () => {
    if (current.trim()) {
      slides.push(current.trim())
      current = ''
    }
  }

  for (const chunk of chunks) {
    const sentenceChars = countChars(chunk)
    if (sentenceChars > maxCharsPerSlide) {
      flush()
      slides.push(chunk)
      continue
    }

    const combinedLength = current.length === 0 ? chunk.length : current.length + (chunk.startsWith('\n\n') ? 2 : 1) + chunk.replace(/^\n\n/, '').length
    if (combinedLength <= maxCharsPerSlide) {
      current = current ? `${current}${chunk.startsWith('\n\n') ? '\n\n' : ' '}${chunk.replace(/^\n\n/, '')}` : chunk.replace(/^\n\n/, '')
    } else {
      flush()
      current = chunk.replace(/^\n\n/, '')
    }
  }

  flush()
  return slides
}

const sentences = splitStoryIntoSentenceChunks(story)
console.log('sentences =', JSON.stringify(sentences, null, 2))
console.log('slides100 =', JSON.stringify(groupSentenceChunksIntoSlides(sentences, 100), null, 2))
console.log('slides60 =', JSON.stringify(groupSentenceChunksIntoSlides(sentences, 60), null, 2))
