# Navigation System

The sidebar uses a categorized navigation pattern with collapsible category groups.

## Layout Structure

```
+----------------------+---------------------------------+
| [Home Button]        |                                 |
| -------------------- |                                 |
| > INFORMATION        |                                 |
|   - Weather          |                                 |
|   - Search Hub       |                                 |
|   - Disasters        |        Section Content          |
| > PRODUCTIVITY       |                                 |
|   - Scratchpad       |                                 |
|   - Bookmarks        |                                 |
|   - Kanban           |                                 |
| v DEVELOPMENT        |  (collapsed)                    |
| -------------------- |                                 |
| Settings             |                                 |
+----------------------+---------------------------------+
```

## Category System

Sections are organized into 6 collapsible categories:

| Category | Default Sections |
|----------|------------------|
| **Information** | Weather, Search Hub, Disasters |
| **Productivity** | Bookmarks, Scratchpad, Kanban |
| **Development** | API Playground, AI Workspace, Prompts Playground, GitHub Activity, Projects, Files, Jobs, Analytics, Flowchart |
| **Finance** | Market Pulse, Paper Trading, Crypto |
| **Entertainment** | Daily Feed, SpaceX Launches, Photo Gallery, Music Player, Video Player |
| **Personal** | Profile |

## Category Behavior

- **Click category header**: Toggles expand/collapse for that category
- **Chevron rotation**: Indicates expanded (down arrow) or collapsed (right arrow) state
- **Section count**: Shows number of sections on hover
- **Empty categories**: Automatically hidden when all sections in category are disabled
- **Collapsed state**: Persisted to localStorage

## Custom Categories

Users can create custom categories via Settings:
- Add new categories with custom name, description, and icon
- Move sections between categories (default and custom)
- Reorder categories using drag-and-drop
- Delete custom categories (only if empty)

## Desktop vs Mobile

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Sidebar | Always visible, collapsible | Hidden in Sheet drawer |
| Toggle | Collapse button (-right-4) | Hamburger menu (top-left) |
| Width | 280px expanded, 80px collapsed | 288px (w-72) |
| Collapsed mode | Shows category icons with flyout popovers | N/A |

## Navigation Configuration

Defined in `app/page.tsx` and `hooks/useSectionPreferences.ts`:

```typescript
// Toggleable sections (can be hidden/reordered) - 24 sections
type ToggleableSection =
  | "weather"
  | "feed"
  | "api-playground"
  | "bookmarks"
  | "search"
  | "stocks"
  | "crypto"
  | "spacex"
  | "github-activity"
  | "disasters"
  | "tasks"
  | "projects"
  | "jobs"
  | "profile"
  | "ai-workspace"
  | "market-pulse"
  | "kanban"
  | "photo-gallery"
  | "music-player"
  | "video-player"
  | "files"
  | "analytics"
  | "prompts-playground"
  | "flowchart"

// All sections (includes non-toggleable home and settings)
type Section = "home" | ToggleableSection | "settings"

interface NavigationItem {
  id: Section
  label: string
  icon: React.ElementType
  description: string
}
```

## Current Sections

| Section ID | Label | Icon | Category |
|------------|-------|------|----------|
| `weather` | Weather | Cloud | Information |
| `feed` | Daily Feed | Newspaper | Entertainment |
| `market-pulse` | Market Pulse | TrendingUp | Finance |
| `api-playground` | API Playground | Zap | Development |
| `bookmarks` | Bookmarks | Bookmark | Productivity |
| `search` | Search Hub | Search | Information |
| `ai-workspace` | AI Workspace | MessageSquare | Development |
| `stocks` | Paper Trading | TrendingUp | Finance |
| `crypto` | Crypto | Bitcoin | Finance |
| `spacex` | SpaceX Launches | Rocket | Entertainment |
| `photo-gallery` | Photo Gallery | Image | Entertainment |
| `github-activity` | GitHub Activity | Github | Development |
| `disasters` | Disasters | AlertCircle | Information |
| `tasks` | Scratchpad | CheckCircle2 | Productivity |
| `projects` | Projects | FolderGit2 | Development |
| `files` | Files | FolderOpen | Development |
| `kanban` | Kanban | LayoutGrid | Productivity |
| `jobs` | Jobs | Play | Development |
| `analytics` | Analytics | BarChart3 | Development |
| `prompts-playground` | Prompts Playground | Beaker | Development |
| `flowchart` | Flowchart | GitBranch | Development |
| `music-player` | Music Player | Music | Entertainment |
| `video-player` | Video Player | Video | Entertainment |
| `profile` | Profile | User | Personal |
| `settings` | Settings | Settings | (always visible) |

