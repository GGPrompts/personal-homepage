# Authentication Implementation Plan

Add GitHub OAuth authentication via Supabase to enable secure access to Quick Notes, Bookmarks, and a new Profile section.

## Goals

1. Replace manual GitHub PAT entry with OAuth login
2. Add Profile section to sidebar navigation
3. Persist auth state across sessions
4. Use GitHub OAuth token for Quick Notes and Bookmarks sync

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Personal Homepage                       │
├─────────────────────────────────────────────────────────────┤
│  Supabase Auth (GitHub OAuth)                               │
│    ├── Login → GitHub OAuth flow → Supabase session        │
│    ├── Session stored in cookies (SSR compatible)          │
│    └── Provider token available for GitHub API calls        │
├─────────────────────────────────────────────────────────────┤
│  Features using auth:                                        │
│    ├── Quick Notes → uses GitHub provider token             │
│    ├── Bookmarks → uses GitHub provider token               │
│    └── Profile → shows user info, logout, sync status       │
└─────────────────────────────────────────────────────────────┘
```

## Files to Create

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client (browser) |
| `lib/supabase-server.ts` | Supabase client (server/SSR) |
| `components/AuthProvider.tsx` | Auth context with useAuth hook |
| `components/AuthModal.tsx` | Login modal (OAuth buttons only) |
| `app/auth/callback/route.ts` | OAuth callback handler |
| `app/sections/profile.tsx` | Profile section component |

## Files to Modify

| File | Changes |
|------|---------|
| `app/page.tsx` | Add Profile to navigation, remove GitHubSettings manual entry |
| `app/sections/quick-notes.tsx` | Use auth token instead of localStorage PAT |
| `app/sections/bookmarks.tsx` | Use auth token instead of localStorage PAT |
| `app/layout.tsx` | Wrap with AuthProvider |
| `.env.local.example` | Add Supabase env vars |

## Implementation Steps

### Phase 1: Supabase Setup ✅

- [x] Add Supabase environment variables to `.env.local.example`
- [x] Create `lib/supabase.ts` - browser client
- [x] Create `lib/supabase-server.ts` - server client (for API routes)
- [x] Create `app/auth/callback/route.ts` - OAuth callback

### Phase 2: Auth Context & UI ✅

- [x] Create `components/AuthProvider.tsx` with:
  - `useAuth()` hook returning `{ user, session, signIn, signOut, loading, isConfigured }`
  - `getGitHubToken()` helper to get provider access token
- [x] Create `components/AuthModal.tsx` (adapted from login template):
  - GitHub OAuth button (primary)
  - Minimal design - just OAuth, no email/password
- [x] Wrap app in AuthProvider in `layout.tsx`

### Phase 3: Profile Section ✅

- [x] Add "Profile" to navigation items in `page.tsx`
- [x] Create `app/sections/profile.tsx`:
  - User avatar and name from GitHub
  - Connected accounts status
  - Quick Notes sync status (last sync time, file count)
  - Bookmarks sync status
  - Repository settings
  - Sign out button
  - Theme matches existing glassmorphism design

### Phase 4: Integrate with Existing Features ✅

- [x] Update `app/sections/quick-notes.tsx`:
  - Use `useAuth()` to get GitHub token
  - Show "Sign in with GitHub" if not authenticated
  - Show "Configure repository" if logged in but no repo set
- [x] Update `app/sections/bookmarks.tsx`:
  - Same changes as Quick Notes
- [x] Update `app/page.tsx`:
  - Remove `GitHubSettings` component
  - Update Settings section to redirect to Profile for GitHub config

### Phase 5: Cleanup & Polish ✅

- [x] Remove unused `GitHubSettings` function from page.tsx
- [x] Update Settings GitHub section to redirect to Profile
- [ ] Test full flow: login → sync notes → logout
- [ ] Update `docs/quick-notes.md` with new auth flow (optional)
- [ ] Update `docs/bookmarks.md` with new auth flow (optional)

## Environment Variables

```bash
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Default repo for new users (can be configured per-user later)
GITHUB_DEFAULT_REPO=username/notes-repo
```

## Supabase Dashboard Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to Authentication > Providers
3. Enable GitHub provider:
   - Use existing GitHub OAuth app OR create new one
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
   - Add localhost redirect: `http://localhost:3001/auth/callback`
4. (Optional) Enable Google provider for additional login option

## UI/UX Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Not logged in:                                               │
│   - Quick Notes shows "Sign in with GitHub to sync"         │
│   - Bookmarks shows "Sign in with GitHub to sync"           │
│   - Profile section shows login prompt                       │
│   - Header shows "Sign In" button                           │
├─────────────────────────────────────────────────────────────┤
│ Logged in:                                                   │
│   - Quick Notes syncs automatically                         │
│   - Bookmarks syncs automatically                           │
│   - Profile shows user info and sync status                 │
│   - Header shows avatar dropdown with logout                │
└─────────────────────────────────────────────────────────────┘
```

## Profile Section Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                   │
│  │Avatar│  Username                                         │
│  │      │  email@example.com                                │
│  └──────┘  [Sign Out]                                       │
├─────────────────────────────────────────────────────────────┤
│  Connected Services                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✓ GitHub    @username    [Connected]                    ││
│  │ ○ Google    Not connected [Connect]                     ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Sync Status                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Quick Notes   user/repo   Last sync: 5 min ago          ││
│  │ Bookmarks     user/repo   Last sync: 2 hours ago        ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Settings                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Notes Repository    [user/repo        ] [Change]        ││
│  │ Bookmarks File      [bookmarks.json   ]                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Migration Path

For users who already have manual GitHub tokens configured:

1. On first load after update, check if `localStorage` has `github-token`
2. If yes, show migration prompt: "Sign in with GitHub to enable auto-sync"
3. After OAuth login, clear old localStorage tokens
4. GitHub OAuth token replaces manual PAT

## Security Considerations

- Supabase handles token refresh automatically
- Provider tokens (GitHub) are stored securely by Supabase
- No tokens stored in localStorage after migration
- Server-side token validation for API routes

## Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Timeline Estimate

This is a reference for complexity, not a schedule:

- Phase 1 (Supabase Setup): Simple - mostly config
- Phase 2 (Auth Context & UI): Medium - new components
- Phase 3 (Profile Section): Medium - adapt template
- Phase 4 (Integration): Medium - refactor existing code
- Phase 5 (Cleanup): Simple - documentation

## Questions to Resolve

1. **Repo configuration**: Should users pick their repo on first login, or use a default?
   - Recommendation: Start with default from env, add UI to change later

2. **Google OAuth**: Include from the start or add later?
   - Recommendation: GitHub only initially (simpler, matches use case)

3. **Existing localStorage data**: Migrate or ignore?
   - Recommendation: Keep local data, just change token source

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side)
- [Next.js App Router + Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- GGPrompts implementation: `~/projects/GGPrompts/src/contexts/AuthContext.jsx`
- Login template: `~/projects/portfolio-style-guides/app/templates/login/page.tsx`
- Profile template: `~/projects/portfolio-style-guides/app/templates/user-profile/page.tsx`
