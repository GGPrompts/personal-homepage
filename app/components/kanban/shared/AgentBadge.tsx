"use client"

import { Bot, Loader2, CheckCircle, XCircle, Pause, Sparkles } from "lucide-react"
import { AgentInfo, AgentStatus, AgentType } from "./types"
import { cn } from "@/lib/utils"

interface AgentBadgeProps {
  agent: AgentInfo
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
}

const AGENT_ICONS: Record<AgentType, typeof Bot> = {
  "claude-code": Sparkles,
  "gemini-cli": Bot,
  "codex": Bot,
  "copilot": Bot,
  "amp": Bot,
  "cursor": Bot,
  "custom": Bot,
}

const AGENT_COLORS: Record<AgentType, string> = {
  "claude-code": "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
  "gemini-cli": "text-blue-400 bg-blue-500/20 border-blue-500/30",
  "codex": "text-purple-400 bg-purple-500/20 border-purple-500/30",
  "copilot": "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
  "amp": "text-orange-400 bg-orange-500/20 border-orange-500/30",
  "cursor": "text-pink-400 bg-pink-500/20 border-pink-500/30",
  "custom": "text-zinc-400 bg-zinc-500/20 border-zinc-500/30",
}

const AGENT_LABELS: Record<AgentType, string> = {
  "claude-code": "Claude Code",
  "gemini-cli": "Gemini CLI",
  "codex": "Codex",
  "copilot": "Copilot",
  "amp": "Amp",
  "cursor": "Cursor",
  "custom": "Custom",
}

const STATUS_ICONS: Record<AgentStatus, typeof Bot> = {
  idle: Bot,
  running: Loader2,
  paused: Pause,
  completed: CheckCircle,
  failed: XCircle,
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "text-zinc-400",
  running: "text-emerald-400",
  paused: "text-yellow-400",
  completed: "text-green-400",
  failed: "text-red-400",
}

export function AgentBadge({
  agent,
  size = "md",
  showStatus = true,
}: AgentBadgeProps) {
  const AgentIcon = AGENT_ICONS[agent.type]
  const StatusIcon = STATUS_ICONS[agent.status]
  const isRunning = agent.status === "running"

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        sizeClasses[size],
        AGENT_COLORS[agent.type],
        isRunning && "terminal-glow"
      )}
    >
      <AgentIcon className={iconSizes[size]} />
      <span className="font-medium">{AGENT_LABELS[agent.type]}</span>
      {showStatus && (
        <StatusIcon
          className={cn(
            iconSizes[size],
            STATUS_COLORS[agent.status],
            isRunning && "animate-spin"
          )}
        />
      )}
    </div>
  )
}
