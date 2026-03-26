"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Bot, RefreshCw, Play, Square, Plus, Monitor, Smartphone,
  Clock, HardDrive, Zap, AlertCircle, Loader2, Terminal,
  Cpu, Activity, ChevronDown, ChevronRight, Trash2,
} from "lucide-react"

interface AgentInfo {
  id: string
  sessionName: string
  status: "idle" | "running" | "tool_use" | "awaiting_input" | "stale" | "unknown"
  currentTool?: string
  issueId?: string
  contextPercent?: number
  lastActivity: string
  workingDir: string
  device: "local" | string
  deviceLabel: string
  pid?: number
  subagentCount: number
  permissionMode?: string
  tmuxPane?: string
  claudeSessionId?: string
}

interface AgentStatusResponse {
  agents: AgentInfo[]
  total: number
  active: number
  timestamp: string
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const diff = now - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getStatusColor(status: AgentInfo["status"]): string {
  switch (status) {
    case "running": return "bg-green-500"
    case "tool_use": return "bg-blue-500"
    case "awaiting_input": return "bg-yellow-500"
    case "idle": return "bg-emerald-400"
    case "stale": return "bg-gray-400"
    case "unknown": return "bg-gray-500"
  }
}

function getStatusLabel(status: AgentInfo["status"]): string {
  switch (status) {
    case "running": return "Running"
    case "tool_use": return "Tool Use"
    case "awaiting_input": return "Awaiting Input"
    case "idle": return "Idle"
    case "stale": return "Stale"
    case "unknown": return "Unknown"
  }
}

function getStatusBadgeVariant(status: AgentInfo["status"]): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "running":
    case "tool_use":
      return "default"
    case "awaiting_input":
      return "destructive"
    case "idle":
      return "secondary"
    default:
      return "outline"
  }
}

function getDeviceIcon(device: string) {
  if (device === "phone" || device.includes("pocket") || device.includes("Pocket")) {
    return Smartphone
  }
  return Monitor
}

