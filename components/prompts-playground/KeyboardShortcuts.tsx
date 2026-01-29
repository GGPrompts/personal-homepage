"use client"

import * as React from "react"
import {
  Keyboard,
  Send,
  Plus,
  Download,
  BarChart3,
  Maximize2,
  History,
  RotateCcw,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Shortcut definitions
export interface ShortcutAction {
  id: string
  label: string
  keys: string[]
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

export const PLAYGROUND_SHORTCUTS: ShortcutAction[] = [
  {
    id: "send",
    label: "Send to All",
    keys: ["Ctrl", "Enter"],
    description: "Send prompt to all panels with models",
    icon: Send,
  },
  {
    id: "add-panel",
    label: "Add Panel",
    keys: ["Ctrl", "N"],
    description: "Add a new comparison panel",
    icon: Plus,
  },
  {
    id: "export",
    label: "Export Dialog",
    keys: ["Ctrl", "E"],
    description: "Toggle export options",
    icon: Download,
  },
  {
    id: "metrics",
    label: "Metrics Panel",
    keys: ["Ctrl", "M"],
    description: "Toggle metrics display",
    icon: BarChart3,
  },
  {
    id: "fullscreen",
    label: "Focus Mode",
    keys: ["Ctrl", "F"],
    description: "Focus on selected panel",
    icon: Maximize2,
  },
  {
    id: "history",
    label: "History",
    keys: ["Ctrl", "H"],
    description: "Open comparison history",
    icon: History,
  },
  {
    id: "new-session",
    label: "New Session",
    keys: ["Ctrl", "Shift", "N"],
    description: "Start a new session",
    icon: RotateCcw,
  },
  {
    id: "close",
    label: "Close Dialog",
    keys: ["Escape"],
    description: "Close any open dialog",
    icon: X,
  },
  {
    id: "help",
    label: "Shortcuts Help",
    keys: ["?"],
    description: "Show this help dialog",
    icon: Keyboard,
  },
]

// Get platform-specific modifier key
function getModifierKey(): string {
  if (typeof window === "undefined") return "Ctrl"
  return navigator.platform.toLowerCase().includes("mac") ? "Cmd" : "Ctrl"
}

// Hook for keyboard shortcuts
interface UseKeyboardShortcutsOptions {
  onSendToAll?: () => void
  onAddPanel?: () => void
  onToggleExport?: () => void
  onToggleMetrics?: () => void
  onToggleFullscreen?: () => void
  onToggleHistory?: () => void
  onNewSession?: () => void
  onCloseDialogs?: () => void
  onShowHelp?: () => void
  disabled?: boolean
}

export function useKeyboardShortcuts({
  onSendToAll,
  onAddPanel,
  onToggleExport,
  onToggleMetrics,
  onToggleFullscreen,
  onToggleHistory,
  onNewSession,
  onCloseDialogs,
  onShowHelp,
  disabled = false,
}: UseKeyboardShortcutsOptions) {
  React.useEffect(() => {
    if (disabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Still allow Escape
        if (e.key === "Escape" && onCloseDialogs) {
          e.preventDefault()
          onCloseDialogs()
        }
        // Allow Ctrl+Enter for send
        if (e.key === "Enter" && modifier && onSendToAll) {
          e.preventDefault()
          onSendToAll()
        }
        return
      }

      // Ctrl/Cmd + Enter - Send to all
      if (e.key === "Enter" && modifier && onSendToAll) {
        e.preventDefault()
        onSendToAll()
        return
      }

      // Ctrl/Cmd + N - Add panel
      if (key === "n" && modifier && !shift && onAddPanel) {
        e.preventDefault()
        onAddPanel()
        return
      }

      // Ctrl/Cmd + E - Export
      if (key === "e" && modifier && onToggleExport) {
        e.preventDefault()
        onToggleExport()
        return
      }

      // Ctrl/Cmd + M - Metrics
      if (key === "m" && modifier && onToggleMetrics) {
        e.preventDefault()
        onToggleMetrics()
        return
      }

      // Ctrl/Cmd + F - Fullscreen/Focus (only when not in browser default)
      if (key === "f" && modifier && onToggleFullscreen) {
        // Don't override browser find, use it only if alt is also pressed
        // or let it pass through
        return
      }

      // Ctrl/Cmd + H - History
      if (key === "h" && modifier && onToggleHistory) {
        e.preventDefault()
        onToggleHistory()
        return
      }

      // Ctrl/Cmd + Shift + N - New session
      if (key === "n" && modifier && shift && onNewSession) {
        e.preventDefault()
        onNewSession()
        return
      }

      // Escape - Close dialogs
      if (e.key === "Escape" && onCloseDialogs) {
        e.preventDefault()
        onCloseDialogs()
        return
      }

      // ? - Show help
      if (e.key === "?" && onShowHelp) {
        e.preventDefault()
        onShowHelp()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    disabled,
    onSendToAll,
    onAddPanel,
    onToggleExport,
    onToggleMetrics,
    onToggleFullscreen,
    onToggleHistory,
    onNewSession,
    onCloseDialogs,
    onShowHelp,
  ])
}

// Shortcuts Help Dialog
interface ShortcutsHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  const modKey = React.useMemo(() => getModifierKey(), [])

  const formatKeys = (keys: string[]) => {
    return keys.map((k) => (k === "Ctrl" ? modKey : k))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 mt-2">
          {PLAYGROUND_SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon
            return (
              <div
                key={shortcut.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {Icon && (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{shortcut.label}</div>
                    {shortcut.description && (
                      <div className="text-xs text-muted-foreground">
                        {shortcut.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {formatKeys(shortcut.keys).map((key, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <span className="text-xs text-muted-foreground">+</span>
                      )}
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border/50">
                        {key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">?</kbd> anytime to show this help
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Small keyboard hint badge
interface ShortcutBadgeProps {
  keys: string[]
  className?: string
}

export function ShortcutBadge({ keys, className }: ShortcutBadgeProps) {
  const modKey = React.useMemo(() => getModifierKey(), [])
  const displayKeys = keys.map((k) => (k === "Ctrl" ? modKey : k))

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70",
        className
      )}
    >
      {displayKeys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span>+</span>}
          <kbd className="px-1 py-0.5 bg-muted/50 rounded font-mono">
            {key === "Ctrl" || key === "Cmd" ? (key === "Cmd" ? "\u2318" : "^") : key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
