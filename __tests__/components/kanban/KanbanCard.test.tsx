import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanCard } from '@/app/components/kanban/board/KanbanCard'
import { Task } from '@/app/components/kanban/types'

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

// Mock @dnd-kit/utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock the store
const mockSetSelectedTask = vi.fn()
vi.mock('@/app/components/kanban/lib/store', () => ({
  useBoardStore: (selector: (state: unknown) => unknown) =>
    selector({
      setSelectedTask: mockSetSelectedTask,
    }),
}))

// Mock GraphMetricsContext
vi.mock('@/app/components/kanban/contexts/GraphMetricsContext', () => ({
  useGraphMetricsContextSafe: () => null,
}))

// Mock WorkerStatusContext
vi.mock('@/app/components/kanban/contexts/WorkerStatusContext', () => ({
  useWorkerStatusContextSafe: () => null,
}))

// Mock usePromptGeneration hook
vi.mock('@/hooks/usePromptGeneration', () => ({
  usePromptGeneration: () => ({
    generatePrompt: vi.fn(),
    savePrompt: vi.fn(),
    isGenerating: false,
    isSaving: false,
    error: null,
    clearError: vi.fn(),
  }),
  extractPromptFromNotes: () => null,
  PROMPT_SECTION_HEADER: '## Worker Prompt',
}))

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  columnId: 'col-1',
  order: 0,
  priority: 'medium',
  labels: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  ...overrides,
})

describe('KanbanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders task title', () => {
      const task = createMockTask({ title: 'My Task Title' })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('My Task Title')).toBeInTheDocument()
    })

    it('renders priority badge', () => {
      const task = createMockTask({ priority: 'high' })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('high')).toBeInTheDocument()
    })

    it('renders different priority levels correctly', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'] as const

      priorities.forEach((priority) => {
        const task = createMockTask({ priority })
        const { unmount } = render(<KanbanCard task={task} />)
        expect(screen.getByText(priority)).toBeInTheDocument()
        unmount()
      })
    })

    it('renders labels', () => {
      const task = createMockTask({ labels: ['feature', 'enhancement'] })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('feature')).toBeInTheDocument()
      expect(screen.getByText('enhancement')).toBeInTheDocument()
    })

    it('truncates labels when more than 2', () => {
      const task = createMockTask({
        labels: ['feature', 'enhancement', 'bug', 'urgent'],
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('feature')).toBeInTheDocument()
      expect(screen.getByText('enhancement')).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('renders issue type badge when present', () => {
      const task = createMockTask({
        beadsMetadata: { isBeadsTask: true, type: 'bug' },
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('bug')).toBeInTheDocument()
    })

    it('renders estimate when not in done column', () => {
      const task = createMockTask({ estimate: '2h' })
      render(<KanbanCard task={task} isDoneColumn={false} />)

      expect(screen.getByText('Est: 2h')).toBeInTheDocument()
    })

    it('does not render estimate in done column', () => {
      const task = createMockTask({ estimate: '2h' })
      render(<KanbanCard task={task} isDoneColumn={true} />)

      expect(screen.queryByText('Est: 2h')).not.toBeInTheDocument()
    })
  })

  describe('git information', () => {
    it('renders git branch when present', () => {
      const task = createMockTask({
        git: {
          branch: 'feature/test-branch',
        },
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('feature/test-branch')).toBeInTheDocument()
    })

    it('renders PR number when present', () => {
      const task = createMockTask({
        git: {
          branch: 'feature/test-branch',
          prNumber: 123,
        },
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('#123')).toBeInTheDocument()
    })
  })

  describe('dependency indicators', () => {
    it('renders blocked indicator when task has blockers', () => {
      const task = createMockTask({
        blockedBy: ['task-2', 'task-3'],
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText(/Blocked by 2/)).toBeInTheDocument()
    })

    it('renders unblocks indicator when task blocks others', () => {
      const task = createMockTask({
        blocking: ['task-2', 'task-3', 'task-4'],
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText(/Unblocks 3/)).toBeInTheDocument()
    })

    it('renders critical path indicator', () => {
      const task = createMockTask({
        criticalPath: true,
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('renders ready indicator when task has ready label', () => {
      const task = createMockTask({
        labels: ['ready'],
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  describe('done column', () => {
    it('renders completed badge in done column', () => {
      const task = createMockTask()
      render(<KanbanCard task={task} isDoneColumn={true} />)

      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('renders close reason when present', () => {
      const task = createMockTask({
        beadsMetadata: {
          isBeadsTask: true,
          closeReason: 'Fixed the bug successfully',
        },
      })
      render(<KanbanCard task={task} isDoneColumn={true} />)

      expect(screen.getByText('Fixed the bug successfully')).toBeInTheDocument()
    })

    it('renders transcript indicator when available', () => {
      const task = createMockTask()
      render(<KanbanCard task={task} isDoneColumn={true} hasTranscript={true} />)

      expect(screen.getByText('Transcript')).toBeInTheDocument()
    })

    it('does not render dependency indicators in done column', () => {
      const task = createMockTask({
        blockedBy: ['task-2'],
        blocking: ['task-3'],
      })
      render(<KanbanCard task={task} isDoneColumn={true} />)

      expect(screen.queryByText(/Blocked by/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Unblocks/)).not.toBeInTheDocument()
    })
  })

  describe('gate labels', () => {
    it('renders gate labels with icons', () => {
      const task = createMockTask({
        labels: ['gate:test-runner', 'gate:visual-qa', 'feature'],
      })
      render(<KanbanCard task={task} />)

      expect(screen.getByText('Tests')).toBeInTheDocument()
      expect(screen.getByText('Visual')).toBeInTheDocument()
      // Regular label should still render
      expect(screen.getByText('feature')).toBeInTheDocument()
    })

    it('does not render unknown gate labels', () => {
      const task = createMockTask({
        labels: ['gate:unknown-gate'],
      })
      render(<KanbanCard task={task} />)

      // Unknown gate should not render
      expect(screen.queryByText('unknown-gate')).not.toBeInTheDocument()
    })
  })

  describe('worker status', () => {
    it('renders no worker indicator when showWorkerStatus is true but no worker', () => {
      const task = createMockTask()
      render(<KanbanCard task={task} showWorkerStatus={true} />)

      expect(screen.getByText('No worker')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls setSelectedTask when clicked', () => {
      const task = createMockTask()
      render(<KanbanCard task={task} />)

      const card = screen.getByText('Test Task').closest('[data-tabz-item]')
      if (card) {
        fireEvent.click(card)
        expect(mockSetSelectedTask).toHaveBeenCalledWith('task-1')
      }
    })
  })

  describe('overlay mode', () => {
    it('renders simplified card in overlay mode', () => {
      const task = createMockTask({
        title: 'Overlay Task',
        description: 'Should not render description in overlay',
        labels: ['feature'],
      })
      render(<KanbanCard task={task} isOverlay={true} />)

      expect(screen.getByText('Overlay Task')).toBeInTheDocument()
      // Labels and other details should not be in overlay mode
      expect(screen.queryByText('feature')).not.toBeInTheDocument()
    })
  })
})
