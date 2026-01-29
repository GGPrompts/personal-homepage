import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  categoryDataToMeta,
  categoryMetaToData,
  DEFAULT_CATEGORIES,
  ICON_MAP,
  DEFAULT_VISIBILITY,
  DEFAULT_SECTION_ORDER,
  DEFAULT_CATEGORY_ASSIGNMENTS,
  DEFAULT_COLLAPSED_CATEGORIES,
  DEFAULT_CATEGORY_ORDER,
  DEFAULT_SECTION_AGENTS,
  AVAILABLE_ICONS,
  CATEGORIES,
  useSectionPreferences,
  type ToggleableSection,
  type CategoryData,
  type IconName,
} from '@/hooks/useSectionPreferences'

// =====================================================
// UTILITY FUNCTION TESTS
// =====================================================

describe('useSectionPreferences utilities', () => {
  describe('categoryDataToMeta', () => {
    it('converts CategoryData to CategoryMeta', () => {
      const data = {
        id: 'test-category',
        label: 'Test Category',
        description: 'A test category',
        iconName: 'Globe' as const,
        isCustom: true,
      }

      const meta = categoryDataToMeta(data)

      expect(meta.id).toBe('test-category')
      expect(meta.label).toBe('Test Category')
      expect(meta.description).toBe('A test category')
      expect(meta.icon).toBe(ICON_MAP.Globe)
      expect(meta.isCustom).toBe(true)
    })

    it('falls back to Folder icon for unknown icon names', () => {
      const data = {
        id: 'test',
        label: 'Test',
        description: 'Test',
        iconName: 'UnknownIcon' as never,
      }

      const meta = categoryDataToMeta(data)
      expect(meta.icon).toBe(ICON_MAP.Folder)
    })

    it('handles undefined isCustom property', () => {
      const data: CategoryData = {
        id: 'test',
        label: 'Test',
        description: 'Test',
        iconName: 'Globe',
      }

      const meta = categoryDataToMeta(data)
      expect(meta.isCustom).toBeUndefined()
    })

    it('handles empty strings in data fields', () => {
      const data: CategoryData = {
        id: '',
        label: '',
        description: '',
        iconName: 'Folder',
      }

      const meta = categoryDataToMeta(data)
      expect(meta.id).toBe('')
      expect(meta.label).toBe('')
      expect(meta.description).toBe('')
    })

    it('maps all valid icon names correctly', () => {
      for (const iconName of AVAILABLE_ICONS) {
        const data: CategoryData = {
          id: 'test',
          label: 'Test',
          description: 'Test',
          iconName,
        }
        const meta = categoryDataToMeta(data)
        expect(meta.icon).toBe(ICON_MAP[iconName])
      }
    })
  })

  describe('categoryMetaToData', () => {
    it('converts CategoryMeta to CategoryData', () => {
      const meta = {
        id: 'test-category',
        label: 'Test Category',
        description: 'A test category',
        icon: ICON_MAP.Code,
        isCustom: false,
      }

      const data = categoryMetaToData(meta, 'Code')

      expect(data.id).toBe('test-category')
      expect(data.label).toBe('Test Category')
      expect(data.description).toBe('A test category')
      expect(data.iconName).toBe('Code')
      expect(data.isCustom).toBe(false)
    })

    it('preserves undefined isCustom', () => {
      const meta = {
        id: 'test',
        label: 'Test',
        description: 'Test',
        icon: ICON_MAP.Globe,
      }

      const data = categoryMetaToData(meta, 'Globe')
      expect(data.isCustom).toBeUndefined()
    })

    it('allows any IconName to be passed', () => {
      const meta = {
        id: 'test',
        label: 'Test',
        description: 'Test',
        icon: ICON_MAP.Heart,
      }

      const data = categoryMetaToData(meta, 'Star')
      // The iconName comes from the parameter, not the icon component
      expect(data.iconName).toBe('Star')
    })
  })

  describe('DEFAULT_CATEGORIES', () => {
    it('has 6 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(6)
    })

    it('includes all expected category IDs', () => {
      const ids = DEFAULT_CATEGORIES.map((c) => c.id)
      expect(ids).toContain('information')
      expect(ids).toContain('productivity')
      expect(ids).toContain('development')
      expect(ids).toContain('finance')
      expect(ids).toContain('entertainment')
      expect(ids).toContain('personal')
    })

    it('has valid iconName for all categories', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(AVAILABLE_ICONS).toContain(cat.iconName)
      }
    })

    it('has non-empty labels and descriptions', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.label.length).toBeGreaterThan(0)
        expect(cat.description.length).toBeGreaterThan(0)
      }
    })

    it('has unique IDs', () => {
      const ids = DEFAULT_CATEGORIES.map((c) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('DEFAULT_VISIBILITY', () => {
    it('has visibility settings for all toggleable sections', () => {
      const sections = Object.keys(DEFAULT_VISIBILITY)
      expect(sections.length).toBeGreaterThan(0)
    })

    it('has some sections hidden by default', () => {
      expect(DEFAULT_VISIBILITY['video-player']).toBe(false)
      expect(DEFAULT_VISIBILITY['photo-gallery']).toBe(false)
      expect(DEFAULT_VISIBILITY['music-player']).toBe(false)
    })

    it('has core sections visible by default', () => {
      expect(DEFAULT_VISIBILITY.weather).toBe(true)
      expect(DEFAULT_VISIBILITY.tasks).toBe(true)
      expect(DEFAULT_VISIBILITY.bookmarks).toBe(true)
    })

    it('has only boolean values', () => {
      for (const value of Object.values(DEFAULT_VISIBILITY)) {
        expect(typeof value).toBe('boolean')
      }
    })
  })

  describe('DEFAULT_SECTION_ORDER', () => {
    it('includes all toggleable sections', () => {
      const visibilityKeys = Object.keys(DEFAULT_VISIBILITY)
      for (const key of visibilityKeys) {
        expect(DEFAULT_SECTION_ORDER).toContain(key)
      }
    })

    it('has no duplicate sections', () => {
      const uniqueSections = new Set(DEFAULT_SECTION_ORDER)
      expect(uniqueSections.size).toBe(DEFAULT_SECTION_ORDER.length)
    })

    it('has same length as DEFAULT_VISIBILITY keys', () => {
      expect(DEFAULT_SECTION_ORDER.length).toBe(Object.keys(DEFAULT_VISIBILITY).length)
    })
  })

  describe('DEFAULT_CATEGORY_ASSIGNMENTS', () => {
    it('assigns every section to a valid category', () => {
      const categoryIds = DEFAULT_CATEGORIES.map((c) => c.id)
      const assignments = Object.values(DEFAULT_CATEGORY_ASSIGNMENTS)

      for (const assignment of assignments) {
        expect(categoryIds).toContain(assignment)
      }
    })

    it('assigns sections to expected categories', () => {
      expect(DEFAULT_CATEGORY_ASSIGNMENTS.weather).toBe('information')
      expect(DEFAULT_CATEGORY_ASSIGNMENTS.tasks).toBe('productivity')
      expect(DEFAULT_CATEGORY_ASSIGNMENTS.stocks).toBe('finance')
      expect(DEFAULT_CATEGORY_ASSIGNMENTS['github-activity']).toBe('development')
    })

    it('has assignments for all sections in DEFAULT_SECTION_ORDER', () => {
      for (const section of DEFAULT_SECTION_ORDER) {
        expect(DEFAULT_CATEGORY_ASSIGNMENTS[section]).toBeDefined()
      }
    })
  })

  describe('DEFAULT_COLLAPSED_CATEGORIES', () => {
    it('has all default categories', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(DEFAULT_COLLAPSED_CATEGORIES[cat.id]).toBeDefined()
      }
    })

    it('has all categories expanded by default', () => {
      for (const value of Object.values(DEFAULT_COLLAPSED_CATEGORIES)) {
        expect(value).toBe(false)
      }
    })
  })

  describe('DEFAULT_CATEGORY_ORDER', () => {
    it('includes all default category IDs', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(DEFAULT_CATEGORY_ORDER).toContain(cat.id)
      }
    })

    it('has same length as DEFAULT_CATEGORIES', () => {
      expect(DEFAULT_CATEGORY_ORDER.length).toBe(DEFAULT_CATEGORIES.length)
    })
  })

  describe('DEFAULT_SECTION_AGENTS', () => {
    it('has all sections set to null', () => {
      for (const value of Object.values(DEFAULT_SECTION_AGENTS)) {
        expect(value).toBeNull()
      }
    })

    it('has entries for all toggleable sections', () => {
      for (const section of DEFAULT_SECTION_ORDER) {
        expect(section in DEFAULT_SECTION_AGENTS).toBe(true)
      }
    })
  })

  describe('ICON_MAP', () => {
    it('has all AVAILABLE_ICONS', () => {
      for (const iconName of AVAILABLE_ICONS) {
        expect(ICON_MAP[iconName]).toBeDefined()
      }
    })

    it('AVAILABLE_ICONS matches ICON_MAP keys', () => {
      expect(AVAILABLE_ICONS.sort()).toEqual(Object.keys(ICON_MAP).sort())
    })
  })

  describe('CATEGORIES (legacy export)', () => {
    it('is a CategoryMeta array with same length as DEFAULT_CATEGORIES', () => {
      expect(CATEGORIES.length).toBe(DEFAULT_CATEGORIES.length)
    })

    it('has icon components instead of iconName', () => {
      for (const cat of CATEGORIES) {
        // React components can be functions or objects (forwardRef returns an object)
        expect(['function', 'object']).toContain(typeof cat.icon)
        expect(cat.icon).toBeDefined()
        expect((cat as any).iconName).toBeUndefined()
      }
    })
  })
})

