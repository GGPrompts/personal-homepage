"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot, FolderOpen, Plus, RefreshCw, Radio, WifiOff,
  Eye, Clock, HardDrive, ChevronRight, ChevronDown,
  Terminal, Send, List, Zap,
} from "lucide-react"
import { ConversationViewer } from "@/components/ai/ConversationViewer"
import { useSessionStream } from "@/hooks/useSessionStream"
import { useWorkingDirSafe, expandTilde } from "@/hooks/useWorkingDirectory"
import { useAuth } from "@/components/AuthProvider"

interface SessionInfo {
  path: string
  sessionId: string
  project: string
  projectSlug: string
  projectPath: string
  size: number
  mtime: number
  isSubagent: boolean
  parentSessionId: string | null
  firstMessage: string | null
  contextPercent?: number | null
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
  const { user } = useAuth()
  const userAvatarUrl = user?.user_metadata?.avatar_url || null

  const [sessions, setSessions] = React.useState<SessionInfo[]>([])
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = React.useState(true)
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [spawningSession, setSpawningSession] = React.useState(false)
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})
  const [expandedSubagents, setExpandedSubagents] = React.useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = React.useState<'projects' | 'recent'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-workspace-view-mode')
      if (saved === 'projects' || saved === 'recent') return saved
    }
    return 'projects'
  })

  // Auto-expand project group matching the current working directory
  const wdCtx = useWorkingDirSafe()
  const workingDir = wdCtx?.workingDir || '~'
  const didAutoExpandRef = React.useRef(false)

  const [activeSessionIds, setActiveSessionIds] = React.useState<Set<string>>(new Set())
  const [activeSessionMap, setActiveSessionMap] = React.useState<Map<string, { windowId: number; socket: string }>>(new Map())
  const [filterActive, setFilterActive] = React.useState(false)

  const [promptInput, setPromptInput] = React.useState("")
  const [sendStatus, setSendStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSending, setIsSending] = React.useState(false)
  const sendStatusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { messages, isStreaming, isConnected, isWaiting, error, isTruncated, loadFullHistory, isLoadingFull } = useSessionStream({
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

  const fetchActiveSessions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/ai/sessions/active')
      if (res.ok) {
        const data = await res.json()
        const ids = new Set<string>()
        const winMap = new Map<string, { windowId: number; socket: string }>()
        for (const a of data.active || []) {
          if (a.sessionId) {
            ids.add(a.sessionId)
            winMap.set(a.sessionId, { windowId: a.windowId, socket: a.socket })
          }
        }
        setActiveSessionIds(ids)
        setActiveSessionMap(winMap)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchSessions = React.useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const [sessionsRes, contextRes] = await Promise.all([
        fetch('/api/ai/sessions'),
        fetch('/api/ai/context').catch(() => null),
        fetchActiveSessions(),
      ])
      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        let sessionList: SessionInfo[] = data.sessions || []

        // Merge context % into session objects
        if (contextRes?.ok) {
          const contextData = await contextRes.json()
          const ctxMap: Record<string, number | null> = {}
          if (contextData.sessions) {
            for (const [sid, info] of Object.entries(contextData.sessions)) {
              ctxMap[sid] = (info as { contextPercent: number | null }).contextPercent
            }
          }
          sessionList = sessionList.map(s => ({
            ...s,
            contextPercent: ctxMap[s.sessionId] ?? null,
          }))
        }

        setSessions(sessionList)

        if (!selectedPath && sessionList.length > 0) {
          setSelectedPath(sessionList[0].path)
        }
      }
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoadingSessions(false)
    }
  }, [selectedPath, fetchActiveSessions])

  React.useEffect(() => {
    fetchSessions()
  }, [])

  // Poll active sessions every 10s
  React.useEffect(() => {
    const interval = setInterval(fetchActiveSessions, 10000)
    return () => clearInterval(interval)
  }, [fetchActiveSessions])

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

  // Persist view mode
  React.useEffect(() => {
    localStorage.setItem('ai-workspace-view-mode', viewMode)
  }, [viewMode])

  // Map from parent sessionId to its subagent sessions
  const subagentMap = React.useMemo(() => {
    const map: Record<string, SessionInfo[]> = {}
    for (const session of sessions) {
      if (session.isSubagent && session.parentSessionId) {
        if (!map[session.parentSessionId]) map[session.parentSessionId] = []
        map[session.parentSessionId].push(session)
      }
    }
    // Sort subagents by mtime desc within each parent
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.mtime - a.mtime)
    }
    return map
  }, [sessions])

  const isSessionActive = React.useCallback((session: SessionInfo) => {
    // Active endpoint returns full UUID or 8-char prefix (homepage-spawned)
    return activeSessionIds.has(session.sessionId) ||
      activeSessionIds.has(session.sessionId.slice(0, 8))
  }, [activeSessionIds])

  // Derive current project name from working dir for prioritization
  const currentProject = React.useMemo(() => {
    const expandedDir = expandTilde(workingDir)
    const match = sessions.find(s => s.projectPath === expandedDir)
    return match?.project || null
  }, [workingDir, sessions])

  const grouped = React.useMemo<GroupedSessions>(() => {
    const groups: GroupedSessions = {}
    for (const session of sessions) {
      // Skip subagents that have a known parent — they'll be nested
      if (session.isSubagent && session.parentSessionId) continue
      if (filterActive && !isSessionActive(session)) continue
      const key = session.project || 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(session)
    }
    // Sort each group: main sessions first (by mtime desc), then orphan subagents (by mtime desc)
    for (const key of Object.keys(groups)) {
      const main = groups[key].filter(s => !s.isSubagent).sort((a, b) => b.mtime - a.mtime)
      const sub = groups[key].filter(s => s.isSubagent).sort((a, b) => b.mtime - a.mtime)
      groups[key] = [...main, ...sub]
    }
    // Re-order: current working dir project first, then by most recent session
    if (currentProject && groups[currentProject]) {
      const ordered: GroupedSessions = {}
      ordered[currentProject] = groups[currentProject]
      for (const key of Object.keys(groups)) {
        if (key !== currentProject) ordered[key] = groups[key]
      }
      return ordered
    }
    return groups
  }, [sessions, filterActive, isSessionActive, currentProject])

  const recentSessions = React.useMemo(() => {
    // Only include top-level sessions (main + orphan subagents without a parent)
    let topLevel = sessions.filter(s => !(s.isSubagent && s.parentSessionId))
    if (filterActive) topLevel = topLevel.filter(s => isSessionActive(s))
    // Sort by effective mtime: max(own mtime, max subagent mtime)
    return topLevel.sort((a, b) => {
      const aSubMax = (subagentMap[a.sessionId] || []).reduce((m, s) => Math.max(m, s.mtime), 0)
      const bSubMax = (subagentMap[b.sessionId] || []).reduce((m, s) => Math.max(m, s.mtime), 0)
      const aEffective = Math.max(a.mtime, aSubMax)
      const bEffective = Math.max(b.mtime, bSubMax)
      return bEffective - aEffective
    })
  }, [sessions, subagentMap, filterActive, isSessionActive])

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

  const toggleSubagents = React.useCallback((parentId: string) => {
    setExpandedSubagents(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) {
        next.delete(parentId)
      } else {
        next.add(parentId)
      }
      return next
    })
  }, [])

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
        body: JSON.stringify({ projectPath: expandTilde(workingDir) }),
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
      // If the session is already active in a terminal, focus that window
      const activeInfo = activeSessionMap.get(session.sessionId)
        || activeSessionMap.get(session.sessionId.slice(0, 8))
      if (activeInfo) {
        await fetch('/api/ai/sessions/focus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ windowId: activeInfo.windowId, socket: activeInfo.socket }),
        })
        return
      }

      // Otherwise spawn a new terminal and resume the session
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

    const active = selectedSession ? isSessionActive(selectedSession) : false
    setIsSending(true)
    if (sendStatusTimerRef.current) clearTimeout(sendStatusTimerRef.current)

    let failed = false
    try {
      if (active) {
        // Session has a live terminal — send directly
        const res = await fetch('/api/ai/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: selectedSessionId, prompt: promptInput.trim(), projectPath: selectedSession?.projectPath }),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          setSendStatus({ type: 'success', message: 'Sent' })
          setPromptInput("")
        } else {
          failed = true
          setSendStatus({ type: 'error', message: (data.error || 'Failed to send').slice(0, 80) })
        }
      } else {
        // Session is inactive — resume in a new terminal and send the prompt
        const res = await fetch('/api/ai/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume: true, sessionId: selectedSessionId, projectPath: selectedSession?.projectPath, prompt: promptInput.trim() }),
        })
        const data = await res.json()
        if (res.ok && data.sessionId) {
          setSendStatus({ type: 'success', message: 'Resumed & sent' })
          setPromptInput("")
          // Refresh active sessions so the green dot appears
          setTimeout(() => fetchActiveSessions(), 3000)
        } else {
          failed = true
          setSendStatus({ type: 'error', message: (data.error || 'Failed to resume').slice(0, 80) })
        }
      }
    } catch {
      failed = true
      setSendStatus({ type: 'error', message: 'Network error' })
    } finally {
      setIsSending(false)
      sendStatusTimerRef.current = setTimeout(() => setSendStatus(null), failed ? 6000 : 3000)
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

            {/* View mode toggle */}
            <div className="px-3 py-2 border-b border-border/40 flex gap-1.5">
              <div className="flex border rounded-md flex-1">
                <Button
                  variant={viewMode === 'projects' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none flex-1 h-7 text-xs gap-1.5"
                  onClick={() => setViewMode('projects')}
                >
                  <FolderOpen className="h-3 w-3" />
                  By Project
                </Button>
                <Button
                  variant={viewMode === 'recent' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none flex-1 h-7 text-xs gap-1.5"
                  onClick={() => setViewMode('recent')}
                >
                  <List className="h-3 w-3" />
                  Recent
                </Button>
              </div>
              <Button
                variant={filterActive ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 text-xs gap-1 px-2 ${filterActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                onClick={() => setFilterActive(f => !f)}
                title={filterActive ? 'Showing active sessions only' : 'Filter to active sessions'}
              >
                <Zap className="h-3 w-3" />
                {activeSessionIds.size > 0 && (
                  <span className="tabular-nums">{activeSessionIds.size}</span>
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-3">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    Loading sessions...
                  </div>
                ) : viewMode === 'recent' ? (
                  recentSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No sessions found</p>
                      <p className="text-xs text-muted-foreground/60">
                        Run <code className="px-1 py-0.5 rounded bg-muted/50">claude</code> in your terminal to start
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {recentSessions.map((session) => {
                        const isSelected = session.path === selectedPath
                        const title = session.firstMessage || 'Untitled session'
                        const childSubs = subagentMap[session.sessionId] || []
                        const hasSubagents = childSubs.length > 0
                        const isExpanded = expandedSubagents.has(session.sessionId)
                        const active = isSessionActive(session)
                        return (
                          <React.Fragment key={session.path}>
                            <button
                              onClick={() => setSelectedPath(session.path)}
                              className={`w-full text-left pr-2 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group min-w-0 overflow-hidden ${
                                session.isSubagent ? 'pl-7' : 'px-3'
                              } ${
                                isSelected
                                  ? 'bg-primary/10 border border-primary/20 text-primary'
                                  : 'hover:bg-muted/30 text-muted-foreground'
                              }`}
                            >
                              {session.isSubagent && (
                                <Bot className="h-3 w-3 shrink-0 text-blue-400/70" />
                              )}
                              {active && (
                                <span className="relative flex h-2 w-2 shrink-0" title="Active terminal">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs truncate leading-snug flex-1 min-w-0" title={session.firstMessage || session.sessionId}>
                                    {title}
                                  </span>
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                                    {session.project || 'unknown'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap whitespace-nowrap text-[10px] text-muted-foreground/60 leading-none">
                                  <Clock className="h-2.5 w-2.5 shrink-0" />
                                  <span>{formatTimeAgo(session.mtime)}</span>
                                  <span className="opacity-40">·</span>
                                  <HardDrive className="h-2.5 w-2.5 shrink-0" />
                                  <span>{formatBytes(session.size)}</span>
                                  {!session.isSubagent && session.contextPercent != null && (
                                    <>
                                      <span className="opacity-40">·</span>
                                      <span className={`font-mono ${
                                        session.contextPercent >= 80
                                          ? 'text-red-400'
                                          : session.contextPercent >= 50
                                            ? 'text-yellow-400'
                                            : 'text-emerald-400'
                                      }`}>
                                        {session.contextPercent}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {!session.isSubagent && (
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
                              )}
                            </button>
                            {hasSubagents && (
                              <>
                                <button
                                  onClick={() => toggleSubagents(session.sessionId)}
                                  className="w-full flex items-center gap-1.5 pl-5 pr-2 py-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                >
                                  <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  <Bot className="h-2.5 w-2.5 text-blue-400/50" />
                                  <span>{childSubs.length} subagent{childSubs.length !== 1 ? 's' : ''}</span>
                                </button>
                                {isExpanded && childSubs.map((sub) => {
                                  const subSelected = sub.path === selectedPath
                                  const subTitle = sub.firstMessage || 'Untitled session'
                                  return (
                                    <button
                                      key={sub.path}
                                      onClick={() => setSelectedPath(sub.path)}
                                      className={`w-full text-left pr-2 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group min-w-0 overflow-hidden pl-7 ${
                                        subSelected
                                          ? 'bg-primary/10 border border-primary/20 text-primary'
                                          : 'hover:bg-muted/30 text-muted-foreground'
                                      }`}
                                    >
                                      <Bot className="h-3 w-3 shrink-0 text-blue-400/70" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="text-xs truncate leading-snug flex-1 min-w-0" title={sub.firstMessage || sub.sessionId}>
                                            {subTitle}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap whitespace-nowrap text-[10px] text-muted-foreground/60 leading-none">
                                          <Clock className="h-2.5 w-2.5 shrink-0" />
                                          <span>{formatTimeAgo(sub.mtime)}</span>
                                          <span className="opacity-40">·</span>
                                          <HardDrive className="h-2.5 w-2.5 shrink-0" />
                                          <span>{formatBytes(sub.size)}</span>
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  )
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
                    const mainCount = projectSessions.filter(s => !s.isSubagent).length
                    // Count all subagents in this project (including nested ones)
                    const totalSubCount = sessions.filter(s => s.isSubagent && (s.project || 'unknown') === project).length
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
                            {mainCount}{totalSubCount > 0 && <span className="text-blue-400/70">+{totalSubCount}</span>}
                          </Badge>
                        </button>
                        {!collapsed && (
                          <div className="space-y-0.5">
                            {visibleSessions.map((session) => {
                              const isSelected = session.path === selectedPath
                              const title = session.firstMessage || 'Untitled session'
                              const childSubs = subagentMap[session.sessionId] || []
                              const hasSubagents = !session.isSubagent && childSubs.length > 0
                              const isSubExpanded = expandedSubagents.has(session.sessionId)
                              const active = isSessionActive(session)
                              return (
                                <React.Fragment key={session.path}>
                                  <button
                                    onClick={() => setSelectedPath(session.path)}
                                    className={`w-full text-left pr-2 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group min-w-0 overflow-hidden ${
                                      session.isSubagent ? 'pl-7' : 'px-3'
                                    } ${
                                      isSelected
                                        ? 'bg-primary/10 border border-primary/20 text-primary'
                                        : 'hover:bg-muted/30 text-muted-foreground'
                                    }`}
                                  >
                                    {session.isSubagent && (
                                      <Bot className="h-3 w-3 shrink-0 text-blue-400/70" />
                                    )}
                                    {active && (
                                      <span className="relative flex h-2 w-2 shrink-0" title="Active terminal">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                      </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs truncate leading-snug" title={session.firstMessage || session.sessionId}>
                                        {title}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap whitespace-nowrap text-[10px] text-muted-foreground/60 leading-none">
                                        <Clock className="h-2.5 w-2.5 shrink-0" />
                                        <span>{formatTimeAgo(session.mtime)}</span>
                                        <span className="opacity-40">·</span>
                                        <HardDrive className="h-2.5 w-2.5 shrink-0" />
                                        <span>{formatBytes(session.size)}</span>
                                        {!session.isSubagent && session.contextPercent != null && (
                                          <>
                                            <span className="opacity-40">·</span>
                                            <span className={`font-mono ${
                                              session.contextPercent >= 80
                                                ? 'text-red-400'
                                                : session.contextPercent >= 50
                                                  ? 'text-yellow-400'
                                                  : 'text-emerald-400'
                                            }`}>
                                              {session.contextPercent}%
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {!session.isSubagent && (
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
                                    )}
                                  </button>
                                  {hasSubagents && (
                                    <>
                                      <button
                                        onClick={() => toggleSubagents(session.sessionId)}
                                        className="w-full flex items-center gap-1.5 pl-5 pr-2 py-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                      >
                                        <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`} />
                                        <Bot className="h-2.5 w-2.5 text-blue-400/50" />
                                        <span>{childSubs.length} subagent{childSubs.length !== 1 ? 's' : ''}</span>
                                      </button>
                                      {isSubExpanded && childSubs.map((sub) => {
                                        const subSelected = sub.path === selectedPath
                                        const subTitle = sub.firstMessage || 'Untitled session'
                                        return (
                                          <button
                                            key={sub.path}
                                            onClick={() => setSelectedPath(sub.path)}
                                            className={`w-full text-left pr-2 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group min-w-0 overflow-hidden pl-7 ${
                                              subSelected
                                                ? 'bg-primary/10 border border-primary/20 text-primary'
                                                : 'hover:bg-muted/30 text-muted-foreground'
                                            }`}
                                          >
                                            <Bot className="h-3 w-3 shrink-0 text-blue-400/70" />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-xs truncate leading-snug" title={sub.firstMessage || sub.sessionId}>
                                                {subTitle}
                                              </div>
                                              <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap whitespace-nowrap text-[10px] text-muted-foreground/60 leading-none">
                                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                                <span>{formatTimeAgo(sub.mtime)}</span>
                                                <span className="opacity-40">·</span>
                                                <HardDrive className="h-2.5 w-2.5 shrink-0" />
                                                <span>{formatBytes(sub.size)}</span>
                                              </div>
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </>
                                  )}
                                </React.Fragment>
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
                {selectedSession && isSessionActive(selectedSession) && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Zap className="h-3 w-3" />
                    <span>Terminal</span>
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
              <ConversationViewer messages={messages} isStreaming={isStreaming} isTruncated={isTruncated} onLoadFullHistory={loadFullHistory} isLoadingFull={isLoadingFull} userAvatarUrl={userAvatarUrl} />
            )}
          </div>

          {/* Send Prompt Input (hidden for subagent sessions) */}
          {selectedPath && selectedSessionId && !selectedSession?.isSubagent && (
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
                  placeholder={selectedSession && isSessionActive(selectedSession) ? 'Send to active session...' : 'Resume session and send...'}
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
              {sendStatus?.type === 'error' && (
                <p className="text-xs text-red-400 mt-1 px-1">{sendStatus.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
