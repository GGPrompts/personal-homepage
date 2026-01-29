"use client"

import * as React from "react"
import {
  RotateCcw,
  Save,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { PanelConfig } from "@/lib/prompts-playground"
import { toast } from "sonner"

// Session state structure
export interface SessionState {
  prompt: string
  systemPrompt?: string
  workspace?: string
  panels: PanelConfig[]
  viewMode: "grid" | "horizontal" | "vertical"
  metricsExpanded: boolean
  lastSaved: string
}

const STORAGE_KEY = "prompts-playground-session"

// Storage helpers
function loadSession(): SessionState | null {
  if (typeof window === "undefined") return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }
  return null
}

function saveSession(session: SessionState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...session,
    lastSaved: new Date().toISOString(),
  }))
}

function clearSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

// Hook for session management
interface UseSessionManagerOptions {
  prompt: string
  systemPrompt?: string
  workspace?: string
  panels: PanelConfig[]
  viewMode: "grid" | "horizontal" | "vertical"
  metricsExpanded: boolean
  onRestoreSession: (session: SessionState) => void
}

export function useSessionManager({
  prompt,
  systemPrompt,
  workspace,
  panels,
  viewMode,
  metricsExpanded,
  onRestoreSession,
}: UseSessionManagerOptions) {
  const [hasRestoredSession, setHasRestoredSession] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Restore session on mount
  React.useEffect(() => {
    if (!hasRestoredSession) {
      const session = loadSession()
      if (session) {
        onRestoreSession(session)
      }
      setHasRestoredSession(true)
    }
  }, [hasRestoredSession, onRestoreSession])

  // Auto-save session with debounce
  React.useEffect(() => {
    if (!hasRestoredSession) return

    setIsDirty(true)

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const session: SessionState = {
        prompt,
        systemPrompt,
        workspace,
        panels,
        viewMode,
        metricsExpanded,
        lastSaved: new Date().toISOString(),
      }
      saveSession(session)
      setIsDirty(false)
    }, 1000) // Save after 1 second of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [prompt, systemPrompt, workspace, panels, viewMode, metricsExpanded, hasRestoredSession])

  // Save immediately
  const saveNow = React.useCallback(() => {
    const session: SessionState = {
      prompt,
      systemPrompt,
      workspace,
      panels,
      viewMode,
      metricsExpanded,
      lastSaved: new Date().toISOString(),
    }
    saveSession(session)
    setIsDirty(false)
    toast.success("Session saved")
  }, [prompt, systemPrompt, workspace, panels, viewMode, metricsExpanded])

  // Clear session and reset
  const resetSession = React.useCallback(() => {
    clearSession()
    toast.success("Session cleared")
  }, [])

  return {
    hasRestoredSession,
    isDirty,
    saveNow,
    resetSession,
  }
}

// New Session Button with confirmation
interface NewSessionButtonProps {
  onNewSession: () => void
  className?: string
  hasContent?: boolean
}

export function NewSessionButton({
  onNewSession,
  className,
  hasContent = false,
}: NewSessionButtonProps) {
  const [showConfirm, setShowConfirm] = React.useState(false)

  const handleClick = () => {
    if (hasContent) {
      setShowConfirm(true)
    } else {
      onNewSession()
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            className={cn("gap-1.5", className)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Session
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Start fresh (Ctrl+Shift+N)
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Start New Session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your current prompt and responses. Panel configurations
              will be preserved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onNewSession()
              setShowConfirm(false)
            }}>
              New Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Session status indicator
interface SessionStatusProps {
  isDirty: boolean
  lastSaved?: string
  className?: string
}

export function SessionStatus({ isDirty, lastSaved, className }: SessionStatusProps) {
  const formatLastSaved = (timestamp?: string) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      {isDirty ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <Save className="h-3 w-3" />
          <span>Saved at {formatLastSaved(lastSaved)}</span>
        </>
      ) : null}
    </div>
  )
}
