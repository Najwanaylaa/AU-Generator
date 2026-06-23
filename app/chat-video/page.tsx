'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatVideoForm from '@/components/ChatVideoForm'
import ChatVideoSettingsForm from '@/components/ChatVideoSettingsForm'
import ChatVideoPreview from '@/components/ChatVideoPreview'
import { ChatVideoProject, ChatVideoSettings } from '@/types'
import { getProjectVideoDurationMs, getResolutionDimensions, resolveMessageDelaySec } from '@/lib/chatVideoTimeline'
import { exportChatVideo } from '@/lib/chatVideoCanvasRender'
import { downloadBlob } from '@/lib/slideExport'

const DEFAULT_SETTINGS: ChatVideoSettings = {
  theme: 'light',
  messageDelaySec: 1.2,
  fontSize: 18,
  bubbleMaxWidth: 85,
  resolution: '1080p',
}

const DEFAULT_PROJECT: ChatVideoProject = {
  id: '1',
  contactName: 'Mas Raka',
  contactTime: '20:15',
  contactStatus: 'online',
  messages: [],
  finalMessage: '',
  ctaText: '',
  settings: DEFAULT_SETTINGS,
}

export default function ChatVideoPage() {
  const router = useRouter()
  const [project, setProject] = useState<ChatVideoProject>(DEFAULT_PROJECT)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  const messageCount = project.messages.length
  const previewDurationSec = useMemo(() => {
    if (messageCount === 0) return '0s'
    return `${Math.ceil(getProjectVideoDurationMs(project) / 1000)}s`
  }, [project, messageCount])
  const isReadyToGenerate = messageCount > 0

  const handleGenerateVideo = async () => {
    if (!isReadyToGenerate) {
      alert('Tambahkan minimal 1 pesan terlebih dahulu')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    const dims = getResolutionDimensions(project.settings.resolution)

    try {
      const { blob, extension } = await exportChatVideo(
        project,
        dims.width,
        dims.height,
        setGenerationProgress
      )

      await downloadBlob(blob, `chat-video-${Date.now()}.${extension}`)
      alert(
        extension === 'mp4'
          ? 'Video MP4 berhasil dibuat! Siap diupload ke Instagram/TikTok.'
          : 'Video WebM berhasil dibuat! Untuk Instagram/TikTok, gunakan Chrome/Edge agar export MP4.'
      )
    } catch (error) {
      console.error(error)
      alert('Error saat membuat video: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    if (confirm('Hapus semua data chat?')) {
      setProject(DEFAULT_PROJECT)
      setGenerationProgress(0)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-ghost text-sm mb-3"
            >
              ← Dashboard
            </button>
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-cyan-400/80">Chat Video Studio</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Dashboard video chat premium
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400 leading-8">
              Buat video WhatsApp-style vertikal dengan preview HP real-time dan export yang selaras dengan animasi chat.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-panel p-4">
              <p className="text-sm font-medium text-slate-400">Jumlah Pesan</p>
              <p className="mt-3 text-3xl font-semibold text-white">{messageCount}</p>
              <p className="mt-2 text-xs text-slate-500">
                Termasuk pesan masuk dan keluar untuk video Anda.
              </p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-sm font-medium text-slate-400">Durasi Video</p>
              <p className="mt-3 text-3xl font-semibold text-white">{previewDurationSec}</p>
              <p className="mt-2 text-xs text-slate-500">Estimasi durasi animasi berdasarkan kecepatan chat.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-6">
            <section className="glass-panel p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Editor Pesan</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Ketik percakapan. Gunakan format <span className="text-slate-300">Nama Kontak: pesan</span> untuk pesan masuk.
                  </p>
                </div>
                <span className="badge-pill bg-cyan-500/10 text-cyan-200">Live sync</span>
              </div>
              <ChatVideoForm project={project} onProjectChange={setProject} />
            </section>

            <section className="glass-panel p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Tampilan & Output</p>
                  <p className="mt-2 text-sm text-slate-400">Sesuaikan tema, ukuran teks, dan format resolusi video.</p>
                </div>
                <span className="badge-pill bg-slate-800/70 text-slate-200">WhatsApp vibe</span>
              </div>
              <ChatVideoSettingsForm
                settings={project.settings}
                onSettingsChange={(settings) => setProject({ ...project, settings })}
                messageCount={messageCount}
                estimatedDurationSec={messageCount > 0 ? Math.ceil(getProjectVideoDurationMs(project) / 1000) : null}
              />
            </section>
          </div>

          <aside className="space-y-6">
            <section className="glass-panel relative overflow-hidden p-6 self-start">
              <div className="pointer-events-none absolute inset-x-6 top-6 h-40 rounded-3xl bg-gradient-to-b from-cyan-500/20 to-transparent blur-3xl opacity-70" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Preview HP Realistis</p>
                    <p className="text-xs text-slate-400">Lihat percakapan bergerak sebagai mockup perangkat.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live preview
                  </div>
                </div>
                <ChatVideoPreview project={project} />
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Kontrol Ekspor</p>
                  <p className="mt-1 text-xs text-slate-400">Siapkan video untuk download dengan progress bar instan.</p>
                </div>
                <span className="badge-pill bg-slate-800/70 text-slate-200">Export ready</span>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || !isReadyToGenerate}
                  className="btn btn-primary w-full justify-center"
                >
                  {isGenerating ? 'Membuat video…' : '📹 Generate Video'}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary w-full justify-center"
                >
                  Reset Proyek
                </button>

                {isGenerating && (
                  <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-3">
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Progress: {generationProgress}%</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Tema</p>
                  <p className="mt-2 text-sm font-semibold text-white">{project.settings.theme}</p>
                </div>
                <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Pop-up Chat</p>
                  <p className="mt-2 text-sm font-semibold text-white">{resolveMessageDelaySec(project.settings)}s</p>
                </div>
                <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Resolusi</p>
                  <p className="mt-2 text-sm font-semibold text-white">{project.settings.resolution}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
