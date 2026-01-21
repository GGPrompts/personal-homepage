"use client"

import * as React from "react"
import {
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Save,
  Settings,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PanelConfig, AgentConfig } from "@/lib/prompts-playground"

interface BrowserPanelProps {
  config: PanelConfig
  index: number
  isFullscreen: boolean
  onConfigChange: (config: PanelConfig) => void
  onRefresh: () => void
  onToggleFullscreen: () => void
  onSave: () => void
}

export function BrowserPanel({
  config,
  index,
  isFullscreen,
  onConfigChange,
  onRefresh,
  onToggleFullscreen,
  onSave,
}: BrowserPanelProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [iframeError, setIframeError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  const handleUrlChange = (url: string) => {
    onConfigChange({ ...config, url })
  }

  const handleLabelChange = (label: string) => {
    onConfigChange({ ...config, label })
  }

  const handleAgentConfigChange = (updates: Partial<AgentConfig>) => {
    onConfigChange({
      ...config,
      agentConfig: {
        cli: config.agentConfig?.cli || "claude",
        model: config.agentConfig?.model || "",
        ...config.agentConfig,
        ...updates,
      },
    })
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setIframeError(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setIframeError(true)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setIframeError(false)
    onRefresh()
  }

  const openInNewTab = () => {
    window.open(config.url, "_blank")
  }

  return (
    <div
      className={`flex flex-col h-full glass rounded-lg overflow-hidden ${
        isFullscreen ? "fixed inset-4 z-50" : ""
      }`}
      data-tabz-region={`panel-${index + 1}`}
    >
      {/* Panel Header */}
      <div className="flex items-center gap-2 p-2 border-b border-border/20 bg-background/50">
        {/* Panel Label */}
        <Input
          value={config.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-32 h-7 text-xs font-medium"
          placeholder="Label..."
          data-tabz-input={`panel-${index + 1}-label`}
        />

        {/* URL Input */}
        <Input
          value={config.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="flex-1 h-7 text-xs font-mono"
          placeholder="http://localhost:3001"
          data-tabz-input={`panel-${index + 1}-url`}
        />

        {/* Panel Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            title="Refresh"
            data-tabz-action={`refresh-panel-${index + 1}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={openInNewTab}
            title="Open in new tab"
            data-tabz-action={`open-panel-${index + 1}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            data-tabz-action={`fullscreen-panel-${index + 1}`}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Agent Config Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Agent config"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">CLI</Label>
                  <Select
                    value={config.agentConfig?.cli || "claude"}
                    onValueChange={(v) => handleAgentConfigChange({ cli: v as "claude" | "codex" | "gemini" })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="codex">Codex</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Model</Label>
                  <Input
                    value={config.agentConfig?.model || ""}
                    onChange={(e) => handleAgentConfigChange({ model: e.target.value })}
                    placeholder="e.g., opus, sonnet, o3..."
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Agent</Label>
                  <Input
                    value={config.agentConfig?.agent || ""}
                    onChange={(e) => handleAgentConfigChange({ agent: e.target.value })}
                    placeholder="e.g., coder, reviewer..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
            onClick={onSave}
            title="Save component"
            data-tabz-action={`save-panel-${index + 1}`}
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Iframe Content */}
      <div className="flex-1 relative bg-background/30">
        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Cannot load {config.url}</p>
            <p className="text-xs mt-1">Make sure the dev server is running</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <RefreshCw className="h-6 w-6 animate-spin text-primary/50" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={config.url}
              key={config.key}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={`${config.label} preview`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </>
        )}
      </div>
    </div>
  )
}
