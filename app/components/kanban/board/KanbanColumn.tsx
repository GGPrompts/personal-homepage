'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Info } from 'lucide-react'
import { Column, Task } from '../types'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import { DoneList } from './DoneList'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  /** Whether this is the Done column (for closed tasks) */
  isDoneColumn?: boolean
  /** Function to check if a task has a transcript */
  hasTranscript?: (taskId: string) => boolean
  /** Column description for tooltip */
  description?: string
  /** Workspace path for beads API calls */
  workspace?: string
}

export function KanbanColumn({
  column,
  tasks,
  isDoneColumn = false,
  hasTranscript,
  description,
  workspace,
}: KanbanColumnProps) {
  // Droppable for receiving tasks
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  const taskIds = tasks.map((task) => task.id)

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
            {isDoneColumn ? (
              <DoneList tasks={tasks} hasTranscript={hasTranscript} />
            ) : (
              <div className="p-2 pb-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs mono">
                    <p>No issues</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      isDoneColumn={isDoneColumn}
                      hasTranscript={hasTranscript?.(task.id)}
                      workspace={workspace}
                    />
                  ))
                )}
              </div>
            )}
          </SortableContext>
        </div>
      </div>
    </motion.div>
  )
}
