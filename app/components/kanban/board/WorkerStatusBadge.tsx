'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Clock,
  Cpu,
  Pause,
  Terminal,
  Wrench,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkerState } from '../hooks/useWorkerStatus'

/**
 * Tool icons mapping
 */
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Bash: Terminal,
  Read: Cpu,
  Edit: Wrench,
  Write: Wrench,
  Grep: Cpu,
  Glob: Cpu,
  Task: Activity,
}

/**
 * Status configuration
 */
const STATUS_CONFIG = {
  idle: {
    label: 'Idle',
    icon: Pause,
    color: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    dotColor: 'bg-blue-400',
    animate: false,
  },
  tool_use: {
    label: 'Working',
    icon: Activity,
    color: 'bg-green-500/15 border-green-500/30 text-green-400',
    dotColor: 'bg-green-400',
    animate: true,
  },
  awaiting_input: {
    label: 'Waiting',
    icon: Clock,
    color: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    dotColor: 'bg-amber-400',
    animate: true,
  },
  unknown: {
    label: 'Unknown',
    icon: HelpCircle,
    color: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400',
    dotColor: 'bg-zinc-400',
    animate: false,
  },
} as const

/**
 * Get context percentage color
 */
function getContextColor(percent: number | undefined): string {
  if (percent === undefined) return 'text-zinc-500'
  if (percent >= 80) return 'text-red-400'
  if (percent >= 60) return 'text-amber-400'
  if (percent >= 40) return 'text-yellow-400'
  return 'text-green-400'
}

interface WorkerStatusBadgeProps {
  worker: WorkerState
  /** Compact mode - just dot indicator */
  compact?: boolean
  /** Show tooltip on hover */
  showTooltip?: boolean
}

/**
 * Badge showing live worker status for a kanban card
 */
export function WorkerStatusBadge({
  worker,
  compact = false,
  showTooltip = true,
}: WorkerStatusBadgeProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const statusConfig = STATUS_CONFIG[worker.status] ?? STATUS_CONFIG.unknown
  const StatusIcon = statusConfig.icon
  const ToolIcon = worker.current_tool ? TOOL_ICONS[worker.current_tool] : null

  // Format last updated time
  const lastUpdatedStr = React.useMemo(() => {
    if (!worker.last_updated) return 'Unknown'
    const updated = new Date(worker.last_updated)
    const now = new Date()
    const diffMs = now.getTime() - updated.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    return updated.toLocaleTimeString()
  }, [worker.last_updated])

  // Compact mode - just a pulsing dot
  if (compact) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)}
          animate={
            statusConfig.animate
              ? {
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }
              : undefined
          }
          transition={
            statusConfig.animate
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : undefined
          }
        />

        {/* Tooltip */}
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 shadow-lg whitespace-nowrap">
              <div className="text-[10px] text-zinc-300 font-medium">
                {statusConfig.label}
                {worker.current_tool && ` - ${worker.current_tool}`}
              </div>
              {worker.contextPercent !== undefined && (
                <div
                  className={cn(
                    'text-[10px] mono',
                    getContextColor(worker.contextPercent)
                  )}
                >
                  Context: {worker.contextPercent}%
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  // Full badge
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-1.5 px-1.5 py-0.5 rounded border',
        statusConfig.color
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated status dot */}
      <motion.div
        className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)}
        animate={
          statusConfig.animate
            ? {
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1],
              }
            : undefined
        }
        transition={
          statusConfig.animate
            ? {
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
      />

      {/* Status/Tool info */}
      <div className="flex items-center gap-1">
        {ToolIcon ? (
          <ToolIcon className="h-3 w-3" />
        ) : (
          <StatusIcon className="h-3 w-3" />
        )}
        <span className="text-[10px] font-medium mono">
          {worker.current_tool ?? statusConfig.label}
        </span>
      </div>

      {/* Context percentage */}
      {worker.contextPercent !== undefined && (
        <span
          className={cn(
            'text-[10px] font-medium mono ml-0.5',
            getContextColor(worker.contextPercent)
          )}
        >
          {worker.contextPercent}%
        </span>
      )}

      {/* Expanded tooltip on hover */}
      {showTooltip && isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-1 z-50"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-2 shadow-lg min-w-[160px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Status</span>
                <span className="text-zinc-200 font-medium">
                  {statusConfig.label}
                </span>
              </div>

              {worker.current_tool && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Tool</span>
                  <span className="text-zinc-200 font-medium mono">
                    {worker.current_tool}
                  </span>
                </div>
              )}

              {worker.contextPercent !== undefined && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Context</span>
                  <span
                    className={cn(
                      'font-medium mono',
                      getContextColor(worker.contextPercent)
                    )}
                  >
                    {worker.contextPercent}%
                  </span>
                </div>
              )}

              {worker.subagent_count > 0 && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Subagents</span>
                  <span className="text-zinc-200 font-medium mono">
                    {worker.subagent_count}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800">
                <span className="text-zinc-500">Updated</span>
                <span className="text-zinc-400 mono">{lastUpdatedStr}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
