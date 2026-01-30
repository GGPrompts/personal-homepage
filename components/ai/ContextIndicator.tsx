"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Gauge, AlertTriangle, ArrowRight, Loader2 } from "lucide-react"
import type { Conversation } from "@/lib/ai-workspace"

// ============================================================================
// CONSTANTS
// ============================================================================

// Context limits vary by plan:
// - Standard: 200K
// - Pro/Team: 200K
// - Enterprise: 500K
// - Beta (1M header): 1M
// We detect the effective limit based on actual usage - if usage exceeds 200K,
// the user must have access to extended context
const CONTEXT_LIMIT_STANDARD = 200000
const CONTEXT_LIMIT_EXTENDED = 500000
const CONTEXT_LIMIT_MAX = 1000000

const WARNING_THRESHOLD = 0.7
const DANGER_THRESHOLD = 0.9

/**
 * Detect the effective context limit based on actual usage
 * If we see usage > 200K, user has extended context access
 */
function detectContextLimit(contextTokens: number): number {
  if (contextTokens > CONTEXT_LIMIT_EXTENDED) {
    return CONTEXT_LIMIT_MAX
  }
  if (contextTokens > CONTEXT_LIMIT_STANDARD) {
    return CONTEXT_LIMIT_EXTENDED
  }
  return CONTEXT_LIMIT_STANDARD
}

// ============================================================================
// TYPES
// ============================================================================

export type ContextStatus = 'ok' | 'warning' | 'danger'
export type UsageSource = 'cumulative' | 'message' | 'estimated'

export interface ContextUsageData {
  contextTokens: number
  contextLimit: number
  contextUsage: number
  contextPercentage: number
  contextStatus: ContextStatus
  usageSource: UsageSource
  isCalculating: boolean
}

export interface ContextIndicatorProps {
  /** The active conversation */
  conversation: Conversation
  /** Whether the AI is currently typing */
  isTyping: boolean
  /** Whether the AI is currently streaming */
  isStreaming: boolean
}

