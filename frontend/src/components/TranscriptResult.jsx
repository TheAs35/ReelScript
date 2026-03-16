import { useState } from 'react'
import { Copy, Download, FileText, ArrowLeft, ChevronDown, ChevronUp, Check } from 'lucide-react'

const LANGUAGE_NAMES = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
}

function formatDuration(seconds) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function TranscriptResult({ data, jobId, onReset }) {
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const { transcript, segments, language, duration } = data

  const langLabel = LANGUAGE_NAMES[language] || language?.toUpperCase() || 'Desconhecido'
  const durationLabel = formatDuration(duration)

  // Format transcript with line breaks per segment for readability
  const formattedTranscript = segments && segments.length > 0
    ? segments.map((seg) => seg.text.trim()).filter(Boolean).join('\n\n')
    : transcript

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formattedTranscript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = formattedTranscript
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleDownload(type) {
    window.location.href = `/api/download/${type}/${jobId}`
  }

  return (
    <div className="space-y-4">
      {/* Meta info */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-wrap items-center gap-4 text-sm">
        <div>
          <span className="text-text-muted">Idioma detectado: </span>
          <span className="font-medium text-text">{langLabel}</span>
        </div>
        {durationLabel && (
          <div>
            <span className="text-text-muted">Duração: </span>
            <span className="font-medium text-text">{durationLabel}</span>
          </div>
        )}
      </div>

      {/* Transcript block */}
      <div className="rounded-2xl border border-border bg-card p-5 relative">
        <div className={expanded ? '' : 'max-h-48 overflow-hidden'}>
          <p className="text-[15px] leading-7 text-text whitespace-pre-wrap">
            {formattedTranscript}
          </p>
        </div>
        {!expanded && formattedTranscript.length > 300 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent pt-12 pb-4 flex justify-center rounded-b-2xl">
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-text hover:border-accent/50 transition-colors"
            >
              <ChevronDown size={14} />
              Ver mais
            </button>
          </div>
        )}
        {expanded && formattedTranscript.length > 300 && (
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1.5 mt-4 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ChevronUp size={14} />
            Ver menos
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopy}
          className={[
            'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
            copied
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border bg-card text-text hover:border-accent/50',
          ].join(' ')}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>

        <button
          onClick={() => handleDownload('txt')}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text hover:border-accent/50 transition-colors"
        >
          <Download size={15} />
          .txt
        </button>

        <button
          onClick={() => handleDownload('srt')}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text hover:border-accent/50 transition-colors"
        >
          <FileText size={15} />
          .srt
        </button>
      </div>

      {/* Timestamps section */}
      {segments && segments.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setShowTimestamps((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-text hover:bg-white/5 transition-colors"
          >
            <span>Ver com timestamps</span>
            {showTimestamps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTimestamps && (
            <div className="border-t border-border px-5 py-4 space-y-2 max-h-80 overflow-y-auto">
              {segments.map((seg, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 font-mono text-accent">
                    [{formatTimestamp(seg.start)}]
                  </span>
                  <span className="text-text">{seg.text.trim()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset button */}
      <button
        onClick={onReset}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={15} />
        Nova Transcrição
      </button>
    </div>
  )
}
