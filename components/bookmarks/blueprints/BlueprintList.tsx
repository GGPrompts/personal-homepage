"use client"

import React, { useState } from "react"
import {
  Play,
  Pencil,
  Trash2,
  Plus,
  Globe,
  Terminal,
  Layout,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { WorkspaceBlueprint, BlueprintWindow } from "./types"

// ============================================================================
// TYPES
// ============================================================================

interface BlueprintListProps {
  blueprints: WorkspaceBlueprint[]
  onEdit: (blueprint: WorkspaceBlueprint) => void
  onDelete: (id: string) => void
  onCreateNew: () => void
  onCreateFromFolder?: (folderId: string) => void
}

// ============================================================================
// MINI PREVIEW - shows colored rectangles representing window layout
// ============================================================================

function MiniPreview({ windows }: { windows: BlueprintWindow[] }) {
  return (
    <div className="relative w-full aspect-video rounded border border-border/30 bg-black/30 overflow-hidden">
      {windows.map((win) => (
        <div
          key={win.id}
          className={`absolute rounded-sm ${
            win.type === "browser"
              ? "bg-blue-500/30 border border-blue-500/40"
              : "bg-emerald-500/30 border border-emerald-500/40"
          }`}
          style={{
            left: `${win.position.x}%`,
            top: `${win.position.y}%`,
            width: `${win.position.w}%`,
            height: `${win.position.h}%`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {win.type === "browser" ? (
              <Globe className="h-2.5 w-2.5 text-blue-400/60" />
            ) : (
              <Terminal className="h-2.5 w-2.5 text-emerald-400/60" />
            )}
          </div>
        </div>
      ))}
      {windows.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] text-muted-foreground">empty</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BlueprintList({
  blueprints,
  onEdit,
  onDelete,
  onCreateNew,
}: BlueprintListProps) {
  const [launchingId, setLaunchingId] = useState<string | null>(null)

  const handleLaunch = async (blueprint: WorkspaceBlueprint) => {
    if (launchingId) return
    setLaunchingId(blueprint.id)

    try {
      const res = await fetch("/api/workspace-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: blueprint.name,
          windows: blueprint.windows,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(
          `Launched "${blueprint.name}" on workspace ${data.workspaceId} (${data.windowCount} windows)`
        )
      } else {
        toast.error(data.error || "Failed to launch workspace")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error"
      toast.error(`Launch failed: ${message}`)
    } finally {
      setLaunchingId(null)
    }
  }

  if (blueprints.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        data-tabz-region="blueprint-empty"
      >
        <Layout className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm mb-1">No workspace blueprints yet</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          Create layouts of browser and terminal windows to launch together
        </p>
        <Button
          variant="outline"
          onClick={onCreateNew}
          data-tabz-action="create-blueprint"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Blueprint
        </Button>
      </div>
    )
  }

  return (
    <div data-tabz-list="blueprint-list">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blueprints.map((bp) => {
          const isLaunching = launchingId === bp.id
          const browserCount = bp.windows.filter((w) => w.type === "browser").length
          const terminalCount = bp.windows.filter((w) => w.type === "terminal").length

          return (
            <div
              key={bp.id}
              className="glass-card-interactive rounded-lg border border-border/40 p-4 space-y-3"
              data-tabz-item={`blueprint-${bp.id}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {bp.icon && <span className="text-lg flex-shrink-0">{bp.icon}</span>}
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{bp.name}</h3>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {browserCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Globe className="h-2.5 w-2.5 text-blue-400" />
                          {browserCount}
                        </span>
                      )}
                      {terminalCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Terminal className="h-2.5 w-2.5 text-emerald-400" />
                          {terminalCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(bp)}
                    data-tabz-action="edit-blueprint"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(bp.id)}
                    data-tabz-action="delete-blueprint"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Mini layout preview */}
              <MiniPreview windows={bp.windows} />

              {/* Window labels */}
              <div className="flex flex-wrap gap-1">
                {bp.windows.slice(0, 4).map((win) => (
                  <span
                    key={win.id}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                      win.type === "browser"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {win.type === "browser" ? (
                      <Globe className="h-2 w-2" />
                    ) : (
                      <Terminal className="h-2 w-2" />
                    )}
                    {win.label}
                  </span>
                ))}
                {bp.windows.length > 4 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{bp.windows.length - 4} more
                  </span>
                )}
              </div>

              {/* Launch button */}
              <Button
                className="w-full"
                size="sm"
                onClick={() => handleLaunch(bp)}
                disabled={isLaunching || bp.windows.length === 0}
                data-tabz-action="launch-blueprint"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Launch Workspace
                  </>
                )}
              </Button>
            </div>
          )
        })}

        {/* Add new card */}
        <button
          onClick={onCreateNew}
          className="rounded-lg border-2 border-dashed border-border/40 hover:border-primary/40 p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[200px]"
          data-tabz-action="create-blueprint"
        >
          <Plus className="h-8 w-8 opacity-40" />
          <span className="text-sm">New Blueprint</span>
        </button>
      </div>
    </div>
  )
}
