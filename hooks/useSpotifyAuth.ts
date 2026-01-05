"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getTokens,
  clearTokens,
  isTokenExpired,
  startAuthFlow,
  exchangeCodeForTokens,
  getCurrentUser,
  getClientId,
  setClientId,
  type SpotifyTokens,
  type SpotifyUser,
} from "@/lib/spotify"

export interface UseSpotifyAuthReturn {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  user: SpotifyUser | null
  error: string | null

  // Client ID management
  clientId: string | null
  setClientId: (id: string) => void
  hasClientId: boolean

  // Auth actions
  login: () => Promise<void>
  logout: () => void

  // Token info
  tokens: SpotifyTokens | null
  isPremium: boolean
}

/**
 * Hook for managing Spotify authentication
 *
 * Handles:
 * - Token storage and validation
 * - OAuth PKCE flow initiation
 * - Callback handling via postMessage
 * - User profile fetching
 * - Premium status checking
 */
export function useSpotifyAuth(): UseSpotifyAuthReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientIdState, setClientIdState] = useState<string | null>(null)

  const authPopupRef = useRef<Window | null>(null)

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoading(true)

      // Load client ID
      const storedClientId = getClientId()
      setClientIdState(storedClientId)

      // Load tokens
      const storedTokens = getTokens()

      if (storedTokens && !isTokenExpired(storedTokens)) {
        setTokens(storedTokens)

        // Fetch user profile
        try {
          const userProfile = await getCurrentUser()
          setUser(userProfile)
        } catch (err) {
          console.error("Failed to fetch Spotify user:", err)
          // Token might be invalid, clear it
          clearTokens()
          setTokens(null)
          setError("Session expired. Please login again.")
        }
      }

      setIsLoading(false)
    }

    loadInitialState()
  }, [])

  // Handle messages from auth popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from our origin
      if (event.origin !== window.location.origin) return

      if (event.data?.type === "spotify-auth-callback") {
        const { code, state } = event.data

        if (code && state) {
          setIsLoading(true)
          setError(null)

          try {
            // Exchange code for tokens
            const newTokens = await exchangeCodeForTokens(code, state)
            setTokens(newTokens)

            // Fetch user profile
            const userProfile = await getCurrentUser()
            setUser(userProfile)

            // Close popup if it's still open
            if (authPopupRef.current && !authPopupRef.current.closed) {
              authPopupRef.current.close()
            }
          } catch (err) {
            console.error("Failed to complete Spotify auth:", err)
            setError(err instanceof Error ? err.message : "Authentication failed")
          } finally {
            setIsLoading(false)
          }
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  // Check for pending auth from redirect (non-popup flow)
  useEffect(() => {
    const checkPendingAuth = async () => {
      const code = sessionStorage.getItem("spotify-auth-code")
      const state = sessionStorage.getItem("spotify-auth-state")

      if (code && state) {
        // Clear code immediately to prevent re-execution on re-render
        // Note: Don't remove state yet - exchangeCodeForTokens needs it for CSRF verification
        sessionStorage.removeItem("spotify-auth-code")

        setIsLoading(true)
        setError(null)

        try {
          const newTokens = await exchangeCodeForTokens(code, state)
          setTokens(newTokens)

          const userProfile = await getCurrentUser()
          setUser(userProfile)
        } catch (err) {
          console.error("Failed to complete Spotify auth:", err)
          setError(err instanceof Error ? err.message : "Authentication failed")
        } finally {
          setIsLoading(false)
        }
      }
    }

    checkPendingAuth()
  }, [])

  // Update client ID
  const handleSetClientId = useCallback((id: string) => {
    setClientId(id)
    setClientIdState(id)
  }, [])

  // Start login flow
  const login = useCallback(async () => {
    if (!clientIdState) {
      setError("Please configure your Spotify Client ID first")
      return
    }

    setError(null)

    try {
      // Start OAuth PKCE flow - this will redirect to Spotify
      await startAuthFlow()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start authentication")
    }
  }, [clientIdState])

  // Logout
  const logout = useCallback(() => {
    clearTokens()
    setTokens(null)
    setUser(null)
    setError(null)
  }, [])

  const isAuthenticated = !!tokens && !!user && !isTokenExpired(tokens)
  const isPremium = user?.product === "premium"
  const hasClientId = !!clientIdState

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    clientId: clientIdState,
    setClientId: handleSetClientId,
    hasClientId,
    login,
    logout,
    tokens,
    isPremium,
  }
}
