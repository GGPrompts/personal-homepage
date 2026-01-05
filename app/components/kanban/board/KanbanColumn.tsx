'use client'

import { useState } from 'react'
import { useDroppable, useDndContext } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
  Activity,
  MoreHorizontal,
  FileText,
  GripVertical,
  Filter,
  Settings2,
  Circle,
} from 'lucide-react'
import { Column, Task, AgentType, BeadsStatusType, AGENT_META } from '../types'
import { useBoardStore } from '../lib/store'
import { cn } from '@/lib/utils'
import { BEADS_STATUS_META } from '../lib/beads/mappers'
import { AddTaskButton } from './AddTaskButton'
import { KanbanCard } from './KanbanCard'
import { ColumnConfigDialog } from './ColumnConfigDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

// Icon mapping for agent types
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
}

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  /** Whether beads mode is active */
  beadsMode?: boolean
  /** The beads status this column maps to */
  beadsStatus?: BeadsStatusType
  /** Other columns that share the same beads status (for grouping indicator) */
  groupedColumns?: Column[]
}

export function KanbanColumn({
  column,
  tasks,
  beadsMode,
  beadsStatus,
  groupedColumns,
}: KanbanColumnProps) {
  // Sortable for column reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  // Droppable for receiving tasks
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  // Check if we're dragging a task (not a column)
  const { active } = useDndContext()
  const isDraggingTask = active?.data.current?.type !== 'column'
  const showDropIndicator = isOver && isDraggingTask

  const { updateColumn, getCurrentBoard } = useBoardStore()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const board = getCurrentBoard()
  const [configOpen, setConfigOpen] = useState(false)

  const taskIds = tasks.map((task) => task.id)

  // Get agent info for this column
  const assignedAgent = column.assignedAgent
  const agentMeta = assignedAgent ? AGENT_META[assignedAgent] : null
  const AgentIcon = agentMeta ? AGENT_ICONS[agentMeta.icon] || Bot : null

  // Count running tasks in this column
  const runningTasks = tasks.filter((t) => t.agent?.status === 'running').length

  // Beads status metadata
  const beadsStatusMeta = beadsStatus ? BEADS_STATUS_META[beadsStatus] : null

  // Get the accent color based on assigned agent or column color
  const accentColor = agentMeta
    ? `hsl(var(--agent-${assignedAgent === 'claude-code' ? 'claude' : assignedAgent}))`
    : undefined

  const handleAssignAgent = (agentType: AgentType | null) => {
    if (!board) return
    updateColumn(board.id, column.id, {
      assignedAgent: agentType ?? undefined,
    })
  }

  return (
    <>
      <motion.div
        ref={setSortableRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "agent-station shrink-0",
          isDragging && "z-50 shadow-2xl"
        )}
        style={{
          '--station-accent': accentColor,
          ...style,
        } as React.CSSProperties}
      >
        {/* Station Header */}
        <div className="station-header">
          <div className="flex items-center justify-between gap-2">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1 -ml-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing transition-colors"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Left: Agent Badge + Title */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* Agent Avatar/Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center transition-all",
                      "border hover:scale-105",
                      agentMeta
                        ? cn(agentMeta.bgColor, agentMeta.borderColor)
                        : "border-dashed border-zinc-700 hover:border-teal-500/50"
                    )}
                  >
                    {AgentIcon ? (
                      <AgentIcon className={cn("h-4 w-4", agentMeta?.color)} />
                    ) : (
                      <Bot className="h-4 w-4 text-zinc-600" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="glass-overlay w-48">
                  <DropdownMenuLabel className="text-xs text-zinc-500">
                    Assign Agent to Step
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(AGENT_META) as AgentType[]).map((type) => {
                    const meta = AGENT_META[type]
                    const Icon = AGENT_ICONS[meta.icon] || Bot
                    return (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => handleAssignAgent(type)}
                        className={cn(
                          "gap-2 cursor-pointer",
                          column.assignedAgent === type && "bg-zinc-800"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", meta.color)} />
                        <span>{meta.label}</span>
                        {column.assignedAgent === type && (
                          <Circle className="h-2 w-2 fill-teal-500 text-teal-500 ml-auto" />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleAssignAgent(null)}
                    className="gap-2 cursor-pointer text-zinc-500"
                  >
                    <Bot className="h-4 w-4" />
                    <span>No Agent</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Column Title */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-100 terminal-glow truncate text-sm">
                  {column.title}
                </h3>
                {agentMeta && (
                  <p className={cn("text-[10px] truncate", agentMeta.color)}>
                    {agentMeta.label}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-2">
              {/* Running indicator */}
              {runningTasks > 0 && (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30"
                  title={`${runningTasks} agent${runningTasks !== 1 ? 's' : ''} running`}
                >
                  <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-400">
                    {runningTasks}
                  </span>
                </div>
              )}

              {/* Beads status badge */}
              {beadsMode && beadsStatusMeta && (
                <div
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                    beadsStatusMeta.bgColor,
                    beadsStatusMeta.color,
                    "border",
                    beadsStatusMeta.borderColor
                  )}
                  title={`${beadsStatusMeta.label}: ${beadsStatusMeta.description}${groupedColumns && groupedColumns.length > 0 ? ` (Same as: ${groupedColumns.map((c) => c.title).join(', ')})` : ''}`}
                >
                  <span>{beadsStatusMeta.shortLabel}</span>
                  {groupedColumns && groupedColumns.length > 0 && (
                    <span className="opacity-60">+{groupedColumns.length}</span>
                  )}
                </div>
              )}

              {/* Task count */}
              <span
                className="text-xs text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full mono"
                suppressHydrationWarning
              >
                {tasks.length}
                {column.wipLimit && (
                  <span className="text-zinc-600">/{column.wipLimit}</span>
                )}
              </span>

              {/* BQL filter indicator */}
              {column.isDynamic && column.bqlQuery && (
                <div
                  className="p-1 rounded bg-teal-500/20 border border-teal-500/30"
                  title={`BQL Filter: ${column.bqlQuery}`}
                >
                  <Filter className="h-3 w-3 text-teal-400" />
                </div>
              )}

              {/* Prompt indicator */}
              {column.agentConfig?.systemPrompt && (
                <div
                  className="p-1 rounded bg-violet-500/20 border border-violet-500/30"
                  title={`Step Prompt: ${column.agentConfig.systemPrompt.slice(0, 100)}...`}
                >
                  <FileText className="h-3 w-3 text-violet-400" />
                </div>
              )}

              {/* Column menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-overlay">
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setConfigOpen(true)}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span>Configure Step</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Agent Activity Preview (when agent is running) */}
          <AnimatePresence>
            {runningTasks > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 pt-2 border-t border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] mono text-zinc-500 truncate">
                    Processing tasks...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Droppable Task Area */}
        <div
          ref={setDroppableRef}
          className={cn(
            'flex-1 min-h-0 flex flex-col transition-all duration-200 relative',
            showDropIndicator && 'bg-teal-500/5'
          )}
        >
          {/* Drop indicator */}
          <AnimatePresence>
            {showDropIndicator && (
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
              <div className="p-2 pb-16 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs mono">
                    {agentMeta && AgentIcon ? (
                      <div className="space-y-2">
                        <AgentIcon className={cn("h-8 w-8 mx-auto opacity-30", agentMeta.color)} />
                        <p>Drop tasks for {agentMeta.shortLabel}</p>
                      </div>
                    ) : (
                      <p>Drop tasks here</p>
                    )}
                  </div>
                ) : (
                  tasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      columnAgent={assignedAgent}
                      isDoneColumn={column.title.toLowerCase() === 'done'}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </div>
        </div>

        {/* Add Task Button */}
        <div className="shrink-0 relative z-10 border-t border-zinc-800/50 bg-zinc-900/50">
          <AddTaskButton columnId={column.id} />
        </div>
      </motion.div>

      {/* Column Configuration Dialog */}
      <ColumnConfigDialog
        column={column}
        open={configOpen}
        onOpenChange={setConfigOpen}
      />
    </>
  )
}
