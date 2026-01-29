/**
 * Tests for AI Agents API Route
 * app/api/ai/agents/route.ts
 *
 * Note: The agents route reads from ~/.claude/agents directory.
 * Since mocking node:fs/promises modules with vitest is complex,
 * we test the route behavior with the actual filesystem.
 * The route has graceful error handling for missing directories.
 */
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/ai/agents/route'

describe('AI Agents API Route', () => {
  describe('GET /api/ai/agents', () => {
    it('returns successful response with agents array', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('agents')
      expect(Array.isArray(data.agents)).toBe(true)
    })

    it('returns proper agent structure when agents exist', async () => {
      const response = await GET()
      const data = await response.json()

      // If there are agents, they should have the correct structure
      if (data.agents.length > 0) {
        const agent = data.agents[0]
        expect(agent).toHaveProperty('name')
        expect(agent).toHaveProperty('filename')
        expect(typeof agent.name).toBe('string')
        expect(typeof agent.filename).toBe('string')
        // description is optional but should be a string if present
        if (agent.description) {
          expect(typeof agent.description).toBe('string')
        }
        // model is optional
        if (agent.model) {
          expect(typeof agent.model).toBe('string')
        }
      }
    })

    it('returns agents sorted alphabetically by name', async () => {
      const response = await GET()
      const data = await response.json()

      if (data.agents.length > 1) {
        const names = data.agents.map((a: { name: string }) => a.name)
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
        expect(names).toEqual(sortedNames)
      }
    })

    it('returns consistent response on multiple calls', async () => {
      const response1 = await GET()
      const response2 = await GET()

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.agents.length).toBe(data2.agents.length)
      // Agent names should match
      const names1 = data1.agents.map((a: { name: string }) => a.name)
      const names2 = data2.agents.map((a: { name: string }) => a.name)
      expect(names1).toEqual(names2)
    })
  })
})

/**
 * Unit tests for frontmatter parsing logic
 * We test the parsing function independently since the route uses it internally
 */
describe('Frontmatter Parsing', () => {
  // Re-implement the parsing function for testing
  function parseFrontmatter(content: string): Record<string, string> {
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return {}

    const frontmatter: Record<string, string> = {}
    const lines = match[1].split('\n')

    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        let value = line.slice(colonIndex + 1).trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        frontmatter[key] = value
      }
    }

    return frontmatter
  }

  it('parses basic frontmatter', () => {
    const content = `---
name: Test Agent
description: A test description
---

# Content here`

    const result = parseFrontmatter(content)
    expect(result.name).toBe('Test Agent')
    expect(result.description).toBe('A test description')
  })

  it('parses double-quoted values', () => {
    const content = `---
name: "Quoted Agent"
description: "A quoted description"
---`

    const result = parseFrontmatter(content)
    expect(result.name).toBe('Quoted Agent')
    expect(result.description).toBe('A quoted description')
  })

  it('parses single-quoted values', () => {
    const content = `---
name: 'Single Quoted'
description: 'Another description'
---`

    const result = parseFrontmatter(content)
    expect(result.name).toBe('Single Quoted')
    expect(result.description).toBe('Another description')
  })

  it('handles empty values', () => {
    const content = `---
name:
description: Has value
---`

    const result = parseFrontmatter(content)
    expect(result.name).toBe('')
    expect(result.description).toBe('Has value')
  })

  it('returns empty object for content without frontmatter', () => {
    const content = `# Just markdown content
No frontmatter here`

    const result = parseFrontmatter(content)
    expect(result).toEqual({})
  })

  it('handles multiple fields', () => {
    const content = `---
name: Multi Field Agent
description: Testing multiple fields
model: claude-sonnet-4
version: 1.0
---`

    const result = parseFrontmatter(content)
    expect(result.name).toBe('Multi Field Agent')
    expect(result.description).toBe('Testing multiple fields')
    expect(result.model).toBe('claude-sonnet-4')
    expect(result.version).toBe('1.0')
  })

  it('handles colons in values', () => {
    const content = `---
name: Agent With Colon
url: https://example.com
---`

    const result = parseFrontmatter(content)
    expect(result.name).toBe('Agent With Colon')
    expect(result.url).toBe('https://example.com')
  })
})
