"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Bot,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAIDrawerSafe } from "./AIDrawerProvider"

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
  const context = useAIDrawerSafe()

  // Don't render if context is not available (outside provider)
  if (!context) return null

  const {
    state,
    close,
    expand,
    minimize,
    toggle,
    isOpen,
    isExpanded,
    hasActiveConversation,
  } = context

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
              onClick={toggle}
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
                onExpand={expand}
                onClose={close}
              />
            )}

            {/* Expanded state - full chat interface */}
            {state === "expanded" && (
              <ExpandedDrawer
                hasActiveConversation={hasActiveConversation}
                onMinimize={minimize}
                onClose={close}
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
}

function ExpandedDrawer({
  hasActiveConversation,
  onMinimize,
  onClose,
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

      {/* Chat content area - placeholder for now */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full glass border-glow mb-4">
              <Sparkles className="h-8 w-8 text-primary terminal-glow" />
            </div>
            <h4 className="text-lg font-semibold mb-2 terminal-glow">
              How can I help?
            </h4>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              This is a placeholder for the AI chat interface.
              Full chat functionality will be wired in a separate task.
            </p>

            {/* Quick action suggestions */}
            <div className="mt-6 space-y-2 w-full">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </p>
              <div className="grid gap-2">
                {[
                  "Explain this code",
                  "Debug an error",
                  "Write a function",
                  "Review my changes",
                ].map((action, i) => (
                  <button
                    key={i}
                    className="glass text-left text-sm px-3 py-2 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      // Placeholder - will be wired to chat logic
                      console.log("Quick action:", action)
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Input area - placeholder */}
      <div className="p-3 border-t border-border/40 shrink-0">
        <div className="glass rounded-lg px-3 py-2 text-sm text-muted-foreground">
          <span className="opacity-70">
            Chat input will be added in a separate task...
          </span>
        </div>
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
  const context = useAIDrawerSafe()

  // Don't render if context is not available
  if (!context) return null

  const { toggle, isOpen, hasActiveConversation } = context

  return (
    <Button
      variant={isOpen ? "secondary" : "ghost"}
      size="icon"
      onClick={toggle}
      className={`relative ${className}`}
      data-tabz-action="toggle-ai-drawer"
    >
      <MessageSquare className="h-5 w-5" />
      {hasActiveConversation && !isOpen && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
    </Button>
  )
}

export default AIDrawer
