import * as React from 'react'
import {
  getTokens,
  clearTokens,
  isTokenExpired,
  getValidAccessToken,
  getCurrentUser,
  revokeAccess,
  type GoogleTokens,
  type GoogleUser,
} from '@/lib/google-auth'

export interface UseGoogleAuthReturn {
  // Connection state
  isConnected: boolean
  isLoading: boolean
  error: string | null

  // User info (when connected)
  user: GoogleUser | null

  // Token info
  tokens: GoogleTokens | null
  isExpired: boolean

  // Actions
  connect: () => void
  disconnect: () => Promise<void>
  refreshStatus: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

/**
 * Hook for managing Google OAuth connection state
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isConnected, setIsConnected] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [user, setUser] = React.useState<GoogleUser | null>(null)
  const [tokens, setTokens] = React.useState<GoogleTokens | null>(null)

  // Check connection status on mount and when window gains focus
  const checkStatus = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const storedTokens = getTokens()
      setTokens(storedTokens)

      if (!storedTokens) {
        setIsConnected(false)
        setUser(null)
        return
      }

      // Check if tokens are expired
      if (isTokenExpired(storedTokens)) {
        // Try to refresh
        try {
          const token = await getValidAccessToken()
          if (!token) {
            setIsConnected(false)
            setUser(null)
            return
          }
          // Update tokens after refresh
          setTokens(getTokens())
        } catch {
          setIsConnected(false)
          setUser(null)
          return
        }
      }

      // Fetch user info
      try {
        const userInfo = await getCurrentUser()
        setUser(userInfo)
        setIsConnected(true)
      } catch (err) {
        // Token might be invalid
        setIsConnected(false)
        setUser(null)
        setError(err instanceof Error ? err.message : 'Failed to get user info')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial check on mount
  React.useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Check on window focus (in case tokens were updated in another tab)
  React.useEffect(() => {
    const handleFocus = () => {
      checkStatus()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [checkStatus])

  // Check for auth success in URL params
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    if (params.get('google-auth') === 'success') {
      // Remove the param from URL
      params.delete('google-auth')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)

      // Refresh status
      checkStatus()
    }
  }, [checkStatus])

  // Connect - redirect to OAuth flow
  const connect = React.useCallback(() => {
    // Use server-side redirect for better security
    window.location.href = '/api/auth/google'
  }, [])

  // Disconnect - revoke and clear tokens
  const disconnect = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await revokeAccess()
    } catch {
      // Ignore errors, we'll clear local tokens anyway
    }
    clearTokens()
    setIsConnected(false)
    setUser(null)
    setTokens(null)
    setIsLoading(false)
  }, [])

  // Get access token (with auto-refresh)
  const getAccessToken = React.useCallback(async () => {
    try {
      return await getValidAccessToken()
    } catch {
      return null
    }
  }, [])

  return {
    isConnected,
    isLoading,
    error,
    user,
    tokens,
    isExpired: tokens ? isTokenExpired(tokens) : false,
    connect,
    disconnect,
    refreshStatus: checkStatus,
    getAccessToken,
  }
}
