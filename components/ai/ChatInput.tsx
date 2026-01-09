"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, StopCircle } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface ChatInputProps {
  /** Current input value */
  value: string
  /** Called when input value changes */
  onChange: (value: string) => void
  /** Called when user submits the message */
  onSend: () => void
  /** Called when user clicks stop button */
  onStop?: () => void
  /** Whether the AI is currently streaming a response */
  isStreaming?: boolean
  /** Whether the AI is currently typing/thinking */
  isTyping?: boolean
  /** Placeholder text for the input */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Ref for the textarea element */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  /** Data attribute for TabzChrome */
  dataTabzInput?: string
  /** Data attribute for submit action */
  dataTabzAction?: string
  /** Whether to show the hint text below input */
  showHint?: boolean
  /** Custom class name for the container */
  className?: string
  /** Minimum height of textarea */
  minHeight?: string
  /** Maximum height of textarea */
  maxHeight?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming = false,
  isTyping = false,
  placeholder = "Ask me anything...",
  disabled = false,
  textareaRef,
  dataTabzInput = "chat-message",
  dataTabzAction = "submit-message",
  showHint = true,
  className = "",
  minHeight = "44px",
  maxHeight = "120px",
}: ChatInputProps) {
  const internalRef = React.useRef<HTMLTextAreaElement>(null)
  const effectiveRef = textareaRef || internalRef

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = effectiveRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, parseInt(maxHeight))}px`
    }
  }, [value, maxHeight, effectiveRef])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const isDisabled = disabled || isStreaming || isTyping
  const canSend = value.trim() && !isDisabled

  return (
    <div className={`${className}`}>
      <div className="flex gap-2">
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={effectiveRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Wait for response..." : placeholder}
            disabled={isStreaming}
            className="resize-none glass text-sm sm:text-base"
            style={{
              minHeight: `clamp(${minHeight}, auto, ${maxHeight})`,
              maxHeight: maxHeight,
            }}
            rows={1}
            data-tabz-input={dataTabzInput}
          />
        </div>

        {isStreaming && onStop ? (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Button
              size="icon"
              variant="destructive"
              className="h-[44px] w-[44px] sm:h-[52px] sm:w-[52px] shrink-0"
              onClick={onStop}
            >
              <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </motion.div>
        ) : (
          <Button
            size="icon"
            className="h-[44px] w-[44px] sm:h-[52px] sm:w-[52px] border-glow shrink-0"
            onClick={onSend}
            disabled={!canSend}
            data-tabz-action={dataTabzAction}
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>

      {showHint && (
        <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
          Press Enter to send &middot; Shift+Enter for new line
        </p>
      )}
    </div>
  )
}

export default ChatInput
