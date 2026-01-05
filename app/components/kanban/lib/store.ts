import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Board, Column, Task, Message, AgentInfo, GitInfo, Commit, TaskClaudeSettings, TaskActiveCapabilities, ColumnState, UndoEntry } from '../types'
import { BOARD_TEMPLATES, BoardTemplateKey } from './constants'

// Max undo history entries
const MAX_UNDO_ENTRIES = 50

// Debounce timer for column state updates
let columnStateDebounceTimer: ReturnType<typeof setTimeout> | null = null
const COLUMN_STATE_DEBOUNCE_MS = 100

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

// Default board with 5 columns
const createDefaultBoard = (): Board => ({
  id: generateId(),
  name: 'My Kanban Board',
  description: 'AI-powered task management',
  columns: [
    { id: generateId(), title: 'Backlog', color: 'border-t-slate-500', order: 0 },
    { id: generateId(), title: 'Ready', color: 'border-t-cyan-500', order: 1 },
    { id: generateId(), title: 'In Progress', color: 'border-t-yellow-500', order: 2 },
    { id: generateId(), title: 'AI Working', color: 'border-t-emerald-500', order: 3 },
    { id: generateId(), title: 'Done', color: 'border-t-green-500', order: 4 },
  ],
  settings: {
    theme: 'dark',
    showEstimates: true,
    showAgentStatus: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
})

interface BoardState {
  boards: Board[]
  currentBoardId: string | null
  tasks: Task[]
  selectedTaskId: string | null

  // Per-column UI state (scroll position, selection)
  columnStates: Record<string, ColumnState>

  // Undo history stack (LIFO, max 50 entries)
  undoStack: UndoEntry[]

  // Board actions
  createBoard: (name: string) => string
  createBoardFromTemplate: (name: string, templateKey: BoardTemplateKey) => string
  updateBoard: (id: string, updates: Partial<Board>) => void
  deleteBoard: (id: string) => void
  setCurrentBoard: (id: string) => void

  // Column actions
  addColumn: (boardId: string, title: string, color?: string) => void
  updateColumn: (boardId: string, columnId: string, updates: Partial<Column>) => void
  deleteColumn: (boardId: string, columnId: string) => void
  reorderColumns: (boardId: string, columnIds: string[]) => void

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, toColumnId: string, newOrder: number) => void
  reorderTasks: (columnId: string, taskIds: string[]) => void
  setSelectedTask: (id: string | null) => void
  syncBeadsTasks: (beadsTasks: Task[]) => void

  // Chat actions
  addMessage: (taskId: string, message: Omit<Message, 'id'>) => void
  updateTaskAgent: (taskId: string, agent: AgentInfo) => void
  updateTaskClaudeSettings: (taskId: string, settings: Partial<TaskClaudeSettings>) => void
  updateTaskActiveCapabilities: (taskId: string, capabilities: Partial<TaskActiveCapabilities>) => void

  // Git actions
  updateTaskGit: (taskId: string, gitInfo: Partial<GitInfo>) => void
  createWorktree: (taskId: string) => void
  createPR: (taskId: string) => void

  // Undo actions
  pushUndo: (action: string, data: Task) => void
  popUndo: () => UndoEntry | undefined

  // Navigation actions
  selectIssueById: (id: string) => { columnId: string; index: number } | null

  // Column state actions
  setColumnState: (columnId: string, state: Partial<ColumnState>) => void
  getColumnState: (columnId: string) => ColumnState

  // Helpers
  getTasksByColumn: (columnId: string) => Task[]
  getCurrentBoard: () => Board | undefined
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: [createDefaultBoard()],
      currentBoardId: null,
      tasks: [],
      selectedTaskId: null,
      columnStates: {},
      undoStack: [],

      // Board actions
      createBoard: (name) => {
        const newBoard: Board = {
          ...createDefaultBoard(),
          id: generateId(),
          name,
        }
        set((state) => ({
          boards: [...state.boards, newBoard],
          currentBoardId: newBoard.id,
        }))
        return newBoard.id
      },

      createBoardFromTemplate: (name, templateKey) => {
        const template = BOARD_TEMPLATES[templateKey]
        const newBoard: Board = {
          id: generateId(),
          name,
          description: template.description || `Created from ${template.name} template`,
          columns: template.columns.map((col, index) => ({
            id: generateId(),
            title: col.title,
            color: col.color,
            order: index,
            // Include agent assignment and config from template
            assignedAgent: col.agent,
            agentConfig: col.agentConfig,
          })),
          settings: {
            theme: 'dark',
            showEstimates: true,
            showAgentStatus: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          boards: [...state.boards, newBoard],
          currentBoardId: newBoard.id,
        }))
        return newBoard.id
      },

      updateBoard: (id, updates) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b
          ),
        }))
      },

      deleteBoard: (id) => {
        set((state) => ({
          boards: state.boards.filter((b) => b.id !== id),
          currentBoardId:
            state.currentBoardId === id
              ? state.boards[0]?.id ?? null
              : state.currentBoardId,
          tasks: state.tasks.filter((t) => {
            const board = state.boards.find((b) => b.id === id)
            return !board?.columns.some((c) => c.id === t.columnId)
          }),
        }))
      },

      setCurrentBoard: (id) => set({ currentBoardId: id }),

      // Column actions
      addColumn: (boardId, title, color = 'border-t-slate-500') => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            const newColumn: Column = {
              id: generateId(),
              title,
              color,
              order: b.columns.length,
            }
            return {
              ...b,
              columns: [...b.columns, newColumn],
              updatedAt: new Date(),
            }
          }),
        }))
      },

      updateColumn: (boardId, columnId, updates) => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            return {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId ? { ...c, ...updates } : c
              ),
              updatedAt: new Date(),
            }
          }),
        }))
      },

      deleteColumn: (boardId, columnId) => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            return {
              ...b,
              columns: b.columns
                .filter((c) => c.id !== columnId)
                .map((c, i) => ({ ...c, order: i })),
              updatedAt: new Date(),
            }
          }),
          tasks: state.tasks.filter((t) => t.columnId !== columnId),
        }))
      },

      reorderColumns: (boardId, columnIds) => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            return {
              ...b,
              columns: columnIds.map((id, order) => {
                const col = b.columns.find((c) => c.id === id)!
                return { ...col, order }
              }),
              updatedAt: new Date(),
            }
          }),
        }))
      },

      // Task actions
      addTask: (taskData) => {
        const id = generateId()
        const now = new Date()
        const newTask: Task = {
          ...taskData,
          id,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
        return id
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        }))
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        }))
      },

      moveTask: (taskId, toColumnId, newOrder) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, columnId: toColumnId, order: newOrder, updatedAt: new Date() }
              : t
          ),
        }))
      },

      reorderTasks: (columnId, taskIds) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.columnId !== columnId) return t
            const newOrder = taskIds.indexOf(t.id)
            return newOrder >= 0 ? { ...t, order: newOrder } : t
          }),
        }))
      },

      setSelectedTask: (id) => set({ selectedTaskId: id }),

      // Sync beads tasks to store (merge with existing, beads tasks take precedence)
      syncBeadsTasks: (beadsTasks) => {
        set((state) => {
          // Keep local tasks that aren't from beads, add/update beads tasks
          const localTasks = state.tasks.filter(
            (t) => !t.beadsMetadata?.isBeadsTask
          )
          // Create a map of beads tasks by ID for efficient lookup
          const beadsTaskMap = new Map(beadsTasks.map((t) => [t.id, t]))
          // Merge: local tasks + beads tasks (beads overwrite if same ID)
          const merged = [
            ...localTasks.filter((t) => !beadsTaskMap.has(t.id)),
            ...beadsTasks,
          ]
          return { tasks: merged }
        })
      },

      // Chat actions
      addMessage: (taskId, messageData) => {
        const newMessage: Message = {
          ...messageData,
          id: generateId(),
        }
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  messages: [...(t.messages || []), newMessage],
                  updatedAt: new Date(),
                }
              : t
          ),
        }))
      },

      updateTaskAgent: (taskId, agent) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, agent, updatedAt: new Date() }
              : t
          ),
        }))
      },

      updateTaskClaudeSettings: (taskId, settings) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  claudeSettings: { ...t.claudeSettings, ...settings },
                  updatedAt: new Date()
                }
              : t
          ),
        }))
      },

      updateTaskActiveCapabilities: (taskId, capabilities) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  activeCapabilities: { ...t.activeCapabilities, ...capabilities, isConfigured: true },
                  updatedAt: new Date()
                }
              : t
          ),
        }))
      },

      // Git actions
      updateTaskGit: (taskId, gitInfo) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, git: { ...t.git, ...gitInfo }, updatedAt: new Date() }
              : t
          ),
        }))
      },

      createWorktree: (taskId) => {
        const { tasks } = get()
        const task = tasks.find((t) => t.id === taskId)
        if (!task) return

        // Generate branch name from task title
        const branchName = `feature/${task.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50)}`

        const worktreePath = `/tmp/worktrees/${branchName}`

        // Mock worktree creation - in real implementation this would call git
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  git: {
                    ...t.git,
                    worktree: worktreePath,
                    branch: branchName,
                    baseBranch: 'main',
                    commits: [],
                  },
                  updatedAt: new Date(),
                }
              : t
          ),
        }))
      },

      createPR: (taskId) => {
        const { tasks } = get()
        const task = tasks.find((t) => t.id === taskId)
        if (!task?.git?.branch) return

        // Mock PR creation - generates a fake PR number
        const prNumber = Math.floor(Math.random() * 1000) + 1
        const prUrl = `https://github.com/user/repo/pull/${prNumber}`

        // Add a mock commit
        const mockCommit: Commit = {
          sha: generateId().substring(0, 7),
          message: `feat: ${task.title}`,
          author: 'AI Agent',
          date: new Date().toISOString(),
        }

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  git: {
                    ...t.git,
                    prNumber,
                    prUrl,
                    prStatus: 'draft' as const,
                    commits: [...(t.git?.commits || []), mockCommit],
                  },
                  updatedAt: new Date(),
                }
              : t
          ),
        }))
      },

      // Undo actions
      pushUndo: (action, data) => {
        set((state) => {
          const entry: UndoEntry = {
            action,
            data: { ...data },
            timestamp: new Date(),
          }
          const newStack = [entry, ...state.undoStack].slice(0, MAX_UNDO_ENTRIES)
          return { undoStack: newStack }
        })
      },

      popUndo: () => {
        const { undoStack } = get()
        if (undoStack.length === 0) return undefined

        const [entry, ...rest] = undoStack
        set({ undoStack: rest })
        return entry
      },

      // Navigation actions
      selectIssueById: (id) => {
        const { tasks, columnStates } = get()
        const task = tasks.find((t) => t.id === id)
        if (!task) return null

        // Get tasks in the same column to find index
        const columnTasks = tasks
          .filter((t) => t.columnId === task.columnId)
          .sort((a, b) => a.order - b.order)
        const index = columnTasks.findIndex((t) => t.id === id)

        // Update column state with selected index
        set({
          selectedTaskId: id,
          columnStates: {
            ...columnStates,
            [task.columnId]: {
              ...columnStates[task.columnId],
              selectedIndex: index,
              scrollOffset: columnStates[task.columnId]?.scrollOffset ?? 0,
            },
          },
        })

        return { columnId: task.columnId, index }
      },

      // Column state actions
      setColumnState: (columnId, state) => {
        // Debounce column state updates
        if (columnStateDebounceTimer) {
          clearTimeout(columnStateDebounceTimer)
        }
        columnStateDebounceTimer = setTimeout(() => {
          set((current) => ({
            columnStates: {
              ...current.columnStates,
              [columnId]: {
                selectedIndex: current.columnStates[columnId]?.selectedIndex ?? 0,
                scrollOffset: current.columnStates[columnId]?.scrollOffset ?? 0,
                ...state,
              },
            },
          }))
          columnStateDebounceTimer = null
        }, COLUMN_STATE_DEBOUNCE_MS)
      },

      getColumnState: (columnId) => {
        const { columnStates } = get()
        return columnStates[columnId] ?? { selectedIndex: 0, scrollOffset: 0 }
      },

      // Helpers
      getTasksByColumn: (columnId) => {
        return get()
          .tasks.filter((t) => t.columnId === columnId)
          .sort((a, b) => a.order - b.order)
      },

      getCurrentBoard: () => {
        const { boards, currentBoardId } = get()
        if (!currentBoardId && boards.length > 0) {
          set({ currentBoardId: boards[0].id })
          return boards[0]
        }
        return boards.find((b) => b.id === currentBoardId)
      },
    }),
    {
      name: 'ai-kanban-storage',
      skipHydration: true,
    }
  )
)
