import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import {
  AIDrawerProvider,
  useAIDrawer,
  useAIDrawerSafe,
  DRAWER_WIDTH_VALUES,
  MINIMIZED_WIDTH,
  type AIDrawerState,
  type AIDrawerWidth,
} from '@/components/ai/AIDrawerProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock useAIChat hook
vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => ({
    conversations: [
      {
        id: 'conv-1',
        title: 'Test Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    activeConvId: 'conv-1',
    activeConv: {
      id: 'conv-1',
      title: 'Test Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    setActiveConvId: vi.fn(),
    createNewConversation: vi.fn(),
    deleteConversation: vi.fn(),
    clearConversation: vi.fn(),
    setConversations: vi.fn(),
    settings: { model: 'test-model', temperature: 0.7 },
    setSettings: vi.fn(),
    availableModels: [{ id: 'test-model', name: 'Test Model', backend: 'test' }],
    backends: [],
    modelsLoading: false,
    generatingConvs: {},
    isTyping: false,
    isStreaming: false,
    sendMessage: vi.fn(),
    handleRegenerate: vi.fn(),
    handleFeedback: vi.fn(),
    stopStreaming: vi.fn(),
    textareaRef: { current: null },
    messagesEndRef: { current: null },
  }),
}))

// Mock useAgents hook
vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => ({
    agents: [
      {
        id: 'agent-1',
        name: 'Test Agent',
        avatar: '🤖',
        description: 'A test agent',
        personality: ['helpful'],
        sections: ['test-section'],
        enabled: true,
      },
    ],
    allAgents: [],
    isLoading: false,
    error: null,
    getById: vi.fn(),
    getForSection: vi.fn(),
    findForSection: vi.fn((section: string) => {
      if (section === 'test-section') {
        return {
          id: 'agent-1',
          name: 'Test Agent',
          avatar: '🤖',
          description: 'A test agent',
          personality: ['helpful'],
          sections: ['test-section'],
          enabled: true,
        }
      }
      return null
    }),
    refetch: vi.fn(),
  }),
}))

// Helper to create a QueryClient for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

// Test component that consumes the context
function TestConsumer({ onMount }: { onMount?: (ctx: ReturnType<typeof useAIDrawer>) => void }) {
  const ctx = useAIDrawer()
  React.useEffect(() => {
    onMount?.(ctx)
  }, [ctx, onMount])
  return (
    <div>
      <span data-testid="state">{ctx.state}</span>
      <span data-testid="is-open">{String(ctx.isOpen)}</span>
      <span data-testid="is-expanded">{String(ctx.isExpanded)}</span>
      <span data-testid="drawer-width">{ctx.drawerWidth}</span>
      <span data-testid="current-width-px">{ctx.currentWidthPx}</span>
      <button data-testid="open" onClick={ctx.open}>Open</button>
      <button data-testid="close" onClick={ctx.close}>Close</button>
      <button data-testid="expand" onClick={ctx.expand}>Expand</button>
      <button data-testid="minimize" onClick={ctx.minimize}>Minimize</button>
      <button data-testid="toggle" onClick={ctx.toggle}>Toggle</button>
      <button data-testid="cycle-width" onClick={ctx.cycleDrawerWidth}>Cycle Width</button>
    </div>
  )
}

// Test component for safe hook
function SafeTestConsumer() {
  const ctx = useAIDrawerSafe()
  return (
    <div data-testid="safe-result">
      {ctx ? 'has-context' : 'no-context'}
    </div>
  )
}