export interface ContextWarningBannerProps {
  /** Context status */
  contextStatus: ContextStatus
  /** Context percentage */
  contextPercentage: number
  /** Whether the warning has been dismissed */
  isDismissed: boolean
  /** Called when the "Continue in new chat" button is clicked */
  onContinueInNewChat: () => void
  /** Called when the "Dismiss" button is clicked */
  onDismiss: () => void
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate context usage data from a conversation
 */
export function calculateContextUsage(
  conversation: Conversation,
  isTyping: boolean,
  isStreaming: boolean
): ContextUsageData {
  // Use cumulative usage for accurate context tracking (contextTokens = current context window)
  // Falls back to latest message usage, then to estimation
  const hasCumulativeUsage = conversation.cumulativeUsage && conversation.cumulativeUsage.contextTokens > 0
  const hasMessageUsage = conversation.usage && conversation.usage.totalTokens > 0
  const hasActualUsage = hasCumulativeUsage || hasMessageUsage

  // Detect if we're waiting for first usage data (shows calculating spinner instead of 0%)
  const isCalculating = (isTyping || isStreaming) && !hasActualUsage && conversation.messages.length > 0

  let contextTokens: number
  let usageSource: UsageSource

  if (hasCumulativeUsage) {
    // Best: use cumulative contextTokens (input + cache read from latest response)
    // This represents the actual current context window size
    contextTokens = conversation.cumulativeUsage!.contextTokens
    usageSource = 'cumulative'
  } else if (hasMessageUsage) {
    // Good: use latest message total tokens as approximation
    contextTokens = conversation.usage!.totalTokens
    usageSource = 'message'
  } else {
    // Fallback: estimate tokens from message content
    // ~4 chars per token is a rough estimate for English text
    const messageTokens = conversation.messages.reduce((sum, msg) => {
      const contentTokens = Math.ceil(msg.content.length / 4)
      const toolTokens = msg.toolUses?.reduce((t, tool) =>
        t + Math.ceil((tool.input?.length || 0) / 4) + 20, 0) || 0
      return sum + contentTokens + toolTokens
    }, 0)
    // Only add minimal overhead for system prompt/formatting (~500 tokens)
    contextTokens = messageTokens > 0 ? messageTokens + 500 : 0
    usageSource = 'estimated'
  }

  const effectiveLimit = detectContextLimit(contextTokens)
  const contextUsage = contextTokens / effectiveLimit
  const contextPercentage = Math.min(Math.round(contextUsage * 100), 100)
  const contextStatus: ContextStatus = contextUsage >= DANGER_THRESHOLD ? 'danger'
    : contextUsage >= WARNING_THRESHOLD ? 'warning'
    : 'ok'

  return {
    contextTokens,
    contextLimit: effectiveLimit,
    contextUsage,
    contextPercentage,
    contextStatus,
    usageSource,
    isCalculating,
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Small indicator showing context usage percentage in the header
 */
export function ContextIndicator({
  conversation,
  isTyping,
  isStreaming,
}: ContextIndicatorProps) {
  const {
    contextTokens,
    contextLimit,
    contextPercentage,
    contextStatus,
    usageSource,
    isCalculating,
  } = calculateContextUsage(conversation, isTyping, isStreaming)

  if (conversation.messages.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-help ${
            contextStatus === 'danger'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : contextStatus === 'warning'
              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {isCalculating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : contextStatus === 'danger' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Gauge className="h-3 w-3" />
            )}
            <span className="text-[10px] font-mono">
              {isCalculating ? '...' : `${contextPercentage}%`}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium text-xs">
            {isCalculating ? (
              <>
                <span className="text-muted-foreground">Calculating usage...</span>
              </>
            ) : (
              <>
                Context: {usageSource === 'estimated' ? '~' : ''}{contextTokens.toLocaleString()} / {(contextLimit / 1000).toFixed(0)}K
                <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${
                  usageSource === 'cumulative'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : usageSource === 'message'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {usageSource === 'cumulative' ? 'tracked' : usageSource === 'message' ? 'actual' : 'est'}
                </span>
              </>
            )}
          </p>
          {/* Show cumulative stats when available */}
          {conversation.cumulativeUsage && (
            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
              <div className="flex justify-between gap-2">
                <span>Input:</span>
                <span className="font-mono">{conversation.cumulativeUsage.inputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Output:</span>
                <span className="font-mono">{conversation.cumulativeUsage.outputTokens.toLocaleString()}</span>
              </div>
              {(conversation.cumulativeUsage.cacheReadTokens > 0 || conversation.cumulativeUsage.cacheCreationTokens > 0) && (
                <div className="flex justify-between gap-2">
                  <span>Cache:</span>
                  <span className="font-mono">
                    {conversation.cumulativeUsage.cacheReadTokens.toLocaleString()}r / {conversation.cumulativeUsage.cacheCreationTokens.toLocaleString()}c
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-border/40 pt-0.5 mt-0.5">
                <span>Messages tracked:</span>
                <span className="font-mono">{conversation.cumulativeUsage.messageCount}</span>
              </div>
            </div>
          )}
          <div className="w-32 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                contextStatus === 'danger' ? 'bg-red-500'
                : contextStatus === 'warning' ? 'bg-yellow-500'
                : 'bg-emerald-500'
              }`}
              style={{ width: `${contextPercentage}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs mt-1.5">
            {contextStatus === 'danger'
              ? 'Context nearly full! Start a new conversation soon.'
              : contextStatus === 'warning'
              ? 'Context getting full. Consider a new conversation.'
              : 'Plenty of context remaining.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Warning banner shown when context is getting full
 */
export function ContextWarningBanner({
  contextStatus,
  contextPercentage,
  isDismissed,
  onContinueInNewChat,
  onDismiss,
}: ContextWarningBannerProps) {
  if (contextStatus === 'ok' || isDismissed) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 p-4 rounded-lg border ${
        contextStatus === 'danger'
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${
          contextStatus === 'danger' ? 'text-red-400' : 'text-yellow-400'
        }`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${
            contextStatus === 'danger' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {contextStatus === 'danger'
              ? 'Context nearly full!'
              : 'Context getting full'}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {contextStatus === 'danger'
              ? `At ${contextPercentage}% capacity. Continue in a new chat with a summary to avoid losing context.`
              : `At ${contextPercentage}% capacity. Consider continuing in a new chat soon.`
            }
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant={contextStatus === 'danger' ? 'default' : 'outline'}
              onClick={onContinueInNewChat}
              className="gap-1"
            >
              <ArrowRight className="h-3 w-3" />
              Continue in new chat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ContextIndicator
