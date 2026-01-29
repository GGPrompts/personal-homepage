"use client"

import * as React from "react"
import {
  Clock,
  FileText,
  Type,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { PanelResponse } from "./DynamicBrowserPanel"
import type { PanelConfig } from "@/lib/prompts-playground"
import { getModelById, MODEL_FAMILY_TEXT_COLORS, type ModelFamily } from "@/lib/models-registry"

export interface ResponseMetrics {
  panelId: string
  modelId?: string
  modelName: string
  modelFamily?: ModelFamily
  responseTime: number | null
  charCount: number
  wordCount: number
  lineCount: number
  error?: string
}

interface MetricsDisplayProps {
  panels: PanelConfig[]
  responses: Map<string, PanelResponse>
  className?: string
}

export function MetricsDisplay({
  panels,
  responses,
  className = "",
}: MetricsDisplayProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)

  // Calculate metrics for each panel
  const metrics: ResponseMetrics[] = React.useMemo(() => {
    return panels
      .filter((p) => p.modelId)
      .map((panel) => {
        const response = responses.get(panel.id)
        const model = panel.modelId ? getModelById(panel.modelId) : undefined
        const content = response?.content || ""

        return {
          panelId: panel.id,
          modelId: panel.modelId,
          modelName: model?.name || panel.label,
          modelFamily: model?.family,
          responseTime: response?.timing ?? null,
          charCount: content.length,
          wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
          lineCount: content ? content.split("\n").length : 0,
          error: response?.error,
        }
      })
  }, [panels, responses])

  // Find fastest and slowest response times
  const timesWithValues = metrics.filter((m) => m.responseTime !== null)
  const fastestTime = timesWithValues.length > 0
    ? Math.min(...timesWithValues.map((m) => m.responseTime!))
    : null
  const slowestTime = timesWithValues.length > 0
    ? Math.max(...timesWithValues.map((m) => m.responseTime!))
    : null

  // Find longest and shortest content
  const maxChars = Math.max(...metrics.map((m) => m.charCount), 0)
  const minChars = metrics.length > 1
    ? Math.min(...metrics.filter((m) => m.charCount > 0).map((m) => m.charCount))
    : maxChars

  // Check if we have any responses
  const hasResponses = metrics.some((m) => m.charCount > 0 || m.responseTime !== null)

  if (!hasResponses || metrics.length === 0) {
    return null
  }

  return (
    <div
      className={cn("glass rounded-lg overflow-hidden", className)}
      data-tabz-region="metrics-display"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-background/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span>Comparison Metrics</span>
          <span className="text-xs text-muted-foreground">
            ({metrics.length} model{metrics.length !== 1 ? "s" : ""})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/30">
                  <th className="text-left py-2 font-medium">Model</th>
                  <th className="text-right py-2 font-medium">Time</th>
                  <th className="text-right py-2 font-medium">Chars</th>
                  <th className="text-right py-2 font-medium">Words</th>
                  <th className="text-right py-2 font-medium">Lines</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const isFastest = m.responseTime !== null && m.responseTime === fastestTime
                  const isSlowest = m.responseTime !== null && m.responseTime === slowestTime && timesWithValues.length > 1
                  const isLongest = m.charCount === maxChars && m.charCount > 0
                  const isShortest = m.charCount === minChars && metrics.length > 1 && m.charCount > 0 && minChars !== maxChars

                  return (
                    <tr key={m.panelId} className="border-b border-border/10 last:border-0">
                      <td className="py-2">
                        <span
                          className={cn(
                            "font-medium",
                            m.modelFamily && MODEL_FAMILY_TEXT_COLORS[m.modelFamily]
                          )}
                        >
                          {m.modelName}
                        </span>
                        {m.error && (
                          <span className="ml-2 text-xs text-red-400">(error)</span>
                        )}
                      </td>
                      <td className="text-right py-2">
                        <MetricCell
                          value={m.responseTime}
                          format={formatTime}
                          isBest={isFastest}
                          isWorst={isSlowest}
                          icon={Clock}
                        />
                      </td>
                      <td className="text-right py-2">
                        <MetricCell
                          value={m.charCount}
                          format={formatNumber}
                          isBest={isLongest}
                          isWorst={isShortest}
                          icon={FileText}
                        />
                      </td>
                      <td className="text-right py-2">
                        <MetricCell
                          value={m.wordCount}
                          format={formatNumber}
                        />
                      </td>
                      <td className="text-right py-2">
                        <MetricCell
                          value={m.lineCount}
                          format={formatNumber}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Visual Comparison Bars */}
          {timesWithValues.length > 1 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">
                Response Time Comparison
              </div>
              <div className="space-y-1.5">
                {metrics
                  .filter((m) => m.responseTime !== null)
                  .sort((a, b) => a.responseTime! - b.responseTime!)
                  .map((m) => {
                    const percentage =
                      slowestTime && slowestTime > 0
                        ? (m.responseTime! / slowestTime) * 100
                        : 0
                    const isFastest = m.responseTime === fastestTime

                    return (
                      <div key={m.panelId} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-24 text-xs truncate",
                            m.modelFamily && MODEL_FAMILY_TEXT_COLORS[m.modelFamily]
                          )}
                        >
                          {m.modelName}
                        </span>
                        <div className="flex-1 h-4 bg-background/50 rounded overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 rounded",
                              isFastest
                                ? "bg-emerald-500/60"
                                : m.modelFamily === "Claude"
                                ? "bg-orange-500/60"
                                : m.modelFamily === "GPT"
                                ? "bg-emerald-500/40"
                                : m.modelFamily === "Gemini"
                                ? "bg-indigo-500/60"
                                : "bg-primary/60"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-16 text-xs text-right text-muted-foreground">
                          {formatTime(m.responseTime)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface MetricCellProps {
  value: number | null
  format: (v: number | null) => string
  isBest?: boolean
  isWorst?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

function MetricCell({
  value,
  format,
  isBest,
  isWorst,
}: MetricCellProps) {
  if (value === null || value === 0) {
    return <span className="text-muted-foreground/50">-</span>
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        isBest && "text-emerald-400 font-medium",
        isWorst && "text-amber-400"
      )}
    >
      {format(value)}
      {isBest && (
        <Tooltip>
          <TooltipTrigger>
            <TrendingUp className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent>Best</TooltipContent>
        </Tooltip>
      )}
      {isWorst && (
        <Tooltip>
          <TooltipTrigger>
            <TrendingDown className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent>Slowest</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}

function formatTime(ms: number | null): string {
  if (ms === null) return "-"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatNumber(n: number | null): string {
  if (n === null) return "-"
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function calculateMetrics(content: string): Pick<ResponseMetrics, "charCount" | "wordCount" | "lineCount"> {
  return {
    charCount: content.length,
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
    lineCount: content ? content.split("\n").length : 0,
  }
}
