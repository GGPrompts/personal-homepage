import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { AgentGallery, type AgentGalleryProps } from '@/components/agents/AgentGallery'
import type { AgentCard as AgentCardType } from '@/lib/agents/types'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, className, onClick, ...props }: any) => (
        <div className={className} onClick={onClick} data-testid={props['data-testid']}>{children}</div>
      ),
      button: ({ children, className, onClick, ...props }: any) => (
        <button className={className} onClick={onClick} {...props}>{children}</button>
      ),
    },
  }
})

// Sample agent data for tests
const createMockAgent = (overrides: Partial<AgentCardType> = {}): AgentCardType => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  avatar: '🤖',
  description: 'A test agent for testing',
  personality: ['helpful', 'concise'],
  system_prompt: 'You are a test agent',
  mcp_tools: [],
  selectors: [],
  config: {
    model: 'test-model',
    temperature: 0.7,
    max_tokens: 4096,
  },
  sections: ['test-section'],
  enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const mockAgents: AgentCardType[] = [
  createMockAgent({ id: 'agent-1', name: 'Code Assistant', sections: ['development'] }),
  createMockAgent({ id: 'agent-2', name: 'Data Analyst', sections: ['analytics'] }),
  createMockAgent({ id: 'agent-3', name: 'Helper Bot', description: 'General helper', sections: ['development', 'analytics'] }),
  createMockAgent({ id: 'agent-4', name: 'Disabled Agent', enabled: false, sections: ['development'] }),
]

