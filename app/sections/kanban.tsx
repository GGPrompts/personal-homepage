"use client"

import * as React from "react"
import { KanbanBoard } from "@/app/components/kanban/board/KanbanBoard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FolderOpen, ChevronDown, X, Check, Pencil } from "lucide-react"

const STORAGE_KEY_WORKSPACE = "kanban-workspace"
const STORAGE_KEY_WORKSPACE_HISTORY = "kanban-workspace-history"
const MAX_HISTORY = 10

interface KanbanSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function KanbanSection({ activeSubItem, onSubItemHandled }: KanbanSectionProps) {
  const [workspace, setWorkspace] = React.useState<string>("")
  const [workspaceHistory, setWorkspaceHistory] = React.useState<string[]>([])
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  // Load persisted workspace on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_WORKSPACE)
    const history = localStorage.getItem(STORAGE_KEY_WORKSPACE_HISTORY)
    if (stored) {
      setWorkspace(stored)
      setInputValue(stored)
    }
    if (history) {
      try {
        setWorkspaceHistory(JSON.parse(history))
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  // Handle sub-item navigation if needed
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  const saveWorkspace = (path: string) => {
    const trimmed = path.trim()
    setWorkspace(trimmed)
    setInputValue(trimmed)
    setIsEditing(false)

    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_WORKSPACE, trimmed)
      // Add to history if not already present
      const newHistory = [trimmed, ...workspaceHistory.filter(h => h !== trimmed)].slice(0, MAX_HISTORY)
      setWorkspaceHistory(newHistory)
      localStorage.setItem(STORAGE_KEY_WORKSPACE_HISTORY, JSON.stringify(newHistory))
    } else {
      localStorage.removeItem(STORAGE_KEY_WORKSPACE)
    }
  }

  const removeFromHistory = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newHistory = workspaceHistory.filter(h => h !== path)
    setWorkspaceHistory(newHistory)
    localStorage.setItem(STORAGE_KEY_WORKSPACE_HISTORY, JSON.stringify(newHistory))
  }

  return (
    <div className="h-full flex flex-col" data-tabz-section="kanban">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow">
            Kanban
          </h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="~/projects/my-project"
                  className="h-8 w-64 font-mono text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveWorkspace(inputValue)
                    } else if (e.key === "Escape") {
                      setInputValue(workspace)
                      setIsEditing(false)
                    }
                  }}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => saveWorkspace(inputValue)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => {
                    setInputValue(workspace)
                    setIsEditing(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 font-mono text-xs"
                    title="Project workspace for beads issues"
                  >
                    <FolderOpen className="h-3 w-3" />
                    {workspace || "Current project"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuItem
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Set workspace path...
                  </DropdownMenuItem>
                  {workspace && (
                    <DropdownMenuItem
                      onClick={() => saveWorkspace("")}
                      className="gap-2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      Clear (use current project)
                    </DropdownMenuItem>
                  )}
                  {workspaceHistory.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                        Recent workspaces
                      </div>
                      {workspaceHistory.map((path) => (
                        <DropdownMenuItem
                          key={path}
                          onClick={() => saveWorkspace(path)}
                          className="gap-2 group font-mono text-xs"
                        >
                          <FolderOpen className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate flex-1">{path}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => removeFromHistory(path, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mb-4">Visual task board for project management</p>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard workspace={workspace || undefined} />
      </div>
    </div>
  )
}
