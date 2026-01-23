"use client"

import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
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
// ANIMATION VARIANTS
// ============================================================================

// Snappy spring for drawer movement
const drawerSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
}

// Quick transition for micro-interactions
const quickTransition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1] as const,
}

// FAB button variants
const fabVariants = {
  hidden: {
    opacity: 0,
    scale: 0.6,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...drawerSpring,
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.6,
    y: 20,
    transition: quickTransition,
  },
  tap: {
    scale: 0.92,
  },
  hover: {
    scale: 1.05,
  },
}

// Backdrop variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

// Panel variants for reduced motion
const panelVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIDrawer({ className = "" }: AIDrawerProps) {
  const context = useAIDrawerSafe()
  const shouldReduceMotion = useReducedMotion()

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

  // Current width based on state
  const currentWidth = isExpanded ? DRAWER_WIDTHS.expanded : DRAWER_WIDTHS.minimized

  return (
    <>
      {/* Floating toggle button - visible when drawer is collapsed */}
      <AnimatePresence mode="wait">
        {state === "collapsed" && (
          <motion.div
            variants={fabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={shouldReduceMotion ? undefined : "hover"}
            whileTap={shouldReduceMotion ? undefined : "tap"}
            className="fixed bottom-24 right-4 z-40"
          >
            <Button
              size="icon"
              onClick={toggle}
              className="h-14 w-14 rounded-full glass border-glow shadow-lg relative transition-shadow hover:shadow-xl hover:shadow-primary/20"
              data-tabz-action="toggle-ai-drawer"
              data-tabz-region="ai-drawer-toggle"
            >
              <MessageSquare className="h-6 w-6" />
              {hasActiveConversation && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary"
                >
                  <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                </motion.span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop overlay for expanded state */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main drawer panel */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion
              ? panelVariantsReduced.hidden
              : { x: DRAWER_WIDTHS.expanded, opacity: 0 }
            }
            animate={shouldReduceMotion
              ? panelVariantsReduced.visible
              : { x: 0, opacity: 1, width: currentWidth }
            }
            exit={shouldReduceMotion
              ? panelVariantsReduced.exit
              : { x: DRAWER_WIDTHS.expanded, opacity: 0 }
            }
            transition={shouldReduceMotion ? quickTransition : drawerSpring}
            className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col ${className}`}
            style={shouldReduceMotion ? { width: currentWidth } : undefined}
            data-tabz-region="ai-drawer"
            data-tabz-section="ai-drawer"
          >
            {/* Minimized state - just a header bar */}
            <AnimatePresence mode="wait">
              {state === "minimized" && (
                <motion.div
                  key="minimized"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={quickTransition}
                  className="h-full"
                >
                  <MinimizedDrawer
                    hasActiveConversation={hasActiveConversation}
                    onExpand={expand}
                    onClose={close}
                  />
                </motion.div>
              )}

              {/* Expanded state - full chat interface */}
              {state === "expanded" && (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={quickTransition}
                  className="h-full"
                >
                  <ExpandedDrawer
                    hasActiveConversation={hasActiveConversation}
                    onMinimize={minimize}
                    onClose={close}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
          <motion.div
            className="p-1.5 rounded-lg bg-primary/10 border border-primary/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bot className="h-4 w-4 text-primary terminal-glow" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold terminal-glow">AI Chat</h3>
            {hasActiveConversation && (
              <p className="text-xs text-muted-foreground">Conversation active</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
              onClick={onExpand}
              data-tabz-action="expand-ai-drawer"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-colors hover:bg-destructive/20 hover:text-destructive"
              onClick={onClose}
              data-tabz-action="close-ai-drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Click to expand area */}
      <motion.button
        className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-4 transition-colors"
        onClick={onExpand}
        whileHover={{ backgroundColor: "hsl(var(--primary) / 0.05)" }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className="p-3 rounded-full glass"
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <MessageSquare className="h-6 w-6 text-primary" />
        </motion.div>
        <div>
          <p className="text-sm font-medium">Click to expand</p>
          <p className="text-xs text-muted-foreground">
            Chat with AI assistants
          </p>
        </div>
      </motion.button>
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
  // Animation variants for staggered quick actions
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  }

  return (
    <div className="h-full glass-dark border-l border-border/40 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <motion.div
            className="p-1.5 rounded-lg bg-primary/10 border border-primary/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bot className="h-4 w-4 text-primary terminal-glow" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold terminal-glow">AI Chat</h3>
            <p className="text-xs text-muted-foreground">
              {hasActiveConversation ? "Conversation active" : "Start a conversation"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
              onClick={onMinimize}
              data-tabz-action="minimize-ai-drawer"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-colors hover:bg-destructive/20 hover:text-destructive"
              onClick={onClose}
              data-tabz-action="close-ai-drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Chat content area - placeholder for now */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Empty state */}
          <motion.div
            className="flex flex-col items-center justify-center py-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <motion.div
              className="p-4 rounded-full glass border-glow mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px hsl(var(--primary) / 0.4)" }}
            >
              <Sparkles className="h-8 w-8 text-primary terminal-glow" />
            </motion.div>
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
              <motion.div
                className="grid gap-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  "Explain this code",
                  "Debug an error",
                  "Write a function",
                  "Review my changes",
                ].map((action, i) => (
                  <motion.button
                    key={i}
                    variants={itemVariants}
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                      borderColor: "hsl(var(--primary) / 0.5)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="glass text-left text-sm px-3 py-2 rounded-lg transition-colors"
                    onClick={() => {
                      // Placeholder - will be wired to chat logic
                      console.log("Quick action:", action)
                    }}
                  >
                    {action}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </ScrollArea>

      {/* Input area - placeholder */}
      <motion.div
        className="p-3 border-t border-border/40 shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50">
          <span className="opacity-70">
            Chat input will be added in a separate task...
          </span>
        </div>
      </motion.div>
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
