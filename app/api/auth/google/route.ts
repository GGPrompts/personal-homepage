import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

// Required scopes for Gmail and Calendar
const GOOGLE_SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  // Calendar
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  // User profile
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

/**
 * Generate a cryptographically random state parameter
 */
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth flow by redirecting to Google's authorization endpoint.
 * The state parameter is passed back in the callback for CSRF protection.
 */
export async function GET(request: NextRequest) {
  // Get client ID from environment
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured - GOOGLE_CLIENT_ID missing' },
      { status: 500 }
    )
  }

  // Determine redirect URI
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/google/callback`

  // Generate state for CSRF protection
  const state = generateState()

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    state: state,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent to ensure refresh token
    include_granted_scopes: 'true',
  })

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`

  // Create response that redirects to Google
  const response = NextResponse.redirect(authUrl)

  // Store state in a secure HTTP-only cookie for verification
  response.cookies.set('google-oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return response
}