describe('AIDrawerProvider', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  const renderWithProvider = (
    ui: React.ReactElement,
    defaultState?: AIDrawerState
  ) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider defaultState={defaultState}>
          {ui}
        </AIDrawerProvider>
      </QueryClientProvider>
    )
  }

  describe('Initial state', () => {
    it('defaults to collapsed state', () => {
      renderWithProvider(<TestConsumer />)
      expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
      expect(screen.getByTestId('is-open')).toHaveTextContent('false')
      expect(screen.getByTestId('is-expanded')).toHaveTextContent('false')
    })

    it('respects defaultState prop', () => {
      renderWithProvider(<TestConsumer />, 'expanded')
      expect(screen.getByTestId('state')).toHaveTextContent('expanded')
      expect(screen.getByTestId('is-open')).toHaveTextContent('true')
      expect(screen.getByTestId('is-expanded')).toHaveTextContent('true')
    })

    it('uses default drawer width', () => {
      renderWithProvider(<TestConsumer />)
      expect(screen.getByTestId('drawer-width')).toHaveTextContent('default')
    })
  })

  describe('State transitions', () => {
    it('open() transitions to minimized state', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />)

      await user.click(screen.getByTestId('open'))

      expect(screen.getByTestId('state')).toHaveTextContent('minimized')
      expect(screen.getByTestId('is-open')).toHaveTextContent('true')
      expect(screen.getByTestId('is-expanded')).toHaveTextContent('false')
    })

    it('close() transitions to collapsed state', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />, 'expanded')

      await user.click(screen.getByTestId('close'))

      expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
      expect(screen.getByTestId('is-open')).toHaveTextContent('false')
    })

    it('expand() transitions to expanded state', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />, 'minimized')

      await user.click(screen.getByTestId('expand'))

      expect(screen.getByTestId('state')).toHaveTextContent('expanded')
      expect(screen.getByTestId('is-expanded')).toHaveTextContent('true')
    })

    it('minimize() transitions to minimized state', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />, 'expanded')

      await user.click(screen.getByTestId('minimize'))

      expect(screen.getByTestId('state')).toHaveTextContent('minimized')
      expect(screen.getByTestId('is-open')).toHaveTextContent('true')
      expect(screen.getByTestId('is-expanded')).toHaveTextContent('false')
    })

    it('toggle() from collapsed goes to expanded', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />)

      await user.click(screen.getByTestId('toggle'))

      expect(screen.getByTestId('state')).toHaveTextContent('expanded')
    })

    it('toggle() from minimized goes to expanded', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />, 'minimized')

      await user.click(screen.getByTestId('toggle'))

      expect(screen.getByTestId('state')).toHaveTextContent('expanded')
    })

    it('toggle() from expanded goes to collapsed', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />, 'expanded')

      await user.click(screen.getByTestId('toggle'))

      expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
    })
  })

  describe('Drawer width', () => {
    it('cycleDrawerWidth cycles through narrow -> default -> wide -> narrow', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />)

      // Initial: default
      expect(screen.getByTestId('drawer-width')).toHaveTextContent('default')

      // Cycle to wide
      await user.click(screen.getByTestId('cycle-width'))
      expect(screen.getByTestId('drawer-width')).toHaveTextContent('wide')

      // Cycle to narrow
      await user.click(screen.getByTestId('cycle-width'))
      expect(screen.getByTestId('drawer-width')).toHaveTextContent('narrow')

      // Cycle back to default
      await user.click(screen.getByTestId('cycle-width'))
      expect(screen.getByTestId('drawer-width')).toHaveTextContent('default')
    })

    it('currentWidthPx returns 0 when collapsed', () => {
      renderWithProvider(<TestConsumer />)
      expect(screen.getByTestId('current-width-px')).toHaveTextContent('0')
    })

    it('currentWidthPx returns MINIMIZED_WIDTH when minimized', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />)

      await user.click(screen.getByTestId('open'))

      expect(screen.getByTestId('current-width-px')).toHaveTextContent(String(MINIMIZED_WIDTH))
    })

    it('currentWidthPx returns expanded width when expanded', async () => {
      const user = userEvent.setup()
      renderWithProvider(<TestConsumer />)

      await user.click(screen.getByTestId('toggle'))

      expect(screen.getByTestId('current-width-px')).toHaveTextContent(String(DRAWER_WIDTH_VALUES.default))
    })
  })

  describe('DRAWER_WIDTH_VALUES constant', () => {
    it('exports correct width values', () => {
      expect(DRAWER_WIDTH_VALUES.narrow).toBe(360)
      expect(DRAWER_WIDTH_VALUES.default).toBe(480)
      expect(DRAWER_WIDTH_VALUES.wide).toBe(640)
    })
  })

  describe('MINIMIZED_WIDTH constant', () => {
    it('exports correct minimized width', () => {
      expect(MINIMIZED_WIDTH).toBe(320)
    })
  })
})

describe('useAIDrawer hook', () => {
  it('throws when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useAIDrawer must be used within an AIDrawerProvider')

    consoleError.mockRestore()
  })
})

describe('useAIDrawerSafe hook', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null when used outside provider', () => {
    render(<SafeTestConsumer />)
    expect(screen.getByTestId('safe-result')).toHaveTextContent('no-context')
  })

  it('returns context when used inside provider', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider>
          <SafeTestConsumer />
        </AIDrawerProvider>
      </QueryClientProvider>
    )
    expect(screen.getByTestId('safe-result')).toHaveTextContent('has-context')
  })
})

describe('localStorage persistence', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists state to localStorage', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider>
          <TestConsumer />
        </AIDrawerProvider>
      </QueryClientProvider>
    )

    await user.click(screen.getByTestId('toggle'))

    expect(localStorage.getItem('ai-drawer-state')).toBe('expanded')
  })

  it('persists drawer width to localStorage', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider>
          <TestConsumer />
        </AIDrawerProvider>
      </QueryClientProvider>
    )

    await user.click(screen.getByTestId('cycle-width'))

    expect(localStorage.getItem('ai-drawer-width')).toBe('wide')
  })

  it('loads state from localStorage on mount', () => {
    localStorage.setItem('ai-drawer-state', 'expanded')

    render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider>
          <TestConsumer />
        </AIDrawerProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId('state')).toHaveTextContent('expanded')
  })

  it('loads drawer width from localStorage on mount', () => {
    localStorage.setItem('ai-drawer-width', 'wide')

    render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider>
          <TestConsumer />
        </AIDrawerProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId('drawer-width')).toHaveTextContent('wide')
  })
})
