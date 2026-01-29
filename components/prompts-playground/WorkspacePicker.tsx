"use client"

import * as React from "react"
import { Folder, FolderOpen, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const STORAGE_KEY = "prompts-playground-workspace"

interface WorkspacePickerProps {
  className?: string
}

export function WorkspacePicker({ className = "" }: WorkspacePickerProps) {
  const [workspace, setWorkspace] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  // Load workspace from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setWorkspace(saved)
      setInputValue(saved)
    }
  }, [])

  const handleSave = () => {
    const trimmed = inputValue.trim()
    if (trimmed) {
      setWorkspace(trimmed)
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      setWorkspace(null)
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setWorkspace(null)
    setInputValue("")
    localStorage.removeItem(STORAGE_KEY)
    setIsOpen(false)
  }

  const displayPath = workspace
    ? workspace.replace(/^\/home\/[^/]+/, "~").replace(/^~\/projects\//, "~/p/")
    : null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1.5 text-xs font-mono ${
                workspace
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              } ${className}`}
            >
              {workspace ? (
                <FolderOpen className="h-3.5 w-3.5" />
              ) : (
                <Folder className="h-3.5 w-3.5" />
              )}
              {displayPath || "No workspace"}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {workspace ? (
            <div className="space-y-1">
              <div className="font-medium">Workspace</div>
              <div className="text-xs font-mono text-muted-foreground">
                {workspace}
              </div>
            </div>
          ) : (
            "Set workspace directory for model outputs"
          )}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Workspace Directory</label>
            <p className="text-xs text-muted-foreground">
              Set the project folder for model outputs
            </p>
          </div>

          <div className="space-y-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="~/projects/my-project"
              className="font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />

            {/* Quick picks */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Quick picks:</div>
              <div className="flex flex-wrap gap-1">
                {[
                  "~/projects",
                  "~/projects/personal-homepage",
                  "/tmp/playground",
                ].map((path) => (
                  <button
                    key={path}
                    onClick={() => setInputValue(path)}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 font-mono transition-colors"
                  >
                    {path.replace(/^\/home\/[^/]+/, "~")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!workspace}
              className="text-xs text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs">
              <ChevronRight className="h-3 w-3 mr-1" />
              Set Workspace
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Hook to access workspace from other components
export function useWorkspace() {
  const [workspace, setWorkspace] = React.useState<string | null>(null)

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setWorkspace(saved)

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setWorkspace(e.newValue)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setAndSave = React.useCallback((path: string | null) => {
    if (path) {
      localStorage.setItem(STORAGE_KEY, path)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setWorkspace(path)
  }, [])

  return [workspace, setAndSave] as const
}
