"use client"

import * as React from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Bot,
  Sparkles,
  Plus,
  Trash2,
  Settings,
  FolderOpen,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAIDrawerSafe } from "./AIDrawerProvider"
import { ChatMessage, TypingIndicator } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/AuthProvider"
import { mergeProjects, type LocalProject, type GitHubRepo } from "@/lib/projects"
import { useAllProjectsMeta } from "@/hooks/useProjectMeta"
import type { AgentCard } from "@/lib/agents/types"

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
  expanded: 420, // Full expanded width
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

// Staggered quick action variants
const quickActionsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const quickActionItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIDrawer({ className = "" }: AIDrawerProps) {
  const context = useAIDrawerSafe()
  const shouldReduceMotion = useReducedMotion()
  const { user, getGitHubToken } = useAuth()
  const userAvatarUrl = user?.user_metadata?.avatar_url || null
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = React.useState(false)
  const [showConversations, setShowConversations] = React.useState(false)

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
    // Chat functionality
    conversations,
    activeConvId,
    activeConv,
    setActiveConvId,
    createNewConversation,
    deleteConversation,
    clearConversation,
    settings,
    setSettings,
    availableModels,
    modelsLoading,
    generatingConvs,
    isTyping,
    isStreaming,
    sendMessage,
    handleRegenerate,
    handleFeedback,
    stopStreaming,
    textareaRef,
    // Drawer-specific
    inputValue,
    setInputValue,
    selectedProjectPath,
    setSelectedProjectPath,
  } = context

  // Fetch local projects
  const { data: localProjects } = useQuery({
    queryKey: ['local-projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects/local')
      if (!res.ok) return []
      const data = await res.json()
      return (data.projects || []) as LocalProject[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // Fetch GitHub projects
  const { data: githubProjects } = useQuery({
    queryKey: ['github-projects-for-ai-drawer'],
    queryFn: async () => {
      const token = await getGitHubToken()
      if (!token) return []
      const res = await fetch('/api/projects/github', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.repos || []) as GitHubRepo[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // Get pinned status
  const { isPinned } = useAllProjectsMeta()

  // Get all projects with local paths (for cwd), with pinned at top
  const availableProjects = React.useMemo(() => {
    if (!Array.isArray(localProjects) || !Array.isArray(githubProjects)) return []

    const merged = mergeProjects(githubProjects, localProjects)
    const projectsWithLocalPath = merged.filter(p => p.local?.path)

    return projectsWithLocalPath.sort((a, b) => {
      const aPinned = isPinned(a.slug)
      const bPinned = isPinned(b.slug)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return a.name.localeCompare(b.name)
    })
  }, [localProjects, githubProjects, isPinned])

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConv.messages, isTyping, isExpanded])

  const handleSend = () => {
    if (!inputValue.trim()) return
    sendMessage(inputValue, { projectPath: selectedProjectPath })
    setInputValue('')
  }

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt, { projectPath: selectedProjectPath })
  }

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

      {/* Backdrop overlay for expanded state (mobile) */}
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
              : { x: 0, opacity: 1, width: isExpanded ? DRAWER_WIDTHS.expanded : DRAWER_WIDTHS.minimized }
            }
            exit={shouldReduceMotion
              ? panelVariantsReduced.exit
              : { x: DRAWER_WIDTHS.expanded, opacity: 0 }
            }
            transition={shouldReduceMotion ? quickTransition : drawerSpring}
            className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col ${className}`}
            style={shouldReduceMotion ? { width: isExpanded ? DRAWER_WIDTHS.expanded : DRAWER_WIDTHS.minimized } : undefined}
            data-tabz-region="ai-drawer"
            data-tabz-section="ai-drawer"
          >
            <AnimatePresence mode="wait">
              {/* Minimized state - just a header bar */}
              {state === "minimized" && (
                <MinimizedDrawer
                  hasActiveConversation={hasActiveConversation}
                  onExpand={expand}
                  onClose={close}
                  isGenerating={isTyping || isStreaming}
                />
              )}

              {/* Expanded state - full chat interface */}
              {state === "expanded" && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={quickTransition}
                className="h-full glass-dark border-l border-border/40 flex flex-col"
              >
                {/* Header */}
                <div className="p-3 border-b border-border/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <motion.div
                      className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0"
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                    >
                      <Bot className="h-4 w-4 text-primary terminal-glow" />
                    </motion.div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold terminal-glow truncate">
                        {activeConv.title.length > 20 ? activeConv.title.slice(0, 20) + '...' : activeConv.title}
                      </h3>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {(isTyping || isStreaming) ? (
                          <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-primary"
                          >
                            Generating...
                          </motion.span>
                        ) : (
                          <span className="truncate">
                            {availableModels.find(m => m.id === (activeConv.model || settings.model))?.name || 'Loading...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
                              onClick={createNewConversation}
                              data-tabz-action="new-conversation"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>New conversation</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}>
                            <Button
                              variant={showConversations ? 'secondary' : 'ghost'}
                              size="icon"
                              className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
                              onClick={() => setShowConversations(!showConversations)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>Conversations</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}>
                            <Button
                              variant={showSettings ? 'secondary' : 'ghost'}
                              size="icon"
                              className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
                              onClick={() => setShowSettings(!showSettings)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>Settings</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
                        onClick={minimize}
                        data-tabz-action="minimize-ai-drawer"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 transition-colors hover:bg-destructive/20 hover:text-destructive"
                        onClick={close}
                        data-tabz-action="close-ai-drawer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Settings Panel (collapsible) */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-b border-border/40 overflow-hidden"
                    >
                      <div className="p-3 space-y-3">
                        {/* Model Selection */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Model</label>
                          {modelsLoading ? (
                            <div className="glass px-2 py-1.5 text-xs text-muted-foreground rounded">
                              Loading models...
                            </div>
                          ) : (
                            <Select
                              value={settings.model}
                              onValueChange={(value) => setSettings({ ...settings, model: value })}
                            >
                              <SelectTrigger className="glass h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableModels.map(model => (
                                  <SelectItem key={model.id} value={model.id}>
                                    <div className="flex flex-col">
                                      <span className="text-xs">{model.name}</span>
                                      <span className="text-[10px] text-muted-foreground">{model.backend}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Project Selection */}
                        {availableProjects.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Project Context</label>
                            <Select
                              value={selectedProjectPath || "none"}
                              onValueChange={(value) => setSelectedProjectPath(value === "none" ? null : value)}
                            >
                              <SelectTrigger className="glass h-8 text-xs">
                                <FolderOpen className="h-3 w-3 mr-1" />
                                <SelectValue placeholder="No project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground text-xs">No project</span>
                                </SelectItem>
                                {availableProjects.map(project => (
                                  <SelectItem key={project.local!.path} value={project.local!.path}>
                                    <span className="text-xs flex items-center gap-1">
                                      {isPinned(project.slug) && <span className="text-amber-500">*</span>}
                                      {project.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Clear conversation */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs glass"
                          onClick={clearConversation}
                          disabled={activeConv.messages.length === 0}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear conversation
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Conversations Panel (collapsible) */}
                <AnimatePresence>
                  {showConversations && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-b border-border/40 overflow-hidden max-h-48"
                    >
                      <ScrollArea className="h-full max-h-48">
                        <div className="p-2 space-y-1">
                          {conversations.map(conv => (
                            <div
                              key={conv.id}
                              className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${
                                conv.id === activeConvId
                                  ? 'bg-primary/20 border border-primary/40'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => {
                                setActiveConvId(conv.id)
                                setShowConversations(false)
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="truncate font-medium">{conv.title}</span>
                                  {generatingConvs[conv.id] && (
                                    <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {conv.messages.length} messages
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteConversation(conv.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat content area */}
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {activeConv.messages.length === 0 ? (
                      /* Empty state */
                      <motion.div
                        className="flex flex-col items-center justify-center py-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
                        <motion.div
                          className="p-3 rounded-full glass border-glow mb-3"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.05, boxShadow: "0 0 30px hsl(var(--primary) / 0.4)" }}
                        >
                          <Sparkles className="h-6 w-6 text-primary terminal-glow" />
                        </motion.div>
                        <h4 className="text-sm font-semibold mb-1 terminal-glow">
                          How can I help?
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-[260px] mb-4">
                          Ask me anything or choose a quick action below.
                        </p>

                        {/* Quick action suggestions */}
                        <div className="space-y-2 w-full">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Quick Actions
                          </p>
                          <motion.div
                            className="grid gap-1.5"
                            variants={quickActionsContainerVariants}
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
                                variants={quickActionItemVariants}
                                whileHover={shouldReduceMotion ? undefined : { scale: 1.02, x: 4 }}
                                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                                className="glass text-left text-xs px-3 py-2 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                onClick={() => handleQuickAction(action)}
                              >
                                {action}
                              </motion.button>
                            ))}
                          </motion.div>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        {activeConv.messages.map(message => (
                          <ChatMessage
                            key={message.id}
                            message={message}
                            onRegenerate={handleRegenerate}
                            onFeedback={(type) => handleFeedback(message.id, type)}
                            userAvatarUrl={userAvatarUrl}
                            availableModels={availableModels}
                            showActions={true}
                            hideAvatar={true}
                            className="text-sm"
                          />
                        ))}

                        {isTyping && <TypingIndicator />}

                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* Input area */}
                <div className="p-3 border-t border-border/40 shrink-0">
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    onStop={stopStreaming}
                    isStreaming={isStreaming}
                    isTyping={isTyping}
                    textareaRef={textareaRef}
                    placeholder="Ask me anything..."
                    showHint={false}
                    minHeight="36px"
                    maxHeight="80px"
                    className="text-sm"
                  />
                </div>
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
  isGenerating?: boolean
}

function MinimizedDrawer({
  hasActiveConversation,
  onExpand,
  onClose,
  isGenerating = false,
}: MinimizedDrawerProps) {
  return (
    <motion.div
      key="minimized"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={quickTransition}
      className="h-full glass-dark border-l border-border/40 flex flex-col"
    >
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
            {isGenerating ? (
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-xs text-primary"
              >
                Generating...
              </motion.p>
            ) : hasActiveConversation ? (
              <p className="text-xs text-muted-foreground">Conversation active</p>
            ) : (
              <p className="text-xs text-muted-foreground">Start chatting</p>
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
    </motion.div>
  )
}

// ============================================================================
// HEADER TOGGLE BUTTON (for use in page header)
// ============================================================================

interface AIDrawerToggleProps {
  className?: string
  /** Current section/page to show contextual agent avatar */
  currentSection?: string
}

/**
 * Check if a string is a path-based URL (absolute path or full URL)
 */
function isAvatarUrl(str: string): boolean {
  if (str.startsWith('/')) return true
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * Toggle button to open/close the AI drawer
 * Use this in the global header
 * Shows contextual agent avatar based on current section
 */
export function AIDrawerToggle({ className = "", currentSection }: AIDrawerToggleProps) {
  const context = useAIDrawerSafe()

  // Fetch agents to find matching one for current section
  const { data: agentsData } = useQuery<{ agents: AgentCard[] }>({
    queryKey: ['agents-registry'],
    queryFn: async () => {
      const res = await fetch('/api/ai/agents/registry')
      if (!res.ok) throw new Error('Failed to fetch agents')
      return res.json()
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Find agent matching current section
  const matchingAgent = React.useMemo(() => {
    if (!currentSection || !agentsData?.agents) return null
    return agentsData.agents.find(
      (agent) => agent.enabled && agent.sections?.includes(currentSection)
    ) || null
  }, [currentSection, agentsData?.agents])

  // Don't render if context is not available
  if (!context) return null

  const { toggle, isOpen, hasActiveConversation } = context

  // Render avatar or fallback icon
  const renderIcon = () => {
    if (matchingAgent) {
      const avatarIsUrl = isAvatarUrl(matchingAgent.avatar)
      return (
        <Avatar className="h-5 w-5">
          {avatarIsUrl && <AvatarImage src={matchingAgent.avatar} alt={matchingAgent.name} />}
          <AvatarFallback className="text-xs bg-transparent">
            {matchingAgent.avatar}
          </AvatarFallback>
        </Avatar>
      )
    }
    // Fallback to generic icon
    return <MessageSquare className="h-5 w-5" />
  }

  const buttonContent = (
    <Button
      variant={isOpen ? "secondary" : "ghost"}
      size="icon"
      onClick={toggle}
      className={`relative ${className}`}
      data-tabz-action="toggle-ai-drawer"
    >
      {renderIcon()}
      {hasActiveConversation && !isOpen && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
    </Button>
  )

  // Wrap with tooltip if there's a matching agent
  if (matchingAgent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{matchingAgent.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return buttonContent
}

export default AIDrawer
