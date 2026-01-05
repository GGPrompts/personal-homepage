'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
  rectIntersection,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Database, HardDrive, RefreshCw, AlertCircle, Columns3, LayoutGrid } from 'lucide-react'
import { useBoardStore } from '../lib/store'
import { useBeadsIssues, useBeadsAvailable } from '../hooks/useBeadsIssues'
import { GraphMetricsProvider } from '../contexts/GraphMetricsContext'
import { KanbanColumn } from './KanbanColumn'
import { AddColumnButton } from './AddColumnButton'
import { TaskModal } from '../task/TaskModal'
import { Task, Column, BeadsStatusType } from '../types'
import { cn } from '@/lib/utils'
import { compileQuery, filterItems } from '../lib/bql'
import { getColumnBeadsStatus } from '../lib/beads/mappers'

export interface KanbanBoardProps {
  /** Use beads as data source instead of local state */
  useBeadsSource?: boolean
  /** Callback when beads mode changes */
  onBeadsModeChange?: (enabled: boolean) => void
}

// localStorage keys for persisting board preferences
const STORAGE_KEY_BEADS_MODE = 'kanban-beads-mode'
const STORAGE_KEY_SIMPLIFIED_MODE = 'kanban-beads-simplified'

// Helper to safely read from localStorage (SSR-safe)
function getStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return fallback
    return stored === 'true'
  } catch {
    return fallback
  }
}

