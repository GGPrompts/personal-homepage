# Contributing

Thanks for your interest in contributing to Personal Homepage!

## Development Setup

1. Fork and clone the repo
2. `npm install`
3. `cp .env.example .env.local` and add your API keys (Supabase required, others optional)
4. `npm run dev` to start on port 3001

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (port 3001) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |

## Adding a New Section

See [docs/navigation.md](docs/navigation.md) for the full guide. In short:

1. Add to `Section` type in `app/page.tsx`
2. Add to `navigationItems` array
3. Create `app/sections/[name].tsx`
4. Add case to `renderContent()` switch

## Code Style

- TypeScript with strict mode
- Tailwind CSS for styling (use `glass` / `glass-dark` for panels)
- shadcn/ui components (Radix primitives)
- TanStack Query for server state

## Pull Requests

- Keep PRs focused on a single change
- Run `npm run lint && npm run typecheck` before submitting
- Include a brief description of what changed and why
