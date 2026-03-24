"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot, FolderOpen, Plus, RefreshCw, Radio, WifiOff,
  Eye, Clock, HardDrive, ChevronRight, ChevronDown,
  Terminal, Send,
} from "lucide-react"
import { ConversationViewer } from "@/components/ai/ConversationViewer"
import { useSessionStream } from "@/hooks/useSessionStream"
import { useWorkingDirSafe, expandTilde } from "@/hooks/useWorkingDirectory"

interface SessionInfo {
  path: string
  sessionId: string
  project: string
  projectSlug: string
  projectPath: string
  size: number
  mtime: number
  isSubagent: boolean
  firstMessage: string | null
}

interface GroupedSessions {
  [project: string]: SessionInfo[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AIWorkspaceSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
  initialProjectPath?: string | null
  onProjectPathConsumed?: () => void
  defaultWorkingDir?: string | null
  onNavigateToSection?: (section: string, path?: string) => void
}) {
  const [sessions, setSessions] = React.useState<SessionInfo[]>([])
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = React.useState(true)
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [spawningSession, setSpawningSession] = React.useState(false)
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({})

  // Auto-expand project group matching the current working directory
  const wdCtx = useWorkingDirSafe()
  const workingDir = wdCtx?.workingDir || '~'
  const didAutoExpandRef = React.useRef(false)

  const [promptInput, setPromptInput] = React.useState("")
  const [sendStatus, setSendStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSending, setIsSending] = React.useState(false)
  const sendStatusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { messages, isStreaming, isConnected, isWaiting, error } = useSessionStream({
    path: selectedPath,
    enabled: !!selectedPath,
  })

  // Poll context % from Claude's state file
  const [contextPercent, setContextPercent] = React.useState<number | null>(null)
  const selectedSessionId = React.useMemo(() => {
    if (!selectedPath) return null
    const match = selectedPath.match(/([a-f0-9-]{36})\.jsonl$/)
    return match?.[1] ?? null
  }, [selectedPath])

  React.useEffect(() => {
    if (!selectedSessionId) {
      setContextPercent(null)
      return
    }
    let mounted = true
    const poll = async () => {
      try {
        const res = await fetch(`/api/ai/context?sessionId=${selectedSessionId}`)
        if (res.ok && mounted) {
          const data = await res.json()
          setContextPercent(data.contextPercent)
        }
      } catch { /* ignore */ }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => { mounted = false; clearInterval(interval) }
  }, [selectedSessionId])

  const fetchSessions = React.useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const res = await fetch('/api/ai/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])

        if (!selectedPath && data.sessions?.length > 0) {
          setSelectedPath(data.sessions[0].path)
        }
      }
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoadingSessions(false)
    }
  }, [selectedPath])

  React.useEffect(() => {
    fetchSessions()
  }, [])

  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  React.useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth >= 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const grouped = React.useMemo<GroupedSessions>(() => {
    const groups: GroupedSessions = {}
    for (const session of sessions) {
      if (session.isSubagent) continue
      const key = session.project || 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(session)
    }
    return groups
  }, [sessions])

  const selectedSession = React.useMemo(
    () => sessions.find(s => s.path === selectedPath) || null,
    [sessions, selectedPath]
  )

  // Find which project group the selected session belongs to
  const selectedProject = selectedSession?.project || null

  // Auto-expand the project group matching the current working directory on initial load
  React.useEffect(() => {
    if (didAutoExpandRef.current || sessions.length === 0) return
    didAutoExpandRef.current = true

    // Convert working dir to the projectSlug format used by sessions
    // e.g. /home/builder/projects/personal-homepage → -home-builder-projects-personal-homepage
    const expandedDir = expandTilde(workingDir)
    const workingDirSlug = expandedDir.replace(/\//g, '-')

    // Find a session whose projectSlug matches
    const matchingSession = sessions.find(s => s.projectSlug === workingDirSlug)
    if (!matchingSession) return

    const matchingProject = matchingSession.project
    // Force expand the matching group (set collapsed = false)
    setCollapsedGroups(prev => ({ ...prev, [matchingProject]: false }))

    // Auto-select the most recent session in that group if nothing is selected yet
    if (!selectedPath) {
      // Sessions are sorted by mtime desc, so first match is most recent
      const mostRecent = sessions.find(s => s.project === matchingProject && !s.isSubagent)
      if (mostRecent) {
        setSelectedPath(mostRecent.path)
      }
    }
  }, [sessions, workingDir, selectedPath])

  // Determine if a group should be collapsed
  const isGroupCollapsed = React.useCallback((project: string, sessionCount: number) => {
    // The group containing the selected session is always expanded
    if (project === selectedProject) return false
    // Explicit user toggle takes priority
    if (collapsedGroups[project] !== undefined) return collapsedGroups[project]
    // Default: groups with >5 sessions start collapsed
    return sessionCount > 5
  }, [collapsedGroups, selectedProject])

  const toggleShowAll = React.useCallback((project: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [project]: !prev[project],
    }))
  }, [])

  const handleSpawnSession = async () => {
    setSpawningSession(true)
    try {
      const res = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        setTimeout(() => {
          fetchSessions()
          if (data.jsonlPath) {
            setSelectedPath(data.jsonlPath)
          }
        }, 2000)
      }
    } catch {
      // ignore
    } finally {
      setSpawningSession(false)
    }
  }

  const handleResumeInTerminal = async (session: SessionInfo) => {
    try {
      await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `claude --resume --session-id ${session.sessionId}`,
          workingDir: session.projectPath,
          name: `claude-${session.sessionId.slice(0, 8)}`,
        }),
      })
    } catch {
      // ignore spawn errors
    }
  }

  const handleSendPrompt = async () => {
    if (!promptInput.trim() || !selectedSessionId || isSending) return

    setIsSending(true)
    if (sendStatusTimerRef.current) clearTimeout(sendStatusTimerRef.current)

    try {
      const res = await fetch('/api/ai/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, prompt: promptInput.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSendStatus({ type: 'success', message: 'Sent' })
        setPromptInput("")
      } else {
        setSendStatus({ type: 'error', message: data.error || 'Failed to send' })
      }
    } catch {
      setSendStatus({ type: 'error', message: 'Network error' })
    } finally {
      setIsSending(false)
      sendStatusTimerRef.current = setTimeout(() => setSendStatus(null), 3000)
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden" data-tabz-section="ai-workspace">
      {/* Session Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-dark border-r border-border/40 flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-3 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold terminal-glow flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Sessions
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={fetchSessions}
                  title="Refresh sessions"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSpawnSession}
                  disabled={spawningSession}
                  title="New Claude session"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-3">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    Loading sessions...
                  </div>
                ) : Object.keys(grouped).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No sessions found</p>
                    <p className="text-xs text-muted-foreground/60">
                      Run <code className="px-1 py-0.5 rounded bg-muted/50">claude</code> in your terminal to start
                    </p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([project, projectSessions]) => {
                    const collapsed = isGroupCollapsed(project, projectSessions.length)
                    const showAll = expandedGroups[project] || false
                    const SESSION_LIMIT = 5
                    const hasMore = projectSessions.length > SESSION_LIMIT
                    const visibleSessions = (!collapsed && hasMore && !showAll)
                      ? projectSessions.slice(0, SESSION_LIMIT)
                      : projectSessions
                    const hiddenCount = projectSessions.length - SESSION_LIMIT

                    return (
                      <div key={project}>
                        <button
                          onClick={() => {
                            // If currently collapsed, expand it; if expanded, collapse it
                            // But for groups with selected session, toggling sets explicit state
                            setCollapsedGroups(prev => ({
                              ...prev,
                              [project]: !collapsed,
                            }))
                          }}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/20 transition-colors group"
                        >
                          <ChevronDown className={`h-3 w-3 text-muted-foreground/60 transition-transform ${
                            collapsed ? '-rotate-90' : ''
                          }`} />
                          <FolderOpen className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider truncate">
                            {project}
                          </span>
                          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                            {projectSessions.length}
                          </Badge>
                        </button>
                        {!collapsed && (
                          <div className="space-y-0.5">
                            {visibleSessions.map((session) => {
                              const isSelected = session.path === selectedPath
                              const title = session.firstMessage
                                ? (session.firstMessage.length > 60
                                  ? session.firstMessage.slice(0, 60) + '...'
                                  : session.firstMessage)
                                : `${session.sessionId.slice(0, 8)}...`
                              return (
                                <button
                                  key={session.path}
                                  onClick={() => setSelectedPath(session.path)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group ${
                                    isSelected
                                      ? 'bg-primary/10 border border-primary/20 text-primary'
                                      : 'hover:bg-muted/30 text-muted-foreground'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs truncate leading-snug" title={session.firstMessage || session.sessionId}>
                                      {title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] flex items-center gap-1 text-muted-foreground/60">
                                        <Clock className="h-2.5 w-2.5" />
                                        {formatTimeAgo(session.mtime)}
                                      </span>
                                      <span className="text-[10px] flex items-center gap-1 text-muted-foreground/60">
                                        <HardDrive className="h-2.5 w-2.5" />
                                        {formatBytes(session.size)}
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleResumeInTerminal(session)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation()
                                        handleResumeInTerminal(session)
                                      }
                                    }}
                                    title="Resume in terminal"
                                    className="shrink-0 p-0.5 rounded hover:bg-primary/20 transition-opacity opacity-0 group-hover:opacity-70 hover:!opacity-100 cursor-pointer"
                                  >
                                    <Terminal className="h-3 w-3" />
                                  </div>
                                </button>
                              )
                            })}
                            {hasMore && !showAll && (
                              <button
                                onClick={() => toggleShowAll(project)}
                                className="w-full text-left px-3 py-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
                              >
                                Show {hiddenCount} more...
                              </button>
                            )}
                            {hasMore && showAll && (
                              <button
                                onClick={() => toggleShowAll(project)}
                                className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }))
                }
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewer */}
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
              <Eye className="h-5 w-5" />
            </Button>

            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0 hidden sm:flex">
              <Bot className="h-5 w-5 text-orange-400 terminal-glow" />
            </div>

            <div className="min-w-0">
              <h2 className="font-semibold terminal-glow truncate">
                {selectedSession
                  ? `Session ${selectedSession.sessionId.slice(0, 8)}`
                  : 'Claude Session Viewer'}
              </h2>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                {selectedSession && (
                  <span className="flex items-center gap-1 truncate">
                    <FolderOpen className="h-3 w-3 shrink-0" />
                    {selectedSession.project}
                  </span>
                )}
                {selectedPath && (
                  <span className="flex items-center gap-1">
                    {isConnected ? (
                      <>
                        <Radio className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 text-muted-foreground" />
                        <span>Disconnected</span>
                      </>
                    )}
                  </span>
                )}
                {isStreaming && (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-orange-400 text-xs"
                  >
                    Streaming
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {selectedSession && (
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-mono">
                {selectedSession.sessionId.slice(0, 12)}...
              </span>
            )}
            {contextPercent !== null && (
              <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono ${
                contextPercent >= 80
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : contextPercent >= 50
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                ctx {contextPercent}%
              </span>
            )}
            <Badge variant="secondary" className="text-xs">
              {messages.length} messages
            </Badge>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-hidden min-h-0">
            {!selectedPath ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                <div className="h-20 w-20 rounded-full bg-orange-500/10 flex items-center justify-center ring-2 ring-orange-500/20">
                  <Bot className="h-10 w-10 text-orange-400/60" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold terminal-glow">Claude Session Viewer</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This viewer watches your Claude CLI sessions in real-time.
                    Run <code className="px-1.5 py-0.5 rounded bg-muted/50 text-xs">claude</code> in
                    your terminal and select a session from the sidebar to watch.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="glass"
                    onClick={fetchSessions}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Sessions
                  </Button>
                  <Button
                    variant="outline"
                    className="glass"
                    onClick={handleSpawnSession}
                    disabled={spawningSession}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Session
                  </Button>
                </div>
              </div>
            ) : isWaiting || (messages.length === 0 && !error) ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Radio className="h-8 w-8 text-orange-400/40" />
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  {isWaiting
                    ? "Session started — waiting for first message in terminal..."
                    : "Waiting for conversation data..."}
                </p>
              </div>
            ) : error && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <WifiOff className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchSessions}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            ) : (
              <ConversationViewer messages={messages} isStreaming={isStreaming} />
            )}
          </div>

          {/* Send Prompt Input */}
          {selectedPath && selectedSessionId && (
            <div className="shrink-0 border-t border-border/40 glass-dark px-3 sm:px-4 py-2 sm:py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendPrompt()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Send a prompt to this session via thc..."
                  className="flex-1 bg-muted/20 border border-border/40 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 h-9 w-9"
                  disabled={isSending || !promptInput.trim()}
                  title="Send prompt"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <AnimatePresence>
                  {sendStatus && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`text-xs shrink-0 ${
                        sendStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {sendStatus.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
