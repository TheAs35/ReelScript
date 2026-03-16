import { AlertCircle, Wifi, WifiOff } from 'lucide-react'

function StepIcon({ status }) {
  if (status === 'done') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-black text-xs font-bold">
        ✓
      </span>
    )
  }
  if (status === 'processing') {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-accent animate-pulse" />
      </span>
    )
  }
  // pending
  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <span className="h-3 w-3 rounded-full border border-border" />
    </span>
  )
}

export default function ProgressStatus({ steps, progress, error, isConnected }) {
  return (
    <div className="space-y-6">
      {/* Connection indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Processando...</h2>
        <span
          className={[
            'flex items-center gap-1.5 text-xs',
            isConnected ? 'text-accent' : 'text-text-muted',
          ].join(' ')}
        >
          {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isConnected ? 'Conectado' : 'Reconectando...'}
        </span>
      </div>

      {/* Steps list */}
      <ul className="space-y-4">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3">
            <StepIcon status={step.status} />
            <span
              className={[
                'text-sm',
                step.status === 'pending' ? 'text-text-muted' : 'text-text',
              ].join(' ')}
            >
              {step.name}
              {step.status === 'processing' && step.progress != null && (
                <span className="ml-2 text-accent font-medium">{step.progress}%</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Progresso</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
