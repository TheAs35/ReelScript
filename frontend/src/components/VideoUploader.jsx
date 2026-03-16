import { useState, useRef } from 'react'
import { Upload, FileVideo, X } from 'lucide-react'

const ACCEPTED = '.mp4,.mov,.avi,.mkv,.webm'
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm']
const MAX_SIZE_MB = 500

export default function VideoUploader({ onUpload }) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  function validateFile(file) {
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return 'Formato não suportado. Use MP4, MOV, AVI, MKV ou WEBM.'
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Arquivo muito grande. Limite: ${MAX_SIZE_MB}MB.`
    }
    return null
  }

  function handleFile(file) {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setSelectedFile(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleInputChange(e) {
    const file = e.target.files[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleClear(e) {
    e.stopPropagation()
    setSelectedFile(null)
    setError(null)
  }

  async function handleUpload(e) {
    e.stopPropagation()
    if (!selectedFile) return
    setLoading(true)
    try {
      await onUpload(selectedFile)
    } finally {
      setLoading(false)
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !selectedFile && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !selectedFile && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-colors',
          dragOver
            ? 'border-accent bg-accent/5 cursor-copy'
            : selectedFile
            ? 'border-border bg-bg cursor-default'
            : 'border-border hover:border-accent/50 cursor-pointer',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleInputChange}
        />

        {selectedFile ? (
          <div className="flex w-full items-center gap-3">
            <FileVideo size={20} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{selectedFile.name}</p>
              <p className="text-xs text-text-muted">{formatSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={handleClear}
              className="shrink-0 rounded-lg p-1 text-text-muted hover:text-text transition-colors"
              aria-label="Remover arquivo"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={24} className="mb-3 text-text-muted" />
            <p className="text-sm text-text-muted text-center">
              Arraste o vídeo aqui ou{' '}
              <span className="text-accent font-medium">clique para selecionar</span>
            </p>
            <p className="mt-1 text-xs text-text-muted">
              MP4, MOV, AVI, MKV, WEBM · Máx {MAX_SIZE_MB}MB
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              Enviando...
            </span>
          ) : (
            'Transcrever vídeo'
          )}
        </button>
      )}
    </div>
  )
}
