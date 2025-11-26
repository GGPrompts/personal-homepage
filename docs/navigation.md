# Navigation System

The sidebar uses an accordion-style navigation pattern with expandable sections and contextual sub-items.

## Layout Structure

```
┌──────────────────────┬─────────────────────────────────┐
│ [Home Button]        │                                 │
│ ──────────────────── │                                 │
│ ▸ Weather            │                                 │
│ ▼ Daily Feed         │        Section Content          │
│   • Sources          │                                 │
│   • Saved Items      │                                 │
│   • Refresh          │                                 │
│ ▸ API Playground     │                                 │
│ ▸ Settings           │                                 │
└──────────────────────┴─────────────────────────────────┘
```

## Accordion Behavior

- **Click section header**: Navigates to section AND toggles expand/collapse
- **Click sub-item**: Navigates to section (closes mobile menu)
- **Auto-collapse**: Only one section expanded at a time
- **Chevron rotation**: Indicates expanded (▾) or collapsed (▸) state

## Desktop vs Mobile

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Sidebar | Always visible, collapsible | Hidden in Sheet drawer |
| Toggle | Collapse button (-right-4) | Hamburger menu (top-left) |
| Width | 280px expanded, 80px collapsed | 288px (w-72) |
| Sub-items | Hidden when collapsed | Always shown |

## Navigation Configuration

Defined in `app/page.tsx`:

```typescript
type Section = "home" | "weather" | "feed" | "api-playground" | "settings"

interface SubItem {
  id: string
  label: string
  icon: React.ElementType
}

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
| **Settings** | Settings | Appearance, Feed Config, API Keys |

## Adding a New Section

1. **Update types** in `app/page.tsx`:
   ```typescript
   type Section = "home" | "weather" | "feed" | "api-playground" | "settings" | "new-section"
   ```

2. **Add to navigationItems array**:
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

5. **Add card to HomeSection** (optional):
   ```typescript
   <button onClick={() => onNavigate("new-section")} className="glass ...">
     ...
   </button>
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

## File Location

- Main component: `app/page.tsx`
- SidebarContent function: `app/page.tsx:121`
