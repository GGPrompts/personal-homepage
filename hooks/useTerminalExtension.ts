"use client"

import { useState, useEffect, useCallback } from "react"

// Use same key as global working directory for sync
const GLOBAL_WORKDIR_KEY = "global-working-directory"
const DEFAULT_WORKDIR = "~"

function getDefaultWorkDir(): string {
  if (typeof window === "undefined") return DEFAULT_WORKDIR
  try {
    return localStorage.getItem(GLOBAL_WORKDIR_KEY) || DEFAULT_WORKDIR
  } catch {
    return DEFAULT_WORKDIR
  }
}

function setDefaultWorkDir(dir: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(GLOBAL_WORKDIR_KEY, dir)
  } catch {
    // Ignore storage errors
  }
}

interface SpawnResult {
  success: boolean
  error?: string
  terminal?: {
    id: string
    name: string
  }
}

export interface SpawnOptions {
  name?: string
  command?: string
  workingDir?: string
  profile?: string
  autoExecute?: boolean
  color?: string
}

export function useTerminalExtension() {
  const [defaultWorkDir, setDefaultWorkDirState] = useState<string>(() => getDefaultWorkDir())
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize — native kitty is always available
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Run a command in the terminal via /api/terminal (Kitty)
  const runCommand = useCallback(
    async (command: string, options?: { workingDir?: string; name?: string }): Promise<SpawnResult> => {
      const workingDir = options?.workingDir || defaultWorkDir || getDefaultWorkDir()

      try {
        const response = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command,
            workingDir,
            name: options?.name || "Terminal",
          }),
        })
        const data = await response.json()
        if (data.success) {
          return { success: true }
        }
        return { success: false, error: data.error || "Failed to spawn terminal" }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        return { success: false, error: errorMessage }
      }
    },
    [defaultWorkDir]
  )

  // Spawn terminal with full options via /api/terminal (Kitty)
  const spawnWithOptions = useCallback(
    async (options: SpawnOptions): Promise<SpawnResult> => {
      const workingDir = options.workingDir || defaultWorkDir || getDefaultWorkDir()

      try {
        const response = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: options.command,
            workingDir,
            name: options.name || "Terminal",
          }),
        })
        const data = await response.json()
        if (data.success) {
          return { success: true }
        }
        return { success: false, error: data.error || "Failed to spawn terminal" }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        return { success: false, error: errorMessage }
      }
    },
    [defaultWorkDir]
  )

  // Paste command to terminal without executing
  // Sends text to the focused kitty window via send-text (no Enter)
  const pasteToTerminal = useCallback(
    async (command: string, options?: { workingDir?: string; name?: string; profile?: string; color?: string }): Promise<SpawnResult> => {
      try {
        const response = await fetch("/api/terminal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: command, execute: false }),
        })
        const data = await response.json()
        if (data.success) {
          return { success: true }
        }
        return { success: false, error: data.error || "Failed to paste to terminal" }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        return { success: false, error: errorMessage }
      }
    },
    []
  )

  // Send text to an active Claude session via kitty @ send-text
  const sendToChat = useCallback(
    async (command: string): Promise<boolean> => {
      if (typeof window === "undefined") return false

      try {
        // Find active Claude sessions running in Kitty terminals
        const activeResponse = await fetch("/api/ai/sessions/active", {
          signal: AbortSignal.timeout(5000),
        })
        if (!activeResponse.ok) {
          console.error("[useTerminalExtension] Failed to fetch active sessions")
          return false
        }

        const { active } = await activeResponse.json() as {
          active: Array<{ windowId: number; title: string; cwd: string; socket: string; sessionId: string | null }>
        }

        if (!active || active.length === 0) {
          console.error("[useTerminalExtension] No active Claude sessions found")
          return false
        }

        // Pick the first (most recently detected) active session
        const session = active[0]

        // Send the text to the session via the AI sessions PUT endpoint
        const sendResponse = await fetch("/api/ai/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            prompt: command,
            projectPath: session.cwd,
          }),
          signal: AbortSignal.timeout(5000),
        })

        if (!sendResponse.ok) {
          const err = await sendResponse.json().catch(() => ({}))
          console.error("[useTerminalExtension] Failed to send to Claude session:", err)
          return false
        }

        console.log("[useTerminalExtension] Sent text to Claude session:", command)
        return true
      } catch (err) {
        console.error("[useTerminalExtension] sendToChat error:", err)
        return false
      }
    },
    []
  )

  // Set default working directory
  const updateDefaultWorkDir = useCallback((dir: string) => {
    setDefaultWorkDir(dir)
    setDefaultWorkDirState(dir)
  }, [])

  // Refresh connection status (native kitty is always available)
  const refreshStatus = useCallback(async () => {
    return true
  }, [])

  return {
    // Status — native kitty is always available
    available: true,
    backendRunning: true,
    authenticated: true,
    error: null as string | null,
    isLoaded,
    defaultWorkDir,

    // Actions
    runCommand,
    spawnWithOptions,
    pasteToTerminal,
    sendToChat,
    refreshStatus,
    updateDefaultWorkDir,
  }
}
