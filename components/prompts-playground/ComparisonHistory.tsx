"use client"

import * as React from "react"
import {
  History,
  Clock,
  Trash2,
  RotateCcw,
  ChevronRight,
  MessageSquare,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { PanelConfig } from "@/lib/prompts-playground"
import type { PanelResponse } from "./DynamicBrowserPanel"
import { getModelById, MODEL_FAMILY_TEXT_COLORS } from "@/lib/models-registry"

// History entry structure
export interface ComparisonHistoryEntry {
  id: string
  timestamp: string
  prompt: string
  systemPrompt?: string
  workspace?: string
  panels: Array<{
    id: string
    label: string
    modelId?: string
    response?: string
    timing?: number
  }>
}

const STORAGE_KEY = "prompts-playground-history"
const MAX_HISTORY_ENTRIES = 20

// Storage helpers
function loadHistory(): ComparisonHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }
  return []
}

function saveHistory(history: ComparisonHistoryEntry[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

// Hook for managing comparison history
export function useComparisonHistory() {
  const [history, setHistory] = React.useState<ComparisonHistoryEntry[]>([])
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Load history on mount
  React.useEffect(() => {
    setHistory(loadHistory())
    setIsLoaded(true)
  }, [])

  // Save history when it changes
  React.useEffect(() => {
    if (isLoaded) {
      saveHistory(history)
    }
  }, [history, isLoaded])

  const addEntry = React.useCallback(
    (
      prompt: string,
      panels: PanelConfig[],
      responses: Map<string, PanelResponse>,
      options?: { systemPrompt?: string; workspace?: string }
    ) => {
      // Only add if there's a prompt and at least one response
      if (!prompt.trim()) return

      const panelsWithResponses = panels
        .filter((p) => p.modelId && responses.get(p.id)?.content)
        .map((p) => {
          const response = responses.get(p.id)
          return {
            id: p.id,
            label: p.label,
            modelId: p.modelId,
            response: response?.content,
            timing: response?.timing,
          }
        })

      if (panelsWithResponses.length === 0) return

      const entry: ComparisonHistoryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        timestamp: new Date().toISOString(),
        prompt,
        systemPrompt: options?.systemPrompt,
        workspace: options?.workspace,
        panels: panelsWithResponses,
      }

      setHistory((prev) => {
        // Add to beginning, limit size
        const updated = [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES)
        return updated
      })
    },
    []
  )

  const removeEntry = React.useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearHistory = React.useCallback(() => {
    setHistory([])
  }, [])

  return {
    history,
    addEntry,
    removeEntry,
    clearHistory,
  }
}

// History Sheet Component
interface ComparisonHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: ComparisonHistoryEntry[]
  onLoadEntry: (entry: ComparisonHistoryEntry) => void
  onRemoveEntry: (id: string) => void
  onClearHistory: () => void
}

export function ComparisonHistorySheet({
  open,
  onOpenChange,
  history,
  onLoadEntry,
  onRemoveEntry,
  onClearHistory,
}: ComparisonHistorySheetProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const truncatePrompt = (prompt: string, maxLen = 60) => {
    if (prompt.length <= maxLen) return prompt
    return prompt.slice(0, maxLen).trim() + "..."
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Comparison History
          </SheetTitle>
          <SheetDescription>
            {history.length === 0
              ? "No comparison history yet"
              : `${history.length} comparison${history.length !== 1 ? "s" : ""} saved`}
          </SheetDescription>
        </SheetHeader>

        {history.length > 0 && (
          <div className="flex justify-end mt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {history.length} saved comparisons.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onClearHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 py-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Run a comparison to start building history</p>
              </div>
            ) : (
              history.map((entry) => (
                <HistoryEntryCard
                  key={entry.id}
                  entry={entry}
                  onLoad={() => {
                    onLoadEntry(entry)
                    onOpenChange(false)
                  }}
                  onRemove={() => onRemoveEntry(entry.id)}
                  formatTime={formatTime}
                  truncatePrompt={truncatePrompt}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

interface HistoryEntryCardProps {
  entry: ComparisonHistoryEntry
  onLoad: () => void
  onRemove: () => void
  formatTime: (ts: string) => string
  truncatePrompt: (prompt: string, maxLen?: number) => string
}

function HistoryEntryCard({
  entry,
  onLoad,
  onRemove,
  formatTime,
  truncatePrompt,
}: HistoryEntryCardProps) {
  return (
    <div className="glass rounded-lg p-3 group hover:bg-background/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            {formatTime(entry.timestamp)}
          </div>

          {/* Prompt preview */}
          <div className="flex items-start gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm font-mono text-foreground/90">
              {truncatePrompt(entry.prompt)}
            </p>
          </div>

          {/* Models used */}
          <div className="flex items-center gap-2 flex-wrap">
            {entry.panels.map((panel) => {
              const model = panel.modelId ? getModelById(panel.modelId) : undefined
              return (
                <span
                  key={panel.id}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted/50",
                    model?.family && MODEL_FAMILY_TEXT_COLORS[model.family]
                  )}
                >
                  <Bot className="h-3 w-3" />
                  {model?.name || panel.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onLoad}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Button to trigger history sheet
interface HistoryTriggerButtonProps {
  onClick: () => void
  count?: number
  className?: string
}

export function HistoryTriggerButton({
  onClick,
  count = 0,
  className,
}: HistoryTriggerButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("gap-1.5", className)}
    >
      <History className="h-3.5 w-3.5" />
      History
      {count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
          {count}
        </span>
      )}
    </Button>
  )
}
