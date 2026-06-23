import type { ChatVideoProject } from '@/types'
import type { ChatVideoFrameState } from '@/lib/chatVideoTimeline'
import { formatContactStatus, formatContactTime } from '@/lib/chatVideoTimeline'

export function applyChatExportFrame(
  exportRoot: HTMLElement,
  project: ChatVideoProject,
  frameState: ChatVideoFrameState
) {
  const messageEls = Array.from(
    exportRoot.querySelectorAll<HTMLElement>('[data-message-index]')
  )
  const typingRow = exportRoot.querySelector<HTMLElement>('[data-typing-row]')
  const finalMessageRow = exportRoot.querySelector<HTMLElement>('[data-final-message]')
  const ctaOverlay = exportRoot.querySelector<HTMLElement>('[data-cta-overlay]')
  const chatList = exportRoot.querySelector<HTMLElement>('.chat-list')
  const statusEl = exportRoot.querySelector<HTMLElement>('.contact-status')

  messageEls.forEach((el) => {
    const index = Number(el.dataset.messageIndex)
    const bubble = el.querySelector<HTMLElement>('.wa-bubble')
    const isVisible = index < frameState.visibleCount

    el.style.display = isVisible ? 'flex' : 'none'
    if (bubble) {
      if (isVisible) {
        bubble.classList.remove('message-enter')
        void bubble.offsetWidth
        bubble.classList.add('message-enter')
      } else {
        bubble.classList.remove('message-enter')
      }
    }
  })

  if (typingRow) {
    typingRow.style.display = frameState.showTyping ? 'flex' : 'none'
  }

  if (finalMessageRow) {
    finalMessageRow.style.display = frameState.showFinalMessage ? 'flex' : 'none'
    const bubble = finalMessageRow.querySelector<HTMLElement>('.wa-bubble')
    if (bubble && frameState.showFinalMessage) {
      bubble.classList.remove('message-enter')
      void bubble.offsetWidth
      bubble.classList.add('message-enter')
    }
  }

  if (ctaOverlay) {
    ctaOverlay.style.display = frameState.showCta ? 'flex' : 'none'
  }

  if (statusEl) {
    statusEl.textContent =
      frameState.showTyping && !frameState.showFinalMessage
        ? 'typing…'
        : `${formatContactStatus(project.contactStatus)} • ${formatContactTime(project.contactTime)}`
  }

  if (chatList) {
    chatList.scrollTop = chatList.scrollHeight
  }
}

export function prepareChatExportRoot(exportRoot: HTMLElement, dims: { width: number; height: number }) {
  exportRoot.style.width = `${dims.width}px`
  exportRoot.style.height = `${dims.height}px`

  const chatScreen = exportRoot.querySelector<HTMLElement>('.chat-screen')
  if (!chatScreen) return null

  chatScreen.style.transform = 'none'
  chatScreen.style.width = `${dims.width}px`
  chatScreen.style.height = `${dims.height}px`
  chatScreen.style.position = 'relative'

  return chatScreen
}
