"use client"

import * as React from "react"

const STORAGE_KEY_WORKING_DIR = "global-working-directory"
const STORAGE_KEY_RECENT_DIRS = "global-working-directory-history"
const MAX_RECENT_DIRS = 10
const DEFAULT_WORKING_DIR = "~"

export interface WorkingDirContextType {
  workingDir: string
  setWorkingDir: (dir: string) => void
  recentDirs: string[]
  addToRecentDirs: (dir: string) => void
  removeFromRecentDirs: (dir: string) => void
  clearWorkingDir: () => void
  isLoaded: boolean
}

const WorkingDirContext = React.createContext<WorkingDirContextType | null>(null)

export function useWorkingDir(): WorkingDirContextType {
  const context = React.useContext(WorkingDirContext)
  if (!context) {
    throw new Error("useWorkingDir must be used within a WorkingDirProvider")
  }
  return context
}

// Safe version that returns null outside provider (for optional usage)
export function useWorkingDirSafe(): WorkingDirContextType | null {
  return React.useContext(WorkingDirContext)
}

interface WorkingDirProviderProps {
  children: React.ReactNode
}

export function WorkingDirProvider({ children }: WorkingDirProviderProps) {
  const [workingDir, setWorkingDirState] = React.useState<string>(DEFAULT_WORKING_DIR)
  const [recentDirs, setRecentDirs] = React.useState<string[]>([])
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    const storedDir = localStorage.getItem(STORAGE_KEY_WORKING_DIR)
    const storedHistory = localStorage.getItem(STORAGE_KEY_RECENT_DIRS)

    if (storedDir) {
      setWorkingDirState(storedDir)
    }

    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory)
        if (Array.isArray(parsed)) {
          setRecentDirs(parsed)
        }
      } catch {
        // Ignore parse errors
      }
    }

    setIsLoaded(true)
  }, [])

  // Persist working directory changes
  const setWorkingDir = React.useCallback((dir: string) => {
    const trimmed = dir.trim() || DEFAULT_WORKING_DIR
    setWorkingDirState(trimmed)
    localStorage.setItem(STORAGE_KEY_WORKING_DIR, trimmed)

    // Add to recent if not default and not already at front
    if (trimmed !== DEFAULT_WORKING_DIR) {
      setRecentDirs(prev => {
        const filtered = prev.filter(d => d !== trimmed)
        const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_DIRS)
        localStorage.setItem(STORAGE_KEY_RECENT_DIRS, JSON.stringify(updated))
        return updated
      })
    }
  }, [])

  const addToRecentDirs = React.useCallback((dir: string) => {
    const trimmed = dir.trim()
    if (!trimmed || trimmed === DEFAULT_WORKING_DIR) return

    setRecentDirs(prev => {
      const filtered = prev.filter(d => d !== trimmed)
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_DIRS)
      localStorage.setItem(STORAGE_KEY_RECENT_DIRS, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeFromRecentDirs = React.useCallback((dir: string) => {
    setRecentDirs(prev => {
      const updated = prev.filter(d => d !== dir)
      localStorage.setItem(STORAGE_KEY_RECENT_DIRS, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearWorkingDir = React.useCallback(() => {
    setWorkingDirState(DEFAULT_WORKING_DIR)
    localStorage.setItem(STORAGE_KEY_WORKING_DIR, DEFAULT_WORKING_DIR)
  }, [])

  const value: WorkingDirContextType = {
    workingDir,
    setWorkingDir,
    recentDirs,
    addToRecentDirs,
    removeFromRecentDirs,
    clearWorkingDir,
    isLoaded,
  }

  return (
    <WorkingDirContext.Provider value={value}>
      {children}
    </WorkingDirContext.Provider>
  )
}
