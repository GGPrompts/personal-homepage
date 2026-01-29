"use client"

import * as React from "react"
import { Beaker, Grid2X2, Columns, Rows } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DynamicPanelViewer, type PanelResponses } from "@/components/prompts-playground/DynamicPanelViewer"
import { type PanelResponse } from "@/components/prompts-playground/DynamicBrowserPanel"
import { WorkspacePicker, useWorkspace } from "@/components/prompts-playground/WorkspacePicker"
import { PromptInput } from "@/components/prompts-playground/PromptInput"
import { MetricsDisplay } from "@/components/prompts-playground/MetricsDisplay"
import { useVoting, type VoteType } from "@/components/prompts-playground/ResponseVoting"
import { DiffViewer, DiffTriggerButton } from "@/components/prompts-playground/DiffViewer"
import { ExportComparison } from "@/components/prompts-playground/ExportComparison"
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

  // Panel responses - map of panelId -> response state
  const [responses, setResponses] = React.useState<PanelResponses>(new Map())

  // Saved data
  const [savedComponents, setSavedComponents] =
    React.useState<SavedComponent[]>(loadSavedComponents)
  const [savedComparisons, setSavedComparisons] =
    React.useState<SavedComparison[]>(loadSavedComparisons)

  // UI state
  const [currentPrompt, setCurrentPrompt] = React.useState("")
  const [systemPrompt, setSystemPrompt] = React.useState("")
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  const [savingPanelId, setSavingPanelId] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [isRunning, setIsRunning] = React.useState(false)
  const [diffViewerOpen, setDiffViewerOpen] = React.useState(false)

  // Workspace hook
  const [workspace] = useWorkspace()

  // Voting hook
  const { getVote, setVote, pickWinner, getWinner } = useVoting(currentPrompt)

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
    // Also remove any response for this panel
    setResponses((prev) => {
      const next = new Map(prev)
      next.delete(panelId)
      return next
    })
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

  // Voting handlers
  const handleVote = (panelId: string, modelId: string | undefined, voteType: VoteType) => {
    setVote(panelId, modelId, voteType)
  }

  const handlePickWinner = (panelId: string, modelId: string | undefined) => {
    pickWinner(panelId, modelId)
  }

  // Check if we have enough responses for diff viewer
  const responsesWithContent = Array.from(responses.entries()).filter(
    ([, r]) => r.content && !r.isLoading
  )
  const canShowDiff = responsesWithContent.length >= 2

  // Send prompt to all panels with selected models
  const handleSendToAll = async (prompt: string, sysPrompt?: string) => {
    // Get panels with models selected
    const panelsWithModels = panels.filter((p) => p.modelId)

    if (panelsWithModels.length === 0) {
      console.warn("No panels have models selected")
      return
    }

    setIsRunning(true)

    // Initialize all responses as loading
    setResponses((prev) => {
      const next = new Map(prev)
      for (const panel of panelsWithModels) {
        next.set(panel.id, {
          content: "",
          isLoading: true,
        })
      }
      return next
    })

    // Invoke all models in parallel
    const invocations = panelsWithModels.map(async (panel) => {
      try {
        const response = await fetch("/api/prompts-playground/invoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: panel.modelId,
            prompt,
            systemPrompt: sysPrompt || panel.agentConfig?.systemPrompt,
            workspace: workspace || undefined,
          }),
        })

        const result = await response.json()

        // Update this panel's response
        setResponses((prev) => {
          const next = new Map(prev)
          next.set(panel.id, {
            content: result.response || "",
            timing: result.timing,
            error: result.error,
            isLoading: false,
          })
          return next
        })
      } catch (error) {
        // Update with error
        setResponses((prev) => {
          const next = new Map(prev)
          next.set(panel.id, {
            content: "",
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          })
          return next
        })
      }
    })

    await Promise.allSettled(invocations)
    setIsRunning(false)
  }

  // Count loading/total for progress indicator
  const loadingCount = Array.from(responses.values()).filter(
    (r) => r.isLoading
  ).length
  const totalWithModels = panels.filter((p) => p.modelId).length

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
        <div className="flex-shrink-0">
          <PromptInput
            value={currentPrompt}
            onChange={setCurrentPrompt}
            onSendToAll={handleSendToAll}
            isLoading={isRunning}
            loadingCount={loadingCount}
            totalCount={totalWithModels}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
          />
        </div>

        {/* Main Viewer Area */}
        <div className="flex-1 min-h-0">
          <DynamicPanelViewer
            panels={panels}
            responses={responses}
            viewMode={viewMode}
            getVote={getVote}
            getWinner={getWinner}
            onPanelChange={handlePanelChange}
            onRefresh={handleRefresh}
            onSave={handleSavePanel}
            onRemove={handleRemovePanel}
            onAdd={handleAddPanel}
            onVote={handleVote}
            onPickWinner={handlePickWinner}
          />
        </div>

        {/* Metrics Panel (collapsible) */}
        <div className="flex-shrink-0">
          <MetricsDisplay
            panels={panels}
            responses={responses}
          />
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="flex-1">
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

          {/* Phase 3: Diff and Export buttons */}
          <div className="flex items-center gap-2">
            <DiffTriggerButton
              onClick={() => setDiffViewerOpen(true)}
              disabled={!canShowDiff}
            />
            <ExportComparison
              prompt={currentPrompt}
              systemPrompt={systemPrompt}
              workspace={workspace || undefined}
              panels={panels}
              responses={responses}
              getVote={getVote}
              getWinner={getWinner}
            />
          </div>
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

        {/* Diff Viewer Dialog */}
        <DiffViewer
          open={diffViewerOpen}
          onOpenChange={setDiffViewerOpen}
          panels={panels}
          responses={responses}
        />
      </div>
    </TooltipProvider>
  )
}
