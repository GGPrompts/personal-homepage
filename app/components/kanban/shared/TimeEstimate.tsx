"use client"

import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeEstimateProps {
  estimate: string
  size?: "sm" | "md"
  showIcon?: boolean
  className?: string
}

export function TimeEstimate({
  estimate,
  size = "sm",
  showIcon = true,
  className
}: TimeEstimateProps) {
  const sizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  }

  return (
    <div className={cn("flex items-center gap-1 text-zinc-500", sizeClasses[size], className)}>
      {showIcon && <Clock className={iconSizes[size]} />}
      <span>{estimate}</span>
    </div>
  )
}
