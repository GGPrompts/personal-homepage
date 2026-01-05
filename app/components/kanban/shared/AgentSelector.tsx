"use client"

import { Bot, Sparkles } from "lucide-react"
import type { AgentType } from "./types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface AgentSelectorProps {
  value?: AgentType
  onValueChange: (value: AgentType) => void
  disabled?: boolean
}

const AGENTS: { value: AgentType; label: string; icon: typeof Bot; color: string }[] = [
  { value: "claude-code", label: "Claude Code", icon: Sparkles, color: "text-emerald-400" },
  { value: "gemini-cli", label: "Gemini CLI", icon: Bot, color: "text-blue-400" },
  { value: "codex", label: "Codex", icon: Bot, color: "text-purple-400" },
  { value: "copilot", label: "Copilot", icon: Bot, color: "text-cyan-400" },
  { value: "amp", label: "Amp", icon: Bot, color: "text-orange-400" },
  { value: "cursor", label: "Cursor", icon: Bot, color: "text-pink-400" },
  { value: "custom", label: "Custom", icon: Bot, color: "text-zinc-400" },
]

export function AgentSelector({
  value,
  onValueChange,
  disabled = false,
}: AgentSelectorProps) {
  const selectedAgent = AGENTS.find((a) => a.value === value)

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "w-[160px] glass-dark border-white/10",
          "focus:ring-emerald-500/50 focus:border-emerald-500/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <SelectValue placeholder="Select agent">
          {selectedAgent && (
            <div className="flex items-center gap-2">
              <selectedAgent.icon className={cn("h-4 w-4", selectedAgent.color)} />
              <span>{selectedAgent.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="glass-dark border-white/10">
        {AGENTS.map((agent) => (
          <SelectItem
            key={agent.value}
            value={agent.value}
            className="focus:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <agent.icon className={cn("h-4 w-4", agent.color)} />
              <span>{agent.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
