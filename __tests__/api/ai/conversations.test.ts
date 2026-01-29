/**
 * Tests for AI Conversations API Route
 * app/api/ai/conversations/route.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the conversation module
vi.mock('@/lib/ai/conversation', () => ({
  listConversations: vi.fn(),
  readConversation: vi.fn(),
  createConversation: vi.fn(),
  exportConversation: vi.fn(),
  pruneConversation: vi.fn(),
}))

// Import after mocking
import { GET, POST, DELETE } from '@/app/api/ai/conversations/route'
import {
  listConversations,
  readConversation,
  createConversation,
  exportConversation,
  pruneConversation,
} from '@/lib/ai/conversation'

// Helper to create NextRequest
function createRequest(
  method: string,
  searchParams?: Record<string, string>,
  body?: object
): NextRequest {
  const url = new URL('http://localhost:3001/api/ai/conversations')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    options.body = JSON.stringify(body)
  }

  return new NextRequest(url.toString(), options)
}

describe('AI Conversations API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/ai/conversations', () => {
    it('lists all conversations', async () => {
      const mockConversations = [
        { id: 'conv_1', messageCount: 5, updatedAt: 1700000000000 },
        { id: 'conv_2', messageCount: 3, updatedAt: 1700000001000 },
      ]
      vi.mocked(listConversations).mockReturnValue(mockConversations)

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toEqual(mockConversations)
      expect(listConversations).toHaveBeenCalled()
    })

    it('returns empty array when no conversations exist', async () => {
      vi.mocked(listConversations).mockReturnValue([])

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toEqual([])
    })

    it('gets specific conversation by id', async () => {
      const mockMessages = [
        { id: 'msg_1', ts: 1700000000000, role: 'user', content: 'Hello' },
        { id: 'msg_2', ts: 1700000001000, role: 'assistant', content: 'Hi!', model: 'claude' },
      ]
      vi.mocked(readConversation).mockReturnValue(mockMessages)

      const request = createRequest('GET', { id: 'conv_123' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('conv_123')
      expect(data.messages).toEqual(mockMessages)
      expect(readConversation).toHaveBeenCalledWith('conv_123')
    })

    it('exports conversation as markdown', async () => {
      const markdown = '**User**: Hello\n\n---\n\n**Claude**: Hi!'
      vi.mocked(exportConversation).mockReturnValue(markdown)

      const request = createRequest('GET', { id: 'conv_123', export: 'true' })
      const response = await GET(request)
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/markdown')
      expect(text).toBe(markdown)
      expect(exportConversation).toHaveBeenCalledWith('conv_123')
    })

    it('exports with markdown parameter', async () => {
      const markdown = 'Exported content'
      vi.mocked(exportConversation).mockReturnValue(markdown)

      const request = createRequest('GET', { id: 'conv_123', export: 'markdown' })
      const response = await GET(request)
      const text = await response.text()

      expect(response.headers.get('Content-Type')).toBe('text/markdown')
      expect(text).toBe(markdown)
    })

    it('returns 500 on error', async () => {
      vi.mocked(listConversations).mockImplementation(() => {
        throw new Error('Database error')
      })

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })

  describe('POST /api/ai/conversations', () => {
    it('creates new conversation', async () => {
      vi.mocked(createConversation).mockReturnValue('conv_new_123')

      const request = createRequest('POST', undefined, {})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('conv_new_123')
      expect(createConversation).toHaveBeenCalledWith(undefined)
    })

    it('creates conversation with name', async () => {
      vi.mocked(createConversation).mockReturnValue('conv_named_123')

      const request = createRequest('POST', undefined, { name: 'My Conversation' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('conv_named_123')
      expect(data.name).toBe('My Conversation')
      expect(createConversation).toHaveBeenCalledWith('My Conversation')
    })

    it('handles empty body', async () => {
      vi.mocked(createConversation).mockReturnValue('conv_123')

      // Create request with invalid JSON that will be caught
      const request = new NextRequest('http://localhost:3001/api/ai/conversations', {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('conv_123')
    })

    it('returns 500 on error', async () => {
      vi.mocked(createConversation).mockImplementation(() => {
        throw new Error('Creation failed')
      })

      const request = createRequest('POST', undefined, {})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Creation failed')
    })
  })

  describe('DELETE /api/ai/conversations', () => {
    it('returns 400 when no id provided', async () => {
      const request = createRequest('DELETE')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Conversation ID required')
    })

    it('prunes conversation to specified count', async () => {
      const request = createRequest('DELETE', { id: 'conv_123', prune: '50' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('pruned')
      expect(data.keepLast).toBe('50')
      expect(pruneConversation).toHaveBeenCalledWith('conv_123', 50)
    })

    it('deletes conversation (prunes to 0)', async () => {
      const request = createRequest('DELETE', { id: 'conv_123' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('deleted')
      expect(pruneConversation).toHaveBeenCalledWith('conv_123', 0)
    })

    it('returns 500 on error', async () => {
      vi.mocked(pruneConversation).mockImplementation(() => {
        throw new Error('Prune failed')
      })

      const request = createRequest('DELETE', { id: 'conv_123' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Prune failed')
    })
  })
})
