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
  Loader2,
  Clock,
  Copy,
  Check,
  Terminal,
  Globe,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ModelSelector, ModelBadge } from "./ModelSelector"
import type { PanelConfig, AgentConfig } from "@/lib/prompts-playground"
import { getModelById, MODEL_FAMILY_BG_COLORS } from "@/lib/models-registry"

// Response state for model invocations
export interface PanelResponse {
  content: string
  timing?: number // ms
  error?: string
  isLoading: boolean
}

type ViewMode = "iframe" | "response"

interface DynamicBrowserPanelProps {
  config: PanelConfig
  response?: PanelResponse
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
  response,
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
  const [isIframeLoading, setIsIframeLoading] = React.useState(true)
  const [showModelSelector, setShowModelSelector] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<ViewMode>(
    response?.content ? "response" : "iframe"
  )

  const selectedModel = config.modelId
    ? getModelById(config.modelId)
    : undefined

  // Auto-switch to response view when response arrives
  React.useEffect(() => {
    if (response?.content && !response.isLoading) {
      setViewMode("response")
    }
  }, [response?.content, response?.isLoading])

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
    setIsIframeLoading(false)
    setIframeError(false)
  }

  const handleIframeError = () => {
    setIsIframeLoading(false)
    setIframeError(true)
  }

  const handleRefresh = () => {
    setIsIframeLoading(true)
    setIframeError(false)
    onRefresh()
  }

  const openInNewTab = () => {
    window.open(config.url, "_blank")
  }

  const handleCopyResponse = async () => {
    if (response?.content) {
      await navigator.clipboard.writeText(response.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatTiming = (ms?: number) => {
    if (!ms) return ""
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Determine if we're in a loading/processing state
  const isProcessing = response?.isLoading

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

        {/* View Mode Toggle (only show if we have a response) */}
        {(response?.content || response?.isLoading) && (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="response" className="h-6 px-2 text-xs gap-1">
                <Terminal className="h-3 w-3" />
                Response
              </TabsTrigger>
              <TabsTrigger value="iframe" className="h-6 px-2 text-xs gap-1">
                <Globe className="h-3 w-3" />
                Browser
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* URL Input (only in iframe mode) */}
        {viewMode === "iframe" && !response?.content && (
          <Input
            value={config.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="flex-1 h-7 text-xs font-mono"
            placeholder="http://localhost:3001"
            data-tabz-input={`panel-${config.id}-url`}
          />
        )}

        {/* Spacer when in response mode */}
        {(viewMode === "response" || response?.content) && (
          <div className="flex-1" />
        )}

        {/* Timing indicator */}
        {response?.timing && !response.isLoading && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTiming(response.timing)}
          </div>
        )}

        {/* Loading indicator */}
        {isProcessing && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Running...</span>
          </div>
        )}

        {/* Panel Actions */}
        <div className="flex items-center gap-1">
          {/* Copy response button */}
          {response?.content && viewMode === "response" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyResponse}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy response</TooltipContent>
            </Tooltip>
          )}

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
                  className={`h-3.5 w-3.5 ${isIframeLoading && viewMode === "iframe" ? "animate-spin" : ""}`}
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

      {/* Content Area */}
      <div className="flex-1 relative bg-background/30 overflow-hidden">
        {viewMode === "response" ? (
          <ResponseView
            response={response}
            model={selectedModel}
            onRetry={handleRefresh}
          />
        ) : (
          <IframeView
            url={config.url}
            frameKey={config.key}
            label={config.label}
            isLoading={isIframeLoading}
            hasError={iframeError}
            iframeRef={iframeRef}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  )
}

// Response view component
interface ResponseViewProps {
  response?: PanelResponse
  model?: ReturnType<typeof getModelById>
  onRetry: () => void
}

function ResponseView({ response, model, onRetry }: ResponseViewProps) {
  const contentRef = React.useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom as content streams in
  React.useEffect(() => {
    if (contentRef.current && response?.isLoading) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [response?.content, response?.isLoading])

  // No model selected
  if (!model) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
        <Terminal className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No model selected</p>
        <p className="text-xs mt-1">Select a model to run prompts</p>
      </div>
    )
  }

  // Loading state
  if (response?.isLoading && !response?.content) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70 mb-3" />
        <p className="text-sm text-muted-foreground">
          Running {model.name}...
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
          {model.cli}
        </p>
      </div>
    )
  }

  // Error state
  if (response?.error && !response?.content) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4">
        <AlertCircle className="h-8 w-8 mb-2 text-red-400/70" />
        <p className="text-sm font-medium text-red-400">Error</p>
        <p className="text-xs mt-2 text-center max-w-md">{response.error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  // No response yet
  if (!response?.content) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
        <Terminal className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Ready to run</p>
        <p className="text-xs mt-1">Enter a prompt and click Send to All</p>
      </div>
    )
  }

  // Response content
  const bgClass = model ? MODEL_FAMILY_BG_COLORS[model.family] : ""

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Response header */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b border-border/20 ${bgClass.split(' ')[0]}`}>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{model.name}</span>
          {response.timing && (
            <span className="text-muted-foreground">
              {response.timing < 1000
                ? `${response.timing}ms`
                : `${(response.timing / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
        {response.isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        )}
        {response.error && (
          <span className="text-xs text-red-400">{response.error}</span>
        )}
      </div>

      {/* Response content */}
      <pre
        ref={contentRef}
        className="flex-1 p-3 overflow-auto text-sm font-mono whitespace-pre-wrap break-words"
      >
        {response.content}
        {response.isLoading && (
          <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse ml-0.5" />
        )}
      </pre>
    </div>
  )
}

// Iframe view component
interface IframeViewProps {
  url: string
  frameKey: number
  label: string
  isLoading: boolean
  hasError: boolean
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onLoad: () => void
  onError: () => void
  onRefresh: () => void
}

function IframeView({
  url,
  frameKey,
  label,
  isLoading,
  hasError,
  iframeRef,
  onLoad,
  onError,
  onRefresh,
}: IframeViewProps) {
  if (hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Cannot load {url}</p>
        <p className="text-xs mt-1">Make sure the dev server is running</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <RefreshCw className="h-6 w-6 animate-spin text-primary/50" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        key={frameKey}
        className="w-full h-full border-0"
        onLoad={onLoad}
        onError={onError}
        title={`${label} preview`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </>
  )
}
