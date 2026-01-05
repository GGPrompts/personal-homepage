"use client"

import * as React from "react"
import { FolderOpen, ChevronDown, X, Check, Pencil, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface WorkingDirSelectorProps {
  workingDir: string
  setWorkingDir: (dir: string) => void
  recentDirs: string[]
  removeFromRecentDirs: (dir: string) => void
  clearWorkingDir: () => void
  collapsed?: boolean
  mobile?: boolean
}

export function WorkingDirSelector({
  workingDir,
  setWorkingDir,
  recentDirs,
  removeFromRecentDirs,
  clearWorkingDir,
  collapsed = false,
  mobile = false,
}: WorkingDirSelectorProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(workingDir)
  const [isOpen, setIsOpen] = React.useState(false)

  // Sync input value when workingDir changes externally
  React.useEffect(() => {
    setInputValue(workingDir)
  }, [workingDir])

  const handleSave = () => {
    const trimmed = inputValue.trim()
    if (trimmed) {
      setWorkingDir(trimmed)
    } else {
      clearWorkingDir()
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setInputValue(workingDir)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const handleRemove = (dir: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeFromRecentDirs(dir)
  }

  // Truncate path for display
  const displayPath = React.useMemo(() => {
    if (workingDir === "~") return "Home (~)"
    // Show last 2 segments for long paths
    const parts = workingDir.split("/")
    if (parts.length > 3) {
      return ".../" + parts.slice(-2).join("/")
    }
    return workingDir
  }, [workingDir])

  // For collapsed sidebar, show tooltip with icon only
  if (collapsed && !mobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(true)}
            data-tabz-action="open-working-dir"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-mono text-xs">{workingDir}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="px-4 py-2 border-b border-border/20">
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="~/projects/my-project"
            className="h-8 flex-1 font-mono text-xs"
            onKeyDown={handleKeyDown}
            autoFocus
            data-tabz-input="working-dir"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleSave}
            data-tabz-action="save-working-dir"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleCancel}
            data-tabz-action="cancel-working-dir"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 justify-between gap-2 font-mono text-xs text-muted-foreground hover:text-foreground"
              data-tabz-action="open-working-dir-menu"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{displayPath}</span>
              </div>
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72" data-tabz-list="working-dir-menu">
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false)
                setIsEditing(true)
              }}
              className="gap-2"
              data-tabz-action="edit-working-dir"
            >
              <Pencil className="h-4 w-4" />
              Set working directory...
            </DropdownMenuItem>

            {workingDir !== "~" && (
              <DropdownMenuItem
                onClick={() => {
                  clearWorkingDir()
                  setIsOpen(false)
                }}
                className="gap-2 text-muted-foreground"
                data-tabz-action="clear-working-dir"
              >
                <Home className="h-4 w-4" />
                Reset to home (~)
              </DropdownMenuItem>
            )}

            {recentDirs.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                  Recent directories
                </div>
                {recentDirs.map((dir) => (
                  <DropdownMenuItem
                    key={dir}
                    onClick={() => {
                      setWorkingDir(dir)
                      setIsOpen(false)
                    }}
                    className="gap-2 group font-mono text-xs"
                    data-tabz-item={`recent-dir-${dir.replace(/[^a-z0-9]/gi, "-")}`}
                  >
                    <FolderOpen className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate flex-1">{dir}</span>
                    {dir !== workingDir && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
                        onClick={(e) => handleRemove(dir, e)}
                        data-tabz-action="remove-recent-dir"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
