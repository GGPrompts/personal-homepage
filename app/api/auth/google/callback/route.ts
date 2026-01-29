import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Google OAuth token endpoint
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string | null): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Escape string for use in JavaScript
 */
function escapeJs(str: string | null): string {
  if (!str) return ""
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/</g, "\\x3c")
    .replace(/>/g, "\\x3e")
}

/**
 * Render an HTML error page
 */
function renderErrorPage(error: string, description: string, status: number = 400): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <title>Google Authorization Failed</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    h1 { color: #ef4444; margin-bottom: 1rem; }
    p { color: rgba(255, 255, 255, 0.8); }
    .error-code { font-family: monospace; color: #fbbf24; }
    a {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #4285f4;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }
    a:hover { background: #5a95f5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authorization Failed</h1>
    <p class="error-code">${escapeHtml(error)}</p>
    <p>${escapeHtml(description)}</p>
    <a href="/">Return to Dashboard</a>
  </div>
</body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html" },
    }
  )
}

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth callback from Google after user authorization.
 * Exchanges the authorization code for tokens and stores them client-side.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Get client credentials from environment
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return renderErrorPage(
      'Configuration Error',
      'Google OAuth not configured on the server.',
      500
    )
  }

  // Check for OAuth error
  if (error) {
    return renderErrorPage(error, errorDescription || 'Unable to connect to Google')
  }

  // Validate state to prevent CSRF
  const storedState = request.cookies.get('google-oauth-state')?.value
  if (!state || state !== storedState) {
    return renderErrorPage(
      'Invalid State',
      'State mismatch - this may be a CSRF attack or the session expired. Please try again.'
    )
  }

  // Must have authorization code
  if (!code) {
    return renderErrorPage(
      'Missing Code',
      'No authorization code received from Google.'
    )
  }

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Token exchange failed:', errorData)
      return renderErrorPage(
        'Token Exchange Failed',
        errorData.error_description || 'Failed to exchange authorization code for tokens.'
      )
    }

    const tokenData = await tokenResponse.json()

    // Build tokens object
    const tokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    }

    // Render success page that stores tokens client-side and redirects
    const response = new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Connecting to Google...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: #4285f4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 { margin-bottom: 0.5rem; }
    p { color: rgba(255, 255, 255, 0.7); }
    .success { color: #34d399; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1 id="title">Connecting to Google...</h1>
    <p id="message">Please wait while we complete the authorization.</p>
  </div>

  <script>
    (function() {
      // Tokens from server
      const tokens = ${JSON.stringify(tokens)};

      // Simple encoding for storage
      function encodeTokens(t) {
        return 'enc:' + btoa(encodeURIComponent(JSON.stringify(t)));
      }

      // Store tokens
      localStorage.setItem('google-tokens', encodeTokens(tokens));

      // Update UI
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('title').textContent = 'Connected!';
      document.getElementById('title').className = 'success';
      document.getElementById('message').textContent = 'Redirecting to dashboard...';

      // Redirect to settings
      setTimeout(function() {
        window.location.href = '/?section=settings&tab=integrations&google-auth=success';
      }, 1000);
    })();
  </script>
</body>
</html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    )

    // Clear the state cookie
    response.cookies.set('google-oauth-state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('OAuth callback error:', err)
    return renderErrorPage(
      'Server Error',
      'An unexpected error occurred during authorization.'
    )
  }
}

/**
 * POST /api/auth/google/callback
 *
 * Alternative endpoint for client-side code exchange.
 * Used when the client needs to exchange a code it received.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code required' },
        { status: 400 }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/auth/google/callback`

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
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error_description || 'Token exchange failed' },
        { status: 400 }
      )
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    })
  } catch (err) {
    console.error('Token exchange error:', err)
    return NextResponse.json(
      { error: 'Server error during token exchange' },
      { status: 500 }
    )
  }
}
