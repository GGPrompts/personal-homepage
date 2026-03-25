'use client'
import { useState, useEffect } from 'react'

export function useTabzConnected() {
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    fetch('http://localhost:8129/health', { signal: AbortSignal.timeout(2000) })
      .then(r => setConnected(r.ok))
      .catch(() => setConnected(false))
  }, [])
  return connected
}
