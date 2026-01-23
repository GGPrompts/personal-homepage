"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Bot,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Conversation } from "./Conversation"
import { ChatInput } from "./ChatInput"
import { useAIDrawerOptional } from "@/contexts/AIDrawerContext"

// ============================================================================
// TYPES
// ============================================================================

interface AIDrawerProps {
  /** Additional class name for the drawer container */
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAWER_WIDTHS = {
  collapsed: 0,
  minimized: 320, // Width of minimized header bar
  expanded: 400, // Full expanded width
} as const

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIDrawer({ className = "" }: AIDrawerProps) {
  const context = useAIDrawerOptional()
  const [inputValue, setInputValue] = React.useState('')

  // Don't render if context is not available (outside provider)
  if (!context) return null

  const {
    // Drawer state
    drawer,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    minimizeDrawer,
    restoreDrawer,
    // Chat state
    activeConv,
    isTyping,
    isStreaming,
    availableModels,
    sendMessage,
    stopStreaming,
    handleRegenerate,
    handleFeedback,
    createNewConversation,
    messagesEndRef,
    textareaRef,
  } = context

  // Computed states
  const isOpen = drawer.isOpen
  const isExpanded = drawer.size !== 'collapsed'
  const hasActiveConversation = activeConv?.messages?.length > 0

  // Map drawer states for animation
  const state = drawer.isMinimized ? 'minimized' : (drawer.isOpen ? 'expanded' : 'collapsed')

  // Handle sending message
  const handleSend = async () => {
    if (!inputValue.trim()) return
    const content = inputValue
    setInputValue('')
    await sendMessage(content)
  }

  // Quick actions for empty state
  const quickActions = [
    { label: "Explain this code", onClick: () => setInputValue("Explain this code:") },
    { label: "Debug an error", onClick: () => setInputValue("Help me debug this error:") },
    { label: "Write a function", onClick: () => setInputValue("Write a function that") },
    { label: "Review my changes", onClick: () => setInputValue("Review these code changes:") },
  ]

  return (
    <>
      {/* Floating toggle button - visible when drawer is collapsed */}
      <AnimatePresence>
        {state === "collapsed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-4 z-40"
          >
            <Button
              size="icon"
              onClick={toggleDrawer}
              className="h-14 w-14 rounded-full glass border-glow shadow-lg relative"
              data-tabz-action="toggle-ai-drawer"
              data-tabz-region="ai-drawer-toggle"
            >
              <MessageSquare className="h-6 w-6" />
              {hasActiveConversation && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: DRAWER_WIDTHS.expanded, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: DRAWER_WIDTHS.expanded, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col ${className}`}
            style={{
              width: isExpanded ? DRAWER_WIDTHS.expanded : DRAWER_WIDTHS.minimized,
            }}
            data-tabz-region="ai-drawer"
            data-tabz-section="ai-drawer"
          >
            {/* Minimized state - just a header bar */}
            {state === "minimized" && (
              <MinimizedDrawer
                hasActiveConversation={hasActiveConversation}
                onExpand={restoreDrawer}
                onClose={closeDrawer}
              />
            )}

            {/* Expanded state - full chat interface */}
            {state === "expanded" && (
              <ExpandedDrawer
                hasActiveConversation={hasActiveConversation}
                onMinimize={minimizeDrawer}
                onClose={closeDrawer}
                onNewConversation={createNewConversation}
                // Chat props
                messages={activeConv?.messages || []}
                isTyping={isTyping}
                isStreaming={isStreaming}
                availableModels={availableModels}
                messagesEndRef={messagesEndRef}
                quickActions={quickActions}
                onRegenerate={handleRegenerate}
                onFeedback={handleFeedback}
                // Input props
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSend}
                onStop={stopStreaming}
                textareaRef={textareaRef}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// MINIMIZED DRAWER
// ============================================================================

interface MinimizedDrawerProps {
  hasActiveConversation: boolean
  onExpand: () => void
  onClose: () => void
}

function MinimizedDrawer({
  hasActiveConversation,
  onExpand,
  onClose,
}: MinimizedDrawerProps) {
  return (
    <div className="h-full glass-dark border-l border-border/40 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Bot className="h-4 w-4 text-primary terminal-glow" />
          </div>
          <div>
            <h3 className="text-sm font-semibold terminal-glow">AI Chat</h3>
            {hasActiveConversation && (
              <p className="text-xs text-muted-foreground">Conversation active</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onExpand}
            data-tabz-action="expand-ai-drawer"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            data-tabz-action="close-ai-drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Click to expand area */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-4 hover:bg-primary/5 transition-colors"
        onClick={onExpand}
      >
        <div className="p-3 rounded-full glass">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Click to expand</p>
          <p className="text-xs text-muted-foreground">
            Chat with AI assistants
          </p>
        </div>
      </button>
    </div>
  )
}

// ============================================================================
// EXPANDED DRAWER
// ============================================================================

interface ExpandedDrawerProps {
  hasActiveConversation: boolean
  onMinimize: () => void
  onClose: () => void
  onNewConversation?: () => void
  // Chat props
  messages: import("@/lib/ai-workspace").Message[]
  isTyping?: boolean
  isStreaming?: boolean
  availableModels?: import("@/lib/ai-workspace").ModelInfo[]
  messagesEndRef?: React.RefObject<HTMLDivElement | null>
  quickActions?: Array<{ label: string; onClick: () => void }>
  onRegenerate?: () => void
  onFeedback?: (messageId: string, type: 'up' | 'down') => void
  // Input props
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

function ExpandedDrawer({
  hasActiveConversation,
  onMinimize,
  onClose,
  onNewConversation,
  // Chat props
  messages,
  isTyping = false,
  isStreaming = false,
  availableModels,
  messagesEndRef,
  quickActions,
  onRegenerate,
  onFeedback,
  // Input props
  inputValue,
  onInputChange,
  onSend,
  onStop,
  textareaRef,
}: ExpandedDrawerProps) {
  return (
    <div className="h-full glass-dark border-l border-border/40 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Bot className="h-4 w-4 text-primary terminal-glow" />
          </div>
          <div>
            <h3 className="text-sm font-semibold terminal-glow">AI Chat</h3>
            <p className="text-xs text-muted-foreground">
              {hasActiveConversation ? "Conversation active" : "Start a conversation"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onNewConversation && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onNewConversation}
              title="New conversation"
              data-tabz-action="new-conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMinimize}
            data-tabz-action="minimize-ai-drawer"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            data-tabz-action="close-ai-drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat content area */}
      <Conversation
        messages={messages}
        isTyping={isTyping}
        isStreaming={isStreaming}
        availableModels={availableModels}
        messagesEndRef={messagesEndRef}
        onRegenerate={onRegenerate}
        onFeedback={onFeedback}
        quickActions={quickActions}
        className="flex-1"
      />

      {/* Input area */}
      <div className="p-3 border-t border-border/40 shrink-0">
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          onStop={onStop}
          isStreaming={isStreaming}
          isTyping={isTyping}
          textareaRef={textareaRef}
          placeholder="Ask me anything..."
          showHint={false}
          minHeight="40px"
          maxHeight="100px"
          dataTabzInput="ai-drawer-message"
          dataTabzAction="submit-ai-drawer"
        />
      </div>
    </div>
  )
}

// ============================================================================
// HEADER TOGGLE BUTTON (for use in page header)
// ============================================================================

interface AIDrawerToggleProps {
  className?: string
}

/**
 * Toggle button to open/close the AI drawer
 * Use this in the global header
 */
export function AIDrawerToggle({ className = "" }: AIDrawerToggleProps) {
  const context = useAIDrawerOptional()

  // Don't render if context is not available
  if (!context) return null

  const { drawer, toggleDrawer, activeConv } = context
  const hasActiveConversation = activeConv?.messages?.length > 0

  return (
    <Button
      variant={drawer.isOpen ? "secondary" : "ghost"}
      size="icon"
      onClick={toggleDrawer}
      className={`relative ${className}`}
      data-tabz-action="toggle-ai-drawer"
    >
      <MessageSquare className="h-5 w-5" />
      {hasActiveConversation && !drawer.isOpen && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
    </Button>
  )
}

export default AIDrawer
