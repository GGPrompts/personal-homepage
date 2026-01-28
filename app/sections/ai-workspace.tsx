"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/AuthProvider"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  MessageSquare, Bot, Plus, X, Trash2, Cpu, FolderOpen,
  Loader2, Pencil, Gauge, AlertTriangle,
  Download, ArrowRight, Settings, ChevronDown, Users, Save, Circle,
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
import type { AgentCard } from "@/lib/agents/types"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { useAllProjectsMeta } from "@/hooks/useProjectMeta"
import { useTabzBridge } from "@/hooks/useTabzBridge"
import { TabzConnectionStatus } from "@/components/TabzConnectionStatus"
import { mergeProjects, type LocalProject, type GitHubRepo } from "@/lib/projects"
import {
  type Conversation,
  DEFAULT_SUGGESTED_PROMPTS,
  DEFAULT_SETTINGS,
  exportConversationToMarkdown,
  downloadMarkdown,
  generateCompactPrompt,
  generateId,
} from "@/lib/ai-workspace"
import { useAIChat } from "@/hooks/useAIChat"
import { ChatMessage, TypingIndicator } from "@/components/ai/ChatMessage"
import { ChatInput } from "@/components/ai/ChatInput"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a string is an emoji (simple heuristic)
 */
function isEmoji(str: string): boolean {
  const emojiRegex = /^[\p{Emoji}\u200d]+$/u
  return emojiRegex.test(str) && str.length <= 8
}

/**
 * Check if a string is a URL or path (for avatar rendering)
 */
