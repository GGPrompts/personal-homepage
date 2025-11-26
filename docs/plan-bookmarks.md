# Bookmarks Section Plan

## User Requirements
- **Organization**: Folders/categories (like Chrome, hierarchical)
- **Storage**: GitHub sync (JSON file in repo, like Quick Notes)
- **Visual**: Icon view + List view toggle (like Windows folder)

## Data Structure

```typescript
interface Bookmark {
  id: string
  name: string
  url: string
  folderId: string | null  // null = root level
  icon?: string  // favicon URL or custom icon
  description?: string
  createdAt: string
}

interface Folder {
  id: string
  name: string
  parentId: string | null  // null = root level, allows nesting
  icon?: string  // optional emoji/icon
}

interface BookmarksData {
  bookmarks: Bookmark[]
  folders: Folder[]
}
```

**Storage**: `bookmarks.json` in GitHub repo root (or configurable path)

## UI Layout

### Desktop (Wide)
```
┌─────────────────────────────────────────────────────────────┐
│ Bookmarks                     [+Add] [+Folder] [Icon|List] 🔍│
├─────────────────────────────────────────────────────────────┤
│ 📁 Home > Dev > APIs                              [← Back] │
├─────────────────────────────────────────────────────────────┤
│ Icon View (folders + bookmarks together):                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │ 📁 │ │ 📁 │ │ 🌐 │ │ 🐙 │ │ 📦 │ │ 💬 │ │ 📧 │ │ 🔧 │   │
│ │Work│ │Dev │ │Site│ │Git │ │NPM │ │Disc│ │Mail│ │Tool│   │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   │
│                                                             │
│ List View (when toggled):                                  │
│ 📁 Work          (folder)        5 items                   │
│ 📁 Dev           (folder)        12 items                  │
│ 🌐 GitHub        github.com      Code hosting              │
│ 🐙 NPM           npmjs.com       Package registry          │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (Narrow)
- Icon view: 4 items per row
- List view: Full width rows
- Breadcrumb navigation for folder hierarchy

## Features

### Core
1. **View Toggle**: Icon grid / List view (persisted in localStorage)
2. **Folder Navigation**: Click folder to enter, breadcrumb to go back
3. **Search**: Filter by name/URL/description across ALL folders
4. **Add Bookmark**: Dialog with name, URL, folder, description
5. **Add Folder**: Create new folders, optionally nested
6. **Edit/Delete**: Context menu or edit button on items
7. **GitHub Sync**: Load/save to `bookmarks.json` in repo

### Favicon Handling
- Use Google's favicon service: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
- Fallback to first letter of name as icon
- Allow custom emoji or icon override

## Components

```
app/sections/bookmarks.tsx
├── BookmarksSection (main component)
├── BookmarkGrid (icon view)
├── BookmarkList (list view)
├── BookmarkCard (single item - icon view)
├── BookmarkRow (single item - list view)
├── TagFilter (horizontal tag pills)
├── AddBookmarkDialog
└── EditBookmarkDialog
```

## Navigation Integration

Add to `navigationItems` in page.tsx:
```typescript
{
  id: "bookmarks",
  label: "Bookmarks",
  icon: Bookmark,  // from lucide-react
  description: "Quick links",
  subItems: [
    { id: "all", label: "All Links", icon: Grid },
    { id: "tags", label: "Manage Tags", icon: Tags },
  ]
}
```

## Implementation Steps

1. Add "bookmarks" to Section type and navigationItems
2. Create `app/sections/bookmarks.tsx` with basic structure
3. Add GitHub sync functions to `lib/github.ts` for JSON files
4. Implement icon grid view
5. Implement list view with toggle
6. Add tag filtering
7. Add search
8. Add/Edit/Delete bookmark dialogs
9. Test responsive layout
10. Create `docs/bookmarks.md` documentation

## Estimated Complexity
- **Low-Medium** - Similar patterns to Quick Notes (GitHub sync) and Daily Feed (grid layout)
- Main work: Two view modes and tag management UI
