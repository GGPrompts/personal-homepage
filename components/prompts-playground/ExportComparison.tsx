"use client"

import * as React from "react"
import {
  Download,
  Copy,
  Check,
  FileJson,
  FileText,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { PanelConfig } from "@/lib/prompts-playground"
import type { PanelResponse } from "./DynamicBrowserPanel"
import { getModelById } from "@/lib/models-registry"
import type { VoteType } from "./ResponseVoting"

export interface ExportData {
  prompt: string
  systemPrompt?: string
  timestamp: string
  workspace?: string
  panels: Array<{
    id: string
    label: string
    modelId?: string
    modelName?: string
    modelFamily?: string
    response: string
    timing?: number
    error?: string
    charCount: number
    wordCount: number
    vote?: VoteType
    isWinner?: boolean
  }>
  metrics: {
    fastestModel?: string
    fastestTime?: number
    slowestModel?: string
    slowestTime?: number
    longestResponse?: string
    shortestResponse?: string
    winnerModel?: string
  }
}

interface ExportComparisonProps {
  prompt: string
  systemPrompt?: string
  workspace?: string
  panels: PanelConfig[]
  responses: Map<string, PanelResponse>
  getVote?: (panelId: string) => VoteType
  getWinner?: () => string | null
  className?: string
}

export function ExportComparison({
  prompt,
  systemPrompt,
  workspace,
  panels,
  responses,
  getVote,
  getWinner,
  className = "",
}: ExportComparisonProps) {
  const [copied, setCopied] = React.useState(false)

  // Build export data
  const exportData = React.useMemo((): ExportData => {
    const winnerId = getWinner?.()

    const panelData = panels
      .filter((p) => p.modelId && responses.get(p.id)?.content)
      .map((panel) => {
        const response = responses.get(panel.id)
        const model = panel.modelId ? getModelById(panel.modelId) : undefined
        const content = response?.content || ""

        return {
          id: panel.id,
          label: panel.label,
          modelId: panel.modelId,
          modelName: model?.name,
          modelFamily: model?.family,
          response: content,
          timing: response?.timing,
          error: response?.error,
          charCount: content.length,
          wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
          vote: getVote?.(panel.id),
          isWinner: panel.id === winnerId,
        }
      })

    // Calculate metrics
    const withTiming = panelData.filter((p) => p.timing !== undefined)
    const withContent = panelData.filter((p) => p.charCount > 0)

    const fastestPanel = withTiming.length > 0
      ? withTiming.reduce((a, b) => (a.timing! < b.timing! ? a : b))
      : undefined

    const slowestPanel = withTiming.length > 0
      ? withTiming.reduce((a, b) => (a.timing! > b.timing! ? a : b))
      : undefined

    const longestPanel = withContent.length > 0
      ? withContent.reduce((a, b) => (a.charCount > b.charCount ? a : b))
      : undefined

    const shortestPanel = withContent.length > 0
      ? withContent.reduce((a, b) => (a.charCount < b.charCount ? a : b))
      : undefined

    const winnerPanel = panelData.find((p) => p.isWinner)

    return {
      prompt,
      systemPrompt: systemPrompt || undefined,
      timestamp: new Date().toISOString(),
      workspace: workspace || undefined,
      panels: panelData,
      metrics: {
        fastestModel: fastestPanel?.modelName,
        fastestTime: fastestPanel?.timing,
        slowestModel: slowestPanel?.modelName,
        slowestTime: slowestPanel?.timing,
        longestResponse: longestPanel?.modelName,
        shortestResponse: shortestPanel?.modelName,
        winnerModel: winnerPanel?.modelName,
      },
    }
  }, [prompt, systemPrompt, workspace, panels, responses, getVote, getWinner])

  // Generate Markdown
  const generateMarkdown = (): string => {
    const lines: string[] = [
      "# Model Comparison Results",
      "",
      `**Date:** ${new Date(exportData.timestamp).toLocaleString()}`,
    ]

    if (exportData.workspace) {
      lines.push(`**Workspace:** \`${exportData.workspace}\``)
    }

    lines.push("")
    lines.push("## Prompt")
    lines.push("")
    lines.push("```")
    lines.push(exportData.prompt)
    lines.push("```")

    if (exportData.systemPrompt) {
      lines.push("")
      lines.push("### System Prompt")
      lines.push("")
      lines.push("```")
      lines.push(exportData.systemPrompt)
      lines.push("```")
    }

    lines.push("")
    lines.push("## Metrics Summary")
    lines.push("")
    lines.push("| Model | Time | Characters | Words | Vote |")
    lines.push("|-------|------|------------|-------|------|")

    for (const panel of exportData.panels) {
      const time = panel.timing ? `${(panel.timing / 1000).toFixed(1)}s` : "-"
      const vote = panel.isWinner
        ? "Winner"
        : panel.vote === "up"
        ? "Upvote"
        : panel.vote === "down"
        ? "Downvote"
        : "-"
      lines.push(
        `| ${panel.modelName || panel.label} | ${time} | ${panel.charCount} | ${panel.wordCount} | ${vote} |`
      )
    }

    if (exportData.metrics.fastestModel || exportData.metrics.winnerModel) {
      lines.push("")
      lines.push("### Highlights")
      lines.push("")

      if (exportData.metrics.winnerModel) {
        lines.push(`- **Winner:** ${exportData.metrics.winnerModel}`)
      }
      if (exportData.metrics.fastestModel) {
        lines.push(
          `- **Fastest:** ${exportData.metrics.fastestModel} (${(
            exportData.metrics.fastestTime! / 1000
          ).toFixed(1)}s)`
        )
      }
      if (exportData.metrics.slowestModel && exportData.metrics.slowestModel !== exportData.metrics.fastestModel) {
        lines.push(
          `- **Slowest:** ${exportData.metrics.slowestModel} (${(
            exportData.metrics.slowestTime! / 1000
          ).toFixed(1)}s)`
        )
      }
    }

    lines.push("")
    lines.push("## Responses")

    for (const panel of exportData.panels) {
      lines.push("")
      lines.push(`### ${panel.modelName || panel.label}`)
      if (panel.isWinner) {
        lines.push("")
        lines.push("> **Winner**")
      }
      lines.push("")
      lines.push("```")
      lines.push(panel.response)
      lines.push("```")

      if (panel.error) {
        lines.push("")
        lines.push(`**Error:** ${panel.error}`)
      }
    }

    lines.push("")
    lines.push("---")
    lines.push("*Generated by Prompts Playground*")

    return lines.join("\n")
  }

  // Generate JSON
  const generateJson = (): string => {
    return JSON.stringify(exportData, null, 2)
  }

  // Copy to clipboard
  const handleCopy = async (format: "markdown" | "json") => {
    const content = format === "markdown" ? generateMarkdown() : generateJson()
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download file
  const handleDownload = (format: "markdown" | "json") => {
    const content = format === "markdown" ? generateMarkdown() : generateJson()
    const mimeType =
      format === "markdown" ? "text/markdown" : "application/json"
    const extension = format === "markdown" ? "md" : "json"
    const filename = `comparison-${new Date()
      .toISOString()
      .slice(0, 10)}.${extension}`

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Check if we have any data to export
  const hasData = exportData.panels.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasData}
          className={className}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
          Copy to Clipboard
        </div>
        <DropdownMenuItem onClick={() => handleCopy("markdown")}>
          <FileText className="h-4 w-4 mr-2" />
          Copy as Markdown
          {copied && <Check className="h-3 w-3 ml-auto text-emerald-400" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopy("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Copy as JSON
          {copied && <Check className="h-3 w-3 ml-auto text-emerald-400" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
          Download File
        </div>
        <DropdownMenuItem onClick={() => handleDownload("markdown")}>
          <Download className="h-4 w-4 mr-2" />
          Download Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("json")}>
          <Download className="h-4 w-4 mr-2" />
          Download JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Quick copy button for single response
interface CopyResponseButtonProps {
  content: string
  className?: string
}

export function CopyResponseButton({
  content,
  className,
}: CopyResponseButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy response"}</TooltipContent>
    </Tooltip>
  )
}
