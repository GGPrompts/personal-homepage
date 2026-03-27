"use client"

import React, { useCallback, useRef, useState } from "react"
import {
  Globe,
  Terminal,
  GripVertical,
  Trash2,
  Plus,
  Layout,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type BlueprintWindow,
  type WorkspaceBlueprint,
  type LayoutPreset,
  LAYOUT_PRESETS,
  generateId,
} from "./types"

// ============================================================================
// TYPES
// ============================================================================

interface BlueprintEditorProps {
  blueprint?: WorkspaceBlueprint | null
  onSave: (blueprint: WorkspaceBlueprint) => void
  onCancel: () => void
}

type DragMode = "move" | "resize-br" | "resize-r" | "resize-b" | null

interface DragState {
  windowId: string
  mode: DragMode
  startX: number
  startY: number
  startPos: { x: number; y: number; w: number; h: number }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SIZE = 10 // minimum 10% width/height
const GRID_SNAP = 5 // snap to 5% grid

const WINDOW_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  browser: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
  },
  terminal: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
  },
}

// ============================================================================
// HELPERS
// ============================================================================

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SNAP) * GRID_SNAP
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BlueprintEditor({ blueprint, onSave, onCancel }: BlueprintEditorProps) {
  const [name, setName] = useState(blueprint?.name || "")
  const [icon, setIcon] = useState(blueprint?.icon || "")
  const [windows, setWindows] = useState<BlueprintWindow[]>(
    blueprint?.windows || []
  )
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  // Get the selected window
  const selectedWindow = windows.find((w) => w.id === selectedWindowId) || null

  // --------------------------------------------------------------------------
  // Window management
  // --------------------------------------------------------------------------

  const addWindow = useCallback((type: "browser" | "terminal") => {
    const newWindow: BlueprintWindow = {
      id: generateId(),
      type,
      label: type === "browser" ? "Browser" : "Terminal",
      url: type === "browser" ? "https://" : undefined,
      command: type === "terminal" ? "" : undefined,
      workingDir: type === "terminal" ? "~" : undefined,
      position: { x: 0, y: 0, w: 50, h: 50 },
    }
    setWindows((prev) => [...prev, newWindow])
    setSelectedWindowId(newWindow.id)
  }, [])

  const removeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
    setSelectedWindowId((prev) => (prev === id ? null : prev))
  }, [])

  const updateWindow = useCallback((id: string, updates: Partial<BlueprintWindow>) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    )
  }, [])

  const applyPreset = useCallback((preset: LayoutPreset) => {
    const newWindows: BlueprintWindow[] = preset.positions.map((pos, i) => {
      // Reuse existing window data if available
      const existing = windows[i]
      return {
        id: existing?.id || generateId(),
        type: existing?.type || "browser",
        label: existing?.label || (i === 0 ? "Main" : `Window ${i + 1}`),
        url: existing?.url,
        command: existing?.command,
        workingDir: existing?.workingDir,
        position: { ...pos },
      }
    })
    setWindows(newWindows)
    setSelectedWindowId(null)
  }, [windows])

  // --------------------------------------------------------------------------
  // Mouse-based drag/resize on the canvas
  // --------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, windowId: string, mode: DragMode) => {
      e.preventDefault()
      e.stopPropagation()

      const win = windows.find((w) => w.id === windowId)
      if (!win) return

      setSelectedWindowId(windowId)
      setDragState({
        windowId,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startPos: { ...win.position },
      })
    },
    [windows]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const deltaXPct = ((e.clientX - dragState.startX) / rect.width) * 100
      const deltaYPct = ((e.clientY - dragState.startY) / rect.height) * 100

      const { startPos, mode } = dragState

      setWindows((prev) =>
        prev.map((w) => {
          if (w.id !== dragState.windowId) return w

          let newPos = { ...w.position }

          if (mode === "move") {
            newPos.x = snapToGrid(clamp(startPos.x + deltaXPct, 0, 100 - startPos.w))
            newPos.y = snapToGrid(clamp(startPos.y + deltaYPct, 0, 100 - startPos.h))
          } else if (mode === "resize-br") {
            newPos.w = snapToGrid(clamp(startPos.w + deltaXPct, MIN_SIZE, 100 - startPos.x))
            newPos.h = snapToGrid(clamp(startPos.h + deltaYPct, MIN_SIZE, 100 - startPos.y))
          } else if (mode === "resize-r") {
            newPos.w = snapToGrid(clamp(startPos.w + deltaXPct, MIN_SIZE, 100 - startPos.x))
          } else if (mode === "resize-b") {
            newPos.h = snapToGrid(clamp(startPos.h + deltaYPct, MIN_SIZE, 100 - startPos.y))
          }

          return { ...w, position: newPos }
        })
      )
    },
    [dragState]
  )

  const handleMouseUp = useCallback(() => {
    setDragState(null)
  }, [])

  // --------------------------------------------------------------------------
  // Save
  // --------------------------------------------------------------------------

  const handleSave = useCallback(() => {
    if (!name.trim()) return

    const bp: WorkspaceBlueprint = {
      id: blueprint?.id || generateId(),
      name: name.trim(),
      icon: icon || undefined,
      windows,
      createdAt: blueprint?.createdAt || new Date().toISOString(),
    }
    onSave(bp)
  }, [name, icon, windows, blueprint, onSave])

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-4" data-tabz-region="blueprint-editor">
      {/* Name and icon row */}
      <div className="flex gap-3">
        <div className="w-16">
          <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🖥️"
            className="text-center"
            data-tabz-input="blueprint-icon"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Blueprint Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
            data-tabz-input="blueprint-name"
          />
        </div>
      </div>

      {/* Preset layouts */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Preset Layouts</label>
        <div className="flex gap-2 flex-wrap">
          {LAYOUT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-colors text-xs"
              title={preset.description}
              data-tabz-action="apply-preset"
            >
              <Layout className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Visual canvas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-muted-foreground">
            Monitor Layout ({windows.length} window{windows.length !== 1 ? "s" : ""})
          </label>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => addWindow("browser")}
              data-tabz-action="add-browser-window"
            >
              <Globe className="h-3 w-3 mr-1" />
              Browser
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => addWindow("terminal")}
              data-tabz-action="add-terminal-window"
            >
              <Terminal className="h-3 w-3 mr-1" />
              Terminal
            </Button>
          </div>
        </div>

        {/* Canvas area - represents a monitor */}
        <div
          ref={canvasRef}
          className="relative w-full aspect-video rounded-lg border-2 border-border/60 bg-black/40 overflow-hidden select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedWindowId(null)}
          data-tabz-region="blueprint-canvas"
        >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {[25, 50, 75].map((pct) => (
              <React.Fragment key={pct}>
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/5"
                  style={{ left: `${pct}%` }}
                />
                <div
                  className="absolute left-0 right-0 h-px bg-white/5"
                  style={{ top: `${pct}%` }}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Window rectangles */}
          {windows.map((win) => {
            const colors = WINDOW_COLORS[win.type]
            const isSelected = selectedWindowId === win.id
            const isDragging = dragState?.windowId === win.id

            return (
              <div
                key={win.id}
                className={`absolute rounded-md border-2 transition-shadow ${
                  colors.bg
                } ${
                  isSelected
                    ? `${colors.border} shadow-lg ring-1 ring-primary/30`
                    : "border-white/20"
                } ${isDragging ? "opacity-90" : ""}`}
                style={{
                  left: `${win.position.x}%`,
                  top: `${win.position.y}%`,
                  width: `${win.position.w}%`,
                  height: `${win.position.h}%`,
                  zIndex: isSelected ? 20 : 10,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedWindowId(win.id)
                }}
              >
                {/* Move handle - entire header area */}
                <div
                  className="absolute inset-x-0 top-0 h-6 cursor-move flex items-center gap-1 px-1.5"
                  onMouseDown={(e) => handleMouseDown(e, win.id, "move")}
                >
                  <GripVertical className="h-3 w-3 text-white/40 flex-shrink-0" />
                  <span className={`text-[10px] font-medium truncate ${colors.text}`}>
                    {win.label}
                  </span>
                  {win.type === "browser" ? (
                    <Globe className="h-2.5 w-2.5 text-white/30 flex-shrink-0 ml-auto" />
                  ) : (
                    <Terminal className="h-2.5 w-2.5 text-white/30 flex-shrink-0 ml-auto" />
                  )}
                </div>

                {/* Resize handle - bottom right corner */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                  onMouseDown={(e) => handleMouseDown(e, win.id, "resize-br")}
                >
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/30 rounded-br-sm" />
                </div>

                {/* Resize handle - right edge */}
                <div
                  className="absolute top-6 bottom-4 right-0 w-2 cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, win.id, "resize-r")}
                />

                {/* Resize handle - bottom edge */}
                <div
                  className="absolute left-0 right-4 bottom-0 h-2 cursor-ns-resize"
                  onMouseDown={(e) => handleMouseDown(e, win.id, "resize-b")}
                />

                {/* Delete button when selected */}
                {isSelected && (
                  <button
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive/90 flex items-center justify-center z-30 hover:bg-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeWindow(win.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            )
          })}

          {/* Empty state */}
          {windows.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Plus className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Add windows or choose a preset layout</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected window config */}
      {selectedWindow && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {selectedWindow.type === "browser" ? (
              <Globe className="h-4 w-4 text-blue-400" />
            ) : (
              <Terminal className="h-4 w-4 text-emerald-400" />
            )}
            Configure Window
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label</label>
              <Input
                value={selectedWindow.label}
                onChange={(e) =>
                  updateWindow(selectedWindow.id, { label: e.target.value })
                }
                className="h-8 text-sm"
                data-tabz-input="window-label"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select
                value={selectedWindow.type}
                onValueChange={(val: "browser" | "terminal") =>
                  updateWindow(selectedWindow.id, {
                    type: val,
                    url: val === "browser" ? selectedWindow.url || "https://" : undefined,
                    command: val === "terminal" ? selectedWindow.command || "" : undefined,
                    workingDir: val === "terminal" ? selectedWindow.workingDir || "~" : undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Browser</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedWindow.type === "browser" ? (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <Input
                value={selectedWindow.url || ""}
                onChange={(e) =>
                  updateWindow(selectedWindow.id, { url: e.target.value })
                }
                placeholder="https://example.com"
                className="h-8 text-sm font-mono"
                data-tabz-input="window-url"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Command</label>
                <Input
                  value={selectedWindow.command || ""}
                  onChange={(e) =>
                    updateWindow(selectedWindow.id, { command: e.target.value })
                  }
                  placeholder="nvim ."
                  className="h-8 text-sm font-mono"
                  data-tabz-input="window-command"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Working Directory</label>
                <Input
                  value={selectedWindow.workingDir || ""}
                  onChange={(e) =>
                    updateWindow(selectedWindow.id, { workingDir: e.target.value })
                  }
                  placeholder="~/projects"
                  className="h-8 text-sm font-mono"
                  data-tabz-input="window-workdir"
                />
              </div>
            </>
          )}

          {/* Position readout */}
          <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
            <span>x:{selectedWindow.position.x}%</span>
            <span>y:{selectedWindow.position.y}%</span>
            <span>w:{selectedWindow.position.w}%</span>
            <span>h:{selectedWindow.position.h}%</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || windows.length === 0}
          data-tabz-action="save-blueprint"
        >
          {blueprint ? "Update Blueprint" : "Save Blueprint"}
        </Button>
      </div>
    </div>
  )
}
