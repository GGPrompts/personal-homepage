import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

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
 * Escape string for use in JavaScript - prevents injection in JS strings
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
 * Spotify OAuth Callback Handler
 *
 * This route handles the redirect back from Spotify after user authorization.
 * It renders an HTML page that:
 * 1. Extracts the authorization code and state from the URL
 * 2. Sends them to the parent window via postMessage
 * 3. Closes itself or redirects back to the app
 *
 * Note: The actual token exchange happens client-side using PKCE,
 * so we don't need to handle the token exchange server-side.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // If there was an error, show it to the user
  if (error) {
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Spotify Authorization Failed</title>
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
      background: #1db954;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }
    a:hover { background: #1ed760; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authorization Failed</h1>
    <p class="error-code">${escapeHtml(error)}</p>
    <p>${escapeHtml(errorDescription) || "Unable to connect to Spotify"}</p>
    <a href="/">Return to Dashboard</a>
  </div>
</body>
</html>`,
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  // If we have a code, render a page that handles the token exchange client-side
  if (code && state) {
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Connecting to Spotify...</title>
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
      border-top-color: #1db954;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 { margin-bottom: 0.5rem; }
    p { color: rgba(255, 255, 255, 0.7); }
    .success { color: #1db954; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1 id="title">Connecting to Spotify...</h1>
    <p id="message">Please wait while we complete the authorization.</p>
  </div>

  <script>
    (async function() {
      const code = "${escapeJs(code)}";
      const state = "${escapeJs(state)}";

      // If we're in a popup opened by the parent window
      if (window.opener) {
        // Send the code and state to the parent window
        window.opener.postMessage({
          type: 'spotify-auth-callback',
          code: code,
          state: state
        }, window.location.origin);

        // Update UI
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = 'Connected!';
        document.getElementById('title').className = 'success';
        document.getElementById('message').textContent = 'You can close this window.';

        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        // Not in a popup - store the auth info and redirect
        // Store temporarily for the main page to pick up
        sessionStorage.setItem('spotify-auth-code', code);
        sessionStorage.setItem('spotify-auth-state', state);

        // Update UI
        document.getElementById('title').textContent = 'Redirecting...';
        document.getElementById('message').textContent = 'Taking you back to the dashboard.';

        // Redirect to music player section
        setTimeout(() => {
          window.location.href = '/?section=music-player&spotify-auth=pending';
        }, 500);
      }
    })();
  </script>
</body>
</html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  // No code or error - invalid request
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <title>Invalid Request</title>
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
    h1 { color: #fbbf24; }
    a {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #1db954;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Invalid Request</h1>
    <p>No authorization code received from Spotify.</p>
    <a href="/">Return to Dashboard</a>
  </div>
</body>
</html>`,
    {
      status: 400,
      headers: { "Content-Type": "text/html" },
    }
  )
}
