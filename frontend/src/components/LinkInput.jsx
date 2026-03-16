import { useState } from 'react'
import { Link, ArrowRight } from 'lucide-react'

function isValidInstagramUrl(url) {
  try {
    const u = new URL(url)
    return (
      (u.hostname === 'www.instagram.com' || u.hostname === 'instagram.com') &&
      (u.pathname.includes('/reel/') ||
        u.pathname.includes('/reels/') ||
        u.pathname.includes('/p/'))
    )
  } catch {
    return false
  }
}

export default function LinkInput({ onSubmit }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const trimmed = url.trim()
    if (!trimmed) {
      setError('Cole um link do Instagram Reels para continuar.')
      return
    }
    if (!isValidInstagramUrl(trimmed)) {
      setError(
        'URL inválida. Use um link do tipo instagram.com/reel/... ou instagram.com/p/...'
      )
      return
    }

    setLoading(true)
    try {
      await onSubmit(trimmed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Cole o link do Reels aqui..."
            className="w-full rounded-xl border border-border bg-bg pl-9 pr-4 py-3 text-text placeholder:text-text-muted text-sm outline-none focus:border-accent transition-colors"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            <>
              Transcrever
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </form>
  )
}
