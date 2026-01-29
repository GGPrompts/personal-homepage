"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, StopCircle } from "lucide-react"

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

// Send button spring animation
const sendButtonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.92 },
  disabled: { scale: 1, opacity: 0.5 },
}

// Stop button pulse animation
const stopButtonVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
}

// Icon animation when sending
const sendIconVariants = {
  idle: { x: 0, y: 0 },
  hover: { x: 2, y: -2 },
  tap: { x: 4, y: -4 },
}

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
  const [isFocused, setIsFocused] = React.useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Auto-resize textarea
  // TODO: [code-review] effectiveRef in dependency array may cause unnecessary re-runs - consider removing
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
        <motion.div
          className="flex-1 relative min-w-0"
          animate={{
            scale: isFocused && !shouldReduceMotion ? 1.01 : 1,
          }}
          transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
        >
          <Textarea
            ref={effectiveRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isStreaming ? "Wait for response..." : placeholder}
            disabled={isStreaming}
            className={`resize-none glass text-xs sm:text-sm transition-all duration-200 ${
              isFocused
                ? 'ring-2 ring-primary/50 border-primary/50 shadow-lg shadow-primary/10'
                : ''
            }`}
            style={{
              minHeight: minHeight,
              maxHeight: maxHeight,
            }}
            rows={1}
            data-tabz-input={dataTabzInput}
          />
        </motion.div>

        {isStreaming && onStop ? (
          <motion.div
            variants={stopButtonVariants}
            animate="pulse"
          >
            <Button
              size="icon"
              variant="destructive"
              className="h-9 w-9 sm:h-[44px] sm:w-[44px] shrink-0 transition-shadow hover:shadow-lg hover:shadow-destructive/30"
              onClick={onStop}
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={sendButtonVariants}
            initial="idle"
            animate={canSend ? "idle" : "disabled"}
            whileHover={canSend && !shouldReduceMotion ? "hover" : undefined}
            whileTap={canSend && !shouldReduceMotion ? "tap" : undefined}
          >
            <Button
              size="icon"
              className={`h-9 w-9 sm:h-[44px] sm:w-[44px] border-glow shrink-0 transition-all duration-200 ${
                canSend ? 'hover:shadow-lg hover:shadow-primary/30' : ''
              }`}
              onClick={onSend}
              disabled={!canSend}
              data-tabz-action={dataTabzAction}
            >
              <motion.div
                variants={sendIconVariants}
                initial="idle"
                animate="idle"
                whileHover={canSend && !shouldReduceMotion ? "hover" : undefined}
                whileTap={canSend && !shouldReduceMotion ? "tap" : undefined}
              >
                <Send className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        )}
      </div>

      {showHint && (
        <motion.p
          className="text-xs text-muted-foreground mt-2 text-center hidden sm:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Press Enter to send &middot; Shift+Enter for new line
        </motion.p>
      )}
    </div>
  )
}

export default ChatInput
