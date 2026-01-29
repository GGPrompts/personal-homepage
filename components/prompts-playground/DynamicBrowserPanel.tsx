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
  X,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ModelSelector, ModelBadge } from "./ModelSelector"
import type { PanelConfig, AgentConfig } from "@/lib/prompts-playground"
import { getModelById } from "@/lib/models-registry"

interface DynamicBrowserPanelProps {
  config: PanelConfig
  isFullscreen: boolean
  canRemove: boolean
  onConfigChange: (updates: Partial<PanelConfig>) => void
  onRefresh: () => void
  onToggleFullscreen: () => void
  onSave: () => void
  onRemove: () => void
}

export function DynamicBrowserPanel({
  config,
  isFullscreen,
  canRemove,
  onConfigChange,
  onRefresh,
  onToggleFullscreen,
  onSave,
  onRemove,
}: DynamicBrowserPanelProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [iframeError, setIframeError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showModelSelector, setShowModelSelector] = React.useState(false)

  const selectedModel = config.modelId
    ? getModelById(config.modelId)
    : undefined

  const handleUrlChange = (url: string) => {
    onConfigChange({ url })
  }

  const handleLabelChange = (label: string) => {
    onConfigChange({ label })
  }

  const handleModelChange = (modelId: string) => {
    const model = getModelById(modelId)
    if (model) {
      // Update both modelId and agentConfig for compatibility
      onConfigChange({
        modelId,
        agentConfig: {
          cli: model.family === "Claude" ? "claude" : model.family === "GPT" ? "codex" : "gemini",
          model: model.id,
          ...config.agentConfig,
        },
      })
    }
    setShowModelSelector(false)
  }

  const handleAgentConfigChange = (updates: Partial<AgentConfig>) => {
    onConfigChange({
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
      data-tabz-region={`panel-${config.id}`}
    >
      {/* Panel Header */}
      <div className="flex items-center gap-2 p-2 border-b border-border/20 bg-background/50">
        {/* Panel Label */}
        <Input
          value={config.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-24 h-7 text-xs font-medium"
          placeholder="Label..."
          data-tabz-input={`panel-${config.id}-label`}
        />

        {/* Model Badge / Selector */}
        <Popover open={showModelSelector} onOpenChange={setShowModelSelector}>
          <PopoverTrigger asChild>
            <div>
              <ModelBadge
                modelId={config.modelId}
                onClick={() => setShowModelSelector(true)}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <ModelSelector
              value={config.modelId}
              onValueChange={handleModelChange}
            />
          </PopoverContent>
        </Popover>

        {/* URL Input */}
        <Input
          value={config.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="flex-1 h-7 text-xs font-mono"
          placeholder="http://localhost:3001"
          data-tabz-input={`panel-${config.id}-url`}
        />

        {/* Panel Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                data-tabz-action={`refresh-panel-${config.id}`}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={openInNewTab}
                data-tabz-action={`open-panel-${config.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in new tab</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleFullscreen}
                data-tabz-action={`fullscreen-panel-${config.id}`}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </TooltipContent>
          </Tooltip>

          {/* Advanced Agent Config Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="text-sm font-medium">Advanced Config</div>

                <div className="space-y-1">
                  <Label className="text-xs">System Prompt</Label>
                  <Input
                    value={config.agentConfig?.systemPrompt || ""}
                    onChange={(e) =>
                      handleAgentConfigChange({ systemPrompt: e.target.value })
                    }
                    placeholder="Custom instructions..."
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Agent Name</Label>
                  <Input
                    value={config.agentConfig?.agent || ""}
                    onChange={(e) =>
                      handleAgentConfigChange({ agent: e.target.value })
                    }
                    placeholder="e.g., coder, reviewer..."
                    className="h-8 text-xs"
                  />
                </div>

                {selectedModel && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-xs text-muted-foreground font-mono">
                      {selectedModel.cli}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                onClick={onSave}
                data-tabz-action={`save-panel-${config.id}`}
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save component</TooltipContent>
          </Tooltip>

          {canRemove && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/70 hover:text-destructive"
                  onClick={onRemove}
                  data-tabz-action={`remove-panel-${config.id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove panel</TooltipContent>
            </Tooltip>
          )}
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
