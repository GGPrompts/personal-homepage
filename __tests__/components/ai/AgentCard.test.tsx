import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { AgentCard, type AgentCardProps } from '@/components/agents/AgentCard'
import type { AgentCard as AgentCardType } from '@/lib/agents/types'

// Mock useTabzBridge hook
const mockSpawnTerminal = vi.fn()
vi.mock('@/hooks/useTabzBridge', () => ({
  useTabzBridge: () => ({
    isConnected: true,
    spawnTerminal: mockSpawnTerminal,
  }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Helper to create mock agent data
const createMockAgent = (overrides: Partial<AgentCardType> = {}): AgentCardType => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  avatar: '🤖',
  description: 'A test agent for testing purposes',
  backend: 'claude',
  flags: ['--model', 'sonnet'],
  sections: ['development', 'testing'],
  enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('AgentCard', () => {
  const mockOnClick = vi.fn()
  const mockOnSpawn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps: AgentCardProps = {
    agent: createMockAgent(),
    onClick: mockOnClick,
  }

  const renderCard = (props: Partial<AgentCardProps> = {}) => {
    return render(<AgentCard {...defaultProps} {...props} />)
  }

  describe('Card variant (default)', () => {
    it('renders agent name', () => {
      renderCard()
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
    })

    it('renders agent description', () => {
      renderCard()
      expect(screen.getByText('A test agent for testing purposes')).toBeInTheDocument()
    })

    it('renders emoji avatar', () => {
      renderCard()
      expect(screen.getByText('🤖')).toBeInTheDocument()
    })

    it('renders URL avatar - shows initials fallback in jsdom', () => {
      renderCard({
        agent: createMockAgent({ avatar: 'https://example.com/avatar.png' }),
      })
      expect(screen.getByText('TA')).toBeInTheDocument()
    })

    it('renders avatar from absolute path - shows initials fallback in jsdom', () => {
      renderCard({
        agent: createMockAgent({ avatar: '/images/agent.png' }),
      })
      expect(screen.getByText('TA')).toBeInTheDocument()
    })

    it('shows initials fallback for non-emoji/non-url avatar', () => {
      renderCard({
        agent: createMockAgent({ avatar: 'invalid-avatar', name: 'Test Agent' }),
      })
      expect(screen.getByText('TA')).toBeInTheDocument()
    })

    it('renders section badges', () => {
      renderCard()
      expect(screen.getByText('development')).toBeInTheDocument()
      expect(screen.getByText('testing')).toBeInTheDocument()
    })

    it('limits visible section badges to 2', () => {
      renderCard({
        agent: createMockAgent({
          sections: ['development', 'testing', 'analytics', 'monitoring'],
        }),
      })
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('shows disabled badge when agent is disabled', () => {
      renderCard({
        agent: createMockAgent({ enabled: false }),
      })
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })

    it('has reduced opacity when disabled', () => {
      renderCard({
        agent: createMockAgent({ enabled: false }),
      })
      const card = screen.getByRole('button')
      expect(card).toHaveClass('opacity-50')
    })

    it('shows backend badge', () => {
      renderCard()
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })

    it('shows mode indicator when mode is set', () => {
      renderCard({
        agent: createMockAgent({ mode: 'dev' }),
      })
      expect(screen.getByText('dev mode')).toBeInTheDocument()
    })
  })

  describe('Compact variant', () => {
    it('renders in compact mode', () => {
      renderCard({ variant: 'compact' })
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
      expect(screen.getByText('A test agent for testing purposes')).toBeInTheDocument()
    })

    it('shows section count instead of individual badges', () => {
      renderCard({ variant: 'compact' })
      expect(screen.getByText('2 sections')).toBeInTheDocument()
    })

    it('uses singular "section" for single section', () => {
      renderCard({
        variant: 'compact',
        agent: createMockAgent({ sections: ['development'] }),
      })
      expect(screen.getByText('1 section')).toBeInTheDocument()
    })
  })

  describe('Selection state', () => {
    it('shows selected state styling', () => {
      renderCard({ isSelected: true })
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'true')
      expect(card).toHaveClass('ring-2')
    })

    it('shows active indicator dot when selected in card variant', () => {
      renderCard({ isSelected: true, variant: 'card' })
      const card = screen.getByRole('button')
      const dot = card.querySelector('.animate-pulse')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('Click handling', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup()
      renderCard()
      await user.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalledWith(defaultProps.agent)
    })

    it('calls onClick when Enter key is pressed', async () => {
      const user = userEvent.setup()
      renderCard()
      const card = screen.getByRole('button')
      card.focus()
      await user.keyboard('{Enter}')
      expect(mockOnClick).toHaveBeenCalledWith(defaultProps.agent)
    })

    it('calls onClick when Space key is pressed', async () => {
      const user = userEvent.setup()
      renderCard()
      const card = screen.getByRole('button')
      card.focus()
      await user.keyboard(' ')
      expect(mockOnClick).toHaveBeenCalledWith(defaultProps.agent)
    })
  })

  describe('Spawn functionality', () => {
    it('shows spawn button when showSpawn is true', () => {
      renderCard({ showSpawn: true })
      expect(screen.getByText('Spawn Agent')).toBeInTheDocument()
    })

    it('hides spawn button when agent is disabled', () => {
      renderCard({
        showSpawn: true,
        agent: createMockAgent({ enabled: false }),
      })
      expect(screen.queryByText('Spawn Agent')).not.toBeInTheDocument()
    })

    it('spawn button calls spawnTerminal with correct command', async () => {
      const user = userEvent.setup()
      renderCard({ showSpawn: true })
      const spawnButton = screen.getByText('Spawn Agent')
      await user.click(spawnButton)
      expect(mockSpawnTerminal).toHaveBeenCalledWith('claude --model sonnet', expect.any(Object))
    })

    it('spawn includes plugin-dir when agent has pluginPath', async () => {
      const user = userEvent.setup()
      renderCard({
        showSpawn: true,
        agent: createMockAgent({ pluginPath: '/path/to/plugins', flags: [] }),
      })
      const spawnButton = screen.getByText('Spawn Agent')
      await user.click(spawnButton)
      expect(mockSpawnTerminal).toHaveBeenCalledWith(
        'claude --plugin-dir "/path/to/plugins"',
        expect.any(Object)
      )
    })

    it('spawn calls onSpawn callback', async () => {
      const user = userEvent.setup()
      renderCard({ showSpawn: true, onSpawn: mockOnSpawn })
      const spawnButton = screen.getByText('Spawn Agent')
      await user.click(spawnButton)
      expect(mockOnSpawn).toHaveBeenCalledWith(defaultProps.agent)
    })

    it('spawn button click does not trigger card selection', async () => {
      const user = userEvent.setup()
      renderCard({ showSpawn: true })
      const spawnButton = screen.getByText('Spawn Agent')
      await user.click(spawnButton)
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('shows plugin path info when agent has pluginPath', () => {
      renderCard({
        showSpawn: true,
        agent: createMockAgent({ pluginPath: '/path/to/plugins' }),
      })
      expect(screen.getByText(/Plugin: plugins/)).toBeInTheDocument()
    })

    it('shows flags count when agent has flags', () => {
      renderCard({
        showSpawn: true,
        agent: createMockAgent({ flags: ['--model', 'sonnet', '--verbose'] }),
      })
      expect(screen.getByText(/3 flags/)).toBeInTheDocument()
    })

    it('shows spawn configuration indicator in compact mode', () => {
      renderCard({
        variant: 'compact',
        showSpawn: true,
        agent: createMockAgent({ pluginPath: '/path/to/plugins' }),
      })
      const playButton = screen.getByRole('button', { name: /Spawn Test Agent/i })
      expect(playButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper role and aria attributes', () => {
      renderCard()
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-label', 'Select agent Test Agent')
      expect(card).toHaveAttribute('aria-pressed', 'false')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('has correct aria-pressed when selected', () => {
      renderCard({ isSelected: true })
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('has data-tabz attributes', () => {
      renderCard()
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('data-tabz-item', 'agent-test-agent-1')
      expect(card).toHaveAttribute('data-tabz-action', 'select')
    })
  })

  describe('Edge cases', () => {
    it('handles empty sections array', () => {
      renderCard({
        agent: createMockAgent({ sections: [] }),
      })
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
      expect(screen.queryByText('sections')).not.toBeInTheDocument()
    })

    it('handles empty flags array', () => {
      renderCard({
        agent: createMockAgent({ flags: [] }),
      })
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
    })

    it('handles long agent name in card variant', () => {
      renderCard({
        agent: createMockAgent({
          name: 'This is a very long agent name that should be truncated in the UI',
        }),
      })
      expect(screen.getByText(/This is a very long/)).toBeInTheDocument()
    })

    it('handles long description in card variant', () => {
      renderCard({
        agent: createMockAgent({
          description: 'This is a very long description that should be limited to two lines in the card variant to prevent the card from becoming too tall.',
        }),
      })
      const description = screen.getByText(/This is a very long description/)
      expect(description).toHaveClass('line-clamp-2')
    })
  })
})
