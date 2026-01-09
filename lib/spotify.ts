/**
 * Spotify OAuth PKCE Flow + API utilities
 *
 * This module handles Spotify authentication using the Authorization Code with PKCE flow.
 * No client secret is needed - the code verifier/challenge provides security.
 */

// Spotify API endpoints
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// Required scopes for full playback control
export const SPOTIFY_SCOPES = [
  // Playback control
  'streaming',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
  // User profile
  'user-read-email',
  'user-read-private',
  // Listening history
  'user-read-recently-played',
  'user-top-read',
  // Library
  'user-library-read',
  'user-library-modify',
  // Following
  'user-follow-read',
  'user-follow-modify',
  // Playlists
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ')

// Token storage keys
const TOKEN_STORAGE_KEY = 'spotify-tokens'
const VERIFIER_STORAGE_KEY = 'spotify-code-verifier'
const STATE_STORAGE_KEY = 'spotify-auth-state'

// Types
export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
  tokenType: string
  scope: string
}

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: Array<{ url: string; height: number; width: number }>
  product: 'premium' | 'free' | 'open'
  country: string
}

export interface SpotifyTrack {
  id: string
  name: string
  uri: string
  duration_ms: number
  explicit: boolean
  artists: Array<{ id: string; name: string; uri: string }>
  album: {
    id: string
    name: string
    uri: string
    images: Array<{ url: string; height: number; width: number }>
    release_date: string
  }
  is_playable?: boolean
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  uri: string
  images: Array<{ url: string; height: number; width: number }>
  owner: { id: string; display_name: string }
  tracks: { total: number; href: string }
  public: boolean
}

export interface SpotifyPlaybackState {
  is_playing: boolean
  progress_ms: number | null
  item: SpotifyTrack | null
  device: {
    id: string
    name: string
    type: string
    volume_percent: number
    is_active: boolean
  } | null
  shuffle_state: boolean
  repeat_state: 'off' | 'track' | 'context'
}

export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export interface SpotifySearchResults {
  tracks?: { items: SpotifyTrack[]; total: number }
  artists?: { items: Array<{ id: string; name: string; images: Array<{ url: string }> }>; total: number }
  albums?: { items: Array<{ id: string; name: string; images: Array<{ url: string }>; artists: Array<{ name: string }> }>; total: number }
  playlists?: { items: SpotifyPlaylist[]; total: number }
}

// ============================================================================
// PKCE Utilities
// ============================================================================

/**
 * Generate a cryptographically random code verifier (43-128 chars)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

/**
 * Generate a code challenge from the verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(digest))
}

/**
 * Base64 URL encode (RFC 4648)
 */
function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

// ============================================================================
// Authentication Flow
// ============================================================================

/**
 * Get the Spotify Client ID from environment or localStorage
 */
export function getClientId(): string | null {
  // First check environment variable
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
    return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  }
  // Then check localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('spotify-client-id')
  }
  return null
}

/**
 * Set the Spotify Client ID in localStorage
 */
export function setClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('spotify-client-id', clientId)
  }
}

/**
 * Get the redirect URI for OAuth callback
 * Note: Spotify requires 127.0.0.1 instead of localhost for loopback redirect URIs
 */
export function getRedirectUri(): string {
  if (typeof window !== 'undefined') {
    // Spotify security requirement: use 127.0.0.1 instead of localhost
    const origin = window.location.origin.replace('localhost', '127.0.0.1')
    return `${origin}/api/spotify/callback`
  }
  return process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3001/api/spotify/callback'
}

/**
 * Start the OAuth authorization flow
 * Redirects user to Spotify login page
 */
export async function startAuthFlow(): Promise<void> {
  const clientId = getClientId()
  if (!clientId) {
    throw new Error('Spotify Client ID not configured. Please add it in Settings.')
  }

  // Generate PKCE values
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = generateState()

  // Store verifier and state for later verification
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier)
  sessionStorage.setItem(STATE_STORAGE_KEY, state)

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    state: state,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  // Redirect to Spotify
  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 * Called after redirect back from Spotify
 */
