"use client"

import { useState, useEffect, useCallback } from "react"

// Chrome extension types (for externally_connectable messaging)
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: Record<string, unknown>,
          callback: (response: { ok?: boolean; version?: string; error?: string } | undefined) => void
        ) => void
        lastError?: { message: string }
      }
    }
  }
}

// Extension ID for TabzChrome-simplified
// You can find this in chrome://extensions when the extension is loaded

interface TerminalExtensionState {
  available: boolean
  version: string | null
  extensionId: string | null
}

const STORAGE_KEY = "terminal-extension-id"

function getStoredExtensionId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredExtensionId(id: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Ignore storage errors
  }
}

export function useTerminalExtension() {
  const [state, setState] = useState<TerminalExtensionState>({
    available: false,
    version: null,
    extensionId: null,
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // Check if extension is available
  const checkExtension = useCallback(async (extensionId: string): Promise<boolean> => {
    if (typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
      console.log("[Terminal] Chrome runtime not available")
      return false
    }

    console.log("[Terminal] Checking extension:", extensionId.slice(0, 8) + "...")
    return new Promise((resolve) => {
      try {
        window.chrome!.runtime!.sendMessage(extensionId, { type: "PING" }, (response) => {
          if (window.chrome?.runtime?.lastError) {
            console.warn("[Terminal] Extension check failed:", window.chrome.runtime.lastError.message)
            resolve(false)
            return
          }
          if (response?.ok) {
            console.log("[Terminal] Extension connected, version:", response.version)
            setState({
              available: true,
              version: response.version || null,
              extensionId,
            })
            setStoredExtensionId(extensionId)
            resolve(true)
          } else {
            console.warn("[Terminal] Extension responded but not ok:", response)
            resolve(false)
          }
        })
      } catch {
        resolve(false)
      }
    })
  }, [])

  // Initialize - try stored extension ID or prompt user
  useEffect(() => {
    const init = async () => {
      const storedId = getStoredExtensionId()
      if (storedId) {
        const found = await checkExtension(storedId)
        if (found) {
          setIsLoaded(true)
          return
        }
      }
      // Extension not found with stored ID
      setState({ available: false, version: null, extensionId: null })
      setIsLoaded(true)
    }

    init()
  }, [checkExtension])

  // Run a command in the terminal
  const runCommand = useCallback(
    async (command: string, options?: { workingDir?: string; name?: string }): Promise<boolean> => {
      if (!state.available || !state.extensionId || !window.chrome?.runtime?.sendMessage) {
        console.warn("[Terminal] Cannot run command - extension not available")
        return false
      }

      console.log("[Terminal] Spawning:", command, options)
      return new Promise((resolve) => {
        try {
          window.chrome!.runtime!.sendMessage(
            state.extensionId!,
            {
              type: "SPAWN_TERMINAL",
              command,
              workingDir: options?.workingDir,
              name: options?.name,
            },
            (response) => {
              if (window.chrome?.runtime?.lastError) {
                console.error("[Terminal] Spawn failed:", window.chrome.runtime.lastError.message)
                resolve(false)
                return
              }
              console.log("[Terminal] Spawn response:", response)
              resolve(response?.ok ?? false)
            }
          )
        } catch (err) {
          console.error("[Terminal] Failed to send message:", err)
          resolve(false)
        }
      })
    },
    [state.available, state.extensionId]
  )

  // Set extension ID manually (for settings UI)
  const setExtensionId = useCallback(
    async (id: string): Promise<boolean> => {
      const found = await checkExtension(id)
      if (!found) {
        setState({ available: false, version: null, extensionId: null })
      }
      return found
    },
    [checkExtension]
  )

  // Clear extension ID
  const clearExtensionId = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
    setState({ available: false, version: null, extensionId: null })
  }, [])

  return {
    available: state.available,
    version: state.version,
    extensionId: state.extensionId,
    isLoaded,
    runCommand,
    setExtensionId,
    clearExtensionId,
  }
}
