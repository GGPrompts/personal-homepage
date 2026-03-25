"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ConversationEntry } from '@/lib/ai/jsonl-parser'
import { entriesToMessages, type ParsedMessage } from '@/lib/ai/jsonl-parser'

interface UseSessionStreamOptions {
  path: string | null
  enabled?: boolean
}

interface UseSessionStreamReturn {
  messages: ParsedMessage[]
  isStreaming: boolean
  isConnected: boolean
  isWaiting: boolean
  error: string | null
  reconnect: () => void
  /** Whether the initial load was truncated (file too large) */
  isTruncated: boolean
  /** Load the full conversation history (re-reads entire file) */
  loadFullHistory: () => void
  /** Whether full history is currently loading */
  isLoadingFull: boolean
}

export function useSessionStream({ path, enabled = true }: UseSessionStreamOptions): UseSessionStreamReturn {
  const [entries, setEntries] = useState<ConversationEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [messages, setMessages] = useState<ParsedMessage[]>([])
  const [reconnectKey, setReconnectKey] = useState(0)
  const [isTruncated, setIsTruncated] = useState(false)
  const [isLoadingFull, setIsLoadingFull] = useState(false)
  const [loadFull, setLoadFull] = useState(false)

  const lastUpdateRef = useRef<number>(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const batchedEntriesRef = useRef<ConversationEntry[]>([])
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushBatch = useCallback(() => {
    if (batchedEntriesRef.current.length === 0) return
    const newEntries = [...batchedEntriesRef.current]
    batchedEntriesRef.current = []
    batchTimerRef.current = null

    setEntries(prev => {
      const updated = [...prev, ...newEntries]
      setMessages(entriesToMessages(updated))
      return updated
    })

    lastUpdateRef.current = Date.now()
    setIsStreaming(true)

    if (streamingTimerRef.current) clearTimeout(streamingTimerRef.current)
    streamingTimerRef.current = setTimeout(() => setIsStreaming(false), 3000)
  }, [])

  useEffect(() => {
    if (!path || !enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
      return
    }

    setEntries([])
    setMessages([])
    setError(null)
    setIsConnected(false)
    setIsStreaming(false)

    const streamUrl = `/api/ai/stream?path=${encodeURIComponent(path)}${loadFull ? '&full=true' : ''}`
    const es = new EventSource(streamUrl)
    eventSourceRef.current = es

    es.addEventListener('waiting', () => {
      setIsWaiting(true)
      setIsConnected(true)
      setError(null)
    })

    es.addEventListener('initial', (event) => {
      try {
        const data = JSON.parse(event.data)
        const initialEntries = data.entries as ConversationEntry[]
        setEntries(initialEntries)
        setMessages(entriesToMessages(initialEntries))
        setIsConnected(true)
        setIsWaiting(false)
        setError(null)
        setIsTruncated(!!data.truncated)
        setIsLoadingFull(false)
      } catch {
        setError('Failed to parse initial data')
      }
    })

    es.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data)
        const newEntries = data.entries as ConversationEntry[]

        batchedEntriesRef.current.push(...newEntries)

        if (!batchTimerRef.current) {
          const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
          const delay = timeSinceLastUpdate > 1000 ? 0 : 500
          batchTimerRef.current = setTimeout(flushBatch, delay)
        }
      } catch {
        // skip malformed updates
      }
    })

    es.addEventListener('reset', () => {
      batchedEntriesRef.current = []
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
        batchTimerRef.current = null
      }
      setEntries([])
      setMessages([])
    })

    es.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data)
        setError(data.message || 'Stream error')
      } catch {
        // SSE connection error — the browser auto-reconnects
      }
    })

    es.onerror = () => {
      setIsConnected(false)
      if (es.readyState === EventSource.CLOSED) {
        setError('Connection lost')
      }
    }

    es.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    return () => {
      es.close()
      eventSourceRef.current = null
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
        batchTimerRef.current = null
      }
      if (streamingTimerRef.current) {
        clearTimeout(streamingTimerRef.current)
        streamingTimerRef.current = null
      }
    }
  }, [path, enabled, reconnectKey, loadFull, flushBatch])

  const reconnect = useCallback(() => {
    setReconnectKey(k => k + 1)
    setError(null)
  }, [])

  const loadFullHistory = useCallback(() => {
    setIsLoadingFull(true)
    setLoadFull(true)
    setReconnectKey(k => k + 1)
  }, [])

  return { messages, isStreaming, isConnected, isWaiting, error, reconnect, isTruncated, loadFullHistory, isLoadingFull }
}
