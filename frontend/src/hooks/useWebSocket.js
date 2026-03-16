import { useEffect, useRef, useState, useCallback } from 'react'

const INITIAL_STEPS = [
  { id: 1, name: 'Baixando vídeo', status: 'pending', progress: null },
  { id: 2, name: 'Extraindo áudio', status: 'pending', progress: null },
  { id: 3, name: 'Transcrevendo', status: 'pending', progress: null },
  { id: 4, name: 'Pronto', status: 'pending', progress: null },
]

export default function useWebSocket(jobId, { onComplete } = {}) {
  const [steps, setSteps] = useState(INITIAL_STEPS)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const updateStep = useCallback((stepId, updates) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    )
  }, [])

  const handleMessage = useCallback(
    (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.type === 'complete') {
        updateStep(4, { status: 'done' })
        setProgress(100)
        setResult(msg)
        if (onCompleteRef.current) onCompleteRef.current(msg)
        return
      }

      if (msg.type === 'error') {
        setError(msg.message || 'Ocorreu um erro durante o processamento')
        return
      }

      // Step progress messages
      if (msg.step !== undefined) {
        updateStep(msg.step, {
          status: msg.status === 'done' ? 'done' : 'processing',
          progress: msg.progress ?? null,
        })

        // Calculate overall progress
        if (msg.step === 1) {
          setProgress(msg.status === 'done' ? 25 : 10)
        } else if (msg.step === 2) {
          setProgress(msg.status === 'done' ? 50 : 35)
        } else if (msg.step === 3) {
          if (msg.progress != null) {
            // Map transcription progress (0-100) to overall progress (50-95)
            setProgress(50 + Math.round((msg.progress / 100) * 45))
          } else if (msg.status === 'done') {
            setProgress(95)
            updateStep(4, { status: 'processing' })
          }
        }
      }
    },
    [updateStep]
  )

  const connect = useCallback(() => {
    if (!jobId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/${jobId}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      reconnectAttemptsRef.current = 0
    }

    ws.onmessage = handleMessage

    ws.onerror = () => {
      setIsConnected(false)
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      wsRef.current = null

      // Don't reconnect if job is done or closed cleanly (code 1000)
      if (event.code === 1000 || result) return

      const attempts = reconnectAttemptsRef.current
      if (attempts < 5) {
        const delay = Math.min(1000 * 2 ** attempts, 16000)
        reconnectAttemptsRef.current = attempts + 1
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      } else {
        setError('Conexão perdida. Recarregue a página para tentar novamente.')
      }
    }
  }, [jobId, handleMessage, result])

  useEffect(() => {
    if (!jobId) return

    // Reset state when a new jobId arrives
    setSteps(INITIAL_STEPS)
    setProgress(0)
    setResult(null)
    setError(null)
    reconnectAttemptsRef.current = 0

    connect()

    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional unmount
        wsRef.current.close(1000)
        wsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  return { steps, progress, result, error, isConnected }
}