export function KanbanBoard({ useBeadsSource = false, onBeadsModeChange }: KanbanBoardProps) {
  const { getCurrentBoard, tasks: localTasks, moveTask, reorderTasks, reorderColumns, getTasksByColumn } = useBoardStore()
  const board = getCurrentBoard()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [beadsMode, setBeadsMode] = useState(useBeadsSource)
  const [beadsSimplifiedMode, setBeadsSimplifiedMode] = useState(false)

  // Load persisted preferences after mount (SSR-safe)
  useEffect(() => {
    const storedBeadsMode = getStoredBoolean(STORAGE_KEY_BEADS_MODE, useBeadsSource)
    const storedSimplifiedMode = getStoredBoolean(STORAGE_KEY_SIMPLIFIED_MODE, false)
    setBeadsMode(storedBeadsMode)
    setBeadsSimplifiedMode(storedSimplifiedMode)
  }, [useBeadsSource])

  // Persist beadsMode changes
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem(STORAGE_KEY_BEADS_MODE, String(beadsMode))
    }
  }, [beadsMode, hasMounted])

  // Persist beadsSimplifiedMode changes
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem(STORAGE_KEY_SIMPLIFIED_MODE, String(beadsSimplifiedMode))
    }
  }, [beadsSimplifiedMode, hasMounted])

  // Check if beads CLI is available
  const beadsAvailable = useBeadsAvailable()

  // Fetch beads issues when in beads mode
  const {
    tasksByColumn: beadsTasksByColumn,
    isLoading: beadsLoading,
    error: beadsError,
    refresh: refreshBeads,
    syncTaskColumn,
  } = useBeadsIssues({
    columns: board?.columns ?? [],
    enabled: beadsMode && beadsAvailable,
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  // Get tasks for a column - either from beads or local store
  // Supports BQL dynamic filtering for columns with bqlQuery
  const getEffectiveTasksByColumn = useCallback(
    (column: Column): Task[] => {
      // If column has BQL dynamic filter, apply it to all tasks
      if (column.isDynamic && column.bqlQuery?.trim()) {
        const allTasks = beadsMode && beadsAvailable
          ? Array.from(beadsTasksByColumn.values()).flat()
          : localTasks

        const filter = compileQuery(column.bqlQuery)
        if (filter.isValid && filter.ast) {
          return filterItems(allTasks, filter).sort((a, b) => a.order - b.order)
        }
      }

      // Otherwise, return tasks assigned to this column
      if (beadsMode && beadsAvailable) {
        return beadsTasksByColumn.get(column.id) ?? []
      }
      return getTasksByColumn(column.id)
    },
    [beadsMode, beadsAvailable, beadsTasksByColumn, getTasksByColumn, localTasks]
  )

  // All tasks for drag handling
  const tasks = useMemo(() => {
    if (beadsMode && beadsAvailable) {
      return Array.from(beadsTasksByColumn.values()).flat()
    }
    return localTasks
  }, [beadsMode, beadsAvailable, beadsTasksByColumn, localTasks])

  // Get syncBeadsTasks from store
  const syncBeadsTasks = useBoardStore((state) => state.syncBeadsTasks)

  // Sync beads tasks to store so TaskModal can find them
  // Use beadsTasksByColumn directly to avoid loop (tasks memo depends on localTasks which changes on sync)
  const beadsTasksFlat = useMemo(() => {
    if (beadsMode && beadsAvailable) {
      return Array.from(beadsTasksByColumn.values()).flat()
    }
    return []
  }, [beadsMode, beadsAvailable, beadsTasksByColumn])

  useEffect(() => {
    if (beadsTasksFlat.length > 0) {
      syncBeadsTasks(beadsTasksFlat)
    }
  }, [beadsTasksFlat, syncBeadsTasks])

  // Toggle beads mode
  const toggleBeadsMode = useCallback(() => {
    const newMode = !beadsMode
    setBeadsMode(newMode)
    onBeadsModeChange?.(newMode)
    // Reset simplified mode when leaving beads mode
    if (!newMode) {
      setBeadsSimplifiedMode(false)
    }
  }, [beadsMode, onBeadsModeChange])

  // Toggle simplified beads mode (hide redundant columns)
  const toggleSimplifiedMode = useCallback(() => {
    setBeadsSimplifiedMode((prev) => !prev)
  }, [])

  // Get visible columns in simplified mode - one column per beads status
  const getVisibleColumns = useCallback((columns: Column[]): Column[] => {
    if (!beadsMode || !beadsSimplifiedMode) {
      return columns
    }

    // In simplified mode, show only one column per beads status (the first one by order)
    const seen = new Set<BeadsStatusType>()
    const visible: Column[] = []

    // Sort by order first
    const sorted = [...columns].sort((a, b) => a.order - b.order)

    for (const column of sorted) {
      const status = getColumnBeadsStatus(column)
      // Also respect explicit isHiddenInBeadsMode flag
      if (column.isHiddenInBeadsMode) continue
      if (!seen.has(status)) {
        seen.add(status)
        visible.push(column)
      }
    }

    return visible
  }, [beadsMode, beadsSimplifiedMode])

  // Get columns that are grouped with a given column (same beads status)
  const getGroupedColumns = useCallback((column: Column): Column[] => {
    if (!board || !beadsMode) return []
    const status = getColumnBeadsStatus(column)
    return board.columns.filter((c) => c.id !== column.id && getColumnBeadsStatus(c) === status)
  }, [board, beadsMode])

  // Wait for hydration to complete before rendering dynamic content
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Check scroll position for navigation buttons
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollButtons()
    container.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)

    return () => {
      container.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [updateScrollButtons, hasMounted])

  // Scroll by one column width
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return
    const scrollAmount = 360 // column width + gap
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Custom collision detection: use pointer position for better UX
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First check pointer-based collisions (mouse position)
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    // Fall back to rect intersection for edge cases
    return rectIntersection(args)
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const activeData = active.data.current

      // Check if dragging a column
      if (activeData?.type === 'column') {
        setActiveColumn(activeData.column)
        setActiveTask(null)
        return
      }

      // Otherwise it's a task
      const task = tasks.find((t) => t.id === active.id)
      if (task) {
        setActiveTask(task)
        setActiveColumn(null)
      }
    },
    [tasks]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeData = active.data.current

      // Skip if dragging a column (handled in dragEnd)
      if (activeData?.type === 'column') return

      // Skip live updates in beads mode - we'll sync on drag end
      if (beadsMode && beadsAvailable) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeTask = tasks.find((t) => t.id === activeId)
      if (!activeTask) return

      // Check if dropping over a column
      const overColumn = board?.columns.find((c) => c.id === overId)
      if (overColumn && activeTask.columnId !== overId) {
        const tasksInColumn = getTasksByColumn(overId)
        moveTask(activeId, overId, tasksInColumn.length)
        return
      }

      // Check if dropping over another task
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask && activeTask.columnId !== overTask.columnId) {
        const tasksInColumn = getTasksByColumn(overTask.columnId)
        const overIndex = tasksInColumn.findIndex((t) => t.id === overId)
        moveTask(activeId, overTask.columnId, overIndex)
      }
    },
    [tasks, board, getTasksByColumn, moveTask, beadsMode, beadsAvailable]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      const activeData = active.data.current

      setActiveTask(null)
      setActiveColumn(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      if (activeId === overId) return

      // Handle column reordering (not synced to beads)
      if (activeData?.type === 'column' && board) {
        const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order)
        const oldIndex = sortedColumns.findIndex((c) => c.id === activeId)
        const newIndex = sortedColumns.findIndex((c) => c.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newColumnIds = sortedColumns.map((c) => c.id)
          newColumnIds.splice(oldIndex, 1)
          newColumnIds.splice(newIndex, 0, activeId)
          reorderColumns(board.id, newColumnIds)
        }
        return
      }

      // Handle task movement in beads mode
      if (beadsMode && beadsAvailable && board) {
        const draggedTask = tasks.find((t) => t.id === activeId)
        if (!draggedTask) return

        // Determine target column
        let targetColumnId: string | null = null

        // Check if dropped on a column directly
        const overColumn = board.columns.find((c) => c.id === overId)
        if (overColumn) {
          targetColumnId = overColumn.id
        } else {
          // Check if dropped on a task
          const overTask = tasks.find((t) => t.id === overId)
          if (overTask) {
            targetColumnId = overTask.columnId
          }
        }

        // Sync to beads if column changed
        if (targetColumnId && targetColumnId !== draggedTask.columnId) {
          const targetColumn = board.columns.find((c) => c.id === targetColumnId)
          if (targetColumn) {
            await syncTaskColumn(activeId, targetColumn)
          }
        }
        return
      }

      // Handle task reordering (local mode)
      const activeTask = tasks.find((t) => t.id === activeId)
      const overTask = tasks.find((t) => t.id === overId)

      if (activeTask && overTask && activeTask.columnId === overTask.columnId) {
        // Reorder within the same column
        const columnTasks = getTasksByColumn(activeTask.columnId)
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)

        if (oldIndex !== newIndex) {
          const newTaskIds = [...columnTasks.map((t) => t.id)]
          newTaskIds.splice(oldIndex, 1)
          newTaskIds.splice(newIndex, 0, activeId)
          reorderTasks(activeTask.columnId, newTaskIds)
        }
      }
    },
    [tasks, board, getTasksByColumn, reorderTasks, reorderColumns, beadsMode, beadsAvailable, syncTaskColumn]
  )

  // Show loading state during hydration to prevent mismatch
  if (!hasMounted) {
    return (
      <div className="flex-1 gradient-bg p-6 flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Loading board...</div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/50">
        <p>No board selected</p>
      </div>
    )
  }

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order)
  const visibleColumns = getVisibleColumns(sortedColumns)
  const columnIds = visibleColumns.map((c) => c.id)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex-1 relative flex flex-col"
    >
      {/* Beads Mode Toggle Bar */}
      {beadsAvailable && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-zinc-800/50">
            <button
              onClick={toggleBeadsMode}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                beadsMode
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-300"
              )}
            >
              {beadsMode ? (
                <Database className="w-3.5 h-3.5" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              {beadsMode ? 'Beads Issues' : 'Local Tasks'}
            </button>

            {beadsMode && (
              <>
                {/* Simplified/Full mode toggle */}
                <button
                  onClick={toggleSimplifiedMode}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                    beadsSimplifiedMode
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-300"
                  )}
                  title={beadsSimplifiedMode
                    ? 'Showing one column per beads status. Click to show all columns.'
                    : 'Multiple columns map to the same beads status. Click to simplify.'}
                >
                  {beadsSimplifiedMode ? (
                    <Columns3 className="w-3.5 h-3.5" />
                  ) : (
                    <LayoutGrid className="w-3.5 h-3.5" />
                  )}
                  {beadsSimplifiedMode ? 'Simplified' : 'Full Board'}
                </button>

                <div className="h-4 w-px bg-zinc-700" />

                <button
                  onClick={() => refreshBeads()}
                  disabled={beadsLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all",
                    "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50",
                    beadsLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", beadsLoading && "animate-spin")} />
                  Refresh
                </button>

                {beadsError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {beadsError}
                  </div>
                )}
              </>
            )}
        </div>
      )}

      {/* Main board area */}
      <div className="flex-1 relative overflow-hidden">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-20",
            "size-10 rounded-full glass-dark border border-zinc-700",
            "flex items-center justify-center",
            "text-zinc-400 hover:text-zinc-200 hover:border-teal-500/50",
            "transition-all hover:scale-105 shadow-lg"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20",
            "size-10 rounded-full glass-dark border border-zinc-700",
            "flex items-center justify-center",
            "text-zinc-400 hover:text-zinc-200 hover:border-teal-500/50",
            "transition-all hover:scale-105 shadow-lg"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Scrollable Board Area */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-x-auto overflow-y-hidden px-6 py-4 scrollbar-visible"
      >
        <GraphMetricsProvider tasks={tasks}>
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 h-full pb-4">
                {visibleColumns.map((column) => {
                  // In simplified mode, don't show grouped columns badge (they're hidden)
                  const groupedWith = beadsSimplifiedMode ? [] : getGroupedColumns(column)
                  const beadsStatus = beadsMode ? getColumnBeadsStatus(column) : undefined

                  return (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      tasks={getEffectiveTasksByColumn(column)}
                      beadsMode={beadsMode}
                      beadsStatus={beadsStatus}
                      groupedColumns={beadsMode && groupedWith.length > 0 ? groupedWith : undefined}
                    />
                  )
                })}

                {/* Add Column Button */}
                <AddColumnButton />
              </div>
            </SortableContext>

            <DragOverlay>
            {activeTask && (
              <div className="kanban-card p-3 rounded-lg opacity-90 rotate-3 scale-105">
                <h4 className="text-sm font-medium text-white">{activeTask.title}</h4>
                {activeTask.description && (
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">
                    {activeTask.description}
                  </p>
                )}
              </div>
            )}
            {activeColumn && (
              <div className="agent-station w-80 opacity-90 rotate-1 scale-[1.02] shadow-2xl">
                <div className="station-header">
                  <h3 className="font-semibold text-zinc-100 text-sm">
                    {activeColumn.title}
                  </h3>
                </div>
              </div>
            )}
            </DragOverlay>
          </DndContext>
        </GraphMetricsProvider>

        {/* Task Detail Modal */}
        <TaskModal />
      </div>
      </div>
    </motion.div>
  )
}
