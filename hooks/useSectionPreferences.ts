"use client"

import { useState, useEffect, useCallback } from "react"

// Section IDs that can be toggled (excluding home and settings which are always visible)
export type ToggleableSection = "weather" | "feed" | "api-playground" | "notes" | "bookmarks" | "search" | "stocks" | "crypto" | "spacex" | "github-activity" | "disasters" | "tasks" | "projects" | "jobs" | "profile" | "ai-workspace" | "market-pulse" | "kanban" | "video-player"

// All sections including non-toggleable ones
export type Section = "home" | ToggleableSection | "settings"

// Category IDs for organizing sections in sidebar
export type CategoryId = "information" | "productivity" | "development" | "finance" | "entertainment" | "personal"

// Category metadata
export interface CategoryMeta {
  id: CategoryId
  label: string
  description: string
}

// Category definitions (in display order)
export const CATEGORIES: CategoryMeta[] = [
  { id: "information", label: "Information", description: "Weather, news, and alerts" },
  { id: "productivity", label: "Productivity", description: "Notes, tasks, and bookmarks" },
  { id: "development", label: "Development", description: "API tools and code" },
  { id: "finance", label: "Finance", description: "Stocks and crypto" },
  { id: "entertainment", label: "Entertainment", description: "Feeds and media" },
  { id: "personal", label: "Personal", description: "Profile and settings" },
]

// Default category assignments for each section
export const DEFAULT_CATEGORY_ASSIGNMENTS: Record<ToggleableSection, CategoryId> = {
  weather: "information",
  feed: "entertainment",
  "market-pulse": "finance",
  "api-playground": "development",
  notes: "productivity",
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
  "video-player": "entertainment",
}

// Default collapsed state (all expanded)
export const DEFAULT_COLLAPSED_CATEGORIES: Record<CategoryId, boolean> = {
  information: false,
  productivity: false,
  development: false,
  finance: false,
  entertainment: false,
  personal: false,
}

// Default order of sections in sidebar (within categories, sections will be ordered by this)
export const DEFAULT_SECTION_ORDER: ToggleableSection[] = [
  "weather",
  "feed",
  "market-pulse",
  "api-playground",
  "notes",
  "bookmarks",
  "search",
  "ai-workspace",
  "stocks",
  "crypto",
  "spacex",
  "video-player",
  "github-activity",
  "disasters",
  "tasks",
  "projects",
  "jobs",
  "profile",
  "kanban",
]

// Default visibility (all visible except video-player)
export const DEFAULT_VISIBILITY: Record<ToggleableSection, boolean> = {
  weather: true,
  feed: true,
  "market-pulse": true,
  "api-playground": true,
  notes: true,
  bookmarks: true,
  search: true,
  "ai-workspace": true,
  stocks: true,
  crypto: true,
  spacex: true,
  "video-player": false,
  "github-activity": true,
  disasters: true,
  tasks: true,
  projects: true,
  jobs: true,
  profile: true,
  kanban: true,
}

const STORAGE_KEY = "section-preferences"

interface SectionPreferences {
  visibility: Record<ToggleableSection, boolean>
  order: ToggleableSection[]
  categoryAssignments: Record<ToggleableSection, CategoryId>
  collapsedCategories: Record<CategoryId, boolean>
}

function loadPreferences(): SectionPreferences {
  if (typeof window === "undefined") {
    return {
      visibility: DEFAULT_VISIBILITY,
      order: DEFAULT_SECTION_ORDER,
      categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
      collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
    }
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)

      // Merge visibility with defaults (new sections get default visibility)
      const visibility = { ...DEFAULT_VISIBILITY, ...parsed.visibility }

      // Merge order: keep saved order but append any new sections at the end
      let order: ToggleableSection[] = []
      if (parsed.order?.length) {
        // Start with saved order
        order = [...parsed.order]
        // Add any new sections that aren't in saved order
        for (const section of DEFAULT_SECTION_ORDER) {
          if (!order.includes(section)) {
            order.push(section)
          }
        }
      } else {
        order = DEFAULT_SECTION_ORDER
      }

      // Merge category assignments with defaults (new sections get default category)
      const categoryAssignments = { ...DEFAULT_CATEGORY_ASSIGNMENTS, ...parsed.categoryAssignments }

      // Merge collapsed categories with defaults (new categories start expanded)
      const collapsedCategories = { ...DEFAULT_COLLAPSED_CATEGORIES, ...parsed.collapsedCategories }

      return { visibility, order, categoryAssignments, collapsedCategories }
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return {
    visibility: DEFAULT_VISIBILITY,
    order: DEFAULT_SECTION_ORDER,
    categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
    collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
  }
}

