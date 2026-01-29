"use client"

import { Bot, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAgents } from "@/hooks/useAgents"

interface AgentSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function AgentSelector({
  value,
  onValueChange,
  disabled = false,
}: AgentSelectorProps) {
  const { agents, isLoading } = useAgents()

  // Find the selected agent from the registry
  const selectedAgent = agents.find((a) => a.id === value)

  // If value is set but not found in registry (legacy value), show fallback
  const displayValue = selectedAgent?.name || (value ? value : undefined)

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger
        className={cn(
          "w-[160px] glass-dark border-white/10",
          "focus:ring-emerald-500/50 focus:border-emerald-500/50",
          (disabled || isLoading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <SelectValue placeholder={isLoading ? "Loading..." : "Select agent"}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              <span className="text-zinc-400">Loading...</span>
            </div>
          ) : selectedAgent ? (
            <div className="flex items-center gap-2">
              <span className="text-base">{selectedAgent.avatar}</span>
              <span>{selectedAgent.name}</span>
            </div>
          ) : displayValue ? (
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-zinc-400" />
              <span>{displayValue}</span>
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="glass-dark border-white/10">
        {agents.length === 0 && !isLoading ? (
          <div className="px-2 py-4 text-center text-sm text-zinc-500">
            No agents configured
          </div>
        ) : (
          agents.map((agent) => (
            <SelectItem
              key={agent.id}
              value={agent.id}
              className="focus:bg-white/10"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{agent.avatar}</span>
                <span>{agent.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
