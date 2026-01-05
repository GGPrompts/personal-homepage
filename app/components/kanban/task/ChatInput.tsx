"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import { Send, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  onCancel?: () => void
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onCancel,
  disabled = false,
  isStreaming = false,
  placeholder = "Send a message..."
}: ChatInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed && !disabled && !isStreaming) {
      onSend(trimmed)
      setValue("")
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="glass-dark border-t border-white/10 p-4">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          className={cn(
            "flex-1 min-h-[44px] max-h-[150px] resize-none",
            "bg-black/40 border-white/10 text-zinc-200 placeholder:text-zinc-500",
            "focus:ring-emerald-500/50 focus:border-emerald-500/50",
            (disabled || isStreaming) && "opacity-50 cursor-not-allowed"
          )}
          rows={1}
        />
        {isStreaming && onCancel ? (
          <Button
            onClick={onCancel}
            size="icon"
            className={cn(
              "h-11 w-11 shrink-0",
              "bg-red-500/20 border border-red-500/30",
              "hover:bg-red-500/30 hover:border-red-500/50"
            )}
          >
            <Square className="h-4 w-4 text-red-400" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled || isStreaming}
            size="icon"
            className={cn(
              "h-11 w-11 shrink-0",
              "bg-emerald-500/20 border border-emerald-500/30",
              "hover:bg-emerald-500/30 hover:border-emerald-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4 text-emerald-400" />
          </Button>
        )}
      </div>
      <p className="text-[10px] text-zinc-600 mt-2">
        {isStreaming ? "Claude is responding..." : "Press Enter to send, Shift+Enter for new line"}
      </p>
    </div>
  )
}
