/**
 * Tests for AI Agents API Route
 * app/api/ai/agents/route.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fs/promises for file system operations - use hoisted factory functions
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual,
    default: actual,
    readdir: vi.fn(),
    readFile: vi.fn(),
  }
})

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return {
    ...actual,
    default: actual,
    homedir: vi.fn(() => '/home/testuser'),
  }
})

// Import mocked modules and the route handler
import * as fsPromises from 'fs/promises'
import * as os from 'os'
import { GET } from '@/app/api/ai/agents/route'

describe('AI Agents API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(os.homedir).mockReturnValue('/home/testuser')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/ai/agents', () => {
    it('returns empty array when no agents directory exists', async () => {
      vi.mocked(fsPromises.readdir).mockRejectedValue(new Error('ENOENT'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toEqual([])
    })

    it('returns empty array when directory is empty', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toEqual([])
    })

    it('lists agents from markdown files', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        'researcher.md',
        'coder.md',
        'README.txt', // Should be skipped
      ] as any)

      vi.mocked(fsPromises.readFile).mockImplementation(async (filePath: any) => {
        if (String(filePath).includes('researcher.md')) {
          return `---
name: Research Assistant
description: Helps with research tasks
model: claude-sonnet-4
---

# Research Assistant

You are a research assistant.`
        }
        if (String(filePath).includes('coder.md')) {
          return `---
name: "Code Helper"
description: 'Assists with coding'
---

# Code Helper`
        }
        return ''
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toHaveLength(2)

      // Should be sorted alphabetically
      expect(data.agents[0].name).toBe('Code Helper')
      expect(data.agents[0].description).toBe('Assists with coding')
      expect(data.agents[0].filename).toBe('coder')

      expect(data.agents[1].name).toBe('Research Assistant')
      expect(data.agents[1].description).toBe('Helps with research tasks')
      expect(data.agents[1].model).toBe('claude-sonnet-4')
      expect(data.agents[1].filename).toBe('researcher')
    })

    it('uses filename as name when no frontmatter name', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue(['simple-agent.md'] as any)
      vi.mocked(fsPromises.readFile).mockResolvedValue('# Just markdown, no frontmatter')

      const response = await GET()
      const data = await response.json()

      expect(data.agents).toHaveLength(1)
      expect(data.agents[0].name).toBe('simple-agent')
      expect(data.agents[0].description).toBe('')
    })

    it('skips files that cannot be read', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue(['good.md', 'bad.md'] as any)
      vi.mocked(fsPromises.readFile).mockImplementation(async (filePath: any) => {
        if (String(filePath).includes('bad.md')) {
          throw new Error('Permission denied')
        }
        return `---
name: Good Agent
---`
      })

      const response = await GET()
      const data = await response.json()

      expect(data.agents).toHaveLength(1)
      expect(data.agents[0].name).toBe('Good Agent')
    })

    it('parses frontmatter with quoted values correctly', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue(['agent.md'] as any)
      vi.mocked(fsPromises.readFile).mockResolvedValue(`---
name: "Agent with Quotes"
description: 'Single quoted description'
model: unquoted-model
---`)

      const response = await GET()
      const data = await response.json()

      expect(data.agents[0].name).toBe('Agent with Quotes')
      expect(data.agents[0].description).toBe('Single quoted description')
      expect(data.agents[0].model).toBe('unquoted-model')
    })

    it('skips non-markdown files', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        'agent.md',
        'config.json',
        'notes.txt',
        'script.js',
      ] as any)

      vi.mocked(fsPromises.readFile).mockResolvedValue(`---
name: Test Agent
---`)

      const response = await GET()
      const data = await response.json()

      expect(data.agents).toHaveLength(1)
      expect(fsPromises.readFile).toHaveBeenCalledTimes(1)
    })

    it('handles empty frontmatter values', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue(['agent.md'] as any)
      vi.mocked(fsPromises.readFile).mockResolvedValue(`---
name:
description: Has description
---`)

      const response = await GET()
      const data = await response.json()

      expect(data.agents[0].name).toBe('agent')
      expect(data.agents[0].description).toBe('Has description')
    })

    it('returns agents array on unexpected readdir error', async () => {
      // Mock to throw a different type of error (the route catches this)
      vi.mocked(fsPromises.readdir).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const response = await GET()
      const data = await response.json()

      // The error is caught and returns agents: []
      expect(data.agents).toEqual([])
    })
  })
})
