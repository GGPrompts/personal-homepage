'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
  Activity,
  Cpu,
  Circle,
  Settings2,
} from 'lucide-react'
import { useBoardStore } from '../lib/store'
import { AgentType, AgentStatus, AGENT_META, AGENT_STATUS_META } from '../types'
import { cn } from '@/lib/utils'
import { BoardSettingsDialog } from './BoardSettingsDialog'

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

interface AgentSummary {
  type: AgentType
  count: number
  running: number
  idle: number
  failed: number
}

export function CommandBar() {
  const { tasks, getCurrentBoard } = useBoardStore()
  const board = getCurrentBoard()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Aggregate agent status across all tasks and columns
  const agentSummaries = useMemo(() => {
    const summaries: Record<AgentType, AgentSummary> = {} as Record<AgentType, AgentSummary>

    // Count agents from tasks
    tasks.forEach((task) => {
      if (task.agent) {
        const type = task.agent.type
        if (!summaries[type]) {
          summaries[type] = { type, count: 0, running: 0, idle: 0, failed: 0 }
        }
        summaries[type].count++
        if (task.agent.status === 'running') summaries[type].running++
        else if (task.agent.status === 'idle') summaries[type].idle++
        else if (task.agent.status === 'failed') summaries[type].failed++
      }
    })

    // Also count column-assigned agents
    board?.columns.forEach((col) => {
      if (col.assignedAgent && !summaries[col.assignedAgent]) {
        summaries[col.assignedAgent] = {
          type: col.assignedAgent,
          count: 0,
          running: 0,
          idle: 0,
          failed: 0,
        }
      }
    })

    return Object.values(summaries)
  }, [tasks, board])

  // Get total active agents
  const totalRunning = agentSummaries.reduce((sum, s) => sum + s.running, 0)
  const totalAgents = agentSummaries.reduce((sum, s) => sum + s.count, 0)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="command-bar px-4 py-2"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: System Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Cpu className="h-4 w-4 text-teal-400" />
                {totalRunning > 0 && (
                  <span className="absolute -top-1 -right-1 size-2 bg-emerald-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-xs font-medium text-zinc-400 display tracking-wider">
                ORCHESTRATOR
              </span>
            </div>

            <div className="h-4 w-px bg-zinc-700" />

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <Activity className={cn(
                "h-3.5 w-3.5",
                totalRunning > 0 ? "text-emerald-400" : "text-zinc-500"
              )} />
              <span className="text-xs mono text-zinc-500">
                {totalRunning > 0 ? (
                  <span className="text-emerald-400">{totalRunning} active</span>
                ) : (
                  'standby'
                )}
              </span>
            </div>
          </div>

          {/* Center: Agent Chips */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {agentSummaries.length === 0 ? (
              <span className="text-xs text-zinc-600 mono">No agents assigned</span>
            ) : (
              agentSummaries.map((summary) => (
                <AgentChip key={summary.type} summary={summary} />
              ))
            )}

            {/* Add more agents placeholder */}
            {agentSummaries.length > 0 && agentSummaries.length < 3 && (
              <button
                className="size-7 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 hover:border-teal-500/50 hover:text-teal-500 transition-colors"
                title="Assign agents to columns"
              >
                <Bot className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right: Quick Stats & Settings */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs mono">
              <span className="text-zinc-600">Tasks:</span>
              <span className="text-zinc-400">{tasks.length}</span>
            </div>

            <div className="h-4 w-px bg-zinc-700" />

            <div className="flex items-center gap-1.5 text-xs mono">
              <span className="text-zinc-600">Columns:</span>
              <span className="text-zinc-400">{board?.columns.length || 0}</span>
            </div>

            <div className="h-4 w-px bg-zinc-700" />

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Board settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      <BoardSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}

function AgentChip({ summary }: { summary: AgentSummary }) {
  const meta = AGENT_META[summary.type]
  const IconComponent = AGENT_ICONS[meta.icon] || Bot

  const tooltipText = `${meta.label}: ${summary.count} task${summary.count !== 1 ? 's' : ''}${summary.running > 0 ? `, ${summary.running} running` : ''}${summary.failed > 0 ? `, ${summary.failed} failed` : ''}`

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "agent-chip cursor-pointer",
        meta.bgColor,
        meta.borderColor,
        summary.running > 0 && "animate-pulse-glow"
      )}
      title={tooltipText}
    >
      <IconComponent className={cn("h-3.5 w-3.5", meta.color)} />
      <span className={cn("font-medium", meta.color)}>
        {meta.shortLabel}
      </span>

      {/* Status indicators */}
      <div className="flex items-center gap-1 ml-1">
        {summary.running > 0 && (
          <div className="flex items-center gap-0.5">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 status-running" />
            <span className="text-emerald-400">{summary.running}</span>
          </div>
        )}
        {summary.idle > 0 && summary.running === 0 && (
          <div className="flex items-center gap-0.5">
            <Circle className="h-2 w-2 fill-zinc-500 text-zinc-500" />
            <span className="text-zinc-500">{summary.idle}</span>
          </div>
        )}
        {summary.failed > 0 && (
          <div className="flex items-center gap-0.5">
            <Circle className="h-2 w-2 fill-red-500 text-red-500" />
            <span className="text-red-400">{summary.failed}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
