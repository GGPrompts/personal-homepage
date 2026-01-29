# Google OAuth Integration

Google OAuth2 authentication for Gmail and Calendar API access.

## Overview

- **APIs**: Gmail API, Google Calendar API
- **Scopes**: gmail.readonly, gmail.send, gmail.modify, calendar.readonly, calendar.events
- **Flow**: Authorization Code (server-side token exchange)
- **Tokens**: Stored in localStorage (encoded)

## Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Gmail API
   - Google Calendar API

### 2. Configure OAuth Consent Screen

1. Go to APIs & Services > OAuth consent screen
2. Select "External" user type (or Internal for Workspace)
3. Fill in required fields:
   - App name
   - User support email
   - Developer contact email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 3. Create OAuth Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
5. Copy Client ID and Client Secret

### 4. Configure Environment Variables

Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

## Architecture

```
API Routes
├── /api/auth/google          # Initiates OAuth flow (redirects to Google)
├── /api/auth/google/callback # Handles OAuth callback, exchanges code for tokens
└── /api/auth/google/refresh  # Refreshes expired access tokens

Client Library (lib/google-auth.ts)
├── Token management (save, get, clear)
├── Token expiry checking
├── Authenticated API requests
└── User profile fetching

React Hook (hooks/useGoogleAuth.ts)
├── Connection state management
├── Auto-refresh on window focus
├── Connect/disconnect actions
└── Access token retrieval
```

## Usage

### Check Connection Status

```tsx
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

function MyComponent() {
  const { isConnected, isLoading, user, error } = useGoogleAuth()

  if (isLoading) return <Loading />
  if (!isConnected) return <ConnectButton />

  return <div>Connected as {user?.email}</div>
}
```

### Connect to Google

```tsx
const { connect } = useGoogleAuth()

<Button onClick={connect}>
  Connect Google
</Button>
```

### Disconnect

```tsx
const { disconnect } = useGoogleAuth()

<Button onClick={disconnect}>
  Disconnect
</Button>
```

### Get Access Token for API Calls

```tsx
const { getAccessToken } = useGoogleAuth()

async function fetchEmails() {
  const token = await getAccessToken()
  if (!token) return

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  )
  return response.json()
}
```

### Using googleFetch Helper

```tsx
import { googleFetch } from "@/lib/google-auth"

// Automatically handles auth and token refresh
const messages = await googleFetch<GmailMessages>(
  'https://gmail.googleapis.com/gmail/v1/users/me/messages'
)
```

## Token Storage

Tokens are stored in localStorage with basic encoding:
- Key: `google-tokens`
- Format: `enc:` prefix + base64-encoded JSON

Token structure:
```typescript
interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number // Unix timestamp in ms
  tokenType: string
  scope: string
}
```

## Security Notes

1. **Client Secret**: Keep `GOOGLE_CLIENT_SECRET` server-side only
2. **Token Refresh**: Happens server-side via `/api/auth/google/refresh`
3. **CSRF Protection**: State parameter in OAuth flow
4. **Token Encoding**: Basic obfuscation, not encryption
5. **Scope**: Only request necessary permissions

## Troubleshooting

### "OAuth not configured"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
- Restart the dev server after adding env vars

### "Redirect URI mismatch"
- Verify redirect URI in Google Console matches exactly
- Development: `http://localhost:3001/api/auth/google/callback`
- Check for trailing slashes

### "Token refresh failed"
- User may need to re-authorize (click Disconnect then Connect)
- Check if refresh token was granted (requires `prompt=consent`)

### "Access denied"
- User declined permissions
- Check OAuth consent screen is properly configured
- For testing, add test users in OAuth consent screen

## Files

| File | Purpose |
|------|---------|
| `lib/google-auth.ts` | OAuth client, token management, API helpers |
| `hooks/useGoogleAuth.ts` | React hook for connection state |
| `app/api/auth/google/route.ts` | Initiates OAuth flow |
| `app/api/auth/google/callback/route.ts` | Handles callback, exchanges tokens |
| `app/api/auth/google/refresh/route.ts` | Token refresh endpoint |
| `app/sections/settings.tsx` | GoogleOAuthCard component |
