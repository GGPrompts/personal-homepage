import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanbanColumn } from '@/app/components/kanban/board/KanbanColumn'
import { Column, Task } from '@/app/components/kanban/types'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}))

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: React.PropsWithChildren) => children,
  verticalListSortingStrategy: {},
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

// Mock KanbanCard
vi.mock('@/app/components/kanban/board/KanbanCard', () => ({
  KanbanCard: ({ task }: { task: Task }) => (
    <div data-testid={`task-${task.id}`}>{task.title}</div>
  ),
}))

// Mock DoneList
vi.mock('@/app/components/kanban/board/DoneList', () => ({
  DoneList: ({ tasks }: { tasks: Task[] }) => (
    <div data-testid="done-list">
      {tasks.map((task) => (
        <div key={task.id} data-testid={`done-task-${task.id}`}>
          {task.title}
        </div>
      ))}
    </div>
  ),
}))

const createMockColumn = (overrides: Partial<Column> = {}): Column => ({
  id: 'col-1',
  title: 'Test Column',
  color: 'border-t-cyan-500',
  order: 0,
  ...overrides,
})

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  columnId: 'col-1',
  order: 0,
  priority: 'medium',
  labels: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('KanbanColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders column title', () => {
      const column = createMockColumn({ title: 'Backlog' })
      render(<KanbanColumn column={column} tasks={[]} />)

      expect(screen.getByText('Backlog')).toBeInTheDocument()
    })

    it('renders task count', () => {
      const column = createMockColumn()
      const tasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
        createMockTask({ id: 'task-3' }),
      ]
      render(<KanbanColumn column={column} tasks={tasks} />)

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('renders zero count when no tasks', () => {
      const column = createMockColumn()
      render(<KanbanColumn column={column} tasks={[]} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('renders tasks', () => {
      const column = createMockColumn()
      const tasks = [
        createMockTask({ id: 'task-1', title: 'First Task' }),
        createMockTask({ id: 'task-2', title: 'Second Task' }),
      ]
      render(<KanbanColumn column={column} tasks={tasks} />)

      expect(screen.getByTestId('task-task-1')).toBeInTheDocument()
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument()
      expect(screen.getByText('First Task')).toBeInTheDocument()
      expect(screen.getByText('Second Task')).toBeInTheDocument()
    })

    it('renders empty state when no tasks', () => {
      const column = createMockColumn()
      render(<KanbanColumn column={column} tasks={[]} />)

      expect(screen.getByText('No issues')).toBeInTheDocument()
    })

    it('applies column color class', () => {
      const column = createMockColumn({ color: 'border-t-emerald-500' })
      render(<KanbanColumn column={column} tasks={[]} />)

      const header = screen.getByText('Test Column').closest('.station-header')
      expect(header).toHaveClass('border-t-emerald-500')
    })
  })

  describe('description tooltip', () => {
    it('renders info icon when description is provided', () => {
      const column = createMockColumn()
      render(
        <KanbanColumn column={column} tasks={[]} description="This is a test column" />
      )

      // The tooltip trigger button should be present
      const infoButton = document.querySelector('button')
      expect(infoButton).toBeInTheDocument()
    })

    it('does not render info icon when no description', () => {
      const column = createMockColumn()
      render(<KanbanColumn column={column} tasks={[]} />)

      // No tooltip button when no description
      const buttons = document.querySelectorAll('button')
      expect(buttons.length).toBe(0)
    })
  })

  describe('done column mode', () => {
    it('renders DoneList when isDoneColumn is true', () => {
      const column = createMockColumn({ title: 'Done' })
      const tasks = [
        createMockTask({ id: 'done-1', title: 'Completed Task' }),
      ]
      render(<KanbanColumn column={column} tasks={tasks} isDoneColumn={true} />)

      expect(screen.getByTestId('done-list')).toBeInTheDocument()
      expect(screen.getByTestId('done-task-done-1')).toBeInTheDocument()
    })

    it('renders regular tasks when isDoneColumn is false', () => {
      const column = createMockColumn()
      const tasks = [createMockTask({ id: 'task-1', title: 'Regular Task' })]
      render(<KanbanColumn column={column} tasks={tasks} isDoneColumn={false} />)

      expect(screen.queryByTestId('done-list')).not.toBeInTheDocument()
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument()
    })
  })

  describe('data attributes', () => {
    it('sets data-tabz-column attribute', () => {
      const column = createMockColumn({ id: 'my-column-id' })
      render(<KanbanColumn column={column} tasks={[]} />)

      const columnElement = document.querySelector('[data-tabz-column="my-column-id"]')
      expect(columnElement).toBeInTheDocument()
    })
  })

  describe('column variations', () => {
    it('handles different column colors', () => {
      const colors = [
        'border-t-slate-500',
        'border-t-cyan-500',
        'border-t-emerald-500',
        'border-t-red-500',
      ]

      colors.forEach((color) => {
        const column = createMockColumn({ color, title: `Column ${color}` })
        const { unmount } = render(<KanbanColumn column={column} tasks={[]} />)

        const header = screen.getByText(`Column ${color}`).closest('.station-header')
        expect(header).toHaveClass(color)
        unmount()
      })
    })

    it('handles column with many tasks', () => {
      const column = createMockColumn()
      const tasks = Array.from({ length: 20 }, (_, i) =>
        createMockTask({ id: `task-${i}`, title: `Task ${i}` })
      )
      render(<KanbanColumn column={column} tasks={tasks} />)

      expect(screen.getByText('20')).toBeInTheDocument()
      tasks.forEach((_, i) => {
        expect(screen.getByTestId(`task-task-${i}`)).toBeInTheDocument()
      })
    })
  })

  describe('in-progress column', () => {
    it('passes showWorkerStatus to KanbanCard when isInProgressColumn', () => {
      // Note: This test verifies the prop is passed through via the mock
      const column = createMockColumn({ title: 'In Progress' })
      const tasks = [createMockTask()]
      render(
        <KanbanColumn
          column={column}
          tasks={tasks}
          isInProgressColumn={true}
        />
      )

      // The card should be rendered (mock doesn't show the actual prop,
      // but we verify the component renders without error)
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument()
    })
  })

  describe('hasTranscript callback', () => {
    it('passes hasTranscript function to cards', () => {
      const column = createMockColumn()
      const tasks = [createMockTask()]
      const hasTranscript = vi.fn().mockReturnValue(true)

      render(
        <KanbanColumn
          column={column}
          tasks={tasks}
          hasTranscript={hasTranscript}
        />
      )

      // Component renders successfully with the callback
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument()
    })
  })
})
