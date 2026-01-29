import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Google OAuth token endpoint
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * POST /api/auth/google/refresh
 *
 * Refreshes an expired Google access token using the refresh token.
 * The client stores tokens locally; this endpoint handles the refresh
 * since it requires the client secret.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth not configured on the server' },
        { status: 500 }
      )
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Token refresh failed:', errorData)

      // If refresh token is invalid/expired, return specific error
      if (errorData.error === 'invalid_grant') {
        return NextResponse.json(
          { error: 'Session expired - please reconnect to Google' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: errorData.error_description || 'Token refresh failed' },
        { status: 400 }
      )
    }

    const tokenData = await tokenResponse.json()

    // Google may or may not return a new refresh token
    return NextResponse.json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null, // May not be present
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    })
  } catch (err) {
    console.error('Token refresh error:', err)
    return NextResponse.json(
      { error: 'Server error during token refresh' },
      { status: 500 }
    )
  }
}
