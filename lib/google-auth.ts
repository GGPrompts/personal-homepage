/**
 * Google OAuth2 Flow + API utilities
 *
 * This module handles Google authentication for Gmail and Calendar APIs.
 * Uses server-side token exchange (requires client secret) for full refresh token support.
 */

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

// Required scopes for Gmail and Calendar
export const GOOGLE_SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  // Calendar
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  // User profile (for display)
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

// Token storage keys
const TOKEN_STORAGE_KEY = 'google-tokens'
const STATE_STORAGE_KEY = 'google-auth-state'

// Types
export interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number // Unix timestamp in ms
  tokenType: string
  scope: string
}

export interface GoogleUser {
  id: string
  email: string
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  verified_email: boolean
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a cryptographically random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get the Google Client ID from environment or localStorage
 */
export function getClientId(): string | null {
  // First check environment variable
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  }
  // Then check localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('google-client-id')
  }
  return null
}

/**
 * Set the Google Client ID in localStorage
 */
export function setClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('google-client-id', clientId)
  }
}

/**
 * Get the redirect URI for OAuth callback
 */
export function getRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth/google/callback`
  }
  return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
}

// ============================================================================
// Authentication Flow
// ============================================================================

/**
 * Start the OAuth authorization flow
 * Redirects user to Google login page
 */
export function startAuthFlow(): void {
  const clientId = getClientId()
  if (!clientId) {
    throw new Error('Google Client ID not configured. Please add it in Settings.')
  }

  // Generate state for CSRF protection
  const state = generateState()

  // Store state for later verification
  sessionStorage.setItem(STATE_STORAGE_KEY, state)

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    state: state,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent to ensure refresh token
    include_granted_scopes: 'true',
  })

  // Redirect to Google
  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Verify the state parameter from OAuth callback
 */
export function verifyState(state: string): boolean {
  const storedState = sessionStorage.getItem(STATE_STORAGE_KEY)
  const isValid = state === storedState
  if (isValid) {
    sessionStorage.removeItem(STATE_STORAGE_KEY)
  }
  return isValid
}

/**
 * Exchange authorization code for tokens via server-side route
 * This is called after the OAuth callback
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch('/api/auth/google/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Failed to exchange code for tokens')
  }

  const tokens = await response.json()
  saveTokens(tokens)
  return tokens
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<GoogleTokens> {
  const tokens = getTokens()
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch('/api/auth/google/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    // If refresh fails, clear tokens and require re-auth
    clearTokens()
    throw new Error(error.error || 'Failed to refresh token')
  }

  const newTokens = await response.json()

  // Preserve refresh token if not returned in response
  const updatedTokens: GoogleTokens = {
    ...newTokens,
    refreshToken: newTokens.refreshToken || tokens.refreshToken,
  }

  saveTokens(updatedTokens)
  return updatedTokens
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Simple encryption for token storage (basic obfuscation)
 * Note: This is NOT secure encryption - just basic obfuscation for localStorage
 * For production, consider using a more secure approach like encrypted cookies
 */
function encodeTokens(tokens: GoogleTokens): string {
  const json = JSON.stringify(tokens)
  // Simple base64 encoding with a prefix to identify encoded data
  return 'enc:' + btoa(encodeURIComponent(json))
}

function decodeTokens(encoded: string): GoogleTokens | null {
  try {
    if (!encoded.startsWith('enc:')) {
      // Legacy unencoded format
      return JSON.parse(encoded)
    }
    const base64 = encoded.slice(4)
    const json = decodeURIComponent(atob(base64))
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Save tokens to localStorage
 */
export function saveTokens(tokens: GoogleTokens): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, encodeTokens(tokens))
  }
}

/**
 * Get tokens from localStorage
 */
export function getTokens(): GoogleTokens | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return null
    return decodeTokens(stored)
  } catch {
    return null
  }
}

/**
 * Clear all stored tokens (disconnect)
 */
export function clearTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

/**
 * Check if tokens are expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(tokens: GoogleTokens | null): boolean {
  if (!tokens) return true
  // Consider expired if less than 5 minutes remaining
  return Date.now() >= tokens.expiresAt - (5 * 60 * 1000)
}

/**
 * Get a valid access token, refreshing if needed
 */
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = getTokens()

  if (!tokens) return null

  if (isTokenExpired(tokens)) {
    try {
      tokens = await refreshAccessToken()
    } catch {
      return null
    }
  }

  return tokens.accessToken
}

/**
 * Revoke access and clear tokens
 */
export async function revokeAccess(): Promise<void> {
  const tokens = getTokens()
  if (tokens?.accessToken) {
    try {
      // Revoke the token on Google's side
      await fetch(`${GOOGLE_REVOKE_URL}?token=${tokens.accessToken}`, {
        method: 'POST',
      })
    } catch {
      // Ignore errors - we'll clear local tokens anyway
    }
  }
  clearTokens()
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Make an authenticated request to Google APIs
 */
export async function googleFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error('Not authenticated with Google')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    // Token might have expired, try refresh
    try {
      await refreshAccessToken()
      return googleFetch(url, options)
    } catch {
      clearTokens()
      throw new Error('Session expired - please login again')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Google API error: ${response.status}`)
  }

  // Handle empty response body
  const text = await response.text()
  if (!text) return {} as T

  return JSON.parse(text)
}

/**
 * Get the current user's Google profile
 */
export async function getCurrentUser(): Promise<GoogleUser> {
  return googleFetch(GOOGLE_USERINFO_URL)
}

/**
 * Check if user is connected to Google
 */
export function isConnected(): boolean {
  const tokens = getTokens()
  return tokens !== null && !isTokenExpired(tokens)
}

/**
 * Get connection status info
 */
export function getConnectionStatus(): {
  connected: boolean
  hasTokens: boolean
  expired: boolean
} {
  const tokens = getTokens()
  return {
    connected: tokens !== null && !isTokenExpired(tokens),
    hasTokens: tokens !== null,
    expired: tokens !== null && isTokenExpired(tokens),
  }
}
