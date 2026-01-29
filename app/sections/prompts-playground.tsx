"use client"

import * as React from "react"
import { Beaker, Grid2X2, Columns, Rows } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DynamicPanelViewer } from "@/components/prompts-playground/DynamicPanelViewer"
import { WorkspacePicker } from "@/components/prompts-playground/WorkspacePicker"
import { ComparisonToolbar } from "@/components/prompts/ComparisonToolbar"
import { SaveComponentDialog } from "@/components/prompts/SaveComponentDialog"
import { ComponentLibrary } from "@/components/prompts/ComponentLibrary"
import {
  loadPanelConfigs,
  savePanelConfigs,
  loadSavedComponents,
  saveSavedComponents,
  loadSavedComparisons,
  saveSavedComparisons,
  addPanel,
  removePanel,
  updatePanel,
  type PanelConfig,
  type SavedComponent,
  type SavedComparison,
} from "@/lib/prompts-playground"

type ViewMode = "grid" | "horizontal" | "vertical"

interface PromptsPlaygroundSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function PromptsPlaygroundSection({
  activeSubItem,
  onSubItemHandled,
}: PromptsPlaygroundSectionProps) {
  // Panel configs - now dynamic array
  const [panels, setPanels] = React.useState<PanelConfig[]>(loadPanelConfigs)

  // Saved data
  const [savedComponents, setSavedComponents] =
    React.useState<SavedComponent[]>(loadSavedComponents)
  const [savedComparisons, setSavedComparisons] =
    React.useState<SavedComparison[]>(loadSavedComparisons)

  // UI state
  const [currentPrompt, setCurrentPrompt] = React.useState("")
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  const [savingPanelId, setSavingPanelId] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem === "library") {
      setLibraryOpen(true)
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Persist panel configs when they change
  React.useEffect(() => {
    savePanelConfigs(panels)
  }, [panels])

  // Persist saved components when they change
  React.useEffect(() => {
    saveSavedComponents(savedComponents)
  }, [savedComponents])

  // Persist saved comparisons when they change
  React.useEffect(() => {
    saveSavedComparisons(savedComparisons)
  }, [savedComparisons])

  // Panel change handler - now by ID
  const handlePanelChange = (panelId: string, updates: Partial<PanelConfig>) => {
    setPanels((prev) => updatePanel(prev, panelId, updates))
  }

  // Refresh a single panel by ID
  const handleRefresh = (panelId: string) => {
    setPanels((prev) =>
      updatePanel(prev, panelId, { key: Date.now() })
    )
  }

  // Refresh all panels
  const handleRefreshAll = () => {
    setPanels((prev) => {
      const timestamp = Date.now()
      return prev.map((p, i) => ({ ...p, key: timestamp + i }))
    })
  }

  // Add a new panel
  const handleAddPanel = () => {
    setPanels((prev) => addPanel(prev))
  }

  // Remove a panel by ID
  const handleRemovePanel = (panelId: string) => {
    setPanels((prev) => removePanel(prev, panelId))
  }

  // Screenshot all panels (placeholder - would need html2canvas or similar)
  const handleScreenshotAll = () => {
    // For now, just log - could integrate html2canvas later
    console.log("Screenshot all panels - not implemented yet")
    // Could use html2canvas to capture each iframe and combine them
  }

  // Open save dialog for a specific panel
  const handleSavePanel = (panelId: string) => {
    setSavingPanelId(panelId)
    setSaveDialogOpen(true)
  }

  // Get the panel config for the save dialog
  const savingPanelConfig = savingPanelId
    ? panels.find((p) => p.id === savingPanelId) ?? null
    : null

  // Save a component
  const handleSaveComponent = (component: SavedComponent) => {
    setSavedComponents((prev) => [component, ...prev])
  }

  // Delete a component
  const handleDeleteComponent = (id: string) => {
    setSavedComponents((prev) => prev.filter((c) => c.id !== id))
  }

  // Re-run prompt from component
  const handleRerunPrompt = (component: SavedComponent) => {
    setCurrentPrompt(component.prompt)
    navigator.clipboard.writeText(component.prompt)
    setLibraryOpen(false)
  }

  // Save comparison
  const handleSaveComparison = (comparison: SavedComparison) => {
    setSavedComparisons((prev) => [comparison, ...prev])
  }

  // Load comparison
  const handleLoadComparison = (comparison: SavedComparison) => {
    setPanels(comparison.panels)
  }

  // Delete comparison
  const handleDeleteComparison = (id: string) => {
    setSavedComparisons((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <TooltipProvider>
      <div
        className="h-full flex flex-col p-6 gap-4"
        data-tabz-section="prompts-playground"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Beaker className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold font-mono gradient-text-theme terminal-glow">
                Prompts Playground
              </h1>
              <p className="text-sm text-muted-foreground">
                Compare AI models side by side ({panels.length} panel
                {panels.length !== 1 ? "s" : ""})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Workspace Picker */}
            <WorkspacePicker />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 glass rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid Layout</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "horizontal" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("horizontal")}
                  >
                    <Columns className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Horizontal Split</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "vertical" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("vertical")}
                  >
                    <Rows className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Vertical Split</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="flex-shrink-0 space-y-2">
          <Label className="text-xs text-muted-foreground">
            Current Prompt (for reference when saving)
          </Label>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Enter the prompt you're testing across all agents..."
            className="h-20 font-mono text-sm resize-none"
            data-tabz-input="current-prompt"
          />
        </div>

        {/* Main Viewer Area */}
        <div className="flex-1 min-h-0">
          <DynamicPanelViewer
            panels={panels}
            viewMode={viewMode}
            onPanelChange={handlePanelChange}
            onRefresh={handleRefresh}
            onSave={handleSavePanel}
            onRemove={handleRemovePanel}
            onAdd={handleAddPanel}
          />
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0">
          <ComparisonToolbar
            panels={panels}
            savedComparisons={savedComparisons}
            onRefreshAll={handleRefreshAll}
            onScreenshotAll={handleScreenshotAll}
            onOpenLibrary={() => setLibraryOpen(true)}
            onSaveComparison={handleSaveComparison}
            onLoadComparison={handleLoadComparison}
            onDeleteComparison={handleDeleteComparison}
          />
        </div>

        {/* Save Component Dialog */}
        <SaveComponentDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          panelConfig={savingPanelConfig}
          currentPrompt={currentPrompt}
          onSave={handleSaveComponent}
        />

        {/* Component Library */}
        <ComponentLibrary
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          components={savedComponents}
          onDelete={handleDeleteComponent}
          onRerunPrompt={handleRerunPrompt}
        />
      </div>
    </TooltipProvider>
  )
}
