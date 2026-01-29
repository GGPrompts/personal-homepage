"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { DynamicBrowserPanel, type PanelResponse } from "./DynamicBrowserPanel"
import type { PanelConfig } from "@/lib/prompts-playground"
import type { VoteType } from "./ResponseVoting"

type ViewMode = "grid" | "horizontal" | "vertical"

// Map of panel ID to response state
export type PanelResponses = Map<string, PanelResponse>

interface DynamicPanelViewerProps {
  panels: PanelConfig[]
  responses?: PanelResponses
  viewMode?: ViewMode
  getVote?: (panelId: string) => VoteType
  getWinner?: () => string | null
  onPanelChange: (panelId: string, config: Partial<PanelConfig>) => void
  onRefresh: (panelId: string) => void
  onSave: (panelId: string) => void
  onRemove: (panelId: string) => void
  onAdd: () => void
  onVote?: (panelId: string, modelId: string | undefined, voteType: VoteType) => void
  onPickWinner?: (panelId: string, modelId: string | undefined) => void
}

export function DynamicPanelViewer({
  panels,
  responses,
  viewMode = "grid",
  getVote,
  getWinner,
  onPanelChange,
  onRefresh,
  onSave,
  onRemove,
  onAdd,
  onVote,
  onPickWinner,
}: DynamicPanelViewerProps) {
  const [fullscreenPanel, setFullscreenPanel] = React.useState<string | null>(
    null
  )

  const handleToggleFullscreen = (panelId: string) => {
    setFullscreenPanel(fullscreenPanel === panelId ? null : panelId)
  }

  const getResponse = (panelId: string) => responses?.get(panelId)

  const winnerId = getWinner?.()

  // Helper to get common props for a panel
  const getPanelVotingProps = (panel: PanelConfig) => ({
    vote: getVote?.(panel.id),
    isWinner: panel.id === winnerId,
    onVote: onVote ? (voteType: VoteType) => onVote(panel.id, panel.modelId, voteType) : undefined,
    onPickWinner: onPickWinner ? () => onPickWinner(panel.id, panel.modelId) : undefined,
  })

  // If a panel is fullscreen, only show that panel
  if (fullscreenPanel !== null) {
    const panel = panels.find((p) => p.id === fullscreenPanel)
    if (!panel) {
      setFullscreenPanel(null)
      return null
    }

    return (
      <div className="h-full" data-tabz-region="panel-viewer">
        <DynamicBrowserPanel
          config={panel}
          response={getResponse(panel.id)}
          isFullscreen={true}
          canRemove={panels.length > 1}
          {...getPanelVotingProps(panel)}
          onConfigChange={(updates) => onPanelChange(panel.id, updates)}
          onRefresh={() => onRefresh(panel.id)}
          onToggleFullscreen={() => handleToggleFullscreen(panel.id)}
          onSave={() => onSave(panel.id)}
          onRemove={() => onRemove(panel.id)}
        />
      </div>
    )
  }

  // Single panel - just show it
  if (panels.length === 1) {
    return (
      <div className="h-full flex flex-col gap-2" data-tabz-region="panel-viewer">
        <div className="flex-1">
          <DynamicBrowserPanel
            config={panels[0]}
            response={getResponse(panels[0].id)}
            isFullscreen={false}
            canRemove={false}
            {...getPanelVotingProps(panels[0])}
            onConfigChange={(updates) => onPanelChange(panels[0].id, updates)}
            onRefresh={() => onRefresh(panels[0].id)}
            onToggleFullscreen={() => handleToggleFullscreen(panels[0].id)}
            onSave={() => onSave(panels[0].id)}
            onRemove={() => onRemove(panels[0].id)}
          />
        </div>
        <AddPanelButton onClick={onAdd} />
      </div>
    )
  }

  // Horizontal split (side by side)
  if (viewMode === "horizontal") {
    return (
      <div className="h-full flex flex-col gap-2" data-tabz-region="panel-viewer">
        <div className="flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {panels.map((panel, index) => (
              <React.Fragment key={panel.id}>
                {index > 0 && (
                  <ResizableHandle withHandle className="bg-border/20" />
                )}
                <ResizablePanel
                  defaultSize={100 / panels.length}
                  minSize={15}
                >
                  <div className="h-full p-1">
                    <DynamicBrowserPanel
                      config={panel}
                      response={getResponse(panel.id)}
                      isFullscreen={false}
                      canRemove={panels.length > 1}
                      {...getPanelVotingProps(panel)}
                      onConfigChange={(updates) =>
                        onPanelChange(panel.id, updates)
                      }
                      onRefresh={() => onRefresh(panel.id)}
                      onToggleFullscreen={() => handleToggleFullscreen(panel.id)}
                      onSave={() => onSave(panel.id)}
                      onRemove={() => onRemove(panel.id)}
                    />
                  </div>
                </ResizablePanel>
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        </div>
        <AddPanelButton onClick={onAdd} />
      </div>
    )
  }

  // Vertical split (stacked)
  if (viewMode === "vertical") {
    return (
      <div className="h-full flex flex-col gap-2" data-tabz-region="panel-viewer">
        <div className="flex-1">
          <ResizablePanelGroup direction="vertical" className="h-full">
            {panels.map((panel, index) => (
              <React.Fragment key={panel.id}>
                {index > 0 && (
                  <ResizableHandle withHandle className="bg-border/20" />
                )}
                <ResizablePanel
                  defaultSize={100 / panels.length}
                  minSize={15}
                >
                  <div className="h-full p-1">
                    <DynamicBrowserPanel
                      config={panel}
                      response={getResponse(panel.id)}
                      isFullscreen={false}
                      canRemove={panels.length > 1}
                      {...getPanelVotingProps(panel)}
                      onConfigChange={(updates) =>
                        onPanelChange(panel.id, updates)
                      }
                      onRefresh={() => onRefresh(panel.id)}
                      onToggleFullscreen={() => handleToggleFullscreen(panel.id)}
                      onSave={() => onSave(panel.id)}
                      onRemove={() => onRemove(panel.id)}
                    />
                  </div>
                </ResizablePanel>
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        </div>
        <AddPanelButton onClick={onAdd} />
      </div>
    )
  }

  // Grid view - auto-layout based on panel count
  return (
    <div className="h-full flex flex-col gap-2" data-tabz-region="panel-viewer">
      <div className="flex-1">
        <GridLayout
          panels={panels}
          responses={responses}
          getVote={getVote}
          winnerId={winnerId}
          onPanelChange={onPanelChange}
          onRefresh={onRefresh}
          onSave={onSave}
          onRemove={onRemove}
          onToggleFullscreen={handleToggleFullscreen}
          onVote={onVote}
          onPickWinner={onPickWinner}
        />
      </div>
      <AddPanelButton onClick={onAdd} />
    </div>
  )
}

interface GridLayoutProps {
  panels: PanelConfig[]
  responses?: PanelResponses
  getVote?: (panelId: string) => VoteType
  winnerId?: string | null
  onPanelChange: (panelId: string, config: Partial<PanelConfig>) => void
  onRefresh: (panelId: string) => void
  onSave: (panelId: string) => void
  onRemove: (panelId: string) => void
  onToggleFullscreen: (panelId: string) => void
  onVote?: (panelId: string, modelId: string | undefined, voteType: VoteType) => void
  onPickWinner?: (panelId: string, modelId: string | undefined) => void
}

function GridLayout({
  panels,
  responses,
  getVote,
  winnerId,
  onPanelChange,
  onRefresh,
  onSave,
  onRemove,
  onToggleFullscreen,
  onVote,
  onPickWinner,
}: GridLayoutProps) {
  // Calculate optimal grid layout
  const count = panels.length
  const cols = count <= 2 ? count : count <= 4 ? 2 : count <= 6 ? 3 : 4
  const rows = Math.ceil(count / cols)

  // Group panels into rows
  const panelRows: PanelConfig[][] = []
  for (let i = 0; i < rows; i++) {
    panelRows.push(panels.slice(i * cols, (i + 1) * cols))
  }

  const getResponse = (panelId: string) => responses?.get(panelId)

  return (
    <ResizablePanelGroup direction="vertical" className="h-full">
      {panelRows.map((row, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {rowIndex > 0 && (
            <ResizableHandle withHandle className="bg-border/20" />
          )}
          <ResizablePanel defaultSize={100 / rows} minSize={15}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {row.map((panel, colIndex) => (
                <React.Fragment key={panel.id}>
                  {colIndex > 0 && (
                    <ResizableHandle withHandle className="bg-border/20" />
                  )}
                  <ResizablePanel
                    defaultSize={100 / row.length}
                    minSize={15}
                  >
                    <div className="h-full p-1">
                      <DynamicBrowserPanel
                        config={panel}
                        response={getResponse(panel.id)}
                        isFullscreen={false}
                        canRemove={panels.length > 1}
                        vote={getVote?.(panel.id)}
                        isWinner={panel.id === winnerId}
                        onConfigChange={(updates) =>
                          onPanelChange(panel.id, updates)
                        }
                        onRefresh={() => onRefresh(panel.id)}
                        onToggleFullscreen={() => onToggleFullscreen(panel.id)}
                        onSave={() => onSave(panel.id)}
                        onRemove={() => onRemove(panel.id)}
                        onVote={onVote ? (voteType: VoteType) => onVote(panel.id, panel.modelId, voteType) : undefined}
                        onPickWinner={onPickWinner ? () => onPickWinner(panel.id, panel.modelId) : undefined}
                      />
                    </div>
                  </ResizablePanel>
                </React.Fragment>
              ))}
            </ResizablePanelGroup>
          </ResizablePanel>
        </React.Fragment>
      ))}
    </ResizablePanelGroup>
  )
}

function AddPanelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="w-full h-8 border-dashed text-muted-foreground hover:text-foreground"
      data-tabz-action="add-panel"
    >
      <Plus className="h-4 w-4 mr-1.5" />
      Add Panel
    </Button>
  )
}
