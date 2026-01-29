/**
 * Tests for AI Chat API Route
 * app/api/ai/chat/route.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the AI backend modules
vi.mock('@/lib/ai/claude', () => ({
  streamClaude: vi.fn(),
}))

vi.mock('@/lib/ai/docker', () => ({
  streamDockerModel: vi.fn(),
}))

vi.mock('@/lib/ai/mock', () => ({
  streamMock: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  streamGemini: vi.fn(),
}))

vi.mock('@/lib/ai/codex', () => ({
  streamCodex: vi.fn(),
}))

vi.mock('@/lib/ai/codex-mcp', () => ({
  getOrCreateSession: vi.fn(),
  codexFirstTurn: vi.fn(),
  codexReply: vi.fn(),
  hasSession: vi.fn(),
}))

vi.mock('@/lib/ai/conversation', () => ({
  readConversation: vi.fn(() => []),
  appendMessage: vi.fn(() => ({ id: 'msg_123', ts: Date.now(), role: 'user', content: 'test' })),
  buildModelContext: vi.fn(() => ({
    systemPrompt: 'test prompt',
    messages: [{ role: 'user', content: 'test' }],
  })),
  createConversation: vi.fn(() => 'conv_test_123'),
}))

// Import after mocking
import { POST } from '@/app/api/ai/chat/route'
import { streamMock } from '@/lib/ai/mock'
import { streamClaude } from '@/lib/ai/claude'
import { streamGemini } from '@/lib/ai/gemini'
import { streamDockerModel } from '@/lib/ai/docker'

// Helper to create a mock ReadableStream
function createMockStream(chunks: string[]): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
}

// Helper to create NextRequest
function createRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper to read SSE stream
async function readSSEStream(response: Response): Promise<string[]> {
  const reader = response.body?.getReader()
  if (!reader) return []

  const decoder = new TextDecoder()
  const events: string[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    events.push(decoder.decode(value))
  }

  return events
}

describe('AI Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/ai/chat', () => {
    describe('validation', () => {
      it('returns 400 when no messages or conversationId provided', async () => {
        const request = createRequest({
          backend: 'mock',
          messages: [],
        })

        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('No messages or conversationId provided')
      })

      it('returns 400 for docker backend without model', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['test']))

        const request = createRequest({
          backend: 'docker',
          messages: [{ role: 'user', content: 'Hello' }],
        })

        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Model required for Docker backend')
      })
    })

    describe('mock backend', () => {
      it('streams response from mock backend', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['Hello ', 'world!']))

        const request = createRequest({
          backend: 'mock',
          messages: [{ role: 'user', content: 'Hi' }],
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('text/event-stream')

        const events = await readSSEStream(response)
        expect(events.length).toBeGreaterThan(0)
      })

      it('calls streamMock with messages', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['response']))

        const messages = [{ role: 'user' as const, content: 'Test message' }]
        const request = createRequest({
          backend: 'mock',
          messages,
        })

        await POST(request)

        expect(streamMock).toHaveBeenCalledWith(messages)
      })
    })

    describe('claude backend', () => {
      it('streams response from claude backend', async () => {
        const mockSessionId = 'session_123'
        vi.mocked(streamClaude).mockResolvedValue({
          stream: createMockStream(['Claude response']),
          getSessionId: () => mockSessionId,
        })

        const request = createRequest({
          backend: 'claude',
          messages: [{ role: 'user', content: 'Hello Claude' }],
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(streamClaude).toHaveBeenCalled()
      })

      it('passes settings and cwd to claude', async () => {
        vi.mocked(streamClaude).mockResolvedValue({
          stream: createMockStream(['response']),
          getSessionId: () => null,
        })

        const settings = {
          model: 'claude-sonnet-4',
          temperature: 0.7,
          maxTokens: 1000,
          systemPrompt: 'You are helpful',
          claude: {
            model: 'sonnet',
            permissionMode: 'default' as const,
          },
        }

        const request = createRequest({
          backend: 'claude',
          messages: [{ role: 'user', content: 'Hi' }],
          settings,
          cwd: '/project',
        })

        await POST(request)

        expect(streamClaude).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            claude: expect.objectContaining({ permissionMode: 'default' }),
          }),
          '/project',
          undefined
        )
      })
    })

    describe('gemini backend', () => {
      it('streams response from gemini backend', async () => {
        vi.mocked(streamGemini).mockResolvedValue(createMockStream(['Gemini response']))

        const request = createRequest({
          backend: 'gemini',
          messages: [{ role: 'user', content: 'Hello Gemini' }],
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(streamGemini).toHaveBeenCalled()
      })
    })

    describe('docker backend', () => {
      it('streams response from docker backend with model', async () => {
        vi.mocked(streamDockerModel).mockResolvedValue(createMockStream(['Local model response']))

        const request = createRequest({
          backend: 'docker',
          model: 'llama3',
          messages: [{ role: 'user', content: 'Hello' }],
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(streamDockerModel).toHaveBeenCalledWith(
          'llama3',
          expect.any(Array),
          undefined
        )
      })
    })

    describe('settings validation', () => {
      it('clamps temperature to valid range (0-2)', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['response']))

        const request = createRequest({
          backend: 'mock',
          messages: [{ role: 'user', content: 'Hi' }],
          settings: {
            model: 'test',
            temperature: 5, // Invalid: too high
            maxTokens: 1000,
            systemPrompt: '',
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      })

      it('clamps maxTokens to valid range', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['response']))

        const request = createRequest({
          backend: 'mock',
          messages: [{ role: 'user', content: 'Hi' }],
          settings: {
            model: 'test',
            temperature: 1,
            maxTokens: 999999, // Will be clamped to 128000
            systemPrompt: '',
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      })

      it('validates claude permission mode', async () => {
        vi.mocked(streamClaude).mockResolvedValue({
          stream: createMockStream(['response']),
          getSessionId: () => null,
        })

        const request = createRequest({
          backend: 'claude',
          messages: [{ role: 'user', content: 'Hi' }],
          settings: {
            model: 'claude-sonnet-4',
            temperature: 1,
            maxTokens: 1000,
            systemPrompt: '',
            claude: {
              permissionMode: 'invalid_mode' as any,
            },
          },
        })

        await POST(request)

        // Should have defaulted to 'default' mode
        expect(streamClaude).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            claude: expect.objectContaining({ permissionMode: 'default' }),
          }),
          undefined,
          undefined
        )
      })
    })

    describe('error handling', () => {
      it('falls back to mock on backend error', async () => {
        vi.mocked(streamClaude).mockRejectedValue(new Error('Claude unavailable'))
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['fallback response']))

        const request = createRequest({
          backend: 'claude',
          messages: [{ role: 'user', content: 'Hi' }],
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(streamMock).toHaveBeenCalled()
      })

      it('returns 500 on request parsing error', async () => {
        const request = new NextRequest('http://localhost:3001/api/ai/chat', {
          method: 'POST',
          body: 'invalid json',
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })

    describe('SSE stream format', () => {
      it('sends data events with content and done flag', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['chunk1', 'chunk2']))

        const request = createRequest({
          backend: 'mock',
          messages: [{ role: 'user', content: 'Hi' }],
        })

        const response = await POST(request)
        const events = await readSSEStream(response)

        // Should have content events and a done event
        expect(events.length).toBeGreaterThan(0)

        // Check for done event at the end
        const lastEvent = events[events.length - 1]
        expect(lastEvent).toContain('data:')
        expect(lastEvent).toContain('"done":true')
      })

      it('includes model in stream events', async () => {
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['response']))

        const request = createRequest({
          backend: 'mock',
          messages: [{ role: 'user', content: 'Hi' }],
        })

        const response = await POST(request)
        const events = await readSSEStream(response)

        const contentEvent = events.find((e) => e.includes('"content"'))
        expect(contentEvent).toContain('"model":"mock"')
      })
    })

    describe('conversation mode', () => {
      it('creates conversation when conversationId provided', async () => {
        const { createConversation, appendMessage } = await import('@/lib/ai/conversation')
        vi.mocked(streamMock).mockResolvedValue(createMockStream(['response']))

        const request = createRequest({
          backend: 'mock',
          messages: [{ role: 'user', content: 'Hi' }],
          conversationId: 'new',
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(createConversation).toHaveBeenCalled()
      })
    })
  })
})
