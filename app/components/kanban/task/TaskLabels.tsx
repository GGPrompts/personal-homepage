"use client"

import { useState } from "react"
import { X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TaskLabelsProps {
  labels: string[]
  onChange: (labels: string[]) => void
  className?: string
}

const PRESET_LABELS = [
  "bug",
  "feature",
  "enhancement",
  "documentation",
  "refactor",
  "test",
  "urgent",
  "blocked",
  "ai-task",
]

const LABEL_COLORS: Record<string, string> = {
  bug: "bg-red-500/20 border-red-500/30 text-red-400",
  feature: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
  enhancement: "bg-blue-500/20 border-blue-500/30 text-blue-400",
  documentation: "bg-purple-500/20 border-purple-500/30 text-purple-400",
  refactor: "bg-orange-500/20 border-orange-500/30 text-orange-400",
  test: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400",
  urgent: "bg-red-600/30 border-red-600/40 text-red-300",
  blocked: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
  "ai-task": "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
}

export function TaskLabels({ labels, onChange, className }: TaskLabelsProps) {
  const [newLabel, setNewLabel] = useState("")
  const [showInput, setShowInput] = useState(false)

  const addLabel = (label: string) => {
    const trimmed = label.trim().toLowerCase()
    if (trimmed && !labels.includes(trimmed)) {
      onChange([...labels, trimmed])
    }
    setNewLabel("")
    setShowInput(false)
  }

  const removeLabel = (label: string) => {
    onChange(labels.filter((l) => l !== label))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addLabel(newLabel)
    } else if (e.key === "Escape") {
      setShowInput(false)
      setNewLabel("")
    }
  }

  const availablePresets = PRESET_LABELS.filter((l) => !labels.includes(l))

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current labels */}
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className={cn(
              "text-xs px-2 py-1 cursor-pointer group",
              LABEL_COLORS[label] || "bg-white/5 border-white/10 text-zinc-400"
            )}
            onClick={() => removeLabel(label)}
          >
            {label}
            <X className="h-3 w-3 ml-1 opacity-50 group-hover:opacity-100" />
          </Badge>
        ))}
        {!showInput && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
            onClick={() => setShowInput(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Add new label input */}
      {showInput && (
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type label name..."
            className="h-8 text-sm bg-black/20 border-white/10"
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => addLabel(newLabel)}
            disabled={!newLabel.trim()}
          >
            Add
          </Button>
        </div>
      )}

      {/* Preset labels */}
      {showInput && availablePresets.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {availablePresets.map((preset) => (
              <Badge
                key={preset}
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 cursor-pointer hover:opacity-80",
                  LABEL_COLORS[preset]
                )}
                onClick={() => addLabel(preset)}
              >
                {preset}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
