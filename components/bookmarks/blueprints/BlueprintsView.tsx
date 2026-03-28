"use client"

import React, { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BlueprintList } from "./BlueprintList"
import { BlueprintEditor } from "./BlueprintEditor"
import {
  type WorkspaceBlueprint,
  type BlueprintWindow,
  loadBlueprints,
  saveBlueprints,
  generateId,
} from "./types"
import type { BookmarkItem, FolderItem } from "../desktop/types"

// ============================================================================
// TYPES
// ============================================================================

interface BlueprintsViewProps {
  bookmarks?: BookmarkItem[]
  folders?: FolderItem[]
  defaultWorkingDir?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BlueprintsView({ bookmarks, folders, defaultWorkingDir }: BlueprintsViewProps) {
  const [blueprints, setBlueprints] = useState<WorkspaceBlueprint[]>([])
  const [editing, setEditing] = useState<WorkspaceBlueprint | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Load blueprints from localStorage on mount
  useEffect(() => {
    setBlueprints(loadBlueprints())
  }, [])

  // Save handler
  const handleSave = useCallback(
    (bp: WorkspaceBlueprint) => {
      setBlueprints((prev) => {
        const exists = prev.find((b) => b.id === bp.id)
        const updated = exists
          ? prev.map((b) => (b.id === bp.id ? bp : b))
          : [...prev, bp]
        saveBlueprints(updated)
        return updated
      })
      setEditing(null)
      setIsCreating(false)
      toast.success(editing ? "Blueprint updated" : "Blueprint created")
    },
    [editing]
  )

  // Delete handler
  const handleDelete = useCallback((id: string) => {
    setBlueprints((prev) => {
      const updated = prev.filter((b) => b.id !== id)
      saveBlueprints(updated)
      return updated
    })
    setDeleteConfirm(null)
    toast.success("Blueprint deleted")
  }, [])

  // Create from folder handler: auto-creates a blueprint from all bookmarks in a folder
  const handleCreateFromFolder = useCallback(
    (folderId: string) => {
      if (!bookmarks || !folders) return

      const folder = folders.find((f) => f.id === folderId)
      if (!folder) return

      const folderBookmarks = bookmarks.filter((b) => b.folderId === folderId)
      if (folderBookmarks.length === 0) {
        toast.error("Folder has no bookmarks")
        return
      }

      // Auto-assign equal grid positions
      const count = folderBookmarks.length
      const cols = Math.ceil(Math.sqrt(count))
      const rows = Math.ceil(count / cols)
      const cellW = 100 / cols
      const cellH = 100 / rows

      const windows: BlueprintWindow[] = folderBookmarks.map((bm, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return {
          id: generateId(),
          type: bm.type === "terminal" ? "terminal" : "browser",
          url: bm.type !== "terminal" ? bm.url : undefined,
          command: bm.type === "terminal" ? bm.command : undefined,
          workingDir: bm.type === "terminal" ? bm.workingDir : undefined,
          label: bm.name,
          position: {
            x: Math.round(col * cellW),
            y: Math.round(row * cellH),
            w: Math.round(cellW),
            h: Math.round(cellH),
          },
        }
      })

      const bp: WorkspaceBlueprint = {
        id: generateId(),
        name: folder.name,
        icon: folder.icon,
        windows,
        createdAt: new Date().toISOString(),
      }

      // Open in editor for review before saving
      setEditing(bp)
      setIsCreating(true)
    },
    [bookmarks, folders]
  )

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditing(null)
    setIsCreating(false)
  }, [])

  // ---- Render ----

  // Editor mode
  if (editing || isCreating) {
    return (
      <div className="space-y-4" data-tabz-region="blueprints-editor-view">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {editing && !isCreating ? "Edit Blueprint" : "New Blueprint"}
          </span>
        </div>
        <BlueprintEditor
          blueprint={editing}
          onSave={handleSave}
          onCancel={handleCancel}
          bookmarks={bookmarks}
        />
      </div>
    )
  }

  // List mode
  return (
    <div data-tabz-section="workspace-blueprints">
      <BlueprintList
        blueprints={blueprints}
        onEdit={(bp) => setEditing(bp)}
        onDelete={(id) => setDeleteConfirm(id)}
        onCreateNew={() => {
          setEditing(null)
          setIsCreating(true)
        }}
        onCreateFromFolder={handleCreateFromFolder}
        defaultWorkingDir={defaultWorkingDir}
      />

      {/* Quick blueprint from folder buttons (if folders exist) */}
      {folders && folders.length > 0 && blueprints.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground mb-2">
            Quick: Create from bookmark folder
          </p>
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleCreateFromFolder(folder.id)}
                data-tabz-action="create-from-folder"
              >
                {folder.icon && <span className="mr-1">{folder.icon}</span>}
                {folder.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Delete Blueprint</DialogTitle>
            <DialogDescription>
              This will permanently delete this workspace blueprint. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