describe('AgentGallery', () => {
  const mockOnSelectAgent = vi.fn()
  const mockOnEditAgent = vi.fn()
  const mockOnNewAgent = vi.fn()
  const mockOnDeleteAgent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps: AgentGalleryProps = {
    agents: mockAgents,
    onSelectAgent: mockOnSelectAgent,
  }

  const renderGallery = (props: Partial<AgentGalleryProps> = {}) => {
    return render(<AgentGallery {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders gallery header with agent count', () => {
      renderGallery()

      expect(screen.getByText('AI Agents')).toBeInTheDocument()
      // Count includes vanilla Claude agent + enabled agents (3)
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('renders search input', () => {
      renderGallery()

      expect(screen.getByPlaceholderText('Search agents...')).toBeInTheDocument()
    })

    it('renders view toggle buttons', () => {
      renderGallery()

      expect(screen.getByRole('button', { name: 'Grid view' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'List view' })).toBeInTheDocument()
    })

    it('renders agents including vanilla Claude option', () => {
      renderGallery()

      expect(screen.getByText('Claude')).toBeInTheDocument()
      expect(screen.getByText('Code Assistant')).toBeInTheDocument()
      expect(screen.getByText('Data Analyst')).toBeInTheDocument()
      expect(screen.getByText('Helper Bot')).toBeInTheDocument()
    })

    it('does not render disabled agents', () => {
      renderGallery()

      expect(screen.queryByText('Disabled Agent')).not.toBeInTheDocument()
    })

    it('renders section filter chips when sections exist', () => {
      renderGallery()

      expect(screen.getByText('All')).toBeInTheDocument()
      // Section names appear both in filter chips and agent cards
      // Check for filter button with "development" text
      const devButtons = screen.getAllByRole('button', { name: /development/i })
      expect(devButtons.length).toBeGreaterThanOrEqual(1)
      const analyticsButtons = screen.getAllByRole('button', { name: /analytics/i })
      expect(analyticsButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      renderGallery({ isLoading: true })

      expect(screen.getByText('Loading agents...')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows empty state when no agents', () => {
      renderGallery({ agents: [] })

      expect(screen.getByText('No agents available')).toBeInTheDocument()
    })

    it('shows filter empty state when filters exclude all agents', async () => {
      const user = userEvent.setup()
      renderGallery()

      // Search for non-existent agent
      const searchInput = screen.getByPlaceholderText('Search agents...')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('No agents match your filters')).toBeInTheDocument()
      expect(screen.getByText('Clear filters')).toBeInTheDocument()
    })

    it('clear filters button resets search', async () => {
      const user = userEvent.setup()
      renderGallery()

      const searchInput = screen.getByPlaceholderText('Search agents...')
      await user.type(searchInput, 'nonexistent')

      const clearButton = screen.getByText('Clear filters')
      await user.click(clearButton)

      expect(screen.getByText('Code Assistant')).toBeInTheDocument()
    })
  })

  describe('Search functionality', () => {
    it('filters agents by name', async () => {
      const user = userEvent.setup()
      renderGallery()

      const searchInput = screen.getByPlaceholderText('Search agents...')
      await user.type(searchInput, 'Code')

      expect(screen.getByText('Code Assistant')).toBeInTheDocument()
      expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument()
    })

    it('filters agents by description', async () => {
      const user = userEvent.setup()
      renderGallery()

      const searchInput = screen.getByPlaceholderText('Search agents...')
      await user.type(searchInput, 'General helper')

      expect(screen.getByText('Helper Bot')).toBeInTheDocument()
      expect(screen.queryByText('Code Assistant')).not.toBeInTheDocument()
    })

    it('search is case insensitive', async () => {
      const user = userEvent.setup()
      renderGallery()

      const searchInput = screen.getByPlaceholderText('Search agents...')
      await user.type(searchInput, 'DATA ANALYST')

      expect(screen.getByText('Data Analyst')).toBeInTheDocument()
    })

    it('searching for "claude" shows vanilla Claude option', async () => {
      const user = userEvent.setup()
      renderGallery()

      const searchInput = screen.getByPlaceholderText('Search agents...')
      await user.type(searchInput, 'claude')

      expect(screen.getByText('Claude')).toBeInTheDocument()
    })
  })

  describe('Section filtering', () => {
    it('filters agents by section when chip is clicked', async () => {
      const user = userEvent.setup()
      renderGallery()

      const developmentChip = screen.getByRole('button', { name: 'development' })
      await user.click(developmentChip)

      expect(screen.getByText('Code Assistant')).toBeInTheDocument()
      expect(screen.getByText('Helper Bot')).toBeInTheDocument()
      expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument()
      // Vanilla Claude is hidden when section filter is active
      expect(screen.queryByText(/Start a conversation with Claude/)).not.toBeInTheDocument()
    })

    it('clicking same section chip toggles filter off', async () => {
      const user = userEvent.setup()
      renderGallery()

      const developmentChip = screen.getByRole('button', { name: 'development' })
      await user.click(developmentChip) // On
      await user.click(developmentChip) // Off

      // All agents should be visible again
      expect(screen.getByText('Code Assistant')).toBeInTheDocument()
      expect(screen.getByText('Data Analyst')).toBeInTheDocument()
    })

    it('"All" chip clears section filter', async () => {
      const user = userEvent.setup()
      renderGallery()

      const developmentChip = screen.getByRole('button', { name: 'development' })
      await user.click(developmentChip)

      const allChip = screen.getByRole('button', { name: 'All' })
      await user.click(allChip)

      expect(screen.getByText('Data Analyst')).toBeInTheDocument()
    })
  })

  describe('View modes', () => {
    it('defaults to grid view', () => {
      renderGallery()

      const gridButton = screen.getByRole('button', { name: 'Grid view' })
      // Grid view button should have secondary variant (active)
      expect(gridButton).toHaveClass('bg-secondary')
    })

    it('clicking list view switches to list mode', async () => {
      const user = userEvent.setup()
      renderGallery()

      const listButton = screen.getByRole('button', { name: 'List view' })
      await user.click(listButton)

      expect(listButton).toHaveClass('bg-secondary')
    })

    it('clicking grid view switches back to grid mode', async () => {
      const user = userEvent.setup()
      renderGallery()

      const listButton = screen.getByRole('button', { name: 'List view' })
      await user.click(listButton)

      const gridButton = screen.getByRole('button', { name: 'Grid view' })
      await user.click(gridButton)

      expect(gridButton).toHaveClass('bg-secondary')
    })
  })

  describe('Agent selection', () => {
    it('calls onSelectAgent when agent is clicked', async () => {
      const user = userEvent.setup()
      renderGallery()

      // Find the agent card and click it
      const agentCard = screen.getByText('Code Assistant').closest('[role="button"]')
      if (agentCard) {
        await user.click(agentCard)
        expect(mockOnSelectAgent).toHaveBeenCalled()
      }
    })

    it('highlights selected agent', () => {
      renderGallery({ selectedAgentId: 'agent-1' })

      const agentCard = screen.getByText('Code Assistant').closest('[role="button"]')
      expect(agentCard).toHaveAttribute('aria-pressed', 'true')
    })

    it('clicking vanilla Claude calls onSelectAgent with vanilla agent', async () => {
      const user = userEvent.setup()
      renderGallery()

      const vanillaCard = screen.getByText('Claude').closest('[role="button"]')
      if (vanillaCard) {
        await user.click(vanillaCard)
        expect(mockOnSelectAgent).toHaveBeenCalledWith(
          expect.objectContaining({ id: '__vanilla__', name: 'Claude' })
        )
      }
    })
  })

  describe('Editable mode', () => {
    it('shows New Agent button when editable', () => {
      renderGallery({ editable: true, onNewAgent: mockOnNewAgent })

      expect(screen.getByText('New Agent')).toBeInTheDocument()
    })

    it('hides New Agent button when not editable', () => {
      renderGallery({ editable: false, onNewAgent: mockOnNewAgent })

      expect(screen.queryByText('New Agent')).not.toBeInTheDocument()
    })

    it('New Agent button calls onNewAgent', async () => {
      const user = userEvent.setup()
      renderGallery({ editable: true, onNewAgent: mockOnNewAgent })

      const newButton = screen.getByText('New Agent')
      await user.click(newButton)

      expect(mockOnNewAgent).toHaveBeenCalled()
    })

    it('shows edit/delete buttons on hover for custom agents when editable', () => {
      renderGallery({
        editable: true,
        onEditAgent: mockOnEditAgent,
        onDeleteAgent: mockOnDeleteAgent,
      })

      // Edit and delete buttons exist but are hidden until hover
      const editButtons = screen.getAllByTitle('Edit agent')
      const deleteButtons = screen.getAllByTitle('Delete agent')

      // Should have buttons for each enabled custom agent (not vanilla)
      expect(editButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('does not show edit/delete buttons for vanilla Claude', () => {
      renderGallery({
        editable: true,
        onEditAgent: mockOnEditAgent,
        onDeleteAgent: mockOnDeleteAgent,
      })

      // Get the vanilla Claude card
      const claudeSection = screen.getByText('Claude').closest('.group')

      // It should not have edit/delete buttons
      if (claudeSection) {
        expect(within(claudeSection).queryByTitle('Edit agent')).not.toBeInTheDocument()
        expect(within(claudeSection).queryByTitle('Delete agent')).not.toBeInTheDocument()
      }
    })
  })

  describe('Accessibility', () => {
    it('agent cards are keyboard accessible', async () => {
      const user = userEvent.setup()
      renderGallery()

      const agentCard = screen.getByText('Code Assistant').closest('[role="button"]')
      expect(agentCard).toHaveAttribute('tabindex', '0')
      expect(agentCard).toHaveAttribute('aria-label', 'Select agent Code Assistant')
    })

    it('search input has data-tabz attribute', () => {
      renderGallery()

      const searchInput = screen.getByPlaceholderText('Search agents...')
      expect(searchInput).toHaveAttribute('data-tabz-input', 'agent-search')
    })
  })
})
