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
  MessageSquare, Bot, Plus, X, Trash2, Code, CheckCheck,
  Sparkles, Clock, Cpu, FolderOpen,
  Loader2, Search, Pencil, Gauge, AlertTriangle,
  Download, ArrowRight, Settings, ChevronDown,
} from "lucide-react"
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
// REACT-DEPENDENT CONSTANTS (kept here due to Lucide icon imports)
// ============================================================================

// Icon mapping for prompt categories
const PROMPT_CATEGORY_ICONS: Record<string, typeof Code> = {
  Debug: Code,
  Learn: Sparkles,
  Create: Code,
  Review: CheckCheck,
  Explore: FolderOpen,
  Search: Search,
  Info: Sparkles,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIWorkspaceSection({
  activeSubItem,
  onSubItemHandled,
  initialProjectPath,
  onProjectPathConsumed,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
  initialProjectPath?: string | null
  onProjectPathConsumed?: () => void
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
    sendMessage(inputValue, { projectPath: selectedProjectPath })
    setInputValue('')
  }

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt, { projectPath: selectedProjectPath })
  }

  const handleExportConversation = () => {
    const markdown = exportConversationToMarkdown(activeConv)
    const filename = `${activeConv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`
    downloadMarkdown(markdown, filename)
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

  // Calculate token usage
  const CONTEXT_LIMIT = 200000
  const WARNING_THRESHOLD = 0.7
  const DANGER_THRESHOLD = 0.9

  const hasActualUsage = activeConv.usage && activeConv.usage.totalTokens > 0

  let totalTokens: number
  if (hasActualUsage) {
    totalTokens = activeConv.usage!.totalTokens
  } else {
    const BASELINE_TOKENS = 44000
    const messageTokens = activeConv.messages.reduce((sum, msg) => {
      const contentTokens = Math.ceil(msg.content.length / 4)
      const toolTokens = msg.toolUses?.reduce((t, tool) =>
        t + Math.ceil((tool.input?.length || 0) / 4) + 20, 0) || 0
      return sum + contentTokens + toolTokens
    }, 0)
    totalTokens = BASELINE_TOKENS + messageTokens
  }

  const contextUsage = totalTokens / CONTEXT_LIMIT
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
                {conversations.map(conv => (
                  <Card
                    key={conv.id}
                    className={`glass cursor-pointer transition-all group max-w-full ${
                      conv.id === activeConvId ? 'border-primary/60 border-glow' : ''
                    }`}
                    onClick={() => setActiveConvId(conv.id)}
                    data-tabz-item={`conversation-${conv.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
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
                            <p className="text-xs text-muted-foreground">
                              {conv.messages.length} messages
                              {generatingConvs[conv.id] && (
                                <span className="text-primary ml-1">generating</span>
                              )}
                            </p>
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
                ))}
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
                            Context: {hasActualUsage ? '' : '~'}{totalTokens.toLocaleString()} tokens
                            <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${
                              hasActualUsage
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {hasActualUsage ? 'actual' : 'est'}
                            </span>
                          </p>
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

            {availableProjects.length > 0 && (
              <Select
                value={selectedProjectPath || "none"}
                onValueChange={(value) => setSelectedProjectPath(value === "none" ? null : value)}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-9 glass text-xs" data-tabz-input="project-selector">
                  <FolderOpen className="h-3 w-3 mr-1 shrink-0" />
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No project context</span>
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
            )}

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
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full box-border">
              {activeConv.messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-4 sm:py-12 space-y-4 sm:space-y-8"
                >
                  <div className="space-y-2 sm:space-y-4">
                    <div className="inline-flex p-2 sm:p-4 rounded-full glass border-glow">
                      <Sparkles className="h-6 w-6 sm:h-12 sm:w-12 text-primary terminal-glow" />
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold font-mono gradient-text-theme terminal-glow">
                      How can I help you today?
                    </h3>
                    <p className="text-xs sm:text-base text-muted-foreground max-w-md mx-auto px-2">
                      Choose a prompt or ask anything
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-2xl mx-auto px-2">
                    {(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS).map((prompt, idx) => {
                      const Icon = PROMPT_CATEGORY_ICONS[prompt.category] || Sparkles
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card
                            className="glass hover:border-glow cursor-pointer transition-all group"
                            onClick={() => handleSuggestedPrompt(prompt.text)}
                          >
                            <CardContent className="p-2 sm:p-4 flex items-start gap-2 sm:gap-3">
                              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                                <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <Badge variant="secondary" className="mb-1 sm:mb-2 text-[10px] sm:text-xs">
                                  {prompt.category}
                                </Badge>
                                <p className="text-xs sm:text-sm line-clamp-2">{prompt.text}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
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
                        <SelectItem value="default">Default (gpt-5)</SelectItem>
                        <SelectItem value="gpt-5">GPT-5 Codex</SelectItem>
                        <SelectItem value="gpt-5-mini">GPT-5 Codex Mini</SelectItem>
                        <SelectItem value="gpt-5.1">GPT-5.1 Codex</SelectItem>
                        <SelectItem value="gpt-5.1-mini">GPT-5.1 Codex Mini</SelectItem>
                        <SelectItem value="gpt-5.1-max">GPT-5.1 Codex Max</SelectItem>
                        <SelectItem value="codex-mini-latest">Codex Mini (Latest)</SelectItem>
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
