import { describe, it, expect } from 'vitest'
import { getFileTypeAndLanguage } from '@/lib/fileTypeUtils'

describe('getFileTypeAndLanguage', () => {
  describe('code files', () => {
    it('detects JavaScript files', () => {
      const result = getFileTypeAndLanguage('src/app.js')
      expect(result.type).toBe('code')
      expect(result.language).toBe('javascript')
    })

    it('detects TypeScript files', () => {
      const result = getFileTypeAndLanguage('src/utils.ts')
      expect(result.type).toBe('code')
      expect(result.language).toBe('typescript')
    })

    it('detects TSX files', () => {
      const result = getFileTypeAndLanguage('components/Button.tsx')
      expect(result.type).toBe('code')
      expect(result.language).toBe('tsx')
    })

    it('detects Python files', () => {
      const result = getFileTypeAndLanguage('scripts/main.py')
      expect(result.type).toBe('code')
      expect(result.language).toBe('python')
    })

    it('detects CSS files', () => {
      const result = getFileTypeAndLanguage('styles/main.css')
      expect(result.type).toBe('code')
      expect(result.language).toBe('css')
    })

    it('detects YAML files', () => {
      const result = getFileTypeAndLanguage('config.yaml')
      expect(result.type).toBe('code')
      expect(result.language).toBe('yaml')
    })
  })

  describe('special filenames', () => {
    it('detects Dockerfile', () => {
      const result = getFileTypeAndLanguage('path/to/Dockerfile')
      expect(result.type).toBe('code')
      expect(result.language).toBe('dockerfile')
    })

    it('detects Makefile', () => {
      const result = getFileTypeAndLanguage('Makefile')
      expect(result.type).toBe('code')
      expect(result.language).toBe('makefile')
    })
  })

  describe('markdown files', () => {
    it('detects .md files', () => {
      const result = getFileTypeAndLanguage('README.md')
      expect(result.type).toBe('markdown')
      expect(result.language).toBe('markdown')
    })

    it('detects .markdown files', () => {
      const result = getFileTypeAndLanguage('docs/guide.markdown')
      expect(result.type).toBe('markdown')
    })
  })

  describe('JSON files', () => {
    it('detects JSON files', () => {
      const result = getFileTypeAndLanguage('package.json')
      expect(result.type).toBe('json')
      expect(result.language).toBe('json')
    })
  })

  describe('media files', () => {
    it('detects image files', () => {
      expect(getFileTypeAndLanguage('photo.png').type).toBe('image')
      expect(getFileTypeAndLanguage('photo.jpg').type).toBe('image')
      expect(getFileTypeAndLanguage('icon.svg').type).toBe('image')
      expect(getFileTypeAndLanguage('photo.webp').type).toBe('image')
    })

    it('detects video files', () => {
      expect(getFileTypeAndLanguage('movie.mp4').type).toBe('video')
      expect(getFileTypeAndLanguage('clip.webm').type).toBe('video')
      expect(getFileTypeAndLanguage('video.mov').type).toBe('video')
    })
  })

  describe('CSV files', () => {
    it('detects CSV files', () => {
      const result = getFileTypeAndLanguage('data.csv')
      expect(result.type).toBe('csv')
    })
  })

  describe('prompty files', () => {
    it('detects prompty files', () => {
      const result = getFileTypeAndLanguage('template.prompty')
      expect(result.type).toBe('prompty')
    })
  })

  describe('unknown files', () => {
    it('defaults to text for unknown extensions', () => {
      const result = getFileTypeAndLanguage('file.xyz')
      expect(result.type).toBe('text')
    })

    it('handles files without extensions', () => {
      const result = getFileTypeAndLanguage('somefile')
      expect(result.type).toBe('text')
    })
  })
})
