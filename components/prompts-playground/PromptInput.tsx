"use client"

import * as React from "react"
import { Send, Loader2, Wand2, Copy, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useWorkspace } from "./WorkspacePicker"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSendToAll: (prompt: string, systemPrompt?: string) => void
  isLoading: boolean
  loadingCount?: number
  totalCount?: number
  systemPrompt?: string
  onSystemPromptChange?: (value: string) => void
  className?: string
}

export function PromptInput({
  value,
  onChange,
  onSendToAll,
  isLoading,
  loadingCount = 0,
  totalCount = 0,
  systemPrompt = "",
  onSystemPromptChange,
  className = "",
}: PromptInputProps) {
  const [copied, setCopied] = React.useState(false)
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [workspace] = useWorkspace()

  // Extract template variables from prompt
  const templateVars = React.useMemo(() => {
    const matches = value.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    return [...new Set(matches.map((m) => m.slice(2, -2)))]
  }, [value])

  const handleSend = () => {
    if (!value.trim() || isLoading) return
    onSendToAll(value.trim(), systemPrompt?.trim() || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClear = () => {
    onChange("")
    textareaRef.current?.focus()
  }

  return (
    <div className={`space-y-3 ${className}`} data-tabz-region="prompt-input">
      {/* Main Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground font-medium">
            Prompt
          </Label>
          <div className="flex items-center gap-1">
            {templateVars.length > 0 && (
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                {templateVars.length} variable{templateVars.length !== 1 ? "s" : ""}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showSystemPrompt ? "Hide" : "Show"} system prompt
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt... Use {{variable}} for templates."
            className="min-h-[100px] font-mono text-sm resize-none pr-10"
            data-tabz-input="prompt"
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {value && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy prompt</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleClear}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* System Prompt (collapsible) */}
      {showSystemPrompt && onSystemPromptChange && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">
            System Prompt (optional)
          </Label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Custom system instructions for all models..."
            className="min-h-[60px] font-mono text-xs resize-none"
            data-tabz-input="system-prompt"
            disabled={isLoading}
          />
        </div>
      )}

      {/* Template Variables Preview */}
      {templateVars.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Variables:</span>
          {templateVars.map((v) => (
            <code key={v} className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      )}

      {/* Send Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {workspace ? (
            <span className="font-mono">{workspace.replace(/^\/home\/[^/]+/, "~")}</span>
          ) : (
            "No workspace set"
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-muted-foreground">
              Running {loadingCount}/{totalCount}...
            </span>
          )}
          <Button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className="gap-2"
            data-tabz-action="send-to-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to All
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