## Section Visibility, Order & Categories

Users can customize which sections appear, their order, and their category:

- **Settings -> Sections**: Toggle visibility, reorder with drag-and-drop, change category via dropdown
- **Hook**: `useSectionPreferences()` from `hooks/useSectionPreferences.ts`
- **Storage**: localStorage key `section-preferences`
- **Hydration**: Uses defaults during SSR, switches to user prefs after load

### Default Category Assignments

```typescript
const DEFAULT_CATEGORY_ASSIGNMENTS: Record<ToggleableSection, CategoryId> = {
  weather: "information",
  feed: "entertainment",
  "market-pulse": "finance",
  "api-playground": "development",
  bookmarks: "productivity",
  search: "information",
  "ai-workspace": "development",
  stocks: "finance",
  crypto: "finance",
  spacex: "entertainment",
  "github-activity": "development",
  disasters: "information",
  tasks: "productivity",
  projects: "development",
  jobs: "development",
  profile: "personal",
  kanban: "productivity",
  "photo-gallery": "entertainment",
  "music-player": "entertainment",
  "video-player": "entertainment",
  files: "development",
  analytics: "development",
  "prompts-playground": "development",
  flowchart: "development",
}
```

### Default Visibility

Most sections are visible by default. The following are hidden by default (opt-in):
- `video-player`
- `photo-gallery`
- `music-player`

## Adding a New Section

### 1. Update types in `hooks/useSectionPreferences.ts`

Add the new section ID to the `ToggleableSection` type:
```typescript
export type ToggleableSection = "weather" | ... | "new-section"
```

Add to `DEFAULT_SECTION_ORDER`:
```typescript
export const DEFAULT_SECTION_ORDER: ToggleableSection[] = [
  ...,
  "new-section",
]
```

Add to `DEFAULT_VISIBILITY`:
```typescript
export const DEFAULT_VISIBILITY: Record<ToggleableSection, boolean> = {
  ...,
  "new-section": true, // or false for opt-in
}
```

Add to `DEFAULT_CATEGORY_ASSIGNMENTS`:
```typescript
export const DEFAULT_CATEGORY_ASSIGNMENTS: Record<ToggleableSection, CategoryId> = {
  ...,
  "new-section": "development", // or appropriate category
}
```

### 2. Add to navigationItems array in `app/page.tsx`

```typescript
const navigationItems: NavigationItem[] = [
  ...,
  {
    id: "new-section",
    label: "New Section",
    icon: IconComponent,
    description: "Description for tooltip",
  },
]
```

### 3. Create section component

Create `app/sections/new-section.tsx`:
```typescript
"use client"

interface NewSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function NewSection({ activeSubItem, onSubItemHandled }: NewSectionProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">New Section</h1>
      {/* Section content */}
    </div>
  )
}
```

### 4. Import and add to renderContent()

In `app/page.tsx`, import the component and add a case:
```typescript
import NewSection from "./sections/new-section"

// In renderContent():
case "new-section":
  return <NewSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
```

For localhost-only sections, wrap with LocalOnlyOverlay:
```typescript
case "new-section":
  if (!isLocal) {
    return <LocalOnlyOverlay sectionName="New Section" description="..." />
  }
  return <NewSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
```

### 5. Add to SectionSettings in `components/SectionSettings.tsx`

```typescript
const SECTION_META: Record<ToggleableSection, { label: string; icon: LucideIcon; description: string }> = {
  ...,
  "new-section": { label: "New Section", icon: IconComponent, description: "..." },
}
```

### 6. Add tile to HomeSection (optional)

In the `tileConfig` object within HomeSection:
```typescript
const tileConfig: Record<ToggleableSection, { icon: React.ElementType; label: string; description: string } | null> = {
  ...,
  "new-section": { icon: IconComponent, label: "New Section", description: "Brief description" },
}
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `activeSection` | `Section` | Currently displayed section |
| `activeSubItem` | `string \| null` | Sub-item to scroll to (legacy, rarely used) |
| `sidebarCollapsed` | `boolean` | Desktop sidebar collapsed state |
| `mobileMenuOpen` | `boolean` | Mobile sheet drawer open state |

## Accessibility

- Sheet includes visually hidden title/description for screen readers
- Tooltips show labels when sidebar is collapsed
- Keyboard navigation supported

## File Locations

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main component, SidebarContent, HomeSection, navigationItems |
| `hooks/useSectionPreferences.ts` | Section visibility/order/category preferences hook |
| `components/SectionSettings.tsx` | Settings UI for toggling/reordering sections |
| `components/WorldClocks.tsx` | World clocks widget on Home page |
| `app/sections/*.tsx` | Individual section components |