export function useSectionPreferences() {
  const [preferences, setPreferences] = useState<SectionPreferences>(loadPreferences)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setPreferences(loadPreferences())
    setIsLoaded(true)
  }, [])

  // Save to localStorage when preferences change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    }
  }, [preferences, isLoaded])

  // Toggle visibility of a section
  const toggleVisibility = useCallback((section: ToggleableSection) => {
    setPreferences((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [section]: !prev.visibility[section],
      },
    }))
  }, [])

  // Set visibility of a section
  const setVisibility = useCallback((section: ToggleableSection, visible: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [section]: visible,
      },
    }))
  }, [])

  // Move a section up in the order
  const moveUp = useCallback((section: ToggleableSection) => {
    setPreferences((prev) => {
      const order = [...prev.order]
      const index = order.indexOf(section)
      if (index > 0) {
        [order[index - 1], order[index]] = [order[index], order[index - 1]]
      }
      return { ...prev, order }
    })
  }, [])

  // Move a section down in the order
  const moveDown = useCallback((section: ToggleableSection) => {
    setPreferences((prev) => {
      const order = [...prev.order]
      const index = order.indexOf(section)
      if (index < order.length - 1) {
        [order[index], order[index + 1]] = [order[index + 1], order[index]]
      }
      return { ...prev, order }
    })
  }, [])

  // Reorder sections (for drag-and-drop)
  const reorder = useCallback((newOrder: ToggleableSection[]) => {
    setPreferences((prev) => ({ ...prev, order: newOrder }))
  }, [])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences({
      visibility: DEFAULT_VISIBILITY,
      order: DEFAULT_SECTION_ORDER,
      categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
      collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
    })
  }, [])

  // Get visible sections in order
  const getVisibleSections = useCallback((): ToggleableSection[] => {
    return preferences.order.filter((section) => preferences.visibility[section])
  }, [preferences])

  // Check if a section is visible
  const isVisible = useCallback((section: ToggleableSection): boolean => {
    return preferences.visibility[section]
  }, [preferences.visibility])

  // Toggle a category's collapsed state
  const toggleCategoryCollapsed = useCallback((categoryId: CategoryId) => {
    setPreferences((prev) => ({
      ...prev,
      collapsedCategories: {
        ...prev.collapsedCategories,
        [categoryId]: !prev.collapsedCategories[categoryId],
      },
    }))
  }, [])

  // Set a category's collapsed state
  const setCategoryCollapsed = useCallback((categoryId: CategoryId, collapsed: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      collapsedCategories: {
        ...prev.collapsedCategories,
        [categoryId]: collapsed,
      },
    }))
  }, [])

  // Change a section's category
  const setSectionCategory = useCallback((section: ToggleableSection, categoryId: CategoryId) => {
    setPreferences((prev) => ({
      ...prev,
      categoryAssignments: {
        ...prev.categoryAssignments,
        [section]: categoryId,
      },
    }))
  }, [])

  // Get sections grouped by category (respecting visibility and order)
  const getSectionsByCategory = useCallback(() => {
    const result: Record<CategoryId, ToggleableSection[]> = {
      information: [],
      productivity: [],
      development: [],
      finance: [],
      entertainment: [],
      personal: [],
    }

    // Use the order array to maintain section order within categories
    for (const section of preferences.order) {
      if (preferences.visibility[section]) {
        const category = preferences.categoryAssignments[section]
        result[category].push(section)
      }
    }

    return result
  }, [preferences])

  // Check if a category is collapsed
  const isCategoryCollapsed = useCallback((categoryId: CategoryId): boolean => {
    return preferences.collapsedCategories[categoryId]
  }, [preferences.collapsedCategories])

  // Get a section's category
  const getSectionCategory = useCallback((section: ToggleableSection): CategoryId => {
    return preferences.categoryAssignments[section]
  }, [preferences.categoryAssignments])

  return {
    visibility: preferences.visibility,
    order: preferences.order,
    categoryAssignments: preferences.categoryAssignments,
    collapsedCategories: preferences.collapsedCategories,
    isLoaded,
    toggleVisibility,
    setVisibility,
    moveUp,
    moveDown,
    reorder,
    resetToDefaults,
    getVisibleSections,
    isVisible,
    toggleCategoryCollapsed,
    setCategoryCollapsed,
    setSectionCategory,
    getSectionsByCategory,
    isCategoryCollapsed,
    getSectionCategory,
  }
}
