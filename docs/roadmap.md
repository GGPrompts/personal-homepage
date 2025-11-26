# Roadmap

Future enhancements and planned features.

## In Progress

### Settings Section (Partial)
Current: Theme customizer only
Needed:
- Theme selection (4 themes)
- Background dropdown (gradient, mesh, textured, minimal, none)
- Feed refresh interval
- Default sources/subreddits

## Planned

### AI Curation (Optional)

The feed currently fetches live from APIs. To add AI curation:

1. Set up Claude API key
2. Create cron job to run daily
3. Have Claude filter/summarize items
4. Save to `public/feed/YYYY-MM-DD.json`
5. Update feed to read from static JSON

### API Playground

A separate page for testing/learning APIs (in Settings section)

## Ideas / Backlog

- Bookmarks section
- Notes/Quick capture
- Calendar integration
- Custom widgets
- Keyboard shortcuts
- PWA support for mobile

---

*Move completed items to CHANGELOG.md*
