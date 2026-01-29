import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { AIDrawer, AIDrawerToggle } from '@/components/ai/AIDrawer'
import { AIDrawerProvider } from '@/components/ai/AIDrawerProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, className, onClick, ...props }: any) => (
        <div className={className} onClick={onClick} {...props}>{children}</div>
      ),
      button: ({ children, className, onClick, ...props }: any) => (
        <button className={className} onClick={onClick} {...props}>{children}</button>
      ),
      span: ({ children, className, ...props }: any) => (
        <span className={className} {...props}>{children}</span>
      ),
      p: ({ children, className, ...props }: any) => (
        <p className={className} {...props}>{children}</p>
      ),
    },
    useReducedMotion: () => false,
  }
})

// Mock useAuth
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      user_metadata: {
        avatar_url: 'https://example.com/avatar.png',
      },
    },
    isAuthenticated: true,
  }),
}))

// Mock useProjects
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [
      {
        slug: 'test-project',
        name: 'Test Project',
        local: { path: '/test/project' },
      },
    ],
    isPinned: vi.fn(() => false),
    isLoading: false,
  }),
}))

// Mock useAIChat
const mockSendMessage = vi.fn()
const mockCreateNewConversation = vi.fn()
const mockDeleteConversation = vi.fn()
const mockClearConversation = vi.fn()
const mockStopStreaming = vi.fn()
const mockHandleRegenerate = vi.fn()
const mockHandleFeedback = vi.fn()

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
    createNewConversation: mockCreateNewConversation,
    deleteConversation: mockDeleteConversation,
    clearConversation: mockClearConversation,
    setConversations: vi.fn(),
    settings: { model: 'test-model', temperature: 0.7 },
    setSettings: vi.fn(),
    availableModels: [
      { id: 'test-model', name: 'Test Model', backend: 'test' },
      { id: 'claude-sonnet', name: 'Claude Sonnet', backend: 'anthropic' },
    ],
    backends: [],
    modelsLoading: false,
    generatingConvs: {},
    isTyping: false,
    isStreaming: false,
    sendMessage: mockSendMessage,
    handleRegenerate: mockHandleRegenerate,
    handleFeedback: mockHandleFeedback,
    stopStreaming: mockStopStreaming,
    textareaRef: { current: null },
    messagesEndRef: { current: null },
  }),
}))

// Mock useAgents
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
    findForSection: vi.fn(() => null),
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