export async function exchangeCodeForTokens(code: string, state: string): Promise<SpotifyTokens> {
  const clientId = getClientId()
  if (!clientId) {
    throw new Error('Spotify Client ID not configured')
  }

  // Verify state to prevent CSRF
  const storedState = sessionStorage.getItem(STATE_STORAGE_KEY)
  if (state !== storedState) {
    throw new Error('State mismatch - possible CSRF attack')
  }

  // Get stored verifier
  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY)
  if (!verifier) {
    throw new Error('Code verifier not found - please restart auth flow')
  }

  // Exchange code for tokens
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }

  const data = await response.json()

  // Clean up session storage
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY)
  sessionStorage.removeItem(STATE_STORAGE_KEY)

  // Calculate expiration time
  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    tokenType: data.token_type,
    scope: data.scope,
  }

  // Store tokens
  saveTokens(tokens)

  return tokens
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<SpotifyTokens> {
  const clientId = getClientId()
  if (!clientId) {
    throw new Error('Spotify Client ID not configured')
  }

  const tokens = getTokens()
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    // If refresh fails, clear tokens and require re-auth
    clearTokens()
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  const data = await response.json()

  const newTokens: SpotifyTokens = {
    accessToken: data.access_token,
    // Spotify may or may not return a new refresh token
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + (data.expires_in * 1000),
    tokenType: data.token_type,
    scope: data.scope,
  }

  saveTokens(newTokens)

  return newTokens
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Save tokens to localStorage
 */
export function saveTokens(tokens: SpotifyTokens): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
  }
}

/**
 * Get tokens from localStorage
 */
export function getTokens(): SpotifyTokens | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Clear all stored tokens (logout)
 */
export function clearTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

/**
 * Check if tokens are expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(tokens: SpotifyTokens | null): boolean {
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

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Make an authenticated request to the Spotify API
 */
export async function spotifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_API_BASE}${endpoint}`

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
      return spotifyFetch(endpoint, options)
    } catch {
      clearTokens()
      throw new Error('Session expired - please login again')
    }
  }

  if (response.status === 403) {
    // Insufficient scope - token doesn't have required permissions
    // Clear tokens so user can re-authenticate with correct scopes
    const error = await response.json().catch(() => ({ error: { message: 'Forbidden' } }))
    if (error.error?.message?.includes('scope') || error.error?.message?.includes('Insufficient')) {
      clearTokens()
      throw new Error('Insufficient permissions - please reconnect to Spotify')
    }
    throw new Error(error.error?.message || 'Forbidden')
  }

  if (response.status === 204) {
    return {} as T
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Spotify API error: ${response.status}`)
  }

  // Handle empty response body (some endpoints return 200 OK with no content)
  const text = await response.text()
  if (!text) return {} as T

  // Some endpoints return non-JSON text (e.g., snapshot IDs)
  const contentType = response.headers.get("content-type")
  if (!contentType?.includes("application/json")) {
    return {} as T
  }

  return JSON.parse(text)
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Get the current user's profile
 */
export async function getCurrentUser(): Promise<SpotifyUser> {
  return spotifyFetch('/me')
}

/**
 * Get current playback state
 */
export async function getPlaybackState(): Promise<SpotifyPlaybackState | null> {
  try {
    return await spotifyFetch('/me/player')
  } catch {
    return null
  }
}

/**
 * Get available devices
 */
export async function getDevices(): Promise<SpotifyDevice[]> {
  const result = await spotifyFetch<{ devices: SpotifyDevice[] }>('/me/player/devices')
  return result.devices || []
}

/**
 * Start/resume playback
 */
export async function play(options?: {
  deviceId?: string
  contextUri?: string
  uris?: string[]
  positionMs?: number
}): Promise<void> {
  const params = options?.deviceId ? `?device_id=${options.deviceId}` : ''
  await spotifyFetch(`/me/player/play${params}`, {
    method: 'PUT',
    body: JSON.stringify({
      context_uri: options?.contextUri,
      uris: options?.uris,
      position_ms: options?.positionMs,
    }),
  })
}

/**
 * Pause playback
 */
export async function pause(deviceId?: string): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : ''
  await spotifyFetch(`/me/player/pause${params}`, { method: 'PUT' })
}

/**
 * Skip to next track
 */
export async function skipToNext(deviceId?: string): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : ''
  await spotifyFetch(`/me/player/next${params}`, { method: 'POST' })
}

/**
 * Skip to previous track
 */
export async function skipToPrevious(deviceId?: string): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : ''
  await spotifyFetch(`/me/player/previous${params}`, { method: 'POST' })
}

