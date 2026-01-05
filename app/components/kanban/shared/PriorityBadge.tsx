"use client"

import { Priority, PRIORITY_COLORS } from "./types"
import { cn } from "@/lib/utils"

interface PriorityBadgeProps {
  priority: Priority
  size?: "sm" | "md"
  className?: string
}

export function PriorityBadge({ priority, size = "sm", className }: PriorityBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded text-white uppercase tracking-wide",
        PRIORITY_COLORS[priority],
        sizeClasses[size],
        className
      )}
    >
      {priority}
    </span>
  )
}
