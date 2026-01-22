"use client"

import * as React from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { BrowserPanel } from "./BrowserPanel"
import type { PanelConfig } from "@/lib/prompts-playground"

type ViewMode = "quad" | "horizontal" | "vertical"

interface QuadSplitViewerProps {
  panels: [PanelConfig, PanelConfig, PanelConfig, PanelConfig]
  viewMode?: ViewMode
  onPanelChange: (index: number, config: PanelConfig) => void
  onRefresh: (index: number) => void
  onSave: (index: number) => void
}

export function QuadSplitViewer({
  panels,
  viewMode = "quad",
  onPanelChange,
  onRefresh,
  onSave,
}: QuadSplitViewerProps) {
  const [fullscreenPanel, setFullscreenPanel] = React.useState<number | null>(null)

  const handleToggleFullscreen = (index: number) => {
    setFullscreenPanel(fullscreenPanel === index ? null : index)
  }

  // If a panel is fullscreen, only show that panel
  if (fullscreenPanel !== null) {
    return (
      <div className="h-full" data-tabz-region="quad-viewer">
        <BrowserPanel
          config={panels[fullscreenPanel]}
          index={fullscreenPanel}
          isFullscreen={true}
          onConfigChange={(config) => onPanelChange(fullscreenPanel, config)}
          onRefresh={() => onRefresh(fullscreenPanel)}
          onToggleFullscreen={() => handleToggleFullscreen(fullscreenPanel)}
          onSave={() => onSave(fullscreenPanel)}
        />
      </div>
    )
  }

  // Horizontal split: 2 panels side by side
  if (viewMode === "horizontal") {
    return (
      <div className="h-full" data-tabz-region="horizontal-viewer">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-1">
              <BrowserPanel
                config={panels[0]}
                index={0}
                isFullscreen={false}
                onConfigChange={(config) => onPanelChange(0, config)}
                onRefresh={() => onRefresh(0)}
                onToggleFullscreen={() => handleToggleFullscreen(0)}
                onSave={() => onSave(0)}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/20" />

          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-1">
              <BrowserPanel
                config={panels[1]}
                index={1}
                isFullscreen={false}
                onConfigChange={(config) => onPanelChange(1, config)}
                onRefresh={() => onRefresh(1)}
                onToggleFullscreen={() => handleToggleFullscreen(1)}
                onSave={() => onSave(1)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    )
  }

  // Vertical split: 2 panels stacked
  if (viewMode === "vertical") {
    return (
      <div className="h-full" data-tabz-region="vertical-viewer">
        <ResizablePanelGroup direction="vertical" className="h-full">
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-1">
              <BrowserPanel
                config={panels[0]}
                index={0}
                isFullscreen={false}
                onConfigChange={(config) => onPanelChange(0, config)}
                onRefresh={() => onRefresh(0)}
                onToggleFullscreen={() => handleToggleFullscreen(0)}
                onSave={() => onSave(0)}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/20" />

          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-1">
              <BrowserPanel
                config={panels[1]}
                index={1}
                isFullscreen={false}
                onConfigChange={(config) => onPanelChange(1, config)}
                onRefresh={() => onRefresh(1)}
                onToggleFullscreen={() => handleToggleFullscreen(1)}
                onSave={() => onSave(1)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    )
  }

  // Quad view: 2x2 grid (default)
  return (
    <div className="h-full" data-tabz-region="quad-viewer">
      <ResizablePanelGroup direction="vertical" className="h-full">
        {/* Top Row */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full p-1">
                <BrowserPanel
                  config={panels[0]}
                  index={0}
                  isFullscreen={false}
                  onConfigChange={(config) => onPanelChange(0, config)}
                  onRefresh={() => onRefresh(0)}
                  onToggleFullscreen={() => handleToggleFullscreen(0)}
                  onSave={() => onSave(0)}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/20" />

            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full p-1">
                <BrowserPanel
                  config={panels[1]}
                  index={1}
                  isFullscreen={false}
                  onConfigChange={(config) => onPanelChange(1, config)}
                  onRefresh={() => onRefresh(1)}
                  onToggleFullscreen={() => handleToggleFullscreen(1)}
                  onSave={() => onSave(1)}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border/20" />

        {/* Bottom Row */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full p-1">
                <BrowserPanel
                  config={panels[2]}
                  index={2}
                  isFullscreen={false}
                  onConfigChange={(config) => onPanelChange(2, config)}
                  onRefresh={() => onRefresh(2)}
                  onToggleFullscreen={() => handleToggleFullscreen(2)}
                  onSave={() => onSave(2)}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/20" />

            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full p-1">
                <BrowserPanel
                  config={panels[3]}
                  index={3}
                  isFullscreen={false}
                  onConfigChange={(config) => onPanelChange(3, config)}
                  onRefresh={() => onRefresh(3)}
                  onToggleFullscreen={() => handleToggleFullscreen(3)}
                  onSave={() => onSave(3)}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
