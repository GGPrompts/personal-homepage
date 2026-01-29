/**
 * Tests for AI Agents [id] API Route
 * app/api/ai/agents/[id]/route.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
  },
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
}))

// Mock the agent loader
vi.mock('@/lib/agents/loader', () => ({
  loadAgentFromDirectory: vi.fn(),
}))

// Import after mocking
import { GET, PUT, DELETE } from '@/app/api/ai/agents/[id]/route'
import fs from 'fs'
import { loadAgentFromDirectory } from '@/lib/agents/loader'

// Helper to create NextRequest with params
function createRequest(
  method: string,
  body?: object
): NextRequest {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    options.body = JSON.stringify(body)
  }
  return new NextRequest('http://localhost:3001/api/ai/agents/test-agent', options)
}

// Mock params promise
function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id })
}

describe('AI Agents [id] API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/ai/agents/:id', () => {
    it('returns 404 when agent not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.readdirSync).mockReturnValue([])

      const request = createRequest('GET')
      const params = createParams('nonexistent')

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Agent not found')
    })

    it('returns agent when found by direct path', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)

      vi.mocked(loadAgentFromDirectory).mockResolvedValue({
        name: 'Test Agent',
        avatar: '🤖',
        description: 'A test agent',
        personality: ['helpful'],
        system_prompt: 'You are a test agent',
        mcp_tools: [],
        selectors: [],
        config: {
          model: 'claude-sonnet-4',
          temperature: 0.7,
          max_tokens: 1024,
        },
        enabled: true,
      })

      const request = createRequest('GET')
      const params = createParams('test-agent')

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agent.name).toBe('Test Agent')
      expect(data.agent.id).toBe('test-agent')
      expect(data.agent.created_at).toBeDefined()
      expect(data.agent.updated_at).toBeDefined()
    })

    it('returns 500 when agent fails to load', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(loadAgentFromDirectory).mockResolvedValue(null)

      const request = createRequest('GET')
      const params = createParams('broken-agent')

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to load agent')
    })

    it('parses file-based agent ID correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        return p.includes('my-agent')
      })
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(loadAgentFromDirectory).mockResolvedValue({
        name: 'My Agent',
        avatar: '🎯',
        description: 'Found agent',
        personality: ['helpful'],
        system_prompt: 'Test',
        mcp_tools: [],
        selectors: [],
        config: { model: 'test', temperature: 0.7, max_tokens: 1000 },
        enabled: true,
      })

      const request = createRequest('GET')
      const params = createParams('file-my-agent-0')

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agent.name).toBe('My Agent')
    })

    it('finds agent by searching directory entries', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        // Agents dir exists, but direct path doesn't
        return p.endsWith('agents')
      })
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'other-agent', isDirectory: () => true },
        { name: 'test-agent', isDirectory: () => true },
      ] as any)
      vi.mocked(loadAgentFromDirectory).mockResolvedValue({
        name: 'Test Agent',
        avatar: '🤖',
        description: 'Found by search',
        personality: ['helpful'],
        system_prompt: 'Test',
        mcp_tools: [],
        selectors: [],
        config: { model: 'test', temperature: 0.7, max_tokens: 1000 },
        enabled: true,
      })

      const request = createRequest('GET')
      const params = createParams('test')

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agent.description).toBe('Found by search')
    })
  })

  describe('PUT /api/ai/agents/:id', () => {
    it('returns 404 when agent not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.readdirSync).mockReturnValue([])

      const request = createRequest('PUT', {
        name: 'Updated Agent',
        system_prompt: 'New prompt',
      })
      const params = createParams('nonexistent')

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Agent not found')
    })

    it('updates agent files successfully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)

      const request = createRequest('PUT', {
        name: 'Updated Agent',
        avatar: '🚀',
        description: 'Updated description',
        personality: ['helpful', 'creative'],
        system_prompt: 'New system prompt',
        mcp_tools: [],
        selectors: [],
        sections: ['weather'],
        config: { model: 'claude-opus', temperature: 0.5, max_tokens: 2000 },
        enabled: true,
        mode: 'dev',
      })
      const params = createParams('test-agent')

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Agent updated successfully')
      expect(data.agent.name).toBe('Updated Agent')

      // Check CLAUDE.md was written
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('CLAUDE.md'),
        'New system prompt'
      )

      // Check agent.json was written
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('agent.json'),
        expect.stringContaining('"name":"Updated Agent"')
      )
    })

    it('returns 500 on write error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed')
      })

      const request = createRequest('PUT', {
        name: 'Test',
        system_prompt: 'Test',
      })
      const params = createParams('test-agent')

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update agent')
    })
  })

  describe('DELETE /api/ai/agents/:id', () => {
    it('returns 404 when agent not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.readdirSync).mockReturnValue([])

      const request = createRequest('DELETE')
      const params = createParams('nonexistent')

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Agent not found')
    })

    it('deletes agent directory successfully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)

      const request = createRequest('DELETE')
      const params = createParams('test-agent')

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Agent deleted successfully')
      expect(fs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining('test-agent'),
        { recursive: true, force: true }
      )
    })

    it('returns 500 on delete error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.rmSync).mockImplementation(() => {
        throw new Error('Delete failed')
      })

      const request = createRequest('DELETE')
      const params = createParams('test-agent')

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete agent')
    })
  })
})
