import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAgents, AGENTS_QUERY_KEY } from '@/hooks/useAgents'
import type { AgentCard } from '@/lib/agents/types'

// Create a fresh QueryClient for each test
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

// Helper wrapper component
const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock agent data
const mockAgents: AgentCard[] = [
  {
    id: 'assistant-1',
    name: 'Page Assistant',
    avatar: '/avatars/assistant.png',
    description: 'General purpose assistant',
    personality: ['helpful', 'friendly'],
    system_prompt: 'You are a helpful assistant',
    mcp_tools: [],
    selectors: [],
    config: {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      max_tokens: 4096,
    },
    sections: ['ai-workspace', 'tasks'],
    enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'coder-1',
    name: 'Code Expert',
    avatar: '/avatars/coder.png',
    description: 'Specialized in code review and debugging',
    personality: ['technical', 'analytical'],
    system_prompt: 'You are a code expert',
    mcp_tools: [],
    selectors: [],
    config: {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5,
      max_tokens: 8192,
    },
    sections: ['github-activity', 'projects-dashboard'],
    enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'disabled-agent',
    name: 'Disabled Agent',
    avatar: '/avatars/disabled.png',
    description: 'This agent is disabled',
    personality: ['helpful'],
    system_prompt: 'You are disabled',
    mcp_tools: [],
    selectors: [],
    config: {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      max_tokens: 4096,
    },
    sections: ['ai-workspace'],
    enabled: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('useAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fetching', () => {
    it('fetches agents from the API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/ai/agents/registry')
    })

    it('returns enabled agents only in agents array', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Only enabled agents
      expect(result.current.agents).toHaveLength(2)
      expect(result.current.agents.every(a => a.enabled)).toBe(true)
    })

    it('returns all agents including disabled in allAgents array', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // All agents including disabled
      expect(result.current.allAgents).toHaveLength(3)
    })

    it('handles fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })

    it('handles non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Failed to fetch agents')
    })

    it('returns empty arrays when no agents', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: [] }),
      })

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.agents).toHaveLength(0)
      expect(result.current.allAgents).toHaveLength(0)
    })
  })

  describe('getById', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })
    })

    it('returns agent by id', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.getById('assistant-1')
      expect(agent).toBeDefined()
      expect(agent?.id).toBe('assistant-1')
      expect(agent?.name).toBe('Page Assistant')
    })

    it('returns null for non-existent id', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.getById('non-existent')
      expect(agent).toBeNull()
    })

    it('returns null for null input', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.getById(null)
      expect(agent).toBeNull()
    })

    it('returns null for undefined input', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.getById(undefined)
      expect(agent).toBeNull()
    })

    it('does not return disabled agents', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.getById('disabled-agent')
      expect(agent).toBeNull()
    })
  })

  describe('getForSection', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })
    })

    it('returns agents for a section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const sectionAgents = result.current.getForSection('ai-workspace')
      expect(sectionAgents).toHaveLength(1) // Only enabled agent
      expect(sectionAgents[0].id).toBe('assistant-1')
    })

    it('returns empty array for section with no agents', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const sectionAgents = result.current.getForSection('unknown-section')
      expect(sectionAgents).toHaveLength(0)
    })

    it('returns empty array for null section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const sectionAgents = result.current.getForSection(null)
      expect(sectionAgents).toHaveLength(0)
    })

    it('returns empty array for undefined section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const sectionAgents = result.current.getForSection(undefined)
      expect(sectionAgents).toHaveLength(0)
    })

    it('only returns enabled agents for section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // ai-workspace has both enabled and disabled agents
      const sectionAgents = result.current.getForSection('ai-workspace')
      expect(sectionAgents).toHaveLength(1)
      expect(sectionAgents.every(a => a.enabled)).toBe(true)
    })
  })

  describe('findForSection', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })
    })

    it('returns first agent for a section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.findForSection('github-activity')
      expect(agent).toBeDefined()
      expect(agent?.id).toBe('coder-1')
    })

    it('returns null for section with no agents', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.findForSection('unknown-section')
      expect(agent).toBeNull()
    })

    it('returns null for null section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.findForSection(null)
      expect(agent).toBeNull()
    })

    it('returns null for undefined section', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const agent = result.current.findForSection(undefined)
      expect(agent).toBeNull()
    })
  })

  describe('refetch', () => {
    it('provides refetch function', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.refetch).toBe('function')
    })
  })

  describe('AGENTS_QUERY_KEY', () => {
    it('exports query key for cache invalidation', () => {
      expect(AGENTS_QUERY_KEY).toEqual(['agent-registry'])
    })
  })
})
