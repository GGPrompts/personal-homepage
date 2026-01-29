import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useBoardStore } from '@/app/components/kanban/lib/store'
import { Task } from '@/app/components/kanban/types'

// Reset store state before each test
beforeEach(() => {
  const store = useBoardStore.getState()
  // Reset to initial state
  useBoardStore.setState({
    boards: [],
    currentBoardId: null,
    tasks: [],
    selectedTaskId: null,
    columnStates: {},
    undoStack: [],
  })
})

describe('useBoardStore', () => {
  describe('board operations', () => {
    it('creates a new board with default columns', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')

      const boards = useBoardStore.getState().boards
      expect(boards).toHaveLength(1)
      expect(boards[0].name).toBe('Test Board')
      expect(boards[0].columns).toHaveLength(5)
      expect(boards[0].id).toBe(boardId)
    })

    it('sets current board after creation', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')

      expect(useBoardStore.getState().currentBoardId).toBe(boardId)
    })

    it('creates a board from template', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoardFromTemplate('Feature Board', 'feature')

      const boards = useBoardStore.getState().boards
      expect(boards).toHaveLength(1)
      expect(boards[0].name).toBe('Feature Board')
      // Feature template has 7 columns
      expect(boards[0].columns.length).toBeGreaterThanOrEqual(5)
    })

    it('updates an existing board', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Original Name')

      store.updateBoard(boardId, { name: 'Updated Name' })

      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)
      expect(board?.name).toBe('Updated Name')
    })

    it('deletes a board and its tasks', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('To Delete')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      // Add a task to the board
      store.addTask({
        title: 'Test Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      expect(useBoardStore.getState().tasks).toHaveLength(1)

      store.deleteBoard(boardId)

      expect(useBoardStore.getState().boards).toHaveLength(0)
      expect(useBoardStore.getState().tasks).toHaveLength(0)
    })

    it('gets current board', () => {
      const store = useBoardStore.getState()
      store.createBoard('Test Board')

      const currentBoard = store.getCurrentBoard()
      expect(currentBoard?.name).toBe('Test Board')
    })
  })

  describe('column operations', () => {
    it('adds a new column to a board', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')

      store.addColumn(boardId, 'New Column', 'border-t-pink-500')

      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)
      expect(board?.columns).toHaveLength(6)
      expect(board?.columns[5].title).toBe('New Column')
      expect(board?.columns[5].color).toBe('border-t-pink-500')
    })

    it('updates a column', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      store.updateColumn(boardId, columnId, { title: 'Updated Title' })

      const updatedBoard = useBoardStore.getState().boards.find((b) => b.id === boardId)
      expect(updatedBoard?.columns[0].title).toBe('Updated Title')
    })

    it('deletes a column and its tasks', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      // Add a task to the column
      store.addTask({
        title: 'Test Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.deleteColumn(boardId, columnId)

      const updatedBoard = useBoardStore.getState().boards.find((b) => b.id === boardId)
      expect(updatedBoard?.columns).toHaveLength(4)
      expect(useBoardStore.getState().tasks).toHaveLength(0)
    })

    it('reorders columns', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnIds = board.columns.map((c) => c.id)

      // Reverse the order
      const reversedIds = [...columnIds].reverse()
      store.reorderColumns(boardId, reversedIds)

      const updatedBoard = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      expect(updatedBoard.columns[0].id).toBe(reversedIds[0])
      expect(updatedBoard.columns[4].id).toBe(reversedIds[4])
    })
  })

  describe('task operations', () => {
    it('adds a new task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'New Task',
        description: 'Task description',
        columnId,
        order: 0,
        priority: 'high',
        labels: ['feature'],
      })

      const tasks = useBoardStore.getState().tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe(taskId)
      expect(tasks[0].title).toBe('New Task')
      expect(tasks[0].priority).toBe('high')
      expect(tasks[0].labels).toContain('feature')
    })

    it('updates an existing task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Original Title',
        columnId,
        order: 0,
        priority: 'low',
        labels: [],
      })

      store.updateTask(taskId, { title: 'Updated Title', priority: 'urgent' })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.title).toBe('Updated Title')
      expect(task?.priority).toBe('urgent')
    })

    it('deletes a task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'To Delete',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      expect(useBoardStore.getState().tasks).toHaveLength(1)

      store.deleteTask(taskId)

      expect(useBoardStore.getState().tasks).toHaveLength(0)
    })

    it('moves a task to a different column', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const fromColumnId = board.columns[0].id
      const toColumnId = board.columns[1].id

      const taskId = store.addTask({
        title: 'Moving Task',
        columnId: fromColumnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.moveTask(taskId, toColumnId, 0)

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.columnId).toBe(toColumnId)
    })

    it('reorders tasks within a column', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId1 = store.addTask({
        title: 'Task 1',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })
      const taskId2 = store.addTask({
        title: 'Task 2',
        columnId,
        order: 1,
        priority: 'medium',
        labels: [],
      })

      // Reorder to swap tasks
      store.reorderTasks(columnId, [taskId2, taskId1])

      const tasks = useBoardStore.getState().tasks
      const task1 = tasks.find((t) => t.id === taskId1)
      const task2 = tasks.find((t) => t.id === taskId2)
      expect(task2?.order).toBe(0)
      expect(task1?.order).toBe(1)
    })

    it('sets selected task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Selectable Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.setSelectedTask(taskId)
      expect(useBoardStore.getState().selectedTaskId).toBe(taskId)

      store.setSelectedTask(null)
      expect(useBoardStore.getState().selectedTaskId).toBeNull()
    })

    it('clears selected task when task is deleted', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Selected Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.setSelectedTask(taskId)
      expect(useBoardStore.getState().selectedTaskId).toBe(taskId)

      store.deleteTask(taskId)
      expect(useBoardStore.getState().selectedTaskId).toBeNull()
    })

    it('gets tasks by column', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      store.addTask({ title: 'Task 1', columnId, order: 1, priority: 'medium', labels: [] })
      store.addTask({ title: 'Task 2', columnId, order: 0, priority: 'high', labels: [] })
      store.addTask({
        title: 'Task 3',
        columnId: board.columns[1].id,
        order: 0,
        priority: 'low',
        labels: [],
      })

      const columnTasks = store.getTasksByColumn(columnId)
      expect(columnTasks).toHaveLength(2)
      // Should be sorted by order
      expect(columnTasks[0].title).toBe('Task 2')
      expect(columnTasks[1].title).toBe('Task 1')
    })
  })

  describe('chat operations', () => {
    it('adds a message to a task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Chat Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.addMessage(taskId, {
        role: 'user',
        content: 'Hello, AI!',
        timestamp: new Date(),
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.messages).toHaveLength(1)
      expect(task?.messages?.[0].content).toBe('Hello, AI!')
      expect(task?.messages?.[0].role).toBe('user')
    })

    it('updates task agent', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Agent Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.updateTaskAgent(taskId, {
        type: 'claude-code',
        status: 'running',
        sessionId: 'session-123',
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.agent?.type).toBe('claude-code')
      expect(task?.agent?.status).toBe('running')
      expect(task?.agent?.sessionId).toBe('session-123')
    })

    it('updates task claude settings', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Settings Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.updateTaskClaudeSettings(taskId, {
        agent: 'custom-agent',
        permissionMode: 'bypassPermissions',
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.claudeSettings?.agent).toBe('custom-agent')
      expect(task?.claudeSettings?.permissionMode).toBe('bypassPermissions')
    })

    it('updates task active capabilities', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Capabilities Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.updateTaskActiveCapabilities(taskId, {
        skills: ['commit', 'review-pr'],
        mcpServers: ['tabz'],
        canCreateWorktree: true,
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.activeCapabilities?.skills).toContain('commit')
      expect(task?.activeCapabilities?.mcpServers).toContain('tabz')
      expect(task?.activeCapabilities?.canCreateWorktree).toBe(true)
      expect(task?.activeCapabilities?.isConfigured).toBe(true)
    })
  })

  describe('git operations', () => {
    it('updates task git info', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Git Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.updateTaskGit(taskId, {
        branch: 'feature/test-branch',
        baseBranch: 'main',
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.git?.branch).toBe('feature/test-branch')
      expect(task?.git?.baseBranch).toBe('main')
    })

    it('creates a worktree for a task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'My Test Feature',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      store.createWorktree(taskId)

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.git?.worktree).toContain('/tmp/worktrees/')
      expect(task?.git?.branch).toContain('feature/my-test-feature')
      expect(task?.git?.baseBranch).toBe('main')
    })

    it('creates a PR for a task', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'PR Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      // First create worktree (required for PR)
      store.createWorktree(taskId)
      store.createPR(taskId)

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)
      expect(task?.git?.prNumber).toBeDefined()
      expect(task?.git?.prUrl).toContain('github.com')
      expect(task?.git?.prStatus).toBe('draft')
      expect(task?.git?.commits).toHaveLength(1)
    })
  })

  describe('undo operations', () => {
    it('pushes and pops undo entries', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Undo Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)!

      store.pushUndo('delete', task)

      expect(useBoardStore.getState().undoStack).toHaveLength(1)

      const entry = store.popUndo()
      expect(entry?.action).toBe('delete')
      expect(entry?.data.id).toBe(taskId)
      expect(useBoardStore.getState().undoStack).toHaveLength(0)
    })

    it('limits undo stack to 50 entries', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      const taskId = store.addTask({
        title: 'Stack Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      const task = useBoardStore.getState().tasks.find((t) => t.id === taskId)!

      // Push 60 entries
      for (let i = 0; i < 60; i++) {
        store.pushUndo(`action-${i}`, task)
      }

      expect(useBoardStore.getState().undoStack).toHaveLength(50)
    })
  })

  describe('beads sync', () => {
    it('syncs beads tasks to store', () => {
      const store = useBoardStore.getState()

      const beadsTasks: Task[] = [
        {
          id: 'beads-1',
          title: 'Beads Task 1',
          columnId: 'col-1',
          order: 0,
          priority: 'high',
          labels: ['bug'],
          beadsMetadata: { isBeadsTask: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'beads-2',
          title: 'Beads Task 2',
          columnId: 'col-2',
          order: 0,
          priority: 'medium',
          labels: [],
          beadsMetadata: { isBeadsTask: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      store.syncBeadsTasks(beadsTasks)

      expect(useBoardStore.getState().tasks).toHaveLength(2)
      expect(useBoardStore.getState().tasks[0].beadsMetadata?.isBeadsTask).toBe(true)
    })

    it('preserves local state when syncing beads tasks', () => {
      const store = useBoardStore.getState()

      // First sync
      const initialTasks: Task[] = [
        {
          id: 'beads-1',
          title: 'Beads Task',
          columnId: 'col-1',
          order: 0,
          priority: 'high',
          labels: [],
          beadsMetadata: { isBeadsTask: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      store.syncBeadsTasks(initialTasks)

      // Add local state
      store.addMessage('beads-1', {
        role: 'user',
        content: 'Local message',
        timestamp: new Date(),
      })

      store.updateTaskAgent('beads-1', {
        type: 'claude-code',
        status: 'running',
      })

      // Sync again with updated beads data
      const updatedTasks: Task[] = [
        {
          id: 'beads-1',
          title: 'Updated Beads Task',
          columnId: 'col-2',
          order: 0,
          priority: 'urgent',
          labels: ['updated'],
          beadsMetadata: { isBeadsTask: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      store.syncBeadsTasks(updatedTasks)

      const task = useBoardStore.getState().tasks.find((t) => t.id === 'beads-1')
      // Beads data should be updated
      expect(task?.title).toBe('Updated Beads Task')
      expect(task?.priority).toBe('urgent')
      // Local state should be preserved
      expect(task?.messages).toHaveLength(1)
      expect(task?.messages?.[0].content).toBe('Local message')
      expect(task?.agent?.type).toBe('claude-code')
    })

    it('keeps local tasks when syncing beads tasks', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      // Add a local task
      store.addTask({
        title: 'Local Task',
        columnId,
        order: 0,
        priority: 'medium',
        labels: [],
      })

      // Sync beads tasks
      const beadsTasks: Task[] = [
        {
          id: 'beads-1',
          title: 'Beads Task',
          columnId: 'col-1',
          order: 0,
          priority: 'high',
          labels: [],
          beadsMetadata: { isBeadsTask: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      store.syncBeadsTasks(beadsTasks)

      const tasks = useBoardStore.getState().tasks
      expect(tasks).toHaveLength(2)
      expect(tasks.some((t) => t.title === 'Local Task')).toBe(true)
      expect(tasks.some((t) => t.title === 'Beads Task')).toBe(true)
    })
  })

  describe('navigation', () => {
    it('selects issue by ID and returns position', () => {
      const store = useBoardStore.getState()
      const boardId = store.createBoard('Test Board')
      const board = useBoardStore.getState().boards.find((b) => b.id === boardId)!
      const columnId = board.columns[0].id

      store.addTask({ title: 'Task 1', columnId, order: 0, priority: 'medium', labels: [] })
      const taskId = store.addTask({
        title: 'Task 2',
        columnId,
        order: 1,
        priority: 'medium',
        labels: [],
      })
      store.addTask({ title: 'Task 3', columnId, order: 2, priority: 'medium', labels: [] })

      const result = store.selectIssueById(taskId)

      expect(result).not.toBeNull()
      expect(result?.columnId).toBe(columnId)
      expect(result?.index).toBe(1)
      expect(useBoardStore.getState().selectedTaskId).toBe(taskId)
    })

    it('returns null for non-existent task ID', () => {
      const store = useBoardStore.getState()

      const result = store.selectIssueById('non-existent-id')

      expect(result).toBeNull()
    })
  })
})
