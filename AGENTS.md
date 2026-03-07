# Agent Instructions

## Development Workflow

1. Run relevant quality gates (tests/linters/build) if applicable
2. When shipping changes:
   ```bash
   git pull --rebase
   git push
   git status  # should show "up to date with origin"
   ```
3. Leave a brief context summary for the next session

## Key Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3001) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Tests | `npm test` |
