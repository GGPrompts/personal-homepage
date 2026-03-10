# Prompt Library

Browse, create, and manage reusable prompts with template variable support. Ported from GGPrompts, sharing the same Supabase tables.

## Files
- `app/sections/prompt-library.tsx` - Main section component
- `components/prompts/PromptCard.tsx` - Card with like/bookmark/copy actions
- `components/prompts/PromptCardSkeleton.tsx` - Loading skeleton
- `components/prompts/PromptDetailModal.tsx` - View/edit/delete modal with template renderer
- `components/prompts/PromptTemplateRenderer.tsx` - Interactive `{{field:hint}}` template inputs
- `components/prompts/InlineField.tsx` - Click-to-edit inline field
- `components/prompts/CreatePromptForm.tsx` - Create/edit form with template builder
- `lib/prompts/types.ts` - Prompt, TemplateField, and related types
- `lib/prompts/database.ts` - CRUD, search, filter, pagination
- `lib/prompts/interactions.ts` - Likes, bookmarks, usage tracking
- `lib/prompts/template.ts` - Template parsing, filling, validation
- `lib/prompts/categories.ts` - Category constants with icons
- `lib/prompts/fetch.ts` - Client-side query helper

## Features
- Browse prompts in responsive grid (1-3 columns)
- Search with Fuse.js fuzzy matching
- Filter by category
- Sort by newest, popular, most used
- Like/bookmark prompts (optimistic UI)
- Copy prompt content (increments usage count)
- Create/edit/delete prompts (auth required)
- Template variables (`{{fieldName:hint}}`) with interactive renderer
- Real-time template field preview with badges

## Template System
Prompts support `{{variable}}` and `{{variable:hint}}` syntax:
- Variables are auto-detected from content
- Interactive fill UI in detail modal
- "Add Field" button inserts variables at cursor in create/edit form
- Validation and progress tracking

## Integration
- **Auth**: Supabase (GitHub OAuth) via `useAuth()`
- **Database**: Supabase tables `prompts`, `prompt_likes`, `prompt_bookmarks`
- **Search**: Fuse.js for client-side fuzzy search
- **Storage**: Supabase (shared with GGPrompts)

## TabzChrome Selectors
- `data-tabz-section="prompt-library"` - Container
- `data-tabz-action="search"` - Search input
- `data-tabz-action="create-prompt"` - New prompt button
- `data-tabz-action="filter-category"` - Category filter
- `data-tabz-list="prompts"` - Prompt grid
- `data-tabz-item="prompt"` - Prompt card
- `data-tabz-action="copy"` - Copy prompt
- `data-tabz-action="like"` - Like prompt
- `data-tabz-action="bookmark"` - Bookmark prompt
