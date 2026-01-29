"use client"

import * as React from "react"
import {
  GitCompare,
  SplitSquareHorizontal,
  AlignLeft,
  X,
  ChevronDown,
  Plus,
  Minus,
  Equal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { PanelConfig } from "@/lib/prompts-playground"
import type { PanelResponse } from "./DynamicBrowserPanel"
import { getModelById, MODEL_FAMILY_TEXT_COLORS } from "@/lib/models-registry"

type DiffViewMode = "split" | "unified"

interface DiffViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  panels: PanelConfig[]
  responses: Map<string, PanelResponse>
  initialPanelA?: string
  initialPanelB?: string
}

export function DiffViewer({
  open,
  onOpenChange,
  panels,
  responses,
  initialPanelA,
  initialPanelB,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = React.useState<DiffViewMode>("split")
  const [panelAId, setPanelAId] = React.useState<string>(initialPanelA || "")
  const [panelBId, setPanelBId] = React.useState<string>(initialPanelB || "")

  // Set initial panels when dialog opens
  React.useEffect(() => {
    if (open) {
      const panelsWithResponses = panels.filter(
        (p) => responses.get(p.id)?.content
      )
      if (panelsWithResponses.length >= 2) {
        if (!panelAId) setPanelAId(panelsWithResponses[0].id)
        if (!panelBId) setPanelBId(panelsWithResponses[1].id)
      }
    }
  }, [open, panels, responses, panelAId, panelBId])

  const panelsWithContent = panels.filter((p) => responses.get(p.id)?.content)

  const panelA = panels.find((p) => p.id === panelAId)
  const panelB = panels.find((p) => p.id === panelBId)
  const responseA = panelAId ? responses.get(panelAId) : undefined
  const responseB = panelBId ? responses.get(panelBId) : undefined

  const modelA = panelA?.modelId ? getModelById(panelA.modelId) : undefined
  const modelB = panelB?.modelId ? getModelById(panelB.modelId) : undefined

  // Calculate diff
  const diff = React.useMemo(() => {
    const contentA = responseA?.content || ""
    const contentB = responseB?.content || ""
    return computeLineDiff(contentA, contentB)
  }, [responseA?.content, responseB?.content])

  const getPanelLabel = (panel: PanelConfig | undefined) => {
    if (!panel) return "Select..."
    const model = panel.modelId ? getModelById(panel.modelId) : undefined
    return model?.name || panel.label
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              <DialogTitle>Compare Responses</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as DiffViewMode)}>
                <TabsList className="h-8">
                  <TabsTrigger value="split" className="h-7 px-3 gap-1.5">
                    <SplitSquareHorizontal className="h-3.5 w-3.5" />
                    Split
                  </TabsTrigger>
                  <TabsTrigger value="unified" className="h-7 px-3 gap-1.5">
                    <AlignLeft className="h-3.5 w-3.5" />
                    Unified
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </DialogHeader>

        {/* Panel Selectors */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground">Left:</span>
            <Select value={panelAId} onValueChange={setPanelAId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model...">
                  {panelA && (
                    <span
                      className={cn(
                        modelA?.family && MODEL_FAMILY_TEXT_COLORS[modelA.family]
                      )}
                    >
                      {getPanelLabel(panelA)}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {panelsWithContent.map((panel) => {
                  const model = panel.modelId
                    ? getModelById(panel.modelId)
                    : undefined
                  return (
                    <SelectItem key={panel.id} value={panel.id}>
                      <span
                        className={cn(
                          model?.family && MODEL_FAMILY_TEXT_COLORS[model.family]
                        )}
                      >
                        {model?.name || panel.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <GitCompare className="h-4 w-4 text-muted-foreground" />

          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground">Right:</span>
            <Select value={panelBId} onValueChange={setPanelBId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model...">
                  {panelB && (
                    <span
                      className={cn(
                        modelB?.family && MODEL_FAMILY_TEXT_COLORS[modelB.family]
                      )}
                    >
                      {getPanelLabel(panelB)}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {panelsWithContent.map((panel) => {
                  const model = panel.modelId
                    ? getModelById(panel.modelId)
                    : undefined
                  return (
                    <SelectItem key={panel.id} value={panel.id}>
                      <span
                        className={cn(
                          model?.family && MODEL_FAMILY_TEXT_COLORS[model.family]
                        )}
                      >
                        {model?.name || panel.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Diff Stats */}
        {diff.stats && (
          <div className="flex items-center gap-4 px-6 py-2 border-b border-border/10 text-xs text-muted-foreground flex-shrink-0">
            <span className="text-emerald-400">
              <Plus className="h-3 w-3 inline mr-1" />
              {diff.stats.additions} additions
            </span>
            <span className="text-red-400">
              <Minus className="h-3 w-3 inline mr-1" />
              {diff.stats.deletions} deletions
            </span>
            <span>
              <Equal className="h-3 w-3 inline mr-1" />
              {diff.stats.unchanged} unchanged
            </span>
          </div>
        )}

        {/* Diff Content */}
        <div className="flex-1 min-h-0">
          {viewMode === "split" ? (
            <SplitView
              diff={diff}
              modelA={modelA}
              modelB={modelB}
              panelA={panelA}
              panelB={panelB}
            />
          ) : (
            <UnifiedView
              diff={diff}
              modelA={modelA}
              modelB={modelB}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Diff types
interface DiffLine {
  type: "added" | "removed" | "unchanged" | "modified"
  contentA?: string
  contentB?: string
  lineA?: number
  lineB?: number
}

interface DiffResult {
  lines: DiffLine[]
  stats: {
    additions: number
    deletions: number
    unchanged: number
  }
}

// Simple line-based diff algorithm
function computeLineDiff(textA: string, textB: string): DiffResult {
  const linesA = textA.split("\n")
  const linesB = textB.split("\n")

  const result: DiffLine[] = []
  let additions = 0
  let deletions = 0
  let unchanged = 0

  // Use longest common subsequence approach (simplified)
  const maxLen = Math.max(linesA.length, linesB.length)
  let i = 0
  let j = 0

  while (i < linesA.length || j < linesB.length) {
    if (i >= linesA.length) {
      // Remaining lines in B are additions
      result.push({
        type: "added",
        contentB: linesB[j],
        lineB: j + 1,
      })
      additions++
      j++
    } else if (j >= linesB.length) {
      // Remaining lines in A are deletions
      result.push({
        type: "removed",
        contentA: linesA[i],
        lineA: i + 1,
      })
      deletions++
      i++
    } else if (linesA[i] === linesB[j]) {
      // Lines are equal
      result.push({
        type: "unchanged",
        contentA: linesA[i],
        contentB: linesB[j],
        lineA: i + 1,
        lineB: j + 1,
      })
      unchanged++
      i++
      j++
    } else {
      // Check if line was modified vs added/removed
      const nextMatchInB = linesB.slice(j + 1, j + 5).indexOf(linesA[i])
      const nextMatchInA = linesA.slice(i + 1, i + 5).indexOf(linesB[j])

      if (nextMatchInB >= 0 && (nextMatchInA < 0 || nextMatchInB <= nextMatchInA)) {
        // Lines were added in B
        for (let k = 0; k <= nextMatchInB; k++) {
          result.push({
            type: "added",
            contentB: linesB[j + k],
            lineB: j + k + 1,
          })
          additions++
        }
        j += nextMatchInB + 1
      } else if (nextMatchInA >= 0) {
        // Lines were removed from A
        for (let k = 0; k <= nextMatchInA; k++) {
          result.push({
            type: "removed",
            contentA: linesA[i + k],
            lineA: i + k + 1,
          })
          deletions++
        }
        i += nextMatchInA + 1
      } else {
        // Modified line
        result.push({
          type: "modified",
          contentA: linesA[i],
          contentB: linesB[j],
          lineA: i + 1,
          lineB: j + 1,
        })
        deletions++
        additions++
        i++
        j++
      }
    }
  }

  return {
    lines: result,
    stats: { additions, deletions, unchanged },
  }
}

// Split view component
interface SplitViewProps {
  diff: DiffResult
  modelA?: ReturnType<typeof getModelById>
  modelB?: ReturnType<typeof getModelById>
  panelA?: PanelConfig
  panelB?: PanelConfig
}

function SplitView({ diff, modelA, modelB, panelA, panelB }: SplitViewProps) {
  return (
    <div className="h-full flex">
      {/* Left panel */}
      <div className="flex-1 flex flex-col border-r border-border/20">
        <div
          className={cn(
            "px-3 py-1.5 border-b border-border/20 text-sm font-medium",
            modelA?.family && MODEL_FAMILY_TEXT_COLORS[modelA.family]
          )}
        >
          {modelA?.name || panelA?.label || "Left"}
        </div>
        <ScrollArea className="flex-1">
          <div className="font-mono text-sm">
            {diff.lines.map((line, idx) => {
              if (line.type === "added") {
                return (
                  <div
                    key={idx}
                    className="flex min-h-[24px] bg-muted/20"
                  >
                    <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                      {" "}
                    </span>
                    <span className="flex-1 px-2 whitespace-pre-wrap break-words" />
                  </div>
                )
              }
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex min-h-[24px]",
                    line.type === "removed" && "bg-red-500/10",
                    line.type === "modified" && "bg-amber-500/10"
                  )}
                >
                  <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                    {line.lineA}
                  </span>
                  <span className="flex-1 px-2 whitespace-pre-wrap break-words">
                    {line.type === "removed" && (
                      <span className="text-red-400">- </span>
                    )}
                    {line.contentA}
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <div
          className={cn(
            "px-3 py-1.5 border-b border-border/20 text-sm font-medium",
            modelB?.family && MODEL_FAMILY_TEXT_COLORS[modelB.family]
          )}
        >
          {modelB?.name || panelB?.label || "Right"}
        </div>
        <ScrollArea className="flex-1">
          <div className="font-mono text-sm">
            {diff.lines.map((line, idx) => {
              if (line.type === "removed") {
                return (
                  <div
                    key={idx}
                    className="flex min-h-[24px] bg-muted/20"
                  >
                    <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                      {" "}
                    </span>
                    <span className="flex-1 px-2 whitespace-pre-wrap break-words" />
                  </div>
                )
              }
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex min-h-[24px]",
                    line.type === "added" && "bg-emerald-500/10",
                    line.type === "modified" && "bg-amber-500/10"
                  )}
                >
                  <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                    {line.lineB}
                  </span>
                  <span className="flex-1 px-2 whitespace-pre-wrap break-words">
                    {line.type === "added" && (
                      <span className="text-emerald-400">+ </span>
                    )}
                    {line.contentB}
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// Unified view component
interface UnifiedViewProps {
  diff: DiffResult
  modelA?: ReturnType<typeof getModelById>
  modelB?: ReturnType<typeof getModelById>
}

function UnifiedView({ diff, modelA, modelB }: UnifiedViewProps) {
  return (
    <ScrollArea className="h-full">
      <div className="font-mono text-sm">
        {diff.lines.map((line, idx) => {
          const isRemoved = line.type === "removed"
          const isAdded = line.type === "added"
          const isModified = line.type === "modified"

          if (isModified) {
            // Show both lines for modified
            return (
              <React.Fragment key={idx}>
                <div className="flex min-h-[24px] bg-red-500/10">
                  <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                    {line.lineA}
                  </span>
                  <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                    {" "}
                  </span>
                  <span className="flex-1 px-2 whitespace-pre-wrap break-words">
                    <span className="text-red-400">- </span>
                    {line.contentA}
                  </span>
                </div>
                <div className="flex min-h-[24px] bg-emerald-500/10">
                  <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                    {" "}
                  </span>
                  <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                    {line.lineB}
                  </span>
                  <span className="flex-1 px-2 whitespace-pre-wrap break-words">
                    <span className="text-emerald-400">+ </span>
                    {line.contentB}
                  </span>
                </div>
              </React.Fragment>
            )
          }

          return (
            <div
              key={idx}
              className={cn(
                "flex min-h-[24px]",
                isRemoved && "bg-red-500/10",
                isAdded && "bg-emerald-500/10"
              )}
            >
              <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                {line.lineA ?? " "}
              </span>
              <span className="w-10 px-2 text-right text-muted-foreground/50 border-r border-border/20 select-none">
                {line.lineB ?? " "}
              </span>
              <span className="flex-1 px-2 whitespace-pre-wrap break-words">
                {isRemoved && <span className="text-red-400">- </span>}
                {isAdded && <span className="text-emerald-400">+ </span>}
                {isRemoved ? line.contentA : line.contentB ?? line.contentA}
              </span>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// Button to open diff viewer
interface DiffTriggerButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function DiffTriggerButton({
  onClick,
  disabled,
  className,
}: DiffTriggerButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("gap-1.5", className)}
    >
      <GitCompare className="h-3.5 w-3.5" />
      Compare
    </Button>
  )
}
