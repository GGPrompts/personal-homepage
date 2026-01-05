"use client"

import { AlertTriangle, Activity, Zap, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TokenUsage } from "./types"
import { CONTEXT_LIMIT } from "./types"

interface ContextIndicatorProps {
  usage: TokenUsage | null
  className?: string
  showBreakdown?: boolean
}

/**
 * Context window usage indicator
 * Shows percentage of context window used with visual warnings at high usage
 */
export function ContextIndicator({
  usage,
  className,
  showBreakdown = false,
}: ContextIndicatorProps) {
  if (!usage) {
    return null
  }

  const { contextPercentage, totalTokens, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } = usage

  // Determine color based on usage level
  const getColorClasses = () => {
    if (contextPercentage >= 80) {
      return {
        text: "text-red-400",
        bg: "bg-red-500/20",
        border: "border-red-500/30",
        bar: "bg-red-500",
        glow: "shadow-red-500/30"
      }
    }
    if (contextPercentage >= 50) {
      return {
        text: "text-amber-400",
        bg: "bg-amber-500/20",
        border: "border-amber-500/30",
        bar: "bg-amber-500",
        glow: "shadow-amber-500/30"
      }
    }
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
      glow: "shadow-emerald-500/30"
    }
  }

  const colors = getColorClasses()
  const isWarning = contextPercentage >= 80

  // Format token count for display
  const formatTokens = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  return (
    <div className={cn("group relative", className)}>
      {/* Main indicator */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md border text-xs",
          colors.bg,
          colors.border,
          isWarning && "animate-pulse"
        )}
      >
        {isWarning ? (
          <AlertTriangle className={cn("h-3 w-3", colors.text)} />
        ) : (
          <Activity className={cn("h-3 w-3", colors.text)} />
        )}

        {/* Progress bar */}
        <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", colors.bar)}
            style={{ width: `${Math.min(contextPercentage, 100)}%` }}
          />
        </div>

        {/* Percentage text */}
        <span className={cn("font-mono font-medium min-w-[2.5rem] text-right", colors.text)}>
          {contextPercentage}%
        </span>
      </div>

      {/* Hover tooltip with breakdown */}
      <div
        className={cn(
          "absolute bottom-full left-0 mb-2 p-3 rounded-lg border opacity-0 invisible",
          "group-hover:opacity-100 group-hover:visible transition-all duration-200",
          "bg-zinc-900 border-white/10 shadow-xl z-50 min-w-[200px]"
        )}
      >
        <div className="text-xs font-medium text-zinc-300 mb-2">Context Window Usage</div>

        {/* Token breakdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Zap className="h-3 w-3 text-cyan-400" />
              Input
            </span>
            <span className="font-mono text-zinc-300">{formatTokens(inputTokens)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Activity className="h-3 w-3 text-emerald-400" />
              Output
            </span>
            <span className="font-mono text-zinc-300">{formatTokens(outputTokens)}</span>
          </div>

          {cacheReadTokens !== undefined && cacheReadTokens > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Database className="h-3 w-3 text-purple-400" />
                Cache Read
              </span>
              <span className="font-mono text-zinc-300">{formatTokens(cacheReadTokens)}</span>
            </div>
          )}

          {cacheCreationTokens !== undefined && cacheCreationTokens > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Database className="h-3 w-3 text-amber-400" />
                Cache Write
              </span>
              <span className="font-mono text-zinc-300">{formatTokens(cacheCreationTokens)}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 my-1.5" />

          {/* Total */}
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-300">Total</span>
            <span className={cn("font-mono", colors.text)}>
              {formatTokens(totalTokens)} / {formatTokens(CONTEXT_LIMIT)}
            </span>
          </div>
        </div>

        {/* Warning message */}
        {isWarning && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Consider starting a new conversation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact inline version for tight spaces
 */
export function ContextIndicatorCompact({
  usage,
  className,
}: Omit<ContextIndicatorProps, 'showBreakdown'>) {
  if (!usage) {
    return null
  }

  const { contextPercentage } = usage
  const isWarning = contextPercentage >= 80
  const isModerate = contextPercentage >= 50

  const textColor = isWarning
    ? "text-red-400"
    : isModerate
    ? "text-amber-400"
    : "text-zinc-500"

  return (
    <span
      className={cn(
        "text-xs font-mono",
        textColor,
        isWarning && "animate-pulse",
        className
      )}
      title={`Context: ${usage.totalTokens.toLocaleString()} / ${CONTEXT_LIMIT.toLocaleString()} tokens`}
    >
      {isWarning && <AlertTriangle className="h-3 w-3 inline mr-1" />}
      {contextPercentage}%
    </span>
  )
}
