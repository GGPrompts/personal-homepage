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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Database, Package } from 'lucide-react'
import { useBeadsBan, BeadsBanColumnId, BEADSBAN_COLUMNS } from '../hooks/useBeadsBan'
import { GraphMetricsProvider } from '../contexts/GraphMetricsContext'
import { KanbanColumn } from './KanbanColumn'
import { TaskModal } from '../task/TaskModal'
import { PluginsSidebar } from '../shared/PluginsSidebar'
import { Task } from '../types'
import { cn } from '@/lib/utils'
import { useBoardStore } from '../lib/store'

export interface KanbanBoardProps {
  /** Workspace path for beads (project directory with .beads) */
  workspace?: string
}

export function KanbanBoard({ workspace }: KanbanBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [showPlugins, setShowPlugins] = useState(false)

  // Use the new BeadsBan hook
  const {
    columns,
    tasksByColumn,
    allTasks,
    isLoading,
    error,
    isAvailable,
    refresh,
    moveTask,
    hasTranscript,
    transcripts,
  } = useBeadsBan({
    workspace,
    refreshInterval: 30000,
  })

  // Get syncBeadsTasks from store for TaskModal compatibility
  const syncBeadsTasks = useBoardStore((state) => state.syncBeadsTasks)

  // Sync beads tasks to store so TaskModal can find them
  useEffect(() => {
    if (allTasks.length > 0) {
      syncBeadsTasks(allTasks)
    }
  }, [allTasks, syncBeadsTasks])

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
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    return rectIntersection(args)
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const task = allTasks.find((t) => t.id === active.id)
      if (task) {
        setActiveTask(task)
      }
    },
    [allTasks]
  )

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // No live updates during drag - we sync on drag end
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      setActiveTask(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      if (activeId === overId) return

      // Find the dragged task
      const draggedTask = allTasks.find((t) => t.id === activeId)
      if (!draggedTask) return

      // Determine target column
      let targetColumnId: BeadsBanColumnId | null = null

      // Check if dropped on a column directly
      const overColumn = columns.find((c) => c.id === overId)
      if (overColumn) {
        targetColumnId = overColumn.id
      } else {
        // Check if dropped on a task
        const overTask = allTasks.find((t) => t.id === overId)
        if (overTask) {
          targetColumnId = overTask.columnId as BeadsBanColumnId
        }
      }

      // Sync to beads if column changed
      if (targetColumnId && targetColumnId !== draggedTask.columnId) {
        await moveTask(activeId, targetColumnId)
      }
    },
    [allTasks, columns, moveTask]
  )

  // Show loading state during hydration
  if (!hasMounted) {
    return (
      <div className="flex-1 gradient-bg p-6 flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Loading board...</div>
      </div>
    )
  }

  // Show message if beads is not available
  if (!isAvailable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4 p-8">
        <Database className="h-12 w-12 text-zinc-600" />
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">Beads Not Available</h3>
          <p className="text-sm">
            This kanban board requires a beads workspace. Make sure you have the{' '}
            <code className="text-cyan-400">bd</code> CLI installed and a{' '}
            <code className="text-cyan-400">.beads</code> directory in your project.
          </p>
          {workspace && (
            <p className="text-xs text-zinc-500 mt-2">
              Workspace: {workspace}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex-1 relative flex flex-col"
    >
      {/* Header Bar */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Database className="w-3.5 h-3.5" />
          Beads Issues
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={() => refresh()}
          disabled={isLoading}
          data-tabz-action="refresh-board"
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all",
            "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        <div className="flex-1" />

        <div className="text-xs text-zinc-500 font-mono">
          {allTasks.length} issue{allTasks.length !== 1 ? 's' : ''}
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={() => setShowPlugins(!showPlugins)}
          data-tabz-action="toggle-plugins"
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all",
            showPlugins
              ? "text-teal-400 bg-teal-500/20"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
          )}
        >
          <Package className="w-3.5 h-3.5" />
          Plugins
        </button>
      </div>

      {/* Main board area with optional sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Board container */}
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
          <GraphMetricsProvider tasks={allTasks}>
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 h-full pb-4">
                {columns.map((column) => {
                  const tasks = tasksByColumn.get(column.id) ?? []
                  const isDoneColumn = column.id === 'done'

                  return (
                    <KanbanColumn
                      key={column.id}
                      column={{
                        id: column.id,
                        title: column.title,
                        color: column.color,
                        order: columns.indexOf(column),
                      }}
                      tasks={tasks}
                      isDoneColumn={isDoneColumn}
                      hasTranscript={hasTranscript}
                      description={column.description}
                      workspace={workspace}
                    />
                  )
                })}
              </div>

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
              </DragOverlay>
            </DndContext>
          </GraphMetricsProvider>

          {/* Task Detail Modal */}
          <TaskModal />
        </div>
        </div>

        {/* Plugins Sidebar */}
        {showPlugins && <PluginsSidebar />}
      </div>
    </motion.div>
  )
}
