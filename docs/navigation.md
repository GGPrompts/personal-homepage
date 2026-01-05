# Navigation System

The sidebar uses a categorized navigation pattern with collapsible category groups.

## Layout Structure

```
┌──────────────────────┬─────────────────────────────────┐
│ [Home Button]        │                                 │
│ ──────────────────── │                                 │
│ ▼ INFORMATION        │                                 │
│   • Weather          │                                 │
│   • Search Hub       │        Section Content          │
│   • Disasters        │                                 │
│ ▼ PRODUCTIVITY       │                                 │
│   • Docs Editor      │                                 │
│   • Scratchpad       │                                 │
│   • Bookmarks        │                                 │
│ ▸ DEVELOPMENT        │  (collapsed)                    │
│ ──────────────────── │                                 │
│ Settings             │                                 │
└──────────────────────┴─────────────────────────────────┘
```

## Category System

Sections are organized into collapsible categories:

| Category | Default Sections |
|----------|------------------|
| **Information** | Weather, Search Hub, Disasters |
| **Productivity** | Docs Editor, Scratchpad, Bookmarks, Tasks, Kanban |
| **Development** | API Playground, AI Workspace, GitHub Activity, Projects, Jobs |
| **Finance** | Market Pulse, Paper Trading, Crypto |
| **Entertainment** | Daily Feed, SpaceX Launches |
| **Personal** | Integrations, Profile, Setup Wizard |

## Category Behavior

- **Click category header**: Toggles expand/collapse for that category
- **Chevron rotation**: Indicates expanded (▾) or collapsed (▸) state
- **Section count**: Shows number of sections on hover
- **Empty categories**: Automatically hidden when all sections in category are disabled
- **Collapsed state**: Persisted to localStorage

## Customization

Users can customize categories via Settings → Sections:
- Change a section's category using the dropdown
- Categories with sections will display in the sidebar
- Category order is fixed (Information → Productivity → Development → Finance → Entertainment → Personal)

## Desktop vs Mobile

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Sidebar | Always visible, collapsible | Hidden in Sheet drawer |
| Toggle | Collapse button (-right-4) | Hamburger menu (top-left) |
| Width | 280px expanded, 80px collapsed | 288px (w-72) |
| Sub-items | Hidden when collapsed | Always shown |

## Navigation Configuration

Defined in `app/page.tsx` and `hooks/useSectionPreferences.ts`:

```typescript
// Toggleable sections (can be hidden/reordered)
type ToggleableSection = "weather" | "feed" | "api-playground" | "notes" | "bookmarks" | "search" | "stocks" | "tasks" | "integrations" | "profile"

// All sections
type Section = "home" | ToggleableSection | "settings"

interface NavigationItem {
  id: Section
  label: string
  icon: React.ElementType
  description: string
  subItems?: SubItem[]
}
```

## Current Sections

| Section | Icon | Sub-items |
|---------|------|-----------|
| **Weather** | Cloud | Forecast, Radar, Alerts |
| **Daily Feed** | Newspaper | Sources, Saved Items, Refresh |
| **API Playground** | Zap | Collections, History |
| **Quick Notes** | FileText | Browse Files, Recent |
| **Bookmarks** | Bookmark | All Links, Search |
| **Search Hub** | Search | Search, AI Chat, Image AI |
| **Paper Trading** | TrendingUp | Portfolio, Watchlist, History |
| **Tasks** | CheckCircle2 | To Do, Completed |
| **Integrations** | Link2 | Authentication, API Services, Data Sources |
| **Profile** | User | Account, Sync Status |
| **Settings** | Settings | Appearance, Sections, Feed Config, API Keys |

## Section Visibility, Order & Categories

Users can customize which sections appear, their order, and their category:

- **Settings → Sections**: Toggle visibility, reorder with drag-and-drop, change category via dropdown
- **Hook**: `useSectionPreferences()` from `hooks/useSectionPreferences.ts`
- **Storage**: localStorage key `section-preferences`
- **Hydration**: Uses defaults during SSR, switches to user prefs after load

### Category Types

```typescript
type CategoryId = "information" | "productivity" | "development" | "finance" | "entertainment" | "personal"
```

## Adding a New Section

1. **Update types** in `hooks/useSectionPreferences.ts`:
   ```typescript
   type ToggleableSection = "weather" | ... | "new-section"
   ```
   Also add to `DEFAULT_SECTION_ORDER`, `DEFAULT_VISIBILITY`, and `DEFAULT_CATEGORY_ASSIGNMENTS`.

2. **Add to navigationItems array** in `app/page.tsx`:
   ```typescript
   {
     id: "new-section",
     label: "New Section",
     icon: IconComponent,
     description: "Description for tooltip",
     subItems: [
       { id: "sub1", label: "Sub Item 1", icon: SubIcon1 },
       { id: "sub2", label: "Sub Item 2", icon: SubIcon2 },
     ]
   }
   ```

3. **Create section component** in `app/sections/new-section.tsx`

4. **Import and add to renderContent()** switch statement:
   ```typescript
   case "new-section":
     return <NewSection />
   ```

5. **Add to SectionSettings** in `components/SectionSettings.tsx`:
   ```typescript
   "new-section": { label: "New Section", icon: IconComponent, description: "..." }
   ```

6. **Add card to HomeSection** (optional):
   ```typescript
   {checkVisible("new-section") && (
     <button onClick={() => onNavigate("new-section")} className="glass ...">
       ...
     </button>
   )}
   ```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `activeSection` | `Section` | Currently displayed section |
| `expandedSection` | `Section \| null` | Which sidebar section is expanded |
| `sidebarCollapsed` | `boolean` | Desktop sidebar collapsed state |
| `mobileMenuOpen` | `boolean` | Mobile sheet drawer open state |

## Accessibility

- Sheet includes visually hidden title/description for screen readers
- Tooltips show labels when sidebar is collapsed
- Keyboard navigation supported

## File Locations

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main component, SidebarContent, HomeSection, SettingsSection |
| `hooks/useSectionPreferences.ts` | Section visibility/order preferences hook |
| `components/SectionSettings.tsx` | Settings UI for toggling/reordering sections |
| `components/WorldClocks.tsx` | World clocks widget on Home page |
| `app/sections/*.tsx` | Individual section components |
