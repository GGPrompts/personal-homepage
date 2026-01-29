'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronDown, FileText } from 'lucide-react'
import { Task } from '../types'
import { useBoardStore } from '../lib/store'

/**
 * Format relative time since a date (e.g., "just now", "5m ago", "2h ago")
 */
function formatTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  if (ms < 0) return 'just now'

  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${minutes}m ago`
}

type DateGroup = 'today' | 'thisWeek' | 'older'

interface GroupedTasks {
  today: Task[]
  thisWeek: Task[]
  older: Task[]
}

/**
 * Group tasks by date: Today, This Week, Older
 */
function groupTasksByDate(tasks: Task[]): GroupedTasks {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const groups: GroupedTasks = { today: [], thisWeek: [], older: [] }

  for (const task of tasks) {
    const closedAt = task.beadsMetadata?.closedAt ?? task.updatedAt
    if (!closedAt) {
      groups.older.push(task)
      continue
    }

    const closedDate = new Date(closedAt.getFullYear(), closedAt.getMonth(), closedAt.getDate())

    if (closedDate.getTime() >= today.getTime()) {
      groups.today.push(task)
    } else if (closedDate.getTime() >= weekAgo.getTime()) {
      groups.thisWeek.push(task)
    } else {
      groups.older.push(task)
    }
  }

  return groups
}

interface DoneListProps {
  tasks: Task[]
  /** Function to check if a task has a transcript */
  hasTranscript?: (taskId: string) => boolean
}

export function DoneList({ tasks, hasTranscript }: DoneListProps) {
  const setSelectedTask = useBoardStore((state) => state.setSelectedTask)

  // Expand state for each section - Today expanded by default
  const [expanded, setExpanded] = useState<Record<DateGroup, boolean>>({
    today: true,
    thisWeek: false,
    older: false,
  })

  const groupedTasks = useMemo(() => groupTasksByDate(tasks), [tasks])

  const toggleSection = (section: DateGroup) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId)
  }

  const sections: { key: DateGroup; label: string; tasks: Task[] }[] = [
    { key: 'today', label: 'Today', tasks: groupedTasks.today },
    { key: 'thisWeek', label: 'This Week', tasks: groupedTasks.thisWeek },
    { key: 'older', label: 'Older', tasks: groupedTasks.older },
  ]

  // Filter out empty sections
  const nonEmptySections = sections.filter((s) => s.tasks.length > 0)

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600 text-xs mono">
        <p>No completed issues</p>
      </div>
    )
  }

  return (
    <div className="p-2 pb-4 space-y-1">
      {nonEmptySections.map((section) => (
        <div key={section.key} className="mb-2">
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.key)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-zinc-800/50 transition-colors text-left group"
            aria-expanded={expanded[section.key]}
            aria-controls={`done-section-${section.key}`}
          >
            <motion.div
              initial={false}
              animate={{ rotate: expanded[section.key] ? 0 : -90 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-400" />
            </motion.div>
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300">
              {section.label}
            </span>
            <span className="text-[10px] text-zinc-600 mono">
              ({section.tasks.length})
            </span>
          </button>

          {/* Section Content */}
          <AnimatePresence initial={false}>
            {expanded[section.key] && (
              <motion.div
                id={`done-section-${section.key}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pl-2 space-y-0.5 mt-1">
                  {section.tasks.map((task) => (
                    <DoneListRow
                      key={task.id}
                      task={task}
                      hasTranscript={hasTranscript?.(task.id)}
                      onClick={() => handleTaskClick(task.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

interface DoneListRowProps {
  task: Task
  hasTranscript?: boolean
  onClick: () => void
}

function DoneListRow({ task, hasTranscript, onClick }: DoneListRowProps) {
  const closedAt = task.beadsMetadata?.closedAt ?? task.updatedAt
  const timeAgo = closedAt ? formatTimeAgo(closedAt) : null

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-zinc-800/50 transition-colors text-left group"
      data-tabz-item={`done-task-${task.id}`}
    >
      {/* Checkmark icon */}
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />

      {/* Title */}
      <span className="text-xs text-zinc-300 group-hover:text-zinc-100 truncate flex-1 min-w-0">
        {task.title}
      </span>

      {/* Transcript indicator */}
      {hasTranscript && (
        <FileText
          className="h-3 w-3 text-violet-400 shrink-0"
          aria-label="Has transcript"
        />
      )}

      {/* Time since closed */}
      {timeAgo && (
        <span className="text-[10px] text-zinc-500 mono shrink-0">{timeAgo}</span>
      )}
    </button>
  )
}
