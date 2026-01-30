"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/AuthProvider"
// Slider removed - settings simplified
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  MessageSquare, Bot, X, Trash2, Cpu, FolderOpen,
  Download, Settings, Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AgentGallery } from "@/components/agents/AgentGallery"
import { AgentBuilderForm } from "@/components/agents/AgentBuilderForm"
import type { AgentCard, CreateAgentInput } from "@/lib/agents/types"
import { useSearchParams } from "next/navigation"
import { useTabzBridge } from "@/hooks/useTabzBridge"
import { TabzConnectionStatus } from "@/components/TabzConnectionStatus"
import { useAgents } from "@/hooks/useAgents"
import { useProjects } from "@/hooks/useProjects"
import { isEmoji, isAvatarUrl } from "@/lib/ai/utils"
import { BackendIcon } from "@/lib/ai/backend-icons"
import {
  type Conversation,
  DEFAULT_SUGGESTED_PROMPTS,
  DEFAULT_SETTINGS,
  exportConversationToMarkdown,
  downloadMarkdown,
  generateCompactPrompt,
  generateId,
} from "@/lib/ai-workspace"
import { useAIDrawer } from "@/components/ai/AIDrawerProvider"
import { ChatMessage, TypingIndicator } from "@/components/ai/ChatMessage"
import { ChatInput } from "@/components/ai/ChatInput"
import { ConversationSidebar } from "@/components/ai/ConversationSidebar"
import { SettingsPanel } from "@/components/ai/SettingsPanel"
import { ContextIndicator, ContextWarningBanner, calculateContextUsage } from "@/components/ai/ContextIndicator"

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIWorkspaceSection({
  activeSubItem,
  onSubItemHandled,
  initialProjectPath,
  onProjectPathConsumed,
  defaultWorkingDir,
  onNavigateToSection,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
  initialProjectPath?: string | null
  onProjectPathConsumed?: () => void
  defaultWorkingDir?: string | null
  onNavigateToSection?: (section: string, path?: string) => void
}) {
  // Auth for user avatar
  const { user } = useAuth()
  const userAvatarUrl = user?.user_metadata?.avatar_url || null

  // TabzChrome bridge for bi-directional communication
  const {
    isConnected: tabzConnected,
    lastReceivedCommand,
    clearLastCommand,
    sendToChat: tabzSendToChat,
    spawnTerminal: tabzSpawnTerminal,
  } = useTabzBridge()

  // Use shared drawer context for chat functionality (single source of truth)
  const drawer = useAIDrawer()
  const {
    conversations,
    activeConvId,
    activeConv,
    setActiveConvId,
    createNewConversation,
    deleteConversation,
    clearConversation,
    setConversations,
    settings,
    setSettings,
    availableModels,
    backends,
    modelsLoading,
    generatingConvs,
    isTyping,
    isStreaming,
    sendMessage,
    handleRegenerate,
    handleFeedback,
    stopStreaming,
    textareaRef,
    messagesEndRef,
    // Drawer-specific for section tracking
    setCurrentSection,
    setSelectedAgentId: setDrawerAgentId,
  } = drawer

  // Track that we're on the AI Workspace section
  React.useEffect(() => {
    setCurrentSection('ai-workspace')
    return () => setCurrentSection(null)
  }, [setCurrentSection])

  // Local state for UI
  const [inputValue, setInputValue] = React.useState('')
  const [showSettings, setShowSettings] = React.useState(false)
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [showAgentGallery, setShowAgentGallery] = React.useState(false)
  const [selectedAgent, setSelectedAgent] = React.useState<AgentCard | null>(null)
  const [availableAgents, setAvailableAgents] = React.useState<{ name: string; description: string; model?: string; filename: string }[]>([])
  // Initialize from persisted settings (globalProjectPath)
  const [selectedProjectPath, setSelectedProjectPath] = React.useState<string | null>(() => {
    return settings.globalProjectPath ?? null
  })
  // Agent editor wizard state
  const [showAgentWizard, setShowAgentWizard] = React.useState(false)
  const [editingAgent, setEditingAgent] = React.useState<AgentCard | null>(null)

  // Track if user has dismissed the context warning for this conversation
  const [contextWarningDismissed, setContextWarningDismissed] = React.useState<Set<string>>(new Set())

  const selectedModel = availableModels.find(m => m.id === settings.model)
  const searchParams = useSearchParams()

  // Use shared hooks for agents and projects
  const { agents: registryAgents, isLoading: agentsLoading, getById: getAgentById, refetch: refetchAgents } = useAgents()
  const { projects: availableProjects, isPinned } = useProjects()

  // Compute effective working directory with fallback chain:
  // 1. User-selected project path (explicit selection)
  // 2. Agent's workingDir (if agent has one configured)
  // 3. Global defaultWorkingDir (from sidebar)
  const effectiveWorkingDir = React.useMemo(() => {
    if (selectedProjectPath) {
      return { path: selectedProjectPath, source: 'selected' as const }
    }
    if (selectedAgent?.workingDir) {
      return { path: selectedAgent.workingDir, source: 'agent' as const }
    }
    if (defaultWorkingDir) {
      return { path: defaultWorkingDir, source: 'global' as const }
    }
    return null
  }, [selectedProjectPath, selectedAgent?.workingDir, defaultWorkingDir])

  // Handle URL query param for project selection
  React.useEffect(() => {
    const projectParam = searchParams.get('project')
    if (projectParam && availableProjects.length > 0) {
      const project = availableProjects.find(p => p.local?.path === projectParam)
      if (project?.local?.path) {
        setSelectedProjectPath(project.local.path)
      }
    }
  }, [searchParams, availableProjects])

  // Handle initial project path from parent navigation
  React.useEffect(() => {
    if (initialProjectPath && availableProjects.length > 0) {
      const project = availableProjects.find(p => p.local?.path === initialProjectPath)
      if (project?.local?.path) {
        setSelectedProjectPath(project.local.path)
      }
      onProjectPathConsumed?.()
    }
  }, [initialProjectPath, availableProjects, onProjectPathConsumed])

  // Use defaultWorkingDir as initial selection if no other path is set
  React.useEffect(() => {
    // Only apply if no project is selected and no explicit initialProjectPath was provided
    if (selectedProjectPath === null && !initialProjectPath && defaultWorkingDir && availableProjects.length > 0) {
      const project = availableProjects.find(p => p.local?.path === defaultWorkingDir)
      if (project?.local?.path) {
        setSelectedProjectPath(project.local.path)
      }
    }
  }, [defaultWorkingDir, availableProjects, selectedProjectPath, initialProjectPath])

  // Persist selectedProjectPath to settings (localStorage) when it changes
  React.useEffect(() => {
    // Only update if the value actually differs from persisted settings
    if (settings.globalProjectPath !== selectedProjectPath) {
      setSettings(prev => ({ ...prev, globalProjectPath: selectedProjectPath }))
    }
  }, [selectedProjectPath])


  // Restore model and project context when switching conversations
  React.useEffect(() => {
    if (activeConv.model && activeConv.model !== settings.model) {
      setSettings(prev => ({ ...prev, model: activeConv.model! }))
    }
    if (!initialProjectPath && activeConv.projectPath !== undefined && activeConv.projectPath !== selectedProjectPath) {
      setSelectedProjectPath(activeConv.projectPath)
    }
  }, [activeConvId, initialProjectPath])

  // Responsive sidebar - hide on mobile by default
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowSidebar(false)
      } else {
        setShowSidebar(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Handle incoming commands from TabzChrome - pre-fill input and focus
  React.useEffect(() => {
    if (lastReceivedCommand) {
      setInputValue(lastReceivedCommand)
      clearLastCommand()
      textareaRef.current?.focus()
    }
  }, [lastReceivedCommand, clearLastCommand])

  const handleSend = () => {
    if (!inputValue.trim()) return
    sendMessage(inputValue, { projectPath: effectiveWorkingDir?.path || null })
    setInputValue('')
  }

  const handleExportConversation = () => {
    const markdown = exportConversationToMarkdown(activeConv)
    const filename = `${activeConv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`
    downloadMarkdown(markdown, filename)
  }

  const handleSelectAgent = (agent: AgentCard) => {
    setSelectedAgent(agent)
    // Sync with drawer context so state is shared
    setDrawerAgentId(agent.id)
    // Update settings with agent's mode for context isolation
    setSettings(prev => ({
      ...prev,
      agentMode: agent.mode,
      agentDir: agent.workingDir ?? undefined,
    }))
    // Also update the active conversation's agentId for persistence
    setConversations(prev => prev.map(conv =>
      conv.id === activeConvId
        ? { ...conv, agentId: agent.id, updatedAt: new Date() }
        : conv
    ))
    setShowAgentGallery(false)
  }

  // Start a new conversation with a specific agent (from landing page gallery)
  const handleStartChatWithAgent = (agent: AgentCard) => {
    // Handle vanilla agents (no custom configuration) specially
    const isVanilla = agent.id.startsWith('__vanilla_')

    if (isVanilla) {
      setSelectedAgent(null)
      setDrawerAgentId(null)  // Sync with drawer
      setSettings(prev => ({
        ...prev,
        agentMode: undefined,
        agentDir: undefined,
      }))
    } else {
      setSelectedAgent(agent)
      setDrawerAgentId(agent.id)  // Sync with drawer
      // Update settings with agent's mode for context isolation
      setSettings(prev => ({
        ...prev,
        agentMode: agent.mode,
        agentDir: agent.workingDir ?? undefined,
      }))
    }

    // Compute effective working dir for this conversation
    // Priority: agent.workingDir > defaultWorkingDir > selectedProjectPath
    const convWorkingDir = isVanilla
      ? (defaultWorkingDir || selectedProjectPath)
      : (agent.workingDir || defaultWorkingDir || selectedProjectPath)

    // Create a new conversation (with or without agent)
    const newConv: Conversation = {
      id: generateId(),
      title: isVanilla ? 'New Conversation' : `Chat with ${agent.name}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: settings.model,
      projectPath: convWorkingDir,
      agentId: isVanilla ? undefined : agent.id,
    }

    setConversations(prev => [newConv, ...prev])
    setActiveConvId(newConv.id)
  }

  const handleClearAgent = () => {
    setSelectedAgent(null)
    setDrawerAgentId(null)  // Sync with drawer
    setSettings(prev => ({
      ...prev,
      systemPrompt: '',
    }))
  }

  const handleContinueInNewChat = () => {
    const compactPrompt = generateCompactPrompt(activeConv)

    const newConv: Conversation = {
      id: generateId(),
      title: `Continued: ${activeConv.title}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: activeConv.model || settings.model,
      projectPath: activeConv.projectPath ?? selectedProjectPath,
      settings: activeConv.settings || {
        systemPrompt: settings.systemPrompt,
        claudeModel: settings.claudeModel,
        additionalDirs: settings.additionalDirs,
        allowedTools: settings.allowedTools,
        disallowedTools: settings.disallowedTools,
        permissionMode: settings.permissionMode,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      },
      claudeSessionId: null,
    }

    setConversations(prev => [newConv, ...prev])
    setActiveConvId(newConv.id)

    setTimeout(() => {
      sendMessage(compactPrompt, { projectPath: newConv.projectPath })
    }, 100)
  }

  const dismissContextWarning = () => {
    setContextWarningDismissed(prev => new Set(prev).add(activeConvId))
  }

  // Agent wizard handlers
  const handleNewAgent = () => {
    setEditingAgent(null)
    setShowAgentWizard(true)
  }

  const handleEditAgent = (agent: AgentCard) => {
    setEditingAgent(agent)
    setShowAgentWizard(true)
  }

  const handleDeleteAgent = async (agent: AgentCard) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) return

    try {
      const res = await fetch(`/api/ai/agents/${encodeURIComponent(agent.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete agent')
      // Refresh agents list via React Query refetch
      refetchAgents()
      // Clear selected agent if it was the deleted one
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent(null)
        setSettings(prev => ({ ...prev, systemPrompt: '' }))
      }
    } catch (error) {
      console.error('Failed to delete agent:', error)
    }
  }

  const handleAgentCreated = async (agentInput: CreateAgentInput) => {
    try {
      const isEditing = !!editingAgent
      const url = isEditing
        ? `/api/ai/agents/${encodeURIComponent(editingAgent!.id)}`
        : '/api/ai/agents/registry'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentInput),
      })

      if (!res.ok) throw new Error('Failed to save agent')

      const savedAgent = await res.json()

      // Refresh agents list via React Query refetch
      refetchAgents()

      // If we were editing the currently selected agent, update it
      if (isEditing && selectedAgent?.id === editingAgent!.id && savedAgent.agent) {
        setSelectedAgent(savedAgent.agent)
        setSettings(prev => ({
          ...prev,
          systemPrompt: savedAgent.agent.system_prompt,
          temperature: savedAgent.agent.config?.temperature ?? prev.temperature,
        }))
      }

      // Close the wizard
      setShowAgentWizard(false)
      setEditingAgent(null)
    } catch (error) {
      console.error('Failed to save agent:', error)
    }
  }

  // Determine if a conversation is persistent (JSONL saved)
  // Claude backend saves to JSONL, others are session-only
  const isConversationPersistent = React.useCallback((conv: Conversation) => {
    const modelInfo = availableModels.find(m => m.id === conv.model)
    return modelInfo?.backend === 'claude'
  }, [availableModels])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden" data-tabz-section="ai-workspace">
      {/* Conversations Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <ConversationSidebar
            conversations={conversations}
            activeConvId={activeConvId}
            onSelectConversation={setActiveConvId}
            onCreateNew={createNewConversation}
            onDeleteConversation={deleteConversation}
            generatingConvs={generatingConvs}
            availableModels={availableModels}
            getAgentById={getAgentById}
            isConversationPersistent={isConversationPersistent}
          />
        )}
      </AnimatePresence>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <div className="glass-dark border-b border-border/40 px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="shrink-0 lg:hidden"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Agent/Bot icon - show agent avatar if selected, otherwise Bot icon */}
              {(() => {
                const agent = selectedAgent || (activeConv.agentId ? getAgentById(activeConv.agentId) : null)
                return agent ? (
                  <Avatar className="h-9 w-9 shrink-0 hidden sm:flex ring-1 ring-primary/20">
                    {isAvatarUrl(agent.avatar) ? (
                      <AvatarImage src={agent.avatar} alt={agent.name} />
                    ) : null}
                    <AvatarFallback className="text-base bg-primary/10">
                      {isEmoji(agent.avatar)
                        ? agent.avatar
                        : <BackendIcon agent={agent} className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0 hidden sm:flex">
                    <Bot className="h-5 w-5 text-primary terminal-glow" />
                  </div>
                )
              })()}
              <div className="min-w-0">
                <h2 className="font-semibold terminal-glow truncate">{activeConv.title}</h2>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {availableModels.find(m => m.id === (activeConv.model || settings.model))?.name || 'Loading...'}
                    </span>
                  </span>
                  {(isTyping || isStreaming) && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-primary text-xs"
                    >
                      Generating
                    </motion.span>
                  )}
                  {activeConv.claudeSessionId && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 cursor-help">
                            <span className="text-[10px]">Session:</span>
                            <code className="text-[10px] font-mono">{activeConv.claudeSessionId.slice(0, 8)}...</code>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-mono text-xs break-all">{activeConv.claudeSessionId}</p>
                          <p className="text-muted-foreground text-xs mt-1">Claude will remember conversation context</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Context Usage Indicator */}
                  <ContextIndicator
                    conversation={activeConv}
                    isTyping={isTyping}
                    isStreaming={isStreaming}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <TabzConnectionStatus size="sm" className="hidden sm:flex" />

            {/* Working Directory Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select
                    value={selectedProjectPath || "none"}
                    onValueChange={(value) => setSelectedProjectPath(value === "none" ? null : value)}
                  >
                    <SelectTrigger
                      className={`w-[140px] sm:w-[180px] h-9 glass text-xs ${
                        effectiveWorkingDir ? 'border-primary/30' : ''
                      }`}
                      data-tabz-input="project-selector"
                    >
                      <FolderOpen className={`h-3 w-3 mr-1 shrink-0 ${
                        effectiveWorkingDir ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <span className="truncate">
                        {effectiveWorkingDir
                          ? effectiveWorkingDir.path.split('/').pop()
                          : 'No project'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">
                          {effectiveWorkingDir && effectiveWorkingDir.source !== 'selected'
                            ? `Use ${effectiveWorkingDir.source} default`
                            : 'No project context'}
                        </span>
                      </SelectItem>
                      {availableProjects.map(project => (
                        <SelectItem key={project.local!.path} value={project.local!.path}>
                          <span className="flex items-center gap-1">
                            {isPinned(project.slug) && <span className="text-amber-500">*</span>}
                            {project.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {effectiveWorkingDir ? (
                    <div className="text-xs">
                      <div className="font-medium">Working directory</div>
                      <div className="text-muted-foreground truncate">{effectiveWorkingDir.path}</div>
                      <div className="text-muted-foreground/70 mt-1">
                        Source: {effectiveWorkingDir.source === 'selected' ? 'manually selected' :
                                effectiveWorkingDir.source === 'agent' ? 'agent config' : 'global setting'}
                      </div>
                    </div>
                  ) : (
                    <span>Select a project for context</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Agent Gallery Button */}
            <Dialog open={showAgentGallery} onOpenChange={setShowAgentGallery}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant={selectedAgent ? 'secondary' : 'ghost'}
                        size="icon"
                        className="relative"
                        data-tabz-action="open-agent-gallery"
                      >
                        <Users className="h-4 w-4" />
                        {selectedAgent && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    {selectedAgent ? `Agent: ${selectedAgent.name}` : 'Select an AI Agent'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent className="max-w-3xl max-h-[80vh] glass-dark overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Select AI Agent
                  </DialogTitle>
                </DialogHeader>
                <div className="h-[60vh] overflow-hidden min-w-0 w-full">
                  <AgentGallery
                    agents={registryAgents}
                    selectedAgentId={selectedAgent?.id}
                    onSelectAgent={handleSelectAgent}
                    onEditAgent={handleEditAgent}
                    onNewAgent={handleNewAgent}
                    onDeleteAgent={handleDeleteAgent}
                    isLoading={agentsLoading}
                    editable={true}
                  />
                </div>
                {selectedAgent && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active:</span>
                      <Badge variant="secondary">{selectedAgent.name}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearAgent}>
                      <X className="h-3 w-3 mr-1" />
                      Clear Agent
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Agent Builder Form */}
            <AgentBuilderForm
              open={showAgentWizard}
              onOpenChange={setShowAgentWizard}
              onAgentCreated={handleAgentCreated}
              initialData={editingAgent || undefined}
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleExportConversation}
                    disabled={activeConv.messages.length === 0}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as markdown</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearConversation}
                    disabled={activeConv.messages.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <Button
              variant={showSettings ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              data-tabz-action="open-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full box-border" key={activeConvId}>
              {activeConv.messages.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full py-12"
                >
                  {/* Empty state - show agent info (if selected) and suggested prompts */}
                  {(() => {
                    const agent = activeConv.agentId ? getAgentById(activeConv.agentId) : null
                    return (
                      <div className="text-center space-y-6 max-w-2xl">
                        {agent ? (
                          <div className="flex flex-col items-center gap-3">
                            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                              {isAvatarUrl(agent.avatar) ? (
                                <AvatarImage src={agent.avatar} alt={agent.name} />
                              ) : null}
                              <AvatarFallback className="text-2xl bg-primary/20">
                                {isEmoji(agent.avatar)
                                  ? agent.avatar
                                  : <BackendIcon agent={agent} className="h-8 w-8" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-lg font-semibold terminal-glow">{agent.name}</h3>
                              <p className="text-sm text-muted-foreground">{agent.description}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                              <MessageSquare className="h-8 w-8 text-primary/60" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold terminal-glow">Start a conversation</h3>
                              <p className="text-sm text-muted-foreground">
                                Type a message below or select an agent from the header
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-muted-foreground">
                          Try one of these prompts:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS).slice(0, 4).map((prompt, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              className="glass h-auto py-3 px-4 text-left justify-start"
                              onClick={() => {
                                setInputValue(prompt.text)
                                textareaRef.current?.focus()
                              }}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <Badge variant="secondary" className="text-xs">{prompt.category}</Badge>
                                <span className="text-sm">{prompt.text}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              ) : (
                <>
                  {/* Context Warning Banner */}
                  {(() => {
                    const { contextStatus, contextPercentage } = calculateContextUsage(activeConv, isTyping, isStreaming)
                    return (
                      <ContextWarningBanner
                        contextStatus={contextStatus}
                        contextPercentage={contextPercentage}
                        isDismissed={contextWarningDismissed.has(activeConvId)}
                        onContinueInNewChat={handleContinueInNewChat}
                        onDismiss={dismissContextWarning}
                      />
                    )
                  })()}

                  {activeConv.messages.map(message => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onCopy={() => {}}
                      onRegenerate={handleRegenerate}
                      onFeedback={(type) => handleFeedback(message.id, type)}
                      onSendToTerminal={(code, lang) => tabzSpawnTerminal(code, { name: `Run ${lang}` })}
                      onSendToChat={tabzSendToChat}
                      tabzConnected={tabzConnected}
                      userAvatarUrl={userAvatarUrl}
                      availableModels={availableModels}
                    />
                  ))}

                  {isTyping && <TypingIndicator />}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="glass-dark border-t border-border/40 p-2 sm:p-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              onStop={stopStreaming}
              isStreaming={isStreaming}
              isTyping={isTyping}
              textareaRef={textareaRef}
            />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            selectedAgent={selectedAgent}
            registryAgents={registryAgents}
            onNavigateToSection={onNavigateToSection}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
