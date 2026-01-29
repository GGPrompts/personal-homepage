"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, FileText, Tag, AlertTriangle, Clock, GitBranch, Gem } from "lucide-react"
import type { Task } from "../types"
import { PriorityBadge } from "../shared/PriorityBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isBeadsTask } from "../lib/beads/mappers"

interface IssueSummaryProps {
  task: Task
  className?: string
  defaultExpanded?: boolean
}

/**
 * Collapsible issue summary for displaying task context in the chat view.
 * Shows title, description, priority, labels, and other metadata.
 */
export function IssueSummary({ task, className, defaultExpanded = true }: IssueSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const taskIsFromBeads = isBeadsTask(task)

  // Calculate if we need to truncate description
  const maxDescriptionLength = 300
  const hasLongDescription = task.description && task.description.length > maxDescriptionLength
  const [showFullDescription, setShowFullDescription] = useState(false)

  const displayDescription = hasLongDescription && !showFullDescription
    ? task.description?.slice(0, maxDescriptionLength) + "..."
    : task.description

  return (
    <div className={cn("border-b border-white/10 bg-black/20", className)}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="text-sm font-medium text-zinc-300 truncate">
            Issue Context
          </span>
          {taskIsFromBeads && (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono px-1.5 py-0 shrink-0"
            >
              <Gem className="h-2.5 w-2.5 mr-1" />
              {task.id}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PriorityBadge priority={task.priority} size="sm" />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Title */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-100">
              {task.title}
            </h3>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                {displayDescription}
              </p>
              {hasLongDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullDescription(!showFullDescription)
                  }}
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {/* Git branch */}
            {task.git?.branch && (
              <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded">
                <GitBranch className="h-3 w-3" />
                <span className="font-mono truncate max-w-[120px]">{task.git.branch}</span>
              </div>
            )}

            {/* Estimate */}
            {task.estimate && (
              <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded">
                <Clock className="h-3 w-3" />
                <span>{task.estimate}</span>
              </div>
            )}

            {/* Blocked indicator */}
            {task.blockedBy && task.blockedBy.length > 0 && (
              <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-1 rounded">
                <AlertTriangle className="h-3 w-3" />
                <span>Blocked by {task.blockedBy.length}</span>
              </div>
            )}
          </div>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3 w-3 text-zinc-500" />
              {task.labels.map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-zinc-400 text-[10px] px-1.5 py-0"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {/* Beads metadata */}
          {taskIsFromBeads && task.beadsMetadata?.type && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="capitalize bg-zinc-800/50 px-2 py-1 rounded">
                {task.beadsMetadata.type}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
