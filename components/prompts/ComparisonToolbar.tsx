"use client"

import * as React from "react"
import {
  RefreshCw,
  Camera,
  Save,
  FolderOpen,
  Library,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PanelConfig, SavedComparison } from "@/lib/prompts-playground"
import { generateId } from "@/lib/prompts-playground"

interface ComparisonToolbarProps {
  panels: [PanelConfig, PanelConfig, PanelConfig, PanelConfig]
  savedComparisons: SavedComparison[]
  onRefreshAll: () => void
  onScreenshotAll: () => void
  onOpenLibrary: () => void
  onSaveComparison: (comparison: SavedComparison) => void
  onLoadComparison: (comparison: SavedComparison) => void
  onDeleteComparison: (id: string) => void
}

export function ComparisonToolbar({
  panels,
  savedComparisons,
  onRefreshAll,
  onScreenshotAll,
  onOpenLibrary,
  onSaveComparison,
  onLoadComparison,
  onDeleteComparison,
}: ComparisonToolbarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  const [comparisonName, setComparisonName] = React.useState("")

  const handleSave = () => {
    if (!comparisonName.trim()) return

    const comparison: SavedComparison = {
      id: generateId(),
      name: comparisonName.trim(),
      createdAt: new Date().toISOString(),
      panels: panels,
    }

    onSaveComparison(comparison)
    setComparisonName("")
    setSaveDialogOpen(false)
  }

  return (
    <div
      className="flex items-center justify-between gap-3 p-3 glass rounded-lg"
      data-tabz-region="comparison-toolbar"
    >
      <div className="flex items-center gap-2">
        {/* Refresh All */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshAll}
          data-tabz-action="refresh-all"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh All
        </Button>

        {/* Screenshot All */}
        <Button
          variant="outline"
          size="sm"
          onClick={onScreenshotAll}
          data-tabz-action="screenshot-all"
        >
          <Camera className="h-3.5 w-3.5 mr-1.5" />
          Screenshot All
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Save/Load Comparison Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              Comparisons
              {savedComparisons.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({savedComparisons.length})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Current Setup
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Comparison</DialogTitle>
                  <DialogDescription>
                    Save the current panel configuration for later use.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    value={comparisonName}
                    onChange={(e) => setComparisonName(e.target.value)}
                    placeholder="Comparison name..."
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!comparisonName.trim()}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {savedComparisons.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                  Saved Comparisons
                </div>
                {savedComparisons.map((comparison) => (
                  <DropdownMenuItem
                    key={comparison.id}
                    className="flex items-center justify-between group"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <button
                      onClick={() => onLoadComparison(comparison)}
                      className="flex-1 text-left"
                    >
                      <span className="font-medium">{comparison.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(comparison.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteComparison(comparison.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Component Library Button */}
        <Button
          variant="default"
          size="sm"
          onClick={onOpenLibrary}
          data-tabz-action="open-library"
        >
          <Library className="h-3.5 w-3.5 mr-1.5" />
          Library
        </Button>
      </div>
    </div>
  )
}