/**
 * Seek to position in track
 */
export async function seek(positionMs: number, deviceId?: string): Promise<void> {
  const params = new URLSearchParams({ position_ms: positionMs.toString() })
  if (deviceId) params.set('device_id', deviceId)
  await spotifyFetch(`/me/player/seek?${params}`, { method: 'PUT' })
}

/**
 * Add item to playback queue
 */
export async function addToQueue(uri: string, deviceId?: string): Promise<void> {
  const params = new URLSearchParams({ uri })
  if (deviceId) params.set('device_id', deviceId)
  await spotifyFetch(`/me/player/queue?${params}`, { method: 'POST' })
}

/**
 * Set volume
 */
export async function setVolume(volumePercent: number, deviceId?: string): Promise<void> {
  const params = new URLSearchParams({ volume_percent: Math.round(volumePercent).toString() })
  if (deviceId) params.set('device_id', deviceId)
  await spotifyFetch(`/me/player/volume?${params}`, { method: 'PUT' })
}

/**
 * Set shuffle mode
 */
export async function setShuffle(state: boolean, deviceId?: string): Promise<void> {
  const params = new URLSearchParams({ state: state.toString() })
  if (deviceId) params.set('device_id', deviceId)
  await spotifyFetch(`/me/player/shuffle?${params}`, { method: 'PUT' })
}

/**
 * Set repeat mode
 */
export async function setRepeat(state: 'off' | 'track' | 'context', deviceId?: string): Promise<void> {
  const params = new URLSearchParams({ state })
  if (deviceId) params.set('device_id', deviceId)
  await spotifyFetch(`/me/player/repeat?${params}`, { method: 'PUT' })
}

/**
 * Transfer playback to a device
 */
export async function transferPlayback(deviceId: string, play?: boolean): Promise<void> {
  await spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({
      device_ids: [deviceId],
      play: play ?? false,
    }),
  })
}

/**
 * Get user's playlists
 */
export async function getPlaylists(limit = 50, offset = 0): Promise<{ items: SpotifyPlaylist[]; total: number }> {
  return spotifyFetch(`/me/playlists?limit=${limit}&offset=${offset}`)
}

/**
 * Get playlist tracks
 */
export async function getPlaylistTracks(
  playlistId: string,
  limit = 50,
  offset = 0
): Promise<{ items: Array<{ track: SpotifyTrack }>; total: number }> {
  return spotifyFetch(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`)
}

/**
 * Get user's saved tracks (Liked Songs)
 */
export async function getSavedTracks(limit = 50, offset = 0): Promise<{ items: Array<{ track: SpotifyTrack }>; total: number }> {
  return spotifyFetch(`/me/tracks?limit=${limit}&offset=${offset}`)
}

/**
 * Check if tracks are saved
 */
export async function checkSavedTracks(trackIds: string[]): Promise<boolean[]> {
  return spotifyFetch(`/me/tracks/contains?ids=${trackIds.join(',')}`)
}

/**
 * Save tracks to library
 */
export async function saveTracks(trackIds: string[]): Promise<void> {
  await spotifyFetch('/me/tracks', {
    method: 'PUT',
    body: JSON.stringify({ ids: trackIds }),
  })
}

/**
 * Remove tracks from library
 */
export async function removeTracks(trackIds: string[]): Promise<void> {
  await spotifyFetch('/me/tracks', {
    method: 'DELETE',
    body: JSON.stringify({ ids: trackIds }),
  })
}

/**
 * Search for tracks, artists, albums, playlists
 */
export async function search(
  query: string,
  types: Array<'track' | 'artist' | 'album' | 'playlist'> = ['track'],
  limit = 20
): Promise<SpotifySearchResults> {
  const params = new URLSearchParams({
    q: query,
    type: types.join(','),
    limit: limit.toString(),
  })
  return spotifyFetch(`/search?${params}`)
}

/**
 * Get recently played tracks
 */
export async function getRecentlyPlayed(limit = 50): Promise<{ items: Array<{ track: SpotifyTrack; played_at: string }> }> {
  return spotifyFetch(`/me/player/recently-played?limit=${limit}`)
}

/**
 * Get user's top tracks
 */
export async function getTopTracks(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 50
): Promise<{ items: SpotifyTrack[] }> {
  return spotifyFetch(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`)
}