function shortenPath(path: string): string {
  return path
    .replace(/^\/home\/[^/]+\/projects\//, "~/p/")
    .replace(/^\/home\/[^/]+\//, "~/")
}

function AgentCard({ agent, onKill }: { agent: AgentInfo; onKill: (name: string) => void }) {
  const [expanded, setExpanded] = React.useState(false)
  const isActive = ["running", "tool_use", "awaiting_input", "idle"].includes(agent.status)
  const DeviceIcon = getDeviceIcon(agent.device)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border transition-colors ${
        isActive
          ? "border-primary/30 bg-card/80"
          : "border-border/20 bg-card/40 opacity-70"
      }`}
      data-tabz-item={`agent-${agent.id}`}
    >
      {/* Main card content */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
        data-tabz-action="toggle-agent-details"
      >
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div className="relative mt-1 flex-shrink-0">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`} />
            {isActive && agent.status !== "idle" && (
              <div className={`absolute inset-0 h-3 w-3 rounded-full ${getStatusColor(agent.status)} animate-ping opacity-50`} />
            )}
          </div>

          {/* Agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium text-foreground truncate">
                {agent.sessionName}
              </span>
              <Badge variant={getStatusBadgeVariant(agent.status)} className="text-xs">
                {getStatusLabel(agent.status)}
              </Badge>
              {agent.currentTool && (
                <Badge variant="outline" className="text-xs font-mono">
                  <Zap className="h-3 w-3 mr-1" />
                  {agent.currentTool}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DeviceIcon className="h-3 w-3" />
                {agent.deviceLabel}
              </span>
              {agent.issueId && (
                <span className="flex items-center gap-1 font-mono text-primary">
                  <Terminal className="h-3 w-3" />
                  {agent.issueId}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(agent.lastActivity)}
              </span>
            </div>

            {/* Context window bar */}
            {agent.contextPercent != null && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      agent.contextPercent > 80
                        ? "bg-red-500"
                        : agent.contextPercent > 60
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(agent.contextPercent, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                  {agent.contextPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Expand indicator */}
          <div className="flex-shrink-0 mt-0.5">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-border/10 pt-3">
              {agent.workingDir && (
                <div className="flex items-center gap-2 text-xs">
                  <HardDrive className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-muted-foreground truncate">{shortenPath(agent.workingDir)}</span>
                </div>
              )}
              {agent.pid && (
                <div className="flex items-center gap-2 text-xs">
                  <Cpu className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">PID: {agent.pid}</span>
                </div>
              )}
              {agent.subagentCount > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Bot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{agent.subagentCount} subagent{agent.subagentCount !== 1 ? "s" : ""}</span>
                </div>
              )}
              {agent.permissionMode && (
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Mode: {agent.permissionMode}</span>
                </div>
              )}
              {agent.tmuxPane && (
                <div className="flex items-center gap-2 text-xs">
                  <Terminal className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-muted-foreground">{agent.tmuxPane}</span>
                </div>
              )}

              {/* Kill button */}
              {isActive && agent.device === "local" && (
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onKill(agent.sessionName)
                    }}
                    className="text-xs"
                    data-tabz-action="kill-agent"
                    data-tabz-item={agent.sessionName}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Kill Session
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AgentSwarmSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  const [agents, setAgents] = React.useState<AgentInfo[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Spawn form state
  const [showSpawnForm, setShowSpawnForm] = React.useState(false)
  const [spawnName, setSpawnName] = React.useState("")
  const [spawnProject, setSpawnProject] = React.useState("")
  const [spawnPrompt, setSpawnPrompt] = React.useState("")
  const [isSpawning, setIsSpawning] = React.useState(false)
  const [spawnError, setSpawnError] = React.useState<string | null>(null)

  // Filter state
  const [showActiveOnly, setShowActiveOnly] = React.useState(false)

  const fetchAgents = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const res = await fetch("/api/agents/status")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AgentStatusResponse = await res.json()
      setAgents(data.agents)
      setLastRefresh(data.timestamp)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent status")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial fetch + polling
  React.useEffect(() => {
    fetchAgents()
    const interval = setInterval(() => fetchAgents(true), 5000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  // Handle activeSubItem
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  const handleSpawn = async () => {
    setIsSpawning(true)
    setSpawnError(null)

    try {
      const res = await fetch("/api/agents/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "spawn",
          sessionName: spawnName || undefined,
          projectPath: spawnProject || undefined,
          prompt: spawnPrompt || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setSpawnName("")
      setSpawnProject("")
      setSpawnPrompt("")
      setShowSpawnForm(false)
      // Refresh after a short delay to let the session start
      setTimeout(() => fetchAgents(true), 1500)
    } catch (err) {
      setSpawnError(err instanceof Error ? err.message : "Failed to spawn agent")
    } finally {
      setIsSpawning(false)
    }
  }

  const handleKill = async (sessionName: string) => {
    try {
      const res = await fetch("/api/agents/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill", sessionName }),
      })

      if (!res.ok) {
        const data = await res.json()
        console.error("Kill failed:", data.error)
      }

      // Refresh after kill
      setTimeout(() => fetchAgents(true), 500)
    } catch (err) {
      console.error("Kill error:", err)
    }
  }

  const filteredAgents = showActiveOnly
    ? agents.filter(a => ["running", "tool_use", "awaiting_input", "idle"].includes(a.status))
    : agents

  const activeCount = agents.filter(a =>
    ["running", "tool_use", "awaiting_input", "idle"].includes(a.status)
  ).length

  const toolUseCount = agents.filter(a => a.status === "tool_use").length
  const awaitingCount = agents.filter(a => a.status === "awaiting_input").length

  // Group agents by device
  const agentsByDevice = React.useMemo(() => {
    const groups: Record<string, AgentInfo[]> = {}
    for (const agent of filteredAgents) {
      const key = agent.deviceLabel
      if (!groups[key]) groups[key] = []
      groups[key].push(agent)
    }
    return groups
  }, [filteredAgents])

  return (
    <div className="p-6 space-y-6" data-tabz-section="agent-swarm">
      {/* Header */}
      <div className="flex items-center justify-between" data-tabz-region="header">
        <div>
          <h1 className="text-2xl font-bold terminal-glow flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Agent Swarm Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} tracked
            {activeCount > 0 && (
              <> &middot; <span className="text-green-400">{activeCount} active</span></>
            )}
            {toolUseCount > 0 && (
              <> &middot; <span className="text-blue-400">{toolUseCount} using tools</span></>
            )}
            {awaitingCount > 0 && (
              <> &middot; <span className="text-yellow-400">{awaitingCount} awaiting input</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={showActiveOnly ? "border-primary text-primary" : ""}
            data-tabz-action="toggle-active-filter"
          >
            <Activity className="h-4 w-4 mr-1" />
            Active
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAgents(true)}
            disabled={isRefreshing}
            data-tabz-action="refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowSpawnForm(!showSpawnForm)}
            data-tabz-action="spawn-agent"
          >
            <Plus className="h-4 w-4 mr-1" />
            Spawn
          </Button>
        </div>
      </div>

      {/* Spawn form */}
      <AnimatePresence>
        {showSpawnForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-lg border border-primary/30 bg-card/80 p-4 space-y-3"
              data-tabz-region="spawn-form"
            >
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Spawn New Agent
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Session Name (optional)</label>
                  <Input
                    value={spawnName}
                    onChange={(e) => setSpawnName(e.target.value)}
                    placeholder="claude-agent-..."
                    className="text-sm"
                    data-tabz-input="agent-name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Project Path (optional)</label>
                  <Input
                    value={spawnProject}
                    onChange={(e) => setSpawnProject(e.target.value)}
                    placeholder="~/projects/my-project"
                    className="text-sm"
                    data-tabz-input="agent-project"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Initial Prompt (optional)</label>
                  <Input
                    value={spawnPrompt}
                    onChange={(e) => setSpawnPrompt(e.target.value)}
                    placeholder="Fix the failing tests..."
                    className="text-sm"
                    data-tabz-input="agent-prompt"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSpawn}
                  disabled={isSpawning}
                  data-tabz-action="confirm-spawn"
                >
                  {isSpawning ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  {isSpawning ? "Spawning..." : "Launch Agent"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpawnForm(false)}
                  data-tabz-action="cancel-spawn"
                >
                  Cancel
                </Button>
                {spawnError && (
                  <span className="text-xs text-destructive">{spawnError}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary stats bar */}
      {agents.length > 0 && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          data-tabz-region="stats"
        >
          <div className="rounded-lg border border-border/20 bg-card/40 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{agents.length}</div>
            <div className="text-xs text-muted-foreground">Total Agents</div>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-green-400">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-blue-400">{toolUseCount}</div>
            <div className="text-xs text-muted-foreground">Using Tools</div>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-yellow-400">{awaitingCount}</div>
            <div className="text-xs text-muted-foreground">Awaiting Input</div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Scanning for agents...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchAgents()}
            data-tabz-action="retry"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && agents.length === 0 && (
        <div className="rounded-lg border border-border/20 bg-card/40 p-8 text-center" data-tabz-region="empty">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No agents detected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No Claude agent sessions found in tmux or state files.
            Spawn one using the button above.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpawnForm(true)}
            data-tabz-action="spawn-agent"
          >
            <Plus className="h-4 w-4 mr-1" />
            Spawn Your First Agent
          </Button>
        </div>
      )}

      {/* Agent cards grouped by device */}
      {!isLoading && !error && filteredAgents.length > 0 && (
        <div className="space-y-4" data-tabz-list="agent-groups">
          {Object.entries(agentsByDevice).map(([deviceLabel, deviceAgents]) => {
            const DeviceIcon = getDeviceIcon(deviceAgents[0]?.device || "local")
            return (
              <div key={deviceLabel} data-tabz-region={`device-${deviceLabel.toLowerCase().replace(/\s+/g, "-")}`}>
                {Object.keys(agentsByDevice).length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">{deviceLabel}</span>
                    <Badge variant="secondary" className="text-xs">{deviceAgents.length}</Badge>
                  </div>
                )}
                <div className="space-y-2" data-tabz-list="agents">
                  <AnimatePresence mode="popLayout">
                    {deviceAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onKill={handleKill}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Last refresh timestamp */}
      {lastRefresh && (
        <div className="text-xs text-muted-foreground text-center pt-2" suppressHydrationWarning>
          Last updated: {new Date(lastRefresh).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
