"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot, FolderOpen, Plus, RefreshCw, Radio, WifiOff,
  Eye, Clock, HardDrive, ChevronRight,
} from "lucide-react"
import { ConversationViewer } from "@/components/ai/ConversationViewer"
import { useSessionStream } from "@/hooks/useSessionStream"

interface SessionInfo {
  path: string
  sessionId: string
  project: string
  projectSlug: string
  size: number
  mtime: number
  isSubagent: boolean
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

  const { messages, isStreaming, isConnected, isWaiting, error } = useSessionStream({
    path: selectedPath,
    enabled: !!selectedPath,
  })

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
                  title="New Claude session (tmux)"
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
                  Object.entries(grouped).map(([project, projectSessions]) => (
                    <div key={project}>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <FolderOpen className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider truncate">
                          {project}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                          {projectSessions.length}
                        </Badge>
                      </div>
                      <div className="space-y-0.5">
                        {projectSessions.map((session) => {
                          const isSelected = session.path === selectedPath
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
                                <div className="font-mono text-xs truncate">
                                  {session.sessionId.slice(0, 8)}...
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
                              <ChevronRight className={`h-3 w-3 shrink-0 transition-opacity ${
                                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                              }`} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
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
            <Badge variant="secondary" className="text-xs">
              {messages.length} messages
            </Badge>
          </div>
        </div>

        {/* Viewer Area */}
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
      </div>
    </div>
  )
}
