"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command"
import {
  DEFAULT_CATEGORY_ASSIGNMENTS,
  DEFAULT_CATEGORIES,
  categoryDataToMeta,
  type ToggleableSection,
  type CategoryId,
  type CategoryMeta,
} from "@/hooks/useSectionPreferences"
import { useTabzBookmarks, type ChromeBookmark } from "@/hooks/useTabzBookmarks"
import {
  FileText,
  Globe,
  Bookmark,
  ExternalLink,
  BookOpen,
  Layers,
  Play,
} from "lucide-react"
import { type ReadingItem, STORAGE_KEY as READING_QUEUE_KEY } from "@/app/sections/reading-queue"
import { type WorkspaceBlueprint, loadBlueprints } from "@/components/bookmarks/blueprints"

// ============================================================================
// TYPES
// ============================================================================

interface QuickNote {
  id: string
  project: string
  text: string
  createdAt: string
  updatedAt?: string
}

interface NavigationItem {
  id: string
  label: string
  icon: React.ElementType
  description: string
}

type Section = "home" | ToggleableSection | "settings"

interface CommandPaletteProps {
  navigationItems: NavigationItem[]
  setActiveSection: (section: Section) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette({ navigationItems, setActiveSection }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [readingQueueItems, setReadingQueueItems] = useState<ReadingItem[]>([])
  const [blueprintItems, setBlueprintItems] = useState<WorkspaceBlueprint[]>([])

  // Bookmark search via TabzChrome
  const {
    results: bookmarkResults,
    isAvailable: bookmarksAvailable,
    search: searchBookmarks,
    clearSearch: clearBookmarkSearch,
  } = useTabzBookmarks(200)

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Fetch quick notes when palette opens
  useEffect(() => {
    if (open && !notesLoaded) {
      fetch("/api/quicknotes")
        .then((res) => {
          if (!res.ok) throw new Error(`quicknotes fetch failed: ${res.status}`)
          return res.json()
        })
        .then((data) => {
          setNotes(data.notes || [])
          setNotesLoaded(true)
        })
        .catch(() => {
          setNotesLoaded(true)
        })
    }
  }, [open, notesLoaded])

  // Load reading queue items when palette opens
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem(READING_QUEUE_KEY)
        if (saved) {
          const all: ReadingItem[] = JSON.parse(saved)
          // Get 3 most recent queued items
          const queued = all
            .filter((i) => i.status === "queued")
            .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
            .slice(0, 3)
          setReadingQueueItems(queued)
        } else {
          setReadingQueueItems([])
        }
      } catch {
        setReadingQueueItems([])
      }
    }
  }, [open])

  // Load workspace blueprints when palette opens
  useEffect(() => {
    if (open) {
      setBlueprintItems(loadBlueprints())
    }
  }, [open])

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setNotesLoaded(false)
      setNotes([])
      setReadingQueueItems([])
      setBlueprintItems([])
      clearBookmarkSearch()
    }
  }, [open, clearBookmarkSearch])

  // Handle section navigation
  const handleSelectSection = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId as Section)
      setOpen(false)
    },
    [setActiveSection]
  )

  // Handle bookmark selection
  const handleSelectBookmark = useCallback(
    (bookmark: ChromeBookmark) => {
      window.open(bookmark.url, "_blank")
      setOpen(false)
    },
    []
  )

  // Handle note selection: navigate to scratchpad
  const handleSelectNote = useCallback(() => {
    setActiveSection("tasks")
    setOpen(false)
  }, [setActiveSection])

  // Handle reading queue item selection: open URL and navigate to section
  const handleSelectReadingItem = useCallback(
    (item: ReadingItem) => {
      // Only open URLs with safe protocols to prevent javascript: XSS
      try {
        const parsed = new URL(item.url)
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          window.open(item.url, "_blank")
        }
      } catch {
        // Invalid URL, skip opening
      }
      setActiveSection("reading-queue")
      setOpen(false)
    },
    [setActiveSection]
  )

  // Handle workspace blueprint launch
  const handleLaunchBlueprint = useCallback(
    async (blueprint: WorkspaceBlueprint) => {
      setOpen(false)
      try {
        const res = await fetch("/api/workspace-launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: blueprint.name,
            windows: blueprint.windows,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          console.error("Blueprint launch failed:", data.error)
        }
      } catch (err) {
        console.error("Blueprint launch error:", err)
      }
    },
    []
  )

  // Handle search value changes for bookmark search
  const handleSearchChange = useCallback(
    (value: string) => {
      if (bookmarksAvailable) {
        searchBookmarks(value)
      }
    },
    [bookmarksAvailable, searchBookmarks]
  )

  // Group navigation items by category
  const groupedSections = groupNavigationByCategory(navigationItems)

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
    >
      <div data-tabz-section="command-palette">
        <CommandInput
          placeholder="Search sections, notes, bookmarks..."
          onValueChange={handleSearchChange}
          data-tabz-input="command-search"
        />
        <CommandList
          className="max-h-[400px]"
          data-tabz-list="command-results"
        >
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Section Navigation Groups */}
          {groupedSections.map(({ category, items }) => (
            <CommandGroup
              key={category.id}
              heading={category.label}
            >
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.description}`}
                    onSelect={() => handleSelectSection(item.id)}
                    data-tabz-action="navigate"
                    data-tabz-item={item.id}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    <CommandShortcut>{item.description}</CommandShortcut>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}

          {/* Quick Notes Group */}
          {notes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick Notes">
                {notes.slice(0, 5).map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`note ${note.text} ${note.project}`}
                    onSelect={handleSelectNote}
                    data-tabz-action="navigate"
                    data-tabz-item={`note-${note.id}`}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[300px]">
                      {note.text.length > 60
                        ? note.text.slice(0, 60) + "..."
                        : note.text}
                    </span>
                    <CommandShortcut>{note.project}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Reading Queue Group */}
          {readingQueueItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Reading Queue">
                {readingQueueItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`reading queue ${item.title} ${item.url}`}
                    onSelect={() => handleSelectReadingItem(item)}
                    data-tabz-action="open-reading-item"
                    data-tabz-item={`reading-${item.id}`}
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[250px]">{item.title}</span>
                    <CommandShortcut>
                      <ExternalLink className="h-3 w-3" />
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Workspace Blueprints Group */}
          {blueprintItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Workspace Blueprints">
                {blueprintItems.map((bp) => (
                  <CommandItem
                    key={bp.id}
                    value={`workspace blueprint ${bp.name} ${bp.windows.map((w) => w.label).join(" ")}`}
                    onSelect={() => handleLaunchBlueprint(bp)}
                    data-tabz-action="launch-blueprint"
                    data-tabz-item={`blueprint-${bp.id}`}
                  >
                    {bp.icon ? (
                      <span className="text-sm mr-1">{bp.icon}</span>
                    ) : (
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate max-w-[250px]">{bp.name}</span>
                    <CommandShortcut>
                      <Play className="h-3 w-3" />
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Bookmarks Group */}
          {bookmarksAvailable && bookmarkResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Bookmarks">
                {bookmarkResults.slice(0, 8).map((bookmark) => (
                  <CommandItem
                    key={bookmark.id}
                    value={`bookmark ${bookmark.title} ${bookmark.url}`}
                    onSelect={() => handleSelectBookmark(bookmark)}
                    data-tabz-action="navigate"
                    data-tabz-item={`bookmark-${bookmark.id}`}
                  >
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[250px]">{bookmark.title}</span>
                    <CommandShortcut>
                      <ExternalLink className="h-3 w-3" />
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </div>
    </CommandDialog>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

interface GroupedCategory {
  category: CategoryMeta
  items: NavigationItem[]
}

function groupNavigationByCategory(
  navigationItems: NavigationItem[]
): GroupedCategory[] {
  // Build category lookup from defaults
  const categoryMap = new Map<CategoryId, CategoryMeta>()
  for (const cat of DEFAULT_CATEGORIES) {
    categoryMap.set(cat.id, categoryDataToMeta(cat))
  }

  // Group items by category
  const groups = new Map<CategoryId, NavigationItem[]>()

  for (const item of navigationItems) {
    // Skip home and settings -- they're always accessible and don't belong to a toggleable category
    if (item.id === "home") continue

    const categoryId =
      item.id === "settings"
        ? "personal"
        : DEFAULT_CATEGORY_ASSIGNMENTS[item.id as ToggleableSection] || "personal"

    if (!groups.has(categoryId)) {
      groups.set(categoryId, [])
    }
    groups.get(categoryId)!.push(item)
  }

  // Return in category display order
  const result: GroupedCategory[] = []
  for (const cat of DEFAULT_CATEGORIES) {
    const items = groups.get(cat.id)
    if (items && items.length > 0) {
      result.push({
        category: categoryDataToMeta(cat),
        items,
      })
    }
  }

  // Catch any items in custom categories not in DEFAULT_CATEGORIES
  for (const [catId, items] of groups) {
    if (!categoryMap.has(catId) && items.length > 0) {
      result.push({
        category: {
          id: catId,
          label: catId,
          description: "",
          icon: Globe,
        },
        items,
      })
    }
  }

  return result
}
