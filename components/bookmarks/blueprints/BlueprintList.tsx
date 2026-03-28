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
  defaultWorkingDir?: string
}

// ============================================================================
// MINI PREVIEW - shows colored rectangles representing window layout
// ============================================================================

function MiniPreview({ windows }: { windows: BlueprintWindow[] }) {
  return (
    <div className="relative w-12 h-8 rounded border border-border/30 bg-black/30 overflow-hidden flex-shrink-0">
      {windows.map((win) => (
        <div
          key={win.id}
          className={`absolute rounded-[1px] ${
            win.type === "browser"
              ? "bg-blue-500/40"
              : "bg-emerald-500/40"
          }`}
          style={{
            left: `${win.position.x}%`,
            top: `${win.position.y}%`,
            width: `${win.position.w}%`,
            height: `${win.position.h}%`,
          }}
        />
      ))}
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
  defaultWorkingDir,
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
          defaultWorkingDir,
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
        className="flex flex-col items-center justify-center py-8 text-muted-foreground"
        data-tabz-region="blueprint-empty"
      >
        <Layout className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-xs mb-3">No workspace blueprints yet</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateNew}
          data-tabz-action="create-blueprint"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Blueprint
        </Button>
      </div>
    )
  }

  return (
    <div data-tabz-list="blueprint-list" className="space-y-1.5">
      {blueprints.map((bp) => {
        const isLaunching = launchingId === bp.id
        const browserCount = bp.windows.filter((w) => w.type === "browser").length
        const terminalCount = bp.windows.filter((w) => w.type === "terminal").length

        return (
          <div
            key={bp.id}
            className="group flex items-center gap-2.5 rounded-md border border-border/30 bg-card/40 hover:bg-card/70 px-3 py-2 transition-colors"
            data-tabz-item={`blueprint-${bp.id}`}
          >
            <MiniPreview windows={bp.windows} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {bp.icon && <span className="text-sm">{bp.icon}</span>}
                <span className="text-sm font-medium truncate">{bp.name}</span>
              </div>
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

            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onEdit(bp)}
                data-tabz-action="edit-blueprint"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(bp.id)}
                data-tabz-action="delete-blueprint"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <Button
              size="sm"
              className="h-7 text-xs flex-shrink-0"
              onClick={() => handleLaunch(bp)}
              disabled={isLaunching || bp.windows.length === 0}
              data-tabz-action="launch-blueprint"
            >
              {isLaunching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Launch
                </>
              )}
            </Button>
          </div>
        )
      })}

      <button
        onClick={onCreateNew}
        className="w-full rounded-md border border-dashed border-border/30 hover:border-primary/40 px-3 py-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-tabz-action="create-blueprint"
      >
        <Plus className="h-3.5 w-3.5" />
        New Blueprint
      </button>
    </div>
  )
}
