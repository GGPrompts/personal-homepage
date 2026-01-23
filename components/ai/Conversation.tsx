"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage, TypingIndicator } from "./ChatMessage"
import { Sparkles } from "lucide-react"
import type { Message, ModelInfo } from "@/lib/ai-workspace"

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationProps {
  /** Array of messages to display */
  messages: Message[]
  /** Whether the AI is currently typing/thinking */
  isTyping?: boolean
  /** Whether the AI is currently streaming a response */
  isStreaming?: boolean
  /** Available models for display purposes */
  availableModels?: ModelInfo[]
  /** Ref to the end of messages (for auto-scroll) */
  messagesEndRef?: React.RefObject<HTMLDivElement | null>
  /** User's avatar URL */
  userAvatarUrl?: string | null
  /** Whether TabzChrome is connected */
  tabzConnected?: boolean
  /** Called when copy button is clicked */
  onCopy?: (message: Message) => void
  /** Called when regenerate button is clicked */
  onRegenerate?: () => void
  /** Called when feedback is given */
  onFeedback?: (messageId: string, type: 'up' | 'down') => void
  /** Called when code should be sent to terminal */
  onSendToTerminal?: (code: string, language: string) => void
  /** Called when code should be sent to chat */
  onSendToChat?: (code: string) => void
  /** Custom class name */
  className?: string
  /** Custom empty state content */
  emptyState?: React.ReactNode
  /** Quick action buttons for empty state */
  quickActions?: Array<{
    label: string
    onClick: () => void
  }>
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  emptyState?: React.ReactNode
  quickActions?: ConversationProps['quickActions']
}

function EmptyState({ emptyState, quickActions }: EmptyStateProps) {
  if (emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full glass border-glow mb-4">
        <Sparkles className="h-8 w-8 text-primary terminal-glow" />
      </div>
      <h4 className="text-lg font-semibold mb-2 terminal-glow">
        How can I help?
      </h4>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Ask me anything about your code, projects, or ideas.
      </p>

      {quickActions && quickActions.length > 0 && (
        <div className="mt-6 space-y-2 w-full max-w-[280px]">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Quick Actions
          </p>
          <div className="grid gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="glass text-left text-sm px-3 py-2 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Conversation container component with auto-scroll during streaming.
 * Wraps a list of messages with smooth animations and scroll behavior.
 */
export function Conversation({
  messages,
  isTyping = false,
  isStreaming = false,
  availableModels,
  messagesEndRef,
  userAvatarUrl,
  tabzConnected = false,
  onCopy,
  onRegenerate,
  onFeedback,
  onSendToTerminal,
  onSendToChat,
  className = "",
  emptyState,
  quickActions,
}: ConversationProps) {
  const internalEndRef = React.useRef<HTMLDivElement>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const effectiveEndRef = messagesEndRef || internalEndRef

  // Auto-scroll to bottom when streaming or when new messages arrive
  React.useEffect(() => {
    if (isStreaming || isTyping) {
      // During streaming, use immediate scroll
      effectiveEndRef.current?.scrollIntoView({ behavior: 'auto' })
    } else if (messages.length > 0) {
      // For new messages, use smooth scroll
      effectiveEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isStreaming, effectiveEndRef])

  // Also scroll on content changes during streaming (for long responses)
  const lastMessage = messages[messages.length - 1]
  const lastMessageContent = lastMessage?.content || ''

  React.useEffect(() => {
    if (isStreaming && lastMessage?.isStreaming) {
      effectiveEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [lastMessageContent, isStreaming, lastMessage?.isStreaming, effectiveEndRef])

  const hasMessages = messages.length > 0

  return (
    <ScrollArea ref={scrollAreaRef} className={`flex-1 ${className}`}>
      <div className="p-4">
        {!hasMessages && !isTyping ? (
          <EmptyState emptyState={emptyState} quickActions={quickActions} />
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  availableModels={availableModels}
                  userAvatarUrl={userAvatarUrl}
                  tabzConnected={tabzConnected}
                  onCopy={onCopy ? () => onCopy(message) : undefined}
                  onRegenerate={message.role === 'assistant' ? onRegenerate : undefined}
                  onFeedback={message.role === 'assistant'
                    ? (type) => onFeedback?.(message.id, type)
                    : undefined
                  }
                  onSendToTerminal={onSendToTerminal}
                  onSendToChat={onSendToChat}
                />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={effectiveEndRef as React.RefObject<HTMLDivElement>} className="h-px" />
      </div>
    </ScrollArea>
  )
}

export default Conversation
