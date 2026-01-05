# Settings

Application configuration with themes, sections, and API keys.

## Files
- `app/sections/settings.tsx` - Main component
- `components/ThemeSettingsPanel.tsx` - Theme config
- `components/SectionSettings.tsx` - Section visibility/order
- `components/CategorySettings.tsx` - Category management
- `hooks/useSectionPreferences.ts` - Section state

## Features
- **Appearance Tab**:
  - Theme selection (Terminal, Amber, Carbon, Light)
  - Background style (gradient, mesh, textured, minimal, none)
  - Custom accent colors
- **Sections Tab**:
  - Show/hide sections
  - Drag-drop reorder
  - Category assignment
- **API Keys Tab**:
  - Finnhub (stocks)
  - Alpha Vantage (stocks)
  - YouTube Data API
  - Anthropic (Claude)
  - OpenAI (GPT)
  - OpenRouter
  - Spotify OAuth
- **Media Tab**:
  - Configure media directories
  - Photo/video/music paths
- **Integrations Tab**:
  - Connection status overview
  - Quick links to docs

## TabzChrome Selectors
- `data-tabz-section="settings"` - Container
- `data-tabz-action="change-theme"` - Theme selector
- `data-tabz-action="change-background"` - Background selector
- `data-tabz-action="toggle-section"` - Show/hide section
- `data-tabz-action="reorder-sections"` - Drag handle
- `data-tabz-action="save-api-key"` - Save key
- `data-tabz-action="clear-api-key"` - Remove key
- `data-tabz-action="test-api-key"` - Validate key
- `data-tabz-input="api-key-*"` - Key inputs
- `data-tabz-region="appearance"` - Appearance tab
- `data-tabz-region="sections"` - Sections tab
- `data-tabz-region="api-keys"` - API keys tab
- `data-tabz-list="sections"` - Section list

## State
- Theme in localStorage (`theme-preference`)
- Background in localStorage (`background-preference`)
- Section preferences in localStorage (`section-preferences`)
- API keys in localStorage (per-key)
