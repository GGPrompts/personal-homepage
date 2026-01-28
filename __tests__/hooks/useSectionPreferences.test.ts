import { describe, it, expect } from 'vitest'
import {
  categoryDataToMeta,
  categoryMetaToData,
  DEFAULT_CATEGORIES,
  ICON_MAP,
  DEFAULT_VISIBILITY,
  DEFAULT_SECTION_ORDER,
  DEFAULT_CATEGORY_ASSIGNMENTS,
} from '@/hooks/useSectionPreferences'

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
  })

  describe('DEFAULT_SECTION_ORDER', () => {
    it('includes all toggleable sections', () => {
      const visibilityKeys = Object.keys(DEFAULT_VISIBILITY)
      for (const key of visibilityKeys) {
        expect(DEFAULT_SECTION_ORDER).toContain(key)
      }
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
  })
})