function isAvatarUrl(str: string): boolean {
  // Check for absolute paths (served by Next.js from public/)
  if (str.startsWith('/')) return true
  // Check for full URLs
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

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

  // Use the extracted chat hook
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
  } = useAIChat()

  // Local state for UI
  const [inputValue, setInputValue] = React.useState('')
  const [showSettings, setShowSettings] = React.useState(false)
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [showAgentGallery, setShowAgentGallery] = React.useState(false)
  const [selectedAgent, setSelectedAgent] = React.useState<AgentCard | null>(null)
  const [availableAgents, setAvailableAgents] = React.useState<{ name: string; description: string; model?: string; filename: string }[]>([])
  const [selectedProjectPath, setSelectedProjectPath] = React.useState<string | null>(null)

  // Track if user has dismissed the context warning for this conversation
  const [contextWarningDismissed, setContextWarningDismissed] = React.useState<Set<string>>(new Set())

  const selectedModel = availableModels.find(m => m.id === settings.model)
  const searchParams = useSearchParams()
  const { getGitHubToken } = useAuth()

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
    queryKey: ['github-projects-for-ai'],
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

  // Fetch agent registry for agent gallery
  const { data: agentRegistry, isLoading: agentsLoading } = useQuery({
    queryKey: ['agent-registry'],
    queryFn: async () => {
      const res = await fetch('/api/ai/agents/registry')
      if (!res.ok) return { agents: [] }
      return res.json() as Promise<{ agents: AgentCard[] }>
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

  // Fetch available agents on mount
  React.useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/ai/agents')
        const data = await response.json()
        if (data.agents) {
          setAvailableAgents(data.agents)
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      }
    }

    fetchAgents()
  }, [])

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
    // Update settings with agent's system prompt
    setSettings(prev => ({
      ...prev,
      systemPrompt: agent.system_prompt,
      temperature: agent.config.temperature,
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
    // Handle vanilla Claude (no agent) specially
    const isVanilla = agent.id === '__vanilla__'

    if (isVanilla) {
      setSelectedAgent(null)
      setSettings(prev => ({
        ...prev,
        systemPrompt: '',
        temperature: 0.7,
      }))
    } else {
      setSelectedAgent(agent)
      // Update settings with agent's config
      setSettings(prev => ({
        ...prev,
        systemPrompt: agent.system_prompt,
        temperature: agent.config.temperature,
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
      settings: isVanilla ? {
        systemPrompt: '',
        temperature: 0.7,
      } : {
        systemPrompt: agent.system_prompt,
        temperature: agent.config.temperature,
      },
    }

    setConversations(prev => [newConv, ...prev])
    setActiveConvId(newConv.id)
  }

  const handleClearAgent = () => {
    setSelectedAgent(null)
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

  // Get agent by ID from registry
  const getAgentById = React.useCallback((agentId: string | null | undefined) => {
    if (!agentId || !agentRegistry?.agents) return null
    return agentRegistry.agents.find(a => a.id === agentId) || null
  }, [agentRegistry])

  // Determine if a conversation is persistent (JSONL saved)
  // Claude backend saves to JSONL, others are session-only
  const isConversationPersistent = React.useCallback((conv: Conversation) => {
    const modelInfo = availableModels.find(m => m.id === conv.model)
    return modelInfo?.backend === 'claude'
  }, [availableModels])

  // Calculate token usage - prefer cumulative data from actual API responses
  const CONTEXT_LIMIT = 200000
  const WARNING_THRESHOLD = 0.7
  const DANGER_THRESHOLD = 0.9

  // Use cumulative usage for accurate context tracking (contextTokens = current context window)
  // Falls back to latest message usage, then to estimation
  const hasCumulativeUsage = activeConv.cumulativeUsage && activeConv.cumulativeUsage.contextTokens > 0
  const hasMessageUsage = activeConv.usage && activeConv.usage.totalTokens > 0
  const hasActualUsage = hasCumulativeUsage || hasMessageUsage

  let contextTokens: number
  let usageSource: 'cumulative' | 'message' | 'estimated'

  if (hasCumulativeUsage) {
    // Best: use cumulative contextTokens (input + cache read from latest response)
    // This represents the actual current context window size
    contextTokens = activeConv.cumulativeUsage!.contextTokens
    usageSource = 'cumulative'
  } else if (hasMessageUsage) {
    // Good: use latest message total tokens as approximation
    contextTokens = activeConv.usage!.totalTokens
    usageSource = 'message'
  } else {
    // Fallback: estimate tokens from message content
    // ~4 chars per token is a rough estimate for English text
    const messageTokens = activeConv.messages.reduce((sum, msg) => {
      const contentTokens = Math.ceil(msg.content.length / 4)
      const toolTokens = msg.toolUses?.reduce((t, tool) =>
        t + Math.ceil((tool.input?.length || 0) / 4) + 20, 0) || 0
      return sum + contentTokens + toolTokens
    }, 0)
    // Only add minimal overhead for system prompt/formatting (~500 tokens)
    contextTokens = messageTokens > 0 ? messageTokens + 500 : 0
    usageSource = 'estimated'
  }

  const contextUsage = contextTokens / CONTEXT_LIMIT
  const contextPercentage = Math.min(Math.round(contextUsage * 100), 100)
  const contextStatus = contextUsage >= DANGER_THRESHOLD ? 'danger'
    : contextUsage >= WARNING_THRESHOLD ? 'warning'
    : 'ok'

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden" data-tabz-section="ai-workspace">
      {/* Conversations Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-full lg:w-80 lg:min-w-80 lg:max-w-80 glass-dark border-r border-border/40 flex flex-col lg:relative absolute inset-y-0 left-0 z-10 overflow-hidden"
          >
            <div className="p-4 border-b border-border/40">
              <Button
                onClick={createNewConversation}
                className="w-full border-glow"
                data-tabz-action="new-conversation"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4 space-y-2" data-tabz-list="conversations">
                {conversations.map(conv => {
                  const convAgent = getAgentById(conv.agentId)
                  const isPersistent = isConversationPersistent(conv)

                  return (
                    <Card
                      key={conv.id}
                      className={`glass cursor-pointer transition-all group max-w-full ${
                        conv.id === activeConvId ? 'border-primary/60 border-glow' : ''
                      }`}
                      onClick={() => setActiveConvId(conv.id)}
                      data-tabz-item={`conversation-${conv.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {/* Agent Avatar */}
                          {convAgent && (
                            <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10">
                              {isAvatarUrl(convAgent.avatar) ? (
                                <AvatarImage src={convAgent.avatar} alt={convAgent.name} />
                              ) : null}
                              <AvatarFallback className="text-sm bg-primary/20">
                                {isEmoji(convAgent.avatar)
                                  ? convAgent.avatar
                                  : convAgent.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium truncate terminal-glow">
                                {conv.title}
                              </h4>
                              {generatingConvs[conv.id] && (
                                <motion.div
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 1.2, repeat: Infinity }}
                                  className="flex items-center gap-1 shrink-0"
                                >
                                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                                </motion.div>
                              )}
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {/* Agent name if available */}
                              {convAgent && (
                                <p className="text-xs text-primary/80 font-medium">
                                  {convAgent.name}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {conv.messages.length} messages
                                  {generatingConvs[conv.id] && (
                                    <span className="text-primary ml-1">generating</span>
                                  )}
                                </p>
                                {/* Persistence indicator */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={`flex items-center ${
                                        isPersistent ? 'text-emerald-400' : 'text-muted-foreground'
                                      }`}>
                                        {isPersistent ? (
                                          <Save className="h-3 w-3" />
                                        ) : (
                                          <Circle className="h-3 w-3" />
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      {isPersistent
                                        ? 'Persistent (JSONL saved)'
                                        : 'Session only (localStorage)'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              {conv.model && (
                                <div className="flex items-center gap-1 overflow-hidden">
                                  <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {availableModels.find(m => m.id === conv.model)?.name || conv.model}
                                  </p>
                                </div>
                              )}
                              {conv.projectPath && (
                                <div className="flex items-center gap-1 overflow-hidden">
                                  <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {conv.projectPath.split('/').pop()}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {conv.updatedAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteConversation(conv.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </motion.div>
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
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0 hidden sm:flex">
                <Bot className="h-5 w-5 text-primary terminal-glow" />
              </div>
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
                  {activeConv.messages.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-help ${
                            contextStatus === 'danger'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : contextStatus === 'warning'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {contextStatus === 'danger' ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Gauge className="h-3 w-3" />
                            )}
                            <span className="text-[10px] font-mono">{contextPercentage}%</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-medium text-xs">
                            Context: {usageSource === 'estimated' ? '~' : ''}{contextTokens.toLocaleString()} tokens
                            <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${
                              usageSource === 'cumulative'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : usageSource === 'message'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {usageSource === 'cumulative' ? 'tracked' : usageSource === 'message' ? 'actual' : 'est'}
                            </span>
                          </p>
                          {/* Show cumulative stats when available */}
                          {activeConv.cumulativeUsage && (
                            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                              <div className="flex justify-between gap-2">
                                <span>Input:</span>
                                <span className="font-mono">{activeConv.cumulativeUsage.inputTokens.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span>Output:</span>
                                <span className="font-mono">{activeConv.cumulativeUsage.outputTokens.toLocaleString()}</span>
                              </div>
                              {(activeConv.cumulativeUsage.cacheReadTokens > 0 || activeConv.cumulativeUsage.cacheCreationTokens > 0) && (
                                <div className="flex justify-between gap-2">
                                  <span>Cache:</span>
                                  <span className="font-mono">
                                    {activeConv.cumulativeUsage.cacheReadTokens.toLocaleString()}r / {activeConv.cumulativeUsage.cacheCreationTokens.toLocaleString()}c
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between gap-2 border-t border-border/40 pt-0.5 mt-0.5">
                                <span>Messages tracked:</span>
                                <span className="font-mono">{activeConv.cumulativeUsage.messageCount}</span>
                              </div>
                            </div>
                          )}
                          <div className="w-32 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                contextStatus === 'danger' ? 'bg-red-500'
                                : contextStatus === 'warning' ? 'bg-yellow-500'
                                : 'bg-emerald-500'
                              }`}
                              style={{ width: `${contextPercentage}%` }}
                            />
                          </div>
                          <p className="text-muted-foreground text-xs mt-1.5">
                            {contextStatus === 'danger'
                              ? 'Context nearly full! Start a new conversation soon.'
                              : contextStatus === 'warning'
                              ? 'Context getting full. Consider a new conversation.'
                              : 'Plenty of context remaining.'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
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
                    agents={agentRegistry?.agents || []}
                    selectedAgentId={selectedAgent?.id}
                    onSelectAgent={handleSelectAgent}
                    isLoading={agentsLoading}
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
                                {isEmoji(agent.avatar) ? agent.avatar : agent.name.charAt(0)}
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
                  {(contextStatus === 'warning' || contextStatus === 'danger') &&
                   !contextWarningDismissed.has(activeConvId) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-4 p-4 rounded-lg border ${
                        contextStatus === 'danger'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${
                          contextStatus === 'danger' ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${
                            contextStatus === 'danger' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {contextStatus === 'danger'
                              ? 'Context nearly full!'
                              : 'Context getting full'}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {contextStatus === 'danger'
                              ? `At ${contextPercentage}% capacity. Continue in a new chat with a summary to avoid losing context.`
                              : `At ${contextPercentage}% capacity. Consider continuing in a new chat soon.`
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant={contextStatus === 'danger' ? 'default' : 'outline'}
                              onClick={handleContinueInNewChat}
                              className="gap-1"
                            >
                              <ArrowRight className="h-3 w-3" />
                              Continue in new chat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={dismissContextWarning}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

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
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-full lg:w-80 glass-dark border-l border-border/40 overflow-y-auto lg:relative absolute inset-y-0 right-0 z-10"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold terminal-glow flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                Settings apply to <strong>new conversations</strong>. Each conversation keeps its own settings.
              </p>

              {/* Model Selection */}
              <div className="space-y-3">
                <Label>Model</Label>
                {modelsLoading ? (
                  <div className="glass px-3 py-2 text-sm text-muted-foreground">
                    Loading models...
                  </div>
                ) : (
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setSettings({ ...settings, model: value })}
                  >
                    <SelectTrigger className="glass" data-tabz-input="model-selector">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {backends.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">Backend Status:</p>
                    {backends.map(backend => (
                      <div key={backend.backend} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{backend.backend}</span>
                        <Badge variant={backend.available ? 'default' : 'secondary'} className="text-xs">
                          {backend.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent Configuration */}
              <Collapsible className="space-y-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <Label className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    Agent Configuration
                  </Label>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Agents are configured via files in the <code className="bg-muted px-1 rounded">agents/</code> directory.
                    Each agent has a <code className="bg-muted px-1 rounded">CLAUDE.md</code> (system prompt) and <code className="bg-muted px-1 rounded">agent.json</code> (config).
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full glass"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/ai/agents/directory')
                        const data = await res.json()
                        if (data.path && onNavigateToSection) {
                          // Navigate to Files section with agents folder path
                          onNavigateToSection('files', data.path)
                        }
                      } catch (error) {
                        console.error('Failed to open agents folder:', error)
                      }
                    }}
                    data-tabz-action="open-agents-folder"
                  >
                    <FolderOpen className="h-3 w-3 mr-2" />
                    Open Agents Folder
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{agentRegistry?.agents?.length || 0} agents loaded</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Temperature - Only for Docker models */}
              {selectedModel?.backend === 'docker' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">{settings.temperature.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[settings.temperature]}
                    onValueChange={([value]) => setSettings({ ...settings, temperature: value })}
                    min={0}
                    max={1}
                    step={0.1}
                    className="glass"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values make output more random
                  </p>
                </div>
              )}

              {/* Max Tokens - Only for Docker models */}
              {selectedModel?.backend === 'docker' && (
                <div className="space-y-3">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={settings.maxTokens}
                    onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 2048 })}
                    min={256}
                    max={8192}
                    step={256}
                    className="glass"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum length of the response
                  </p>
                </div>
              )}

              {/* Append System Prompt */}
              <Collapsible className="space-y-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <Label>Append System Prompt</Label>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                    className="glass min-h-[120px]"
                    placeholder="Leave empty for vanilla behavior..."
                    disabled={selectedModel?.backend === 'mock'}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedModel?.backend === 'claude' && 'Appended via --append-system-prompt flag'}
                    {selectedModel?.backend === 'gemini' && 'Prepended to conversation as system context'}
                    {selectedModel?.backend === 'codex' && 'Prepended to conversation as system context'}
                    {selectedModel?.backend === 'docker' && 'Sent as system role message'}
                    {selectedModel?.backend === 'mock' && 'Not used for mock responses'}
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Suggested Prompts */}
              <Collapsible className="space-y-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <Label className="flex items-center gap-2">
                    <Pencil className="h-3 w-3" />
                    Quick Prompts
                  </Label>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Edit the prompts shown on new conversations. Categories: Explore, Learn, Search, Info, Debug, Create, Review
                  </p>
                  {(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS).map((prompt, idx) => (
                    <div key={idx} className="space-y-2 p-3 glass rounded-lg">
                      <div className="flex items-center gap-2">
                        <Input
                          value={prompt.category}
                          onChange={(e) => {
                            const newPrompts = [...(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS)]
                            newPrompts[idx] = { ...newPrompts[idx], category: e.target.value }
                            setSettings({ ...settings, suggestedPrompts: newPrompts })
                          }}
                          className="glass w-24 text-xs"
                          placeholder="Category"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => {
                            const newPrompts = (settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS).filter((_, i) => i !== idx)
                            setSettings({ ...settings, suggestedPrompts: newPrompts.length > 0 ? newPrompts : undefined })
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={prompt.text}
                        onChange={(e) => {
                          const newPrompts = [...(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS)]
                          newPrompts[idx] = { ...newPrompts[idx], text: e.target.value }
                          setSettings({ ...settings, suggestedPrompts: newPrompts })
                        }}
                        className="glass text-xs"
                        placeholder="Prompt text..."
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 glass"
                      onClick={() => {
                        const newPrompts = [...(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS), { text: '', category: 'Info' }]
                        setSettings({ ...settings, suggestedPrompts: newPrompts })
                      }}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Add Prompt
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="glass"
                      onClick={() => setSettings({ ...settings, suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS })}
                    >
                      Reset
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Claude-specific settings */}
              {selectedModel?.backend === 'claude' && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <Label>Claude Model</Label>
                    <Select
                      value={settings.claudeModel || 'default'}
                      onValueChange={(value) => setSettings({ ...settings, claudeModel: value === 'default' ? undefined : value })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (from config)</SelectItem>
                        <SelectItem value="opus">Opus</SelectItem>
                        <SelectItem value="sonnet">Sonnet</SelectItem>
                        <SelectItem value="haiku">Haiku</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Override the default model for this conversation
                    </p>
                  </div>

                  {availableAgents.length > 0 && (
                    <div className="space-y-3">
                      <Label>Agent</Label>
                      <Select
                        value={settings.claudeAgent || 'none'}
                        onValueChange={(value) => setSettings({ ...settings, claudeAgent: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (default)</SelectItem>
                          {availableAgents.map(agent => (
                            <SelectItem key={agent.filename} value={agent.filename}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{agent.name}</span>
                                {agent.description && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {agent.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Use an agent from ~/.claude/agents/
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Permission Mode</Label>
                    <Select
                      value={settings.permissionMode || 'default'}
                      onValueChange={(value) => setSettings({ ...settings, permissionMode: value === 'default' ? undefined : value as any })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (ask)</SelectItem>
                        <SelectItem value="acceptEdits">Accept Edits</SelectItem>
                        <SelectItem value="bypassPermissions">Bypass All</SelectItem>
                        <SelectItem value="plan">Plan Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Control how Claude asks for permissions
                    </p>
                  </div>

                  <Collapsible className="space-y-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <Label>Additional Directories</Label>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {settings.additionalDirs?.map((dir, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={dir}
                            onChange={(e) => {
                              const newDirs = [...(settings.additionalDirs || [])]
                              newDirs[idx] = e.target.value
                              setSettings({ ...settings, additionalDirs: newDirs })
                            }}
                            className="glass flex-1 text-xs"
                            placeholder="/path/to/directory"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newDirs = settings.additionalDirs?.filter((_, i) => i !== idx)
                              setSettings({ ...settings, additionalDirs: newDirs?.length ? newDirs : undefined })
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full glass"
                        onClick={() => {
                          const newDirs = [...(settings.additionalDirs || []), '']
                          setSettings({ ...settings, additionalDirs: newDirs })
                        }}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Add Directory
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Grant Claude access to additional project directories
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* Gemini-specific settings */}
              {selectedModel?.backend === 'gemini' && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <Label>Gemini Model</Label>
                    <Select
                      value={settings.geminiModel || 'default'}
                      onValueChange={(value) => setSettings({ ...settings, geminiModel: value === 'default' ? undefined : value })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the Gemini model variant
                    </p>
                  </div>
                </>
              )}

              {/* Codex-specific settings */}
              {selectedModel?.backend === 'codex' && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <Label>Codex Model</Label>
                    <Select
                      value={settings.codexModel || 'default'}
                      onValueChange={(value) => setSettings({ ...settings, codexModel: value === 'default' ? undefined : value })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (gpt-5.2-codex)</SelectItem>
                        <SelectItem value="gpt-5.2-codex">GPT-5.2 Codex (Frontier agentic)</SelectItem>
                        <SelectItem value="gpt-5.1-codex-max">GPT-5.1 Codex Max (Deep reasoning)</SelectItem>
                        <SelectItem value="gpt-5.1-codex-mini">GPT-5.1 Codex Mini (Faster)</SelectItem>
                        <SelectItem value="gpt-5.2">GPT-5.2 (Frontier)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the OpenAI Codex model
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Reasoning Effort</Label>
                    <Select
                      value={settings.reasoningEffort || 'high'}
                      onValueChange={(value) => setSettings({ ...settings, reasoningEffort: value as 'low' | 'medium' | 'high' })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How much reasoning to apply (higher = more thorough)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Sandbox Mode</Label>
                    <Select
                      value={settings.sandbox || 'read-only'}
                      onValueChange={(value) => setSettings({ ...settings, sandbox: value as 'read-only' | 'full' | 'off' })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read-only">Read Only</SelectItem>
                        <SelectItem value="full">Full Access</SelectItem>
                        <SelectItem value="off">Off (No Sandbox)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Control file system access level
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <Button
                variant="outline"
                className="w-full glass"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
              >
                Reset to Defaults
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
