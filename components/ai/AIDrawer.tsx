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
  ChevronDown,
  Check,
  PanelRightClose,
  PanelRight,
  PanelRightOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAIDrawerSafe, DRAWER_WIDTH_VALUES, MINIMIZED_WIDTH } from "./AIDrawerProvider"
import { ChatMessage, TypingIndicator } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { useAuth } from "@/components/AuthProvider"
import { useProjects } from "@/hooks/useProjects"
import { isAvatarUrl } from "@/lib/ai/utils"

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

// Use shared constant from provider for minimized width
const DRAWER_MINIMIZED_WIDTH = MINIMIZED_WIDTH

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
  const { user } = useAuth()
  const userAvatarUrl = user?.user_metadata?.avatar_url || null
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = React.useState(false)
  const [showConversations, setShowConversations] = React.useState(false)
  const [agentPickerOpen, setAgentPickerOpen] = React.useState(false)

  // Hydration-safe: don't render drawer until mounted to avoid server/client mismatch
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

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
    // Agent selection
    selectedAgentId,
    setSelectedAgentId,
    recommendedAgent,
    availableAgents,
    agentsLoading,
    isAgentAutoSelected,
    // Width
    drawerWidth,
    cycleDrawerWidth,
  } = context

  // Get the expanded width from preference
  const expandedWidth = DRAWER_WIDTH_VALUES[drawerWidth]

  // Get the currently selected agent
  const selectedAgent = React.useMemo(() => {
    if (!selectedAgentId) return null
    return availableAgents.find(a => a.id === selectedAgentId) ?? null
  }, [selectedAgentId, availableAgents])

  // Use shared hook for projects
  const { projects: availableProjects, isPinned } = useProjects()

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

  // Don't render until mounted to prevent hydration mismatch with localStorage state
  if (!mounted) return null

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={toggle}
                    className="h-14 w-14 rounded-full glass border-glow shadow-lg relative transition-shadow hover:shadow-xl hover:shadow-primary/20"
                    data-tabz-action="toggle-ai-drawer"
                    data-tabz-region="ai-drawer-toggle"
                    data-tabz-agent={recommendedAgent?.id}
                  >
                    {/* Show recommended agent avatar or fallback to generic icon */}
                    {recommendedAgent ? (
                      <Avatar className="h-8 w-8">
                        {isAvatarUrl(recommendedAgent.avatar) && (
                          <AvatarImage src={recommendedAgent.avatar} alt={recommendedAgent.name} />
                        )}
                        <AvatarFallback className="text-sm bg-transparent">
                          {recommendedAgent.avatar}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <MessageSquare className="h-6 w-6" />
                    )}
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
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{recommendedAgent?.name || 'AI Assistant'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              : { x: expandedWidth, opacity: 0 }
            }
            animate={shouldReduceMotion
              ? panelVariantsReduced.visible
              : { x: 0, opacity: 1, width: isExpanded ? expandedWidth : DRAWER_MINIMIZED_WIDTH }
            }
            exit={shouldReduceMotion
              ? panelVariantsReduced.exit
              : { x: expandedWidth, opacity: 0 }
            }
            transition={shouldReduceMotion ? quickTransition : drawerSpring}
            className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col ${className}`}
            style={shouldReduceMotion ? { width: isExpanded ? expandedWidth : DRAWER_MINIMIZED_WIDTH } : undefined}
            data-tabz-region="ai-drawer"
            data-tabz-section="ai-drawer"
          >
            <AnimatePresence mode="wait">
              {/* Minimized state - conversation list sidebar */}
              {state === "minimized" && (
                <MinimizedDrawer
                  hasActiveConversation={hasActiveConversation}
                  onExpand={expand}
                  onClose={close}
                  isGenerating={isTyping || isStreaming}
                  conversations={conversations}
                  activeConvId={activeConvId}
                  onSelectConversation={setActiveConvId}
                  onNewConversation={createNewConversation}
                  generatingConvs={generatingConvs}
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
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Agent Picker Dropdown */}
                    <DropdownMenu open={agentPickerOpen} onOpenChange={setAgentPickerOpen}>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 hover:bg-primary/20 transition-colors"
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                          data-tabz-action="open-agent-picker"
                        >
                          {selectedAgent ? (
                            <Avatar className="h-5 w-5">
                              {isAvatarUrl(selectedAgent.avatar) && (
                                <AvatarImage src={selectedAgent.avatar} alt={selectedAgent.name} />
                              )}
                              <AvatarFallback className="text-xs bg-transparent">
                                {selectedAgent.avatar}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <Bot className="h-4 w-4 text-primary terminal-glow" />
                          )}
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        {/* No agent / default option */}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAgentId(null)
                            setAgentPickerOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Bot className="h-4 w-4" />
                          <span className="flex-1">Default Assistant</span>
                          {!selectedAgentId && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>

                        {availableAgents.length > 0 && <DropdownMenuSeparator />}

                        {agentsLoading ? (
                          <DropdownMenuItem disabled>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading agents...
                          </DropdownMenuItem>
                        ) : (
                          availableAgents.map(agent => {
                            const isSelected = selectedAgentId === agent.id
                            const isRecommended = recommendedAgent?.id === agent.id
                            return (
                              <DropdownMenuItem
                                key={agent.id}
                                onClick={() => {
                                  setSelectedAgentId(agent.id)
                                  setAgentPickerOpen(false)
                                }}
                                className="flex items-center gap-2"
                              >
                                <Avatar className="h-5 w-5 shrink-0">
                                  {isAvatarUrl(agent.avatar) && (
                                    <AvatarImage src={agent.avatar} alt={agent.name} />
                                  )}
                                  <AvatarFallback className="text-xs bg-transparent">
                                    {agent.avatar}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm truncate">{agent.name}</span>
                                    {isRecommended && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                                        Recommended
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {agent.description}
                                  </p>
                                </div>
                                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                              </DropdownMenuItem>
                            )
                          })
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="min-w-0 flex-1">
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
                        ) : selectedAgent ? (
                          <span className="truncate flex items-center gap-1">
                            {selectedAgent.name}
                            {isAgentAutoSelected && (
                              <span className="text-primary/60">(auto)</span>
                            )}
                          </span>
                        ) : (
                          // TODO: [code-review] availableModels accessed without null check - verify it's always an array
                          <span className="truncate">
                            {availableModels?.find(m => m.id === (activeConv.model || settings.model))?.name || 'Loading...'}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 transition-colors hover:bg-primary/20 hover:text-primary"
                              onClick={cycleDrawerWidth}
                              data-tabz-action="cycle-drawer-width"
                            >
                              {drawerWidth === 'narrow' ? (
                                <PanelRightClose className="h-4 w-4" />
                              ) : drawerWidth === 'default' ? (
                                <PanelRight className="h-4 w-4" />
                              ) : (
                                <PanelRightOpen className="h-4 w-4" />
                              )}
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {drawerWidth === 'narrow' ? 'Narrow' : drawerWidth === 'default' ? 'Default' : 'Wide'} width (click to cycle)
                        </TooltipContent>
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

interface ConversationItem {
  id: string
  title: string
  messages: { role: string; content: string }[]
  updatedAt: Date
  model?: string
  projectPath?: string | null
}

/** Format relative time (e.g., "2h ago", "3d ago") */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Get short model name (e.g., "opus" from "claude-opus-4-5-20251101") */
function getShortModelName(model?: string): string | null {
  if (!model) return null
  // Extract the model type from Claude model names
  if (model.includes('opus')) return 'opus'
  if (model.includes('sonnet')) return 'sonnet'
  if (model.includes('haiku')) return 'haiku'
  // For other models, take the first part
  const parts = model.split('-')
  return parts[0] || model
}

interface MinimizedDrawerProps {
  hasActiveConversation: boolean
  onExpand: () => void
  onClose: () => void
  isGenerating?: boolean
  conversations: ConversationItem[]
  activeConvId: string
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  generatingConvs: Record<string, { startedAt: number; model: string }>
}

function MinimizedDrawer({
  hasActiveConversation,
  onExpand,
  onClose,
  isGenerating = false,
  conversations,
  activeConvId,
  onSelectConversation,
  onNewConversation,
  generatingConvs,
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
            ) : (
              <p className="text-xs text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
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

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* New conversation button */}
          <motion.button
            className="w-full flex items-center gap-2 p-2 rounded-md text-left text-xs transition-colors hover:bg-primary/10 border border-dashed border-border/60 hover:border-primary/40"
            onClick={() => {
              onNewConversation()
              onExpand()
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">New conversation</span>
          </motion.button>

          {/* Conversation items */}
          {conversations.map(conv => {
            const isActive = conv.id === activeConvId
            const isConvGenerating = !!generatingConvs[conv.id]
            const shortModel = getShortModelName(conv.model)
            const timeAgo = formatRelativeTime(conv.updatedAt)
            const projectName = conv.projectPath?.split('/').pop()

            return (
              <motion.button
                key={conv.id}
                className={`w-full flex flex-col gap-1 p-2 rounded-md text-left text-xs transition-colors ${
                  isActive
                    ? 'bg-primary/20 border border-primary/40'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
                onClick={() => {
                  onSelectConversation(conv.id)
                  onExpand()
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Title row */}
                <div className="flex items-center gap-1.5 w-full">
                  <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate flex-1">{conv.title}</span>
                  {isConvGenerating && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                  )}
                </div>

                {/* Meta row: model, time, project */}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-4.5">
                  {shortModel && (
                    <span className="px-1 py-0.5 rounded bg-muted/50 font-medium">
                      {shortModel}
                    </span>
                  )}
                  <span>{timeAgo}</span>
                  {projectName && (
                    <>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-0.5 truncate">
                        <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{projectName}</span>
                      </span>
                    </>
                  )}
                  {!shortModel && !projectName && (
                    <span>{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </motion.button>
            )
          })}

          {conversations.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-[10px] mt-1">Click above to start</p>
            </div>
          )}
        </div>
      </ScrollArea>
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
 * Toggle button to open/close the AI drawer
 * Use this in the global header
 * Shows contextual agent avatar based on current section
 */
export function AIDrawerToggle({ className = "", currentSection }: AIDrawerToggleProps) {
  const context = useAIDrawerSafe()

  // Track if component has mounted (for hydration-safe rendering)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sync currentSection to context when it changes
  React.useEffect(() => {
    if (context && currentSection) {
      context.setCurrentSection(currentSection)
    }
  }, [context, currentSection])

  // Use recommended agent from context (or fall back to local lookup)
  const matchingAgent = context?.recommendedAgent ?? null

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

  // Use ghost variant on server, then sync to actual state after mount
  // This prevents hydration mismatch from localStorage-persisted isOpen state
  const buttonVariant = mounted && isOpen ? "secondary" : "ghost"

  const buttonContent = (
    <Button
      variant={buttonVariant}
      size="icon"
      onClick={toggle}
      className={`relative ${className}`}
      data-tabz-action="toggle-ai-drawer"
    >
      {renderIcon()}
      {mounted && hasActiveConversation && !isOpen && (
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