// =====================================================
// LOCALSTORAGE MOCKING AND HOOK TESTS
// =====================================================

describe('useSectionPreferences hook', () => {
  const STORAGE_KEY = 'section-preferences'

  // Mock localStorage
  let localStorageMock: Record<string, string> = {}

  beforeEach(() => {
    localStorageMock = {}

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('loads default preferences when localStorage is empty', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.visibility).toEqual(DEFAULT_VISIBILITY)
      expect(result.current.order).toEqual(DEFAULT_SECTION_ORDER)
      expect(result.current.categoryAssignments).toEqual(DEFAULT_CATEGORY_ASSIGNMENTS)
    })

    it('loads saved preferences from localStorage', async () => {
      const savedPrefs = {
        visibility: { ...DEFAULT_VISIBILITY, weather: false },
        order: DEFAULT_SECTION_ORDER,
        categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
        collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
        customCategories: [],
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        sectionAgents: DEFAULT_SECTION_AGENTS,
      }
      localStorageMock[STORAGE_KEY] = JSON.stringify(savedPrefs)

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.visibility.weather).toBe(false)
    })

    it('handles corrupted JSON in localStorage', async () => {
      localStorageMock[STORAGE_KEY] = 'not valid json {'

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // Should fall back to defaults
      expect(result.current.visibility).toEqual(DEFAULT_VISIBILITY)
    })

    it('handles empty string in localStorage', async () => {
      localStorageMock[STORAGE_KEY] = ''

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.visibility).toEqual(DEFAULT_VISIBILITY)
    })
  })

  describe('merging with defaults', () => {
    it('merges new sections into saved visibility', async () => {
      // Simulate saved preferences missing a section
      const oldVisibility = { ...DEFAULT_VISIBILITY }
      delete (oldVisibility as any).flowchart // Pretend this section didn't exist before

      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: oldVisibility,
        order: DEFAULT_SECTION_ORDER.filter((s) => s !== 'flowchart'),
        categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
        collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
        customCategories: [],
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        sectionAgents: DEFAULT_SECTION_AGENTS,
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // The new section should get its default visibility
      expect(result.current.visibility.flowchart).toBe(DEFAULT_VISIBILITY.flowchart)
      // And be added to the order
      expect(result.current.order).toContain('flowchart')
    })

    it('appends new sections to the end of saved order', async () => {
      const partialOrder = ['weather', 'feed', 'tasks']
      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: DEFAULT_VISIBILITY,
        order: partialOrder,
        categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
        collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
        customCategories: [],
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        sectionAgents: DEFAULT_SECTION_AGENTS,
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // First three should match saved order
      expect(result.current.order.slice(0, 3)).toEqual(partialOrder)
      // All sections should be present
      expect(result.current.order.length).toBe(DEFAULT_SECTION_ORDER.length)
    })

    it('merges custom categories from saved data', async () => {
      const customCategory: CategoryData = {
        id: 'custom-123',
        label: 'Custom',
        description: 'My custom category',
        iconName: 'Star',
        isCustom: true,
      }

      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: DEFAULT_VISIBILITY,
        order: DEFAULT_SECTION_ORDER,
        categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
        collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
        customCategories: [customCategory],
        categoryOrder: [...DEFAULT_CATEGORY_ORDER, 'custom-123'],
        sectionAgents: DEFAULT_SECTION_AGENTS,
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.customCategories).toHaveLength(1)
      expect(result.current.customCategories[0].id).toBe('custom-123')
      expect(result.current.categoryOrder).toContain('custom-123')
    })
  })

  describe('visibility actions', () => {
    it('toggleVisibility flips section visibility', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const initialVisibility = result.current.visibility.weather

      act(() => {
        result.current.toggleVisibility('weather')
      })

      expect(result.current.visibility.weather).toBe(!initialVisibility)
    })

    it('setVisibility sets specific visibility value', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.setVisibility('weather', false)
      })

      expect(result.current.visibility.weather).toBe(false)

      act(() => {
        result.current.setVisibility('weather', true)
      })

      expect(result.current.visibility.weather).toBe(true)
    })

    it('isVisible returns correct visibility state', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.isVisible('weather')).toBe(true)
      expect(result.current.isVisible('video-player')).toBe(false)
    })

    it('getVisibleSections returns only visible sections in order', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const visibleSections = result.current.getVisibleSections()

      // Should not include hidden sections
      expect(visibleSections).not.toContain('video-player')
      expect(visibleSections).not.toContain('photo-gallery')

      // Should include visible sections
      expect(visibleSections).toContain('weather')
      expect(visibleSections).toContain('tasks')
    })
  })

  describe('order actions', () => {
    it('moveUp moves section up in order', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const secondSection = result.current.order[1]
      const initialIndex = result.current.order.indexOf(secondSection)

      act(() => {
        result.current.moveUp(secondSection)
      })

      expect(result.current.order.indexOf(secondSection)).toBe(initialIndex - 1)
    })

    it('moveUp does nothing for first section', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const firstSection = result.current.order[0]
      const originalOrder = [...result.current.order]

      act(() => {
        result.current.moveUp(firstSection)
      })

      expect(result.current.order).toEqual(originalOrder)
    })

    it('moveDown moves section down in order', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const firstSection = result.current.order[0]

      act(() => {
        result.current.moveDown(firstSection)
      })

      expect(result.current.order.indexOf(firstSection)).toBe(1)
    })

    it('moveDown does nothing for last section', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const lastSection = result.current.order[result.current.order.length - 1]
      const originalOrder = [...result.current.order]

      act(() => {
        result.current.moveDown(lastSection)
      })

      expect(result.current.order).toEqual(originalOrder)
    })

    it('reorder sets a completely new order', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const newOrder = [...DEFAULT_SECTION_ORDER].reverse()

      act(() => {
        result.current.reorder(newOrder)
      })

      expect(result.current.order).toEqual(newOrder)
    })
  })

  describe('category actions', () => {
    it('toggleCategoryCollapsed flips category collapsed state', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const initialState = result.current.collapsedCategories.information

      act(() => {
        result.current.toggleCategoryCollapsed('information')
      })

      expect(result.current.collapsedCategories.information).toBe(!initialState)
    })

    it('setCategoryCollapsed sets specific collapsed value', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.setCategoryCollapsed('information', true)
      })

      expect(result.current.collapsedCategories.information).toBe(true)
    })

    it('isCategoryCollapsed returns correct state', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.isCategoryCollapsed('information')).toBe(false)

      act(() => {
        result.current.setCategoryCollapsed('information', true)
      })

      expect(result.current.isCategoryCollapsed('information')).toBe(true)
    })

    it('setSectionCategory changes section category assignment', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.setSectionCategory('weather', 'entertainment')
      })

      expect(result.current.categoryAssignments.weather).toBe('entertainment')
      expect(result.current.getSectionCategory('weather')).toBe('entertainment')
    })

    it('getSectionsByCategory groups sections correctly', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const grouped = result.current.getSectionsByCategory()

      // Check that weather is in information category
      expect(grouped.information).toContain('weather')
      // Check that stocks is in finance category
      expect(grouped.finance).toContain('stocks')
      // Hidden sections should not be included
      expect(grouped.entertainment).not.toContain('video-player')
    })
  })

  describe('agent actions', () => {
    it('getSectionAgent returns null by default', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.getSectionAgent('weather')).toBeNull()
    })

    it('setSectionAgent sets agent for section', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.setSectionAgent('weather', 'agent-123')
      })

      expect(result.current.getSectionAgent('weather')).toBe('agent-123')
      expect(result.current.sectionAgents.weather).toBe('agent-123')
    })

    it('setSectionAgent can clear agent with null', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.setSectionAgent('weather', 'agent-123')
      })

      act(() => {
        result.current.setSectionAgent('weather', null)
      })

      expect(result.current.getSectionAgent('weather')).toBeNull()
    })
  })

  describe('category management', () => {
    it('getAllCategories returns all categories in order', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const allCategories = result.current.getAllCategories()

      expect(allCategories.length).toBe(DEFAULT_CATEGORIES.length)
      expect(allCategories[0].id).toBe(result.current.categoryOrder[0])
    })

    it('getCategory returns category by ID', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const infoCategory = result.current.getCategory('information')

      expect(infoCategory).toBeDefined()
      expect(infoCategory?.label).toBe('Information')
    })

    it('getCategory returns undefined for unknown ID', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const unknown = result.current.getCategory('nonexistent')

      expect(unknown).toBeUndefined()
    })

    it('addCategory creates a new custom category', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      let newId: string = ''

      act(() => {
        newId = result.current.addCategory('My Category', 'Description', 'Star')
      })

      expect(newId).toMatch(/^custom-\d+$/)
      expect(result.current.customCategories.length).toBe(1)
      expect(result.current.categoryOrder).toContain(newId)
      expect(result.current.collapsedCategories[newId]).toBe(false)
    })

    it('updateCategory updates custom category', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      let newId: string = ''

      act(() => {
        newId = result.current.addCategory('Original', 'Original desc', 'Star')
      })

      act(() => {
        result.current.updateCategory(newId, { label: 'Updated', iconName: 'Heart' })
      })

      const updated = result.current.getCategory(newId)
      expect(updated?.label).toBe('Updated')
    })

    it('updateCategory creates override for default category', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.updateCategory('information', { label: 'Info Modified' })
      })

      const modified = result.current.getCategory('information')
      expect(modified?.label).toBe('Info Modified')
      // Should have one custom category (the override)
      expect(result.current.customCategories.length).toBe(1)
    })

    it('deleteCategory removes custom category with no sections', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      let newId: string = ''

      act(() => {
        newId = result.current.addCategory('To Delete', 'Will be deleted', 'Star')
      })

      let deleted = false
      act(() => {
        deleted = result.current.deleteCategory(newId)
      })

      expect(deleted).toBe(true)
      expect(result.current.customCategories.length).toBe(0)
      expect(result.current.categoryOrder).not.toContain(newId)
    })

    it('deleteCategory fails for category with sections', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      let newId: string = ''

      act(() => {
        newId = result.current.addCategory('With Sections', 'Has sections', 'Star')
      })

      act(() => {
        result.current.setSectionCategory('weather', newId)
      })

      let deleted = false
      act(() => {
        deleted = result.current.deleteCategory(newId)
      })

      expect(deleted).toBe(false)
      expect(result.current.customCategories.length).toBe(1)
    })

    it('deleteCategory fails for default categories', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      let deleted = false
      act(() => {
        deleted = result.current.deleteCategory('information')
      })

      expect(deleted).toBe(false)
    })

    it('reorderCategories changes category order', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const newOrder = [...DEFAULT_CATEGORY_ORDER].reverse()

      act(() => {
        result.current.reorderCategories(newOrder)
      })

      expect(result.current.categoryOrder).toEqual(newOrder)
    })

    it('getSectionCountForCategory returns correct count', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const infoCount = result.current.getSectionCountForCategory('information')
      const expectedCount = Object.values(DEFAULT_CATEGORY_ASSIGNMENTS).filter(
        (c) => c === 'information'
      ).length

      expect(infoCount).toBe(expectedCount)
    })

    it('canDeleteCategory returns correct value', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // Default categories cannot be deleted
      expect(result.current.canDeleteCategory('information')).toBe(false)

      let newId: string = ''
      act(() => {
        newId = result.current.addCategory('Empty', 'No sections', 'Star')
      })

      // Empty custom category can be deleted
      expect(result.current.canDeleteCategory(newId)).toBe(true)

      act(() => {
        result.current.setSectionCategory('weather', newId)
      })

      // Custom category with sections cannot be deleted
      expect(result.current.canDeleteCategory(newId)).toBe(false)
    })

    it('isDefaultCategory identifies default categories', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.isDefaultCategory('information')).toBe(true)
      expect(result.current.isDefaultCategory('custom-123')).toBe(false)
    })

    it('getCategoryIconName returns correct icon name', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.getCategoryIconName('information')).toBe('Globe')
      expect(result.current.getCategoryIconName('nonexistent')).toBe('Folder')
    })
  })

  describe('resetToDefaults', () => {
    it('resets all preferences to defaults', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // Make some changes
      act(() => {
        result.current.setVisibility('weather', false)
        result.current.addCategory('Custom', 'Test', 'Star')
        result.current.setSectionAgent('feed', 'agent-1')
      })

      // Reset
      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.visibility).toEqual(DEFAULT_VISIBILITY)
      expect(result.current.order).toEqual(DEFAULT_SECTION_ORDER)
      expect(result.current.customCategories).toEqual([])
      expect(result.current.categoryOrder).toEqual(DEFAULT_CATEGORY_ORDER)
      expect(result.current.sectionAgents).toEqual(DEFAULT_SECTION_AGENTS)
    })
  })

  describe('localStorage persistence', () => {
    it('saves preferences to localStorage when changed', async () => {
      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      act(() => {
        result.current.setVisibility('weather', false)
      })

      // Wait for the effect to save to localStorage
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock[STORAGE_KEY])
      expect(savedData.visibility.weather).toBe(false)
    })

    it('does not save before isLoaded is true', async () => {
      // This tests that we don't overwrite localStorage with initial state
      const savedPrefs = {
        visibility: { ...DEFAULT_VISIBILITY, weather: false },
        order: DEFAULT_SECTION_ORDER,
        categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
        collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
        customCategories: [],
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        sectionAgents: DEFAULT_SECTION_AGENTS,
      }
      localStorageMock[STORAGE_KEY] = JSON.stringify(savedPrefs)

      const { result } = renderHook(() => useSectionPreferences())

      // Before loaded, visibility should be from initial load
      expect(result.current.visibility.weather).toBe(false)

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // After loaded, should still have the saved value
      expect(result.current.visibility.weather).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles partial saved preferences gracefully', async () => {
      // Only visibility saved, no order
      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: { weather: false },
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.visibility.weather).toBe(false)
      // Other visibility should come from defaults
      expect(result.current.visibility.feed).toBe(DEFAULT_VISIBILITY.feed)
      // Order should be default
      expect(result.current.order).toEqual(DEFAULT_SECTION_ORDER)
    })

    it('handles null values in saved data', async () => {
      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: null,
        order: null,
        categoryAssignments: null,
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // Should merge with defaults
      expect(result.current.visibility).toBeDefined()
      expect(result.current.order.length).toBeGreaterThan(0)
    })

    it('handles array instead of object for visibility', async () => {
      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: ['weather', 'feed'], // Wrong type
        order: DEFAULT_SECTION_ORDER,
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // Should handle gracefully by merging with defaults
      expect(typeof result.current.visibility).toBe('object')
      expect(Array.isArray(result.current.visibility)).toBe(false)
    })

    it('preserves unknown sections in saved order', async () => {
      const orderWithUnknown = ['unknown-section' as ToggleableSection, ...DEFAULT_SECTION_ORDER]
      localStorageMock[STORAGE_KEY] = JSON.stringify({
        visibility: DEFAULT_VISIBILITY,
        order: orderWithUnknown,
        categoryAssignments: DEFAULT_CATEGORY_ASSIGNMENTS,
        collapsedCategories: DEFAULT_COLLAPSED_CATEGORIES,
        customCategories: [],
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        sectionAgents: DEFAULT_SECTION_AGENTS,
      })

      const { result } = renderHook(() => useSectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      // Unknown section should be preserved in order
      expect(result.current.order).toContain('unknown-section')
    })
  })
})
