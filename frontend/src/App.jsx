import { useState } from 'react'
import LinkInput from './components/LinkInput.jsx'
import VideoUploader from './components/VideoUploader.jsx'
import ModelSelector from './components/ModelSelector.jsx'
import LanguageSelector from './components/LanguageSelector.jsx'
import ProgressStatus from './components/ProgressStatus.jsx'
import TranscriptResult from './components/TranscriptResult.jsx'
import useWebSocket from './hooks/useWebSocket.js'

export default function App() {
  const [appState, setAppState] = useState('input') // 'input' | 'processing' | 'result'
  const [jobId, setJobId] = useState(null)
  const [model, setModel] = useState('base')
  const [language, setLanguage] = useState('auto')
  const [transcriptData, setTranscriptData] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  const { steps, progress, result, error: wsError, isConnected } = useWebSocket(
    appState === 'processing' ? jobId : null,
    {
      onComplete: (data) => {
        setTranscriptData(data)
        setAppState('result')
      },
    }
  )

  async function handleLinkSubmit(url) {
    setSubmitError(null)
    try {
      const res = await fetch('/api/transcribe/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, model, language }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Erro ${res.status}`)
      }
      const { job_id } = await res.json()
      setJobId(job_id)
      setAppState('processing')
    } catch (err) {
      setSubmitError(err.message || 'Erro ao iniciar transcrição')
    }
  }

  async function handleFileUpload(file) {
    setSubmitError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('model', model)
      formData.append('language', language)

      const res = await fetch('/api/transcribe/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Erro ${res.status}`)
      }
      const { job_id } = await res.json()
      setJobId(job_id)
      setAppState('processing')
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar vídeo')
    }
  }

  function handleReset() {
    setAppState('input')
    setJobId(null)
    setTranscriptData(null)
    setSubmitError(null)
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-[720px] px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            🎬 ReelScript
          </h1>
          <p className="mt-2 text-text-muted text-lg">
            Transcreva Reels em segundos
          </p>
        </div>

        {/* Input State */}
        {appState === 'input' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <LinkInput onSubmit={handleLinkSubmit} />

              <div className="flex items-center gap-3 text-text-muted text-sm">
                <div className="flex-1 h-px bg-border" />
                <span>ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <VideoUploader onUpload={handleFileUpload} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs text-text-muted mb-1 font-medium uppercase tracking-wide">
                  Modelo Whisper
                </label>
                <ModelSelector value={model} onChange={setModel} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-muted mb-1 font-medium uppercase tracking-wide">
                  Idioma
                </label>
                <LanguageSelector value={language} onChange={setLanguage} />
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-red-400 text-sm">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {appState === 'processing' && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <ProgressStatus
              steps={steps}
              progress={progress}
              error={wsError}
              isConnected={isConnected}
            />
          </div>
        )}

        {/* Result State */}
        {appState === 'result' && transcriptData && (
          <TranscriptResult
            data={transcriptData}
            jobId={jobId}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}
