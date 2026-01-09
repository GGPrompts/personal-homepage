"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Globe,
  CheckSquare,
  Code,
  TrendingUp,
  Play,
  User,
  Folder,
  Star,
  Heart,
  Zap,
  Coffee,
  Home,
  Settings,
  Layers,
  Grid,
  Box,
  Circle,
  Square,
  Triangle,
  Hexagon,
  type LucideIcon,
} from "lucide-react"

// Section IDs that can be toggled (excluding home and settings which are always visible)
export type ToggleableSection = "weather" | "feed" | "api-playground" | "notes" | "bookmarks" | "search" | "stocks" | "crypto" | "spacex" | "github-activity" | "disasters" | "tasks" | "projects" | "jobs" | "profile" | "ai-workspace" | "market-pulse" | "kanban" | "photo-gallery" | "music-player" | "video-player" | "files"

// All sections including non-toggleable ones
export type Section = "home" | ToggleableSection | "settings"

// Category IDs - now supports custom string IDs
export type CategoryId = string

// Icon name type for serialization
export type IconName = "Globe" | "CheckSquare" | "Code" | "TrendingUp" | "Play" | "User" | "Folder" | "Star" | "Heart" | "Zap" | "Coffee" | "Home" | "Settings" | "Layers" | "Grid" | "Box" | "Circle" | "Square" | "Triangle" | "Hexagon"

// Map of icon names to components for serialization
export const ICON_MAP: Record<IconName, LucideIcon> = {
  Globe,
  CheckSquare,
  Code,
  TrendingUp,
  Play,
  User,
  Folder,
  Star,
  Heart,
  Zap,
  Coffee,
  Home,
  Settings,
  Layers,
  Grid,
  Box,
  Circle,
  Square,
  Triangle,
  Hexagon,
}

// Available icons for category customization
export const AVAILABLE_ICONS: IconName[] = Object.keys(ICON_MAP) as IconName[]

// Category metadata (runtime)
export interface CategoryMeta {
  id: CategoryId
  label: string
  description: string
  icon: LucideIcon
  isCustom?: boolean
}

// Category data for storage (serializable)
export interface CategoryData {
  id: CategoryId
  label: string
  description: string
  iconName: IconName
  isCustom?: boolean
}

// Default category IDs
export const DEFAULT_CATEGORY_IDS = ["information", "productivity", "development", "finance", "entertainment", "personal"] as const
export type DefaultCategoryId = typeof DEFAULT_CATEGORY_IDS[number]

// Default category definitions (in display order)
export const DEFAULT_CATEGORIES: CategoryData[] = [
  { id: "information", label: "Information", description: "Weather, news, and alerts", iconName: "Globe" },
  { id: "productivity", label: "Productivity", description: "Notes, tasks, and bookmarks", iconName: "CheckSquare" },
  { id: "development", label: "Development", description: "API tools and code", iconName: "Code" },
  { id: "finance", label: "Finance", description: "Stocks and crypto", iconName: "TrendingUp" },
  { id: "entertainment", label: "Entertainment", description: "Feeds and media", iconName: "Play" },
  { id: "personal", label: "Personal", description: "Profile and settings", iconName: "User" },
]

// Convert CategoryData to CategoryMeta (add icon component)
export function categoryDataToMeta(data: CategoryData): CategoryMeta {
  return {
    id: data.id,
    label: data.label,
    description: data.description,
    icon: ICON_MAP[data.iconName] || Folder,
    isCustom: data.isCustom,
  }
}

// Convert CategoryMeta to CategoryData (for storage)
export function categoryMetaToData(meta: CategoryMeta, iconName: IconName): CategoryData {
  return {
    id: meta.id,
    label: meta.label,
    description: meta.description,
    iconName,
    isCustom: meta.isCustom,
  }
}

// Legacy CATEGORIES export for backward compatibility
export const CATEGORIES: CategoryMeta[] = DEFAULT_CATEGORIES.map(categoryDataToMeta)

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
  "photo-gallery": "entertainment",
  "music-player": "entertainment",
  "video-player": "entertainment",
  files: "development",
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
  "files",
  "jobs",
  "profile",
  "kanban",
  "photo-gallery",
  "music-player",
]