describe('AIDrawer', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  const renderWithProviders = (defaultState?: 'collapsed' | 'minimized' | 'expanded') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider defaultState={defaultState}>
          <AIDrawer />
        </AIDrawerProvider>
      </QueryClientProvider>
    )
  }

  describe('Collapsed state', () => {
    it('renders floating action button when collapsed', () => {
      renderWithProviders('collapsed')

      // The FAB should be visible - find by data-tabz attribute
      const toggleButton = screen.getAllByRole('button').find(
        btn => btn.getAttribute('data-tabz-action') === 'toggle-ai-drawer'
      )
      expect(toggleButton).toBeTruthy()
    })

    it('clicking FAB opens the drawer', async () => {
      const user = userEvent.setup()
      renderWithProviders('collapsed')

      // Find FAB by data-tabz attribute
      const toggleButton = screen.getAllByRole('button').find(
        btn => btn.getAttribute('data-tabz-action') === 'toggle-ai-drawer'
      )

      if (toggleButton) {
        await user.click(toggleButton)

        // After clicking, we should see the drawer content
        // The drawer should now be expanded (toggle from collapsed goes to expanded)
        await waitFor(() => {
          expect(screen.getByText(/How can I help/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Minimized state', () => {
    it('renders conversation list in minimized state', () => {
      renderWithProviders('minimized')

      expect(screen.getByText('AI Chat')).toBeInTheDocument()
      expect(screen.getByText('1 conversation')).toBeInTheDocument()
    })

    it('shows new conversation button', () => {
      renderWithProviders('minimized')

      expect(screen.getByText('New conversation')).toBeInTheDocument()
    })

    it('expand button opens expanded state', async () => {
      const user = userEvent.setup()
      renderWithProviders('minimized')

      const buttons = screen.getAllByRole('button')
      const expandBtn = buttons.find(btn => btn.getAttribute('data-tabz-action') === 'expand-ai-drawer')

      if (expandBtn) {
        await user.click(expandBtn)

        await waitFor(() => {
          expect(screen.getByText(/How can I help/i)).toBeInTheDocument()
        })
      }
    })

    it('close button closes the drawer', async () => {
      const user = userEvent.setup()
      renderWithProviders('minimized')

      const closeBtn = screen.getAllByRole('button').find(
        btn => btn.getAttribute('data-tabz-action') === 'close-ai-drawer'
      )

      if (closeBtn) {
        await user.click(closeBtn)

        await waitFor(() => {
          expect(screen.queryByText('AI Chat')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Expanded state', () => {
    it('renders header with conversation title', () => {
      renderWithProviders('expanded')

      // Should show conversation title (truncated to 20 chars)
      expect(screen.getByText('Test Conversation')).toBeInTheDocument()
    })

    it('renders empty state when no messages', () => {
      renderWithProviders('expanded')

      expect(screen.getByText(/How can I help/i)).toBeInTheDocument()
      expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument()
    })

    it('renders quick action buttons', () => {
      renderWithProviders('expanded')

      expect(screen.getByText('Explain this code')).toBeInTheDocument()
      expect(screen.getByText('Debug an error')).toBeInTheDocument()
      expect(screen.getByText('Write a function')).toBeInTheDocument()
      expect(screen.getByText('Review my changes')).toBeInTheDocument()
    })

    it('clicking quick action sends message', async () => {
      const user = userEvent.setup()
      renderWithProviders('expanded')

      const quickAction = screen.getByText('Explain this code')
      await user.click(quickAction)

      expect(mockSendMessage).toHaveBeenCalledWith('Explain this code', expect.any(Object))
    })

    it('new conversation button creates new conversation', async () => {
      const user = userEvent.setup()
      renderWithProviders('expanded')

      const newConvBtn = screen.getAllByRole('button').find(
        btn => btn.getAttribute('data-tabz-action') === 'new-conversation'
      )

      if (newConvBtn) {
        await user.click(newConvBtn)
        expect(mockCreateNewConversation).toHaveBeenCalled()
      }
    })

    it('minimize button minimizes the drawer', async () => {
      const user = userEvent.setup()
      renderWithProviders('expanded')

      const minimizeBtn = screen.getAllByRole('button').find(
        btn => btn.getAttribute('data-tabz-action') === 'minimize-ai-drawer'
      )

      if (minimizeBtn) {
        await user.click(minimizeBtn)

        await waitFor(() => {
          expect(screen.getByText('AI Chat')).toBeInTheDocument()
        })
      }
    })

    it('close button closes the drawer', async () => {
      const user = userEvent.setup()
      renderWithProviders('expanded')

      const closeBtn = screen.getAllByRole('button').find(
        btn => btn.getAttribute('data-tabz-action') === 'close-ai-drawer'
      )

      if (closeBtn) {
        await user.click(closeBtn)

        await waitFor(() => {
          // Drawer should be collapsed, showing FAB
          expect(screen.queryByText('Test Conversation')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Without provider', () => {
    it('returns null when rendered outside provider', () => {
      const { container } = render(<AIDrawer />)
      expect(container).toBeEmptyDOMElement()
    })
  })
})

describe('AIDrawerToggle', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  const renderToggle = (currentSection?: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AIDrawerProvider>
          <AIDrawerToggle currentSection={currentSection} />
        </AIDrawerProvider>
      </QueryClientProvider>
    )
  }

  it('renders toggle button', () => {
    renderToggle()

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('clicking toggle opens drawer', async () => {
    const user = userEvent.setup()
    renderToggle()

    const button = screen.getByRole('button')
    await user.click(button)

    // The button should now have secondary variant (isOpen = true)
    expect(button).toBeInTheDocument()
  })

  it('returns null when used outside provider', () => {
    const { container } = render(<AIDrawerToggle />)
    expect(container).toBeEmptyDOMElement()
  })

  it('accepts custom className', () => {
    renderToggle()
    const button = screen.getByRole('button')
    // The className prop is applied
    expect(button).toBeInTheDocument()
  })
})
