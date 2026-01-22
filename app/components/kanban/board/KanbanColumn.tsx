'use client'

import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, ChevronDown } from 'lucide-react'
import { Column, Task } from '../types'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Number of items to show initially in Done column for performance */
const DONE_COLUMN_INITIAL_ITEMS = 20
/** Number of items to load when clicking "Show more" */
const DONE_COLUMN_LOAD_MORE_COUNT = 30

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  /** Whether this is the Done column (for closed tasks) */
  isDoneColumn?: boolean
  /** Function to check if a task has a transcript */
  hasTranscript?: (taskId: string) => boolean
  /** Column description for tooltip */
  description?: string
}

export function KanbanColumn({
  column,
  tasks,
  isDoneColumn = false,
  hasTranscript,
  description,
}: KanbanColumnProps) {
  // Droppable for receiving tasks
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  // Performance optimization: limit visible items in Done column
  const [visibleCount, setVisibleCount] = useState(DONE_COLUMN_INITIAL_ITEMS)

  // Determine which tasks to render (all for normal columns, limited for Done)
  const { visibleTasks, hasMore, hiddenCount } = useMemo(() => {
    if (!isDoneColumn || tasks.length <= DONE_COLUMN_INITIAL_ITEMS) {
      return { visibleTasks: tasks, hasMore: false, hiddenCount: 0 }
    }
    const visible = tasks.slice(0, visibleCount)
    return {
      visibleTasks: visible,
      hasMore: visibleCount < tasks.length,
      hiddenCount: tasks.length - visibleCount,
    }
  }, [tasks, visibleCount, isDoneColumn])

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + DONE_COLUMN_LOAD_MORE_COUNT, tasks.length))
  }

  const taskIds = visibleTasks.map((task) => task.id)

  // Column color indicator (extract color from class)
  const colorClass = column.color || 'border-t-zinc-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="agent-station shrink-0"
      data-tabz-column={column.id}
    >
      {/* Column Header */}
      <div className={cn("station-header border-t-2", colorClass)}>
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-100 terminal-glow truncate text-sm">
              {column.title}
            </h3>
            {description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-0.5 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Right: Task count */}
          <span
            className="text-xs text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full mono"
            suppressHydrationWarning
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Droppable Task Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-0 flex flex-col transition-all duration-200 relative',
          isOver && 'bg-teal-500/5'
        )}
      >
        {/* Drop indicator */}
        <AnimatePresence>
          {isOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 border-2 border-dashed border-teal-500/30 rounded-lg pointer-events-none z-10"
            />
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-visible">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="p-2 pb-4 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-xs mono">
                  <p>No issues</p>
                </div>
              ) : (
                <>
                  {visibleTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      isDoneColumn={isDoneColumn}
                      hasTranscript={hasTranscript?.(task.id)}
                    />
                  ))}
                  {/* Show more button for Done column with many items */}
                  {isDoneColumn && hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShowMore}
                      className="w-full mt-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show {Math.min(DONE_COLUMN_LOAD_MORE_COUNT, hiddenCount)} more
                      <span className="ml-1 text-zinc-600">({hiddenCount} hidden)</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </motion.div>
  )
}