// Default visibility (all visible except media players which are opt-in)
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
  files: true,
  jobs: true,
  profile: true,
  kanban: true,
  "photo-gallery": false,
  "music-player": false,
}

const STORAGE_KEY = "section-preferences"

// Default category order
export const DEFAULT_CATEGORY_ORDER: CategoryId[] = DEFAULT_CATEGORY_IDS.slice()

interface SectionPreferences {
  visibility: Record<ToggleableSection, boolean>
  order: ToggleableSection[]
  categoryAssignments: Record<ToggleableSection, CategoryId>
  collapsedCategories: Record<CategoryId, boolean>
  // New: custom categories and category order
  customCategories: CategoryData[]
  categoryOrder: CategoryId[]
}

function loadPreferences(): SectionPreferences {
  if (typeof window === "undefined") {
    return {
      visibility: DEFAULT_VISIBILITY,
      order: DEFAULT_SECTION_ORDER,
      categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
      collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
      customCategories: [],
      categoryOrder: DEFAULT_CATEGORY_ORDER,
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

      // Load custom categories (new feature)
      const customCategories: CategoryData[] = parsed.customCategories || []

      // Load category order, ensuring all default categories are included
      let categoryOrder: CategoryId[] = []
      if (parsed.categoryOrder?.length) {
        categoryOrder = [...parsed.categoryOrder]
        // Ensure all default categories are in the order
        for (const catId of DEFAULT_CATEGORY_ORDER) {
          if (!categoryOrder.includes(catId)) {
            categoryOrder.push(catId)
          }
        }
        // Ensure all custom categories are in the order
        for (const cat of customCategories) {
          if (!categoryOrder.includes(cat.id)) {
            categoryOrder.push(cat.id)
          }
        }
      } else {
        categoryOrder = [...DEFAULT_CATEGORY_ORDER, ...customCategories.map(c => c.id)]
      }

      return { visibility, order, categoryAssignments, collapsedCategories, customCategories, categoryOrder }
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return {
    visibility: DEFAULT_VISIBILITY,
    order: DEFAULT_SECTION_ORDER,
    categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
    collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
    customCategories: [],
    categoryOrder: DEFAULT_CATEGORY_ORDER,
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
      customCategories: [],
      categoryOrder: DEFAULT_CATEGORY_ORDER,
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
    const result: Record<CategoryId, ToggleableSection[]> = {}

    // Initialize all categories (default + custom)
    for (const catId of preferences.categoryOrder) {
      result[catId] = []
    }

    // Use the order array to maintain section order within categories
    for (const section of preferences.order) {
      if (preferences.visibility[section]) {
        const category = preferences.categoryAssignments[section]
        if (!result[category]) {
          result[category] = []
        }
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

  // =====================================================
  // CATEGORY MANAGEMENT FUNCTIONS
  // =====================================================

  // Get all categories (default + custom) as CategoryMeta, respecting order
  const getAllCategories = useCallback((): CategoryMeta[] => {
    const categoryMap = new Map<CategoryId, CategoryMeta>()

    // Add default categories
    for (const cat of DEFAULT_CATEGORIES) {
      categoryMap.set(cat.id, categoryDataToMeta(cat))
    }

    // Add/override with custom categories
    for (const cat of preferences.customCategories) {
      categoryMap.set(cat.id, categoryDataToMeta(cat))
    }

    // Return in order
    return preferences.categoryOrder
      .filter(id => categoryMap.has(id))
      .map(id => categoryMap.get(id)!)
  }, [preferences.customCategories, preferences.categoryOrder])

  // Get a category by ID
  const getCategory = useCallback((categoryId: CategoryId): CategoryMeta | undefined => {
    // Check custom categories first
    const custom = preferences.customCategories.find(c => c.id === categoryId)
    if (custom) {
      return categoryDataToMeta(custom)
    }
    // Fall back to default
    const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
    if (defaultCat) {
      return categoryDataToMeta(defaultCat)
    }
    return undefined
  }, [preferences.customCategories])

  // Add a new custom category
  const addCategory = useCallback((label: string, description: string, iconName: IconName): CategoryId => {
    const id = `custom-${Date.now()}`
    const newCategory: CategoryData = {
      id,
      label,
      description,
      iconName,
      isCustom: true,
    }
    setPreferences((prev) => ({
      ...prev,
      customCategories: [...prev.customCategories, newCategory],
      categoryOrder: [...prev.categoryOrder, id],
      collapsedCategories: { ...prev.collapsedCategories, [id]: false },
    }))
    return id
  }, [])

  // Update an existing category (works for both default and custom)
  const updateCategory = useCallback((categoryId: CategoryId, updates: { label?: string; description?: string; iconName?: IconName }) => {
    setPreferences((prev) => {
      // Check if it's a custom category
      const customIndex = prev.customCategories.findIndex(c => c.id === categoryId)
      if (customIndex >= 0) {
        const updatedCustom = [...prev.customCategories]
        updatedCustom[customIndex] = {
          ...updatedCustom[customIndex],
          ...updates,
        }
        return { ...prev, customCategories: updatedCustom }
      }

      // It's a default category - create a custom override
      const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
      if (defaultCat) {
        const customOverride: CategoryData = {
          ...defaultCat,
          ...updates,
          isCustom: false, // Mark as modified default, not fully custom
        }
        return {
          ...prev,
          customCategories: [...prev.customCategories, customOverride],
        }
      }

      return prev
    })
  }, [])

  // Delete a custom category (only works for custom categories, not defaults)
  const deleteCategory = useCallback((categoryId: CategoryId): boolean => {
    // Check if any sections are assigned to this category
    const sectionsInCategory = Object.entries(preferences.categoryAssignments)
      .filter(([_, catId]) => catId === categoryId)
      .map(([section]) => section as ToggleableSection)

    if (sectionsInCategory.length > 0) {
      // Cannot delete - has sections
      return false
    }

    // Check if it's a fully custom category (not a modified default)
    const customCat = preferences.customCategories.find(c => c.id === categoryId)
    if (!customCat?.isCustom) {
      // Cannot delete default categories (even if modified)
      return false
    }

    setPreferences((prev) => ({
      ...prev,
      customCategories: prev.customCategories.filter(c => c.id !== categoryId),
      categoryOrder: prev.categoryOrder.filter(id => id !== categoryId),
    }))
    return true
  }, [preferences.categoryAssignments, preferences.customCategories])

  // Reorder categories
  const reorderCategories = useCallback((newOrder: CategoryId[]) => {
    setPreferences((prev) => ({ ...prev, categoryOrder: newOrder }))
  }, [])

  // Get section count for a category
  const getSectionCountForCategory = useCallback((categoryId: CategoryId): number => {
    return Object.values(preferences.categoryAssignments).filter(id => id === categoryId).length
  }, [preferences.categoryAssignments])

  // Check if a category can be deleted (is custom and has no sections)
  const canDeleteCategory = useCallback((categoryId: CategoryId): boolean => {
    const customCat = preferences.customCategories.find(c => c.id === categoryId)
    if (!customCat?.isCustom) {
      return false // Can't delete default categories
    }
    const sectionCount = Object.values(preferences.categoryAssignments).filter(id => id === categoryId).length
    return sectionCount === 0
  }, [preferences.customCategories, preferences.categoryAssignments])

  // Check if a category is a default category
  const isDefaultCategory = useCallback((categoryId: CategoryId): boolean => {
    return DEFAULT_CATEGORY_IDS.includes(categoryId as DefaultCategoryId)
  }, [])

  // Get the icon name for a category (for the icon picker)
  const getCategoryIconName = useCallback((categoryId: CategoryId): IconName => {
    // Check custom categories first
    const custom = preferences.customCategories.find(c => c.id === categoryId)
    if (custom) {
      return custom.iconName
    }
    // Fall back to default
    const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
    if (defaultCat) {
      return defaultCat.iconName
    }
    return "Folder"
  }, [preferences.customCategories])

  return {
    visibility: preferences.visibility,
    order: preferences.order,
    categoryAssignments: preferences.categoryAssignments,
    collapsedCategories: preferences.collapsedCategories,
    customCategories: preferences.customCategories,
    categoryOrder: preferences.categoryOrder,
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
    // Category management
    getAllCategories,
    getCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getSectionCountForCategory,
    canDeleteCategory,
    isDefaultCategory,
    getCategoryIconName,
  }
}
