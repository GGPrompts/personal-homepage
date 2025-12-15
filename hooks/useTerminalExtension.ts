"use client"

import { useState, useEffect, useCallback } from "react"

// TabzChrome REST API configuration
const TABZ_API_BASE = "http://localhost:8129"
const TOKEN_STORAGE_KEY = "tabz-api-token"
const DEFAULT_WORKDIR_KEY = "tabz-default-workdir"

function getDefaultWorkDir(): string {
  if (typeof window === "undefined") return "~/projects"
  try {
    return localStorage.getItem(DEFAULT_WORKDIR_KEY) || "~/projects"
  } catch {
    return "~/projects"
  }
}

function setDefaultWorkDir(dir: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DEFAULT_WORKDIR_KEY, dir)
  } catch {
    // Ignore storage errors
  }
}

// Check if we're running on localhost (safe to probe local network)
function isLocalhost(): boolean {
  if (typeof window === "undefined") return false
  const hostname = window.location.hostname
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")
}

interface TerminalState {
  available: boolean
  backendRunning: boolean
  authenticated: boolean
  error: string | null
}

interface SpawnResult {
  success: boolean
  error?: string
  terminal?: {
    id: string
    name: string
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredToken(token: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // Ignore storage errors
  }
}

function clearStoredToken(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

export function useTerminalExtension() {
  const [state, setState] = useState<TerminalState>({
    available: false,
    backendRunning: false,
    authenticated: false,
    error: null,
  })
  const [token, setToken] = useState<string | null>(null)
  const [defaultWorkDir, setDefaultWorkDirState] = useState<string>(() => getDefaultWorkDir())
  const [isLoaded, setIsLoaded] = useState(false)

  // Try to fetch token from backend (only when on localhost to avoid permission prompts)
  const fetchTokenFromBackend = useCallback(async (): Promise<string | null> => {
    // Don't probe localhost from remote sites - causes browser permission prompts
    if (!isLocalhost()) return null

    try {
      const response = await fetch(`${TABZ_API_BASE}/api/auth/token`, {
        method: "GET",
      })
      if (response.ok) {
        const data = await response.json()
        return data.token || null
      }
    } catch {
      // Backend not reachable - expected when backend isn't running
    }
    return null
  }, [])

  // Check if backend is running and we have valid auth
  // skipProbe: true = don't make network requests (for remote sites on init)
  const checkBackend = useCallback(async (authToken: string | null, skipProbe = false): Promise<TerminalState> => {
    // From remote sites, don't auto-probe - just check if we have a stored token
    if (skipProbe) {
      if (!authToken) {
        return {
          available: false,
          backendRunning: false, // unknown
          authenticated: false,
          error: "API token required. Paste from TabzChrome extension Settings > API Token",
        }
      }
      // Have a token but haven't verified - optimistically assume it works
      return {
        available: true,
        backendRunning: true, // assume true since we have a token
        authenticated: true,
        error: null,
      }
    }

    // On localhost, actually check if backend is running
    try {
      const response = await fetch(`${TABZ_API_BASE}/api/health`, {
        method: "GET",
      })
      if (!response.ok) {
        return {
          available: false,
          backendRunning: false,
          authenticated: false,
          error: "TabzChrome backend not responding",
        }
      }
    } catch {
      return {
        available: false,
        backendRunning: false,
        authenticated: false,
        error: "TabzChrome backend not running. Start the backend on localhost:8129",
      }
    }

    // Backend is running - check if we have a token
    if (!authToken) {
      return {
        available: false,
        backendRunning: true,
        authenticated: false,
        error: "API token required. Copy from TabzChrome extension Settings > API Token",
      }
    }

    // We have a token - verify it works by attempting a lightweight call
    // The spawn endpoint will validate the token
    return {
      available: true,
      backendRunning: true,
      authenticated: true,
      error: null,
    }
  }, [])

  // Initialize - try to get token and check backend
  useEffect(() => {
    const init = async () => {
      const onLocalhost = isLocalhost()

      // First, try to fetch token from backend (only on localhost)
      let authToken = await fetchTokenFromBackend()

      // If that failed, use stored token
      if (!authToken) {
        authToken = getStoredToken()
      } else {
        // If we fetched from backend, store it for future use
        setStoredToken(authToken)
      }

      setToken(authToken)

      // Skip network probe from remote sites to avoid permission prompts
      const newState = await checkBackend(authToken, !onLocalhost)
      setState(newState)
      setIsLoaded(true)
    }

    init()
  }, [fetchTokenFromBackend, checkBackend])

  // Run a command in the terminal via REST API
  const runCommand = useCallback(
    async (command: string, options?: { workingDir?: string; name?: string }): Promise<SpawnResult> => {
      const currentToken = token || getStoredToken()

      if (!currentToken) {
        return {
          success: false,
          error: "API token required. Add your TabzChrome API token in Profile settings.",
        }
      }

      try {
        // Use default workDir if none provided
        const workingDir = options?.workingDir || defaultWorkDir || getDefaultWorkDir()

        const response = await fetch(`${TABZ_API_BASE}/api/spawn`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": currentToken,
          },
          body: JSON.stringify({
            name: options?.name || "Terminal",
            workingDir,
            command,
          }),
        })

        const data = await response.json()

        if (response.status === 401 || response.status === 403) {
          // Token is invalid
          setState(prev => ({
            ...prev,
            authenticated: false,
            available: false,
            error: "Invalid API token. Copy a fresh token from TabzChrome extension Settings > API Token",
          }))
          return {
            success: false,
            error: "Authentication failed. Your API token may be expired or invalid.",
          }
        }

        if (!response.ok) {
          return {
            success: false,
            error: data.error || `Request failed with status ${response.status}`,
          }
        }

        if (data.success) {
          return {
            success: true,
            terminal: data.terminal,
          }
        } else {
          return {
            success: false,
            error: data.error || "Unknown error",
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"

        // Check if it's a network error (backend not running)
        if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
          setState({
            available: false,
            backendRunning: false,
            authenticated: false,
            error: "TabzChrome backend not running. Start the backend on localhost:8129",
          })
          return {
            success: false,
            error: "Cannot connect to TabzChrome backend. Make sure it's running on localhost:8129",
          }
        }

        return {
          success: false,
          error: errorMessage,
        }
      }
    },
    [token, defaultWorkDir]
  )

  // Set default working directory
  const updateDefaultWorkDir = useCallback((dir: string) => {
    setDefaultWorkDir(dir)
    setDefaultWorkDirState(dir)
  }, [])

  // Set API token manually (for settings UI)
  const setApiToken = useCallback(
    async (newToken: string): Promise<boolean> => {
      if (!newToken.trim()) {
        return false
      }

      // Store the token
      setStoredToken(newToken.trim())
      setToken(newToken.trim())

      // Check if it works
      const newState = await checkBackend(newToken.trim())
      setState(newState)

      return newState.authenticated
    },
    [checkBackend]
  )

  // Clear API token
  const clearApiToken = useCallback(() => {
    clearStoredToken()
    setToken(null)
    setState(prev => ({
      ...prev,
      authenticated: false,
      available: false,
      error: "API token required. Copy from TabzChrome extension Settings > API Token",
    }))
  }, [])

  // Refresh connection status
  const refreshStatus = useCallback(async () => {
    // Try to fetch token from backend first
    let authToken = await fetchTokenFromBackend()

    if (!authToken) {
      authToken = getStoredToken()
    } else {
      setStoredToken(authToken)
    }

    setToken(authToken)
    const newState = await checkBackend(authToken)
    setState(newState)

    return newState.available
  }, [fetchTokenFromBackend, checkBackend])

  return {
    // Status
    available: state.available,
    backendRunning: state.backendRunning,
    authenticated: state.authenticated,
    error: state.error,
    isLoaded,
    hasToken: !!token,
    defaultWorkDir,

    // Actions
    runCommand,
    setApiToken,
    clearApiToken,
    refreshStatus,
    updateDefaultWorkDir,
  }
}
