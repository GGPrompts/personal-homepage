"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3,
  Activity,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Zap,
  Timer,
  Hash,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Pause,
  Terminal,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

interface TokenUsage {
  date: string
  inputTokens: number
  outputTokens: number
  cacheRead: number
  cacheWrite: number
  totalTokens?: number
  isLive?: boolean
}

interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  webSearchRequests: number
}

interface DailyActivity {
  date: string
  messageCount: number
  sessionCount: number
  toolCallCount: number
}

interface ClaudeStatsData {
  dailyTokenUsage: TokenUsage[]
  modelUsage: Record<string, ModelUsage>
  totalSessions: number
  totalMessages: number
  dailyActivity: DailyActivity[]
  lastComputedDate: string
  firstSessionDate?: string
  hourCounts?: Record<string, number>
  liveData?: {
    lastUpdated: string
    tokensByModel: Record<string, number>
  }
}

interface Session {
  id: string
  name: string
  project: string
  startTime: string
  endTime?: string
  status: "active" | "paused" | "completed" | "error"
  totalTokens: number
  messageCount: number
  toolCalls: number
  sessionCount?: number
}

interface ConversationStats {
  totalConversations: number
  totalMessages: number
  totalTokens: number
  avgTokensPerConversation: number
  avgMessagesPerConversation: number
  mostActiveProject: string
  mostUsedTools: { name: string; count: number }[]
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = "claude-analytics"

interface StoredAnalytics {
  tokenUsage: TokenUsage[]
  sessions: Session[]
  lastUpdated: string
  claudeStats?: ClaudeStatsData
  isRealData?: boolean
}

function loadAnalytics(): StoredAnalytics {
  if (typeof window === "undefined") {
    return { tokenUsage: [], sessions: [], lastUpdated: new Date().toISOString() }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }
  return { tokenUsage: [], sessions: [], lastUpdated: new Date().toISOString() }
}

function saveAnalytics(data: StoredAnalytics) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

async function fetchClaudeStats(): Promise<ClaudeStatsData | null> {
  try {
    const response = await fetch('/api/claude-stats')
    if (!response.ok) return null
    const data = await response.json()
    if (!data.success || !data.data) return null
    return data.data as ClaudeStatsData
  } catch {
    return null
  }
}

// ============================================================================
// DEMO DATA GENERATOR
// ============================================================================

function generateDemoData(): StoredAnalytics {
  const now = new Date()
  const tokenUsage: TokenUsage[] = []
  const sessions: Session[] = []

  // Generate 14 days of token usage
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    // Random usage with some variance
    const baseInput = Math.floor(Math.random() * 50000) + 10000
    const baseOutput = Math.floor(Math.random() * 30000) + 5000

    tokenUsage.push({
      date: dateStr,
      inputTokens: baseInput,
      outputTokens: baseOutput,
      cacheRead: Math.floor(baseInput * (Math.random() * 0.3)),
      cacheWrite: Math.floor(baseInput * (Math.random() * 0.1)),
    })
  }

  // Generate sample sessions
  const projectNames = ["personal-homepage", "api-server", "mobile-app", "docs-site", "cli-tool"]
  const sessionNames = [
    "Feature implementation",
    "Bug fixing",
    "Code review",
    "Refactoring",
    "Documentation",
    "Testing",
  ]

  for (let i = 0; i < 8; i++) {
    const startTime = new Date(now)
    startTime.setHours(startTime.getHours() - Math.floor(Math.random() * 48))

    const isActive = i === 0
    const isPaused = i === 1
    const hasError = i === 7

    sessions.push({
      id: `session-${Date.now()}-${i}`,
      name: sessionNames[Math.floor(Math.random() * sessionNames.length)],
      project: projectNames[Math.floor(Math.random() * projectNames.length)],
      startTime: startTime.toISOString(),
      endTime: isActive || isPaused ? undefined : new Date(startTime.getTime() + Math.random() * 3600000).toISOString(),
      status: isActive ? "active" : isPaused ? "paused" : hasError ? "error" : "completed",
      totalTokens: Math.floor(Math.random() * 50000) + 5000,
      messageCount: Math.floor(Math.random() * 50) + 5,
      toolCalls: Math.floor(Math.random() * 30) + 2,
    })
  }

  return {
    tokenUsage,
    sessions,
    lastUpdated: now.toISOString(),
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function getStatusIcon(status: Session["status"]) {
  switch (status) {
    case "active":
      return <Circle className="h-3 w-3 text-green-500 fill-green-500 animate-pulse" />
    case "paused":
      return <Pause className="h-3 w-3 text-yellow-500" />
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-blue-500" />
    case "error":
      return <AlertCircle className="h-3 w-3 text-red-500" />
  }
}

function getStatusColor(status: Session["status"]) {
  switch (status) {
    case "active":
      return "text-green-500 border-green-500/50"
    case "paused":
      return "text-yellow-500 border-yellow-500/50"
    case "completed":
      return "text-blue-500 border-blue-500/50"
    case "error":
      return "text-red-500 border-red-500/50"
  }
}

// ============================================================================
// CHART COMPONENT
// ============================================================================

function TokenUsageChart({ data, timeRange }: { data: TokenUsage[]; timeRange: "7d" | "14d" | "30d" }) {
  const CHART_HEIGHT = 160 // pixels available for bars (excluding label space)

  const chartData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30
    return data.slice(-days)
  }, [data, timeRange])

  const maxTokens = useMemo(() => {
    if (chartData.length === 0) return 1
    const max = Math.max(...chartData.map((d) => d.inputTokens + d.outputTokens))
    // Ensure we have a sensible minimum to avoid division issues
    return Math.max(max, 1)
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
        <p>No usage data yet</p>
        <p className="text-xs">Start using Claude Code to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="flex items-end gap-1 h-48">
        {chartData.map((day, i) => {
          const total = day.inputTokens + day.outputTokens
          // Calculate pixel heights instead of percentages
          const totalHeight = (total / maxTokens) * CHART_HEIGHT
          const inputHeight = total > 0 ? (day.inputTokens / total) * totalHeight : 0
          const outputHeight = total > 0 ? (day.outputTokens / total) * totalHeight : 0

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              style={{ transformOrigin: "bottom" }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                  <p className="font-medium text-white flex items-center gap-2">
                    {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {day.isLive && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded font-medium">
                        LIVE
                      </span>
                    )}
                  </p>
                  <p className="text-blue-400">Input: {formatNumber(day.inputTokens)}</p>
                  <p className="text-emerald-400">Output: {formatNumber(day.outputTokens)}</p>
                  <p className="text-zinc-400">Total: {formatNumber(total)}</p>
                </div>
              </div>

              {/* Live indicator dot */}
              {day.isLive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              )}

              {/* Bars - using pixel heights for proper scaling */}
              <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: CHART_HEIGHT }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${day.isLive ? "bg-blue-400/80 hover:bg-blue-400" : "bg-blue-500/70 hover:bg-blue-500"}`}
                  style={{ height: Math.max(inputHeight, day.inputTokens > 0 ? 2 : 0) }}
                />
                <div
                  className={`w-full rounded-b-sm transition-all ${day.isLive ? "bg-emerald-400/80 hover:bg-emerald-400" : "bg-emerald-500/70 hover:bg-emerald-500"}`}
                  style={{ height: Math.max(outputHeight, day.outputTokens > 0 ? 2 : 0) }}
                />
              </div>

              {/* Day label */}
              <span className={`text-[10px] ${day.isLive ? "text-green-400 font-medium" : "text-muted-foreground"}`}>
                {day.isLive ? "Today" : new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Input Tokens</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-muted-foreground">Output Tokens</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsSection({ activeSubItem, onSubItemHandled }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<StoredAnalytics>(loadAnalytics)
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d">("7d")
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  // Handle sub-item navigation
  useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Load analytics on mount - fetch real Claude Code stats
  useEffect(() => {
    async function loadData() {
      // First try to fetch real Claude Code stats
      const claudeStats = await fetchClaudeStats()

      if (claudeStats && claudeStats.dailyTokenUsage.length > 0) {
        // Convert real stats to analytics format
        const tokenUsage: TokenUsage[] = claudeStats.dailyTokenUsage.map(day => ({
          date: day.date,
          inputTokens: day.inputTokens,
          outputTokens: day.outputTokens,
          cacheRead: day.cacheRead,
          cacheWrite: day.cacheWrite,
        }))

        // Create sessions from daily activity
        const sessions: Session[] = claudeStats.dailyActivity.map((day, i) => ({
          id: `session-${day.date}-${i}`,
          name: `Day ${day.date}`,
          project: "All Projects",
          startTime: new Date(day.date + "T12:00:00").toISOString(),
          endTime: new Date(day.date + "T12:00:00").toISOString(),
          status: "completed" as const,
          totalTokens: claudeStats.dailyTokenUsage.find(t => t.date === day.date)?.totalTokens || 0,
          messageCount: day.messageCount,
          toolCalls: day.toolCallCount,
          sessionCount: day.sessionCount,
        }))

        const realData: StoredAnalytics = {
          tokenUsage,
          sessions,
          lastUpdated: claudeStats.lastComputedDate,
          claudeStats,
          isRealData: true,
        }

        setAnalytics(realData)
        saveAnalytics(realData)
        return
      }

      // Fallback to local storage or demo data
      const loaded = loadAnalytics()
      if (loaded.tokenUsage.length === 0 || !loaded.isRealData) {
        const demo = generateDemoData()
        setAnalytics(demo)
        saveAnalytics(demo)
      } else {
        setAnalytics(loaded)
      }
    }

    loadData()
  }, [])

  // Calculate stats - use real Claude stats when available
  const stats = useMemo((): ConversationStats => {
    const { sessions, claudeStats } = analytics

    // Use real Claude stats if available
    if (claudeStats) {
      const totalTokensFromModels = Object.values(claudeStats.modelUsage).reduce(
        (sum, model) => sum + model.inputTokens + model.outputTokens, 0
      )
      const totalToolCalls = claudeStats.dailyActivity.reduce((sum, d) => sum + d.toolCallCount, 0)

      // Most used tools (estimated from total tool calls)
      const mostUsedTools = [
        { name: "Edit", count: Math.floor(totalToolCalls * 0.35) },
        { name: "Read", count: Math.floor(totalToolCalls * 0.25) },
        { name: "Bash", count: Math.floor(totalToolCalls * 0.2) },
        { name: "Grep", count: Math.floor(totalToolCalls * 0.12) },
        { name: "Write", count: Math.floor(totalToolCalls * 0.08) },
      ]

      return {
        totalConversations: claudeStats.totalSessions,
        totalMessages: claudeStats.totalMessages,
        totalTokens: totalTokensFromModels,
        avgTokensPerConversation: claudeStats.totalSessions > 0 ? Math.floor(totalTokensFromModels / claudeStats.totalSessions) : 0,
        avgMessagesPerConversation: claudeStats.totalSessions > 0 ? Math.floor(claudeStats.totalMessages / claudeStats.totalSessions) : 0,
        mostActiveProject: "Claude Code",
        mostUsedTools,
      }
    }

    // Fallback to session-based calculation
    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0)
    const totalToolCalls = sessions.reduce((sum, s) => sum + s.toolCalls, 0)

    // Find most active project
    const projectCounts = new Map<string, number>()
    sessions.forEach((s) => {
      projectCounts.set(s.project, (projectCounts.get(s.project) || 0) + 1)
    })
    const mostActiveProject = Array.from(projectCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

    // Most used tools (simulated)
    const mostUsedTools = [
      { name: "Edit", count: Math.floor(totalToolCalls * 0.35) },
      { name: "Read", count: Math.floor(totalToolCalls * 0.25) },
      { name: "Bash", count: Math.floor(totalToolCalls * 0.2) },
      { name: "Grep", count: Math.floor(totalToolCalls * 0.12) },
      { name: "Write", count: Math.floor(totalToolCalls * 0.08) },
    ]

    return {
      totalConversations: sessions.length,
      totalMessages,
      totalTokens,
      avgTokensPerConversation: sessions.length > 0 ? Math.floor(totalTokens / sessions.length) : 0,
      avgMessagesPerConversation: sessions.length > 0 ? Math.floor(totalMessages / sessions.length) : 0,
      mostActiveProject,
      mostUsedTools,
    }
  }, [analytics])

  // Token usage summary
  const tokenSummary = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30
    const recentData = analytics.tokenUsage.slice(-days)
    const previousData = analytics.tokenUsage.slice(-days * 2, -days)

    const recentTotal = recentData.reduce((sum, d) => sum + d.inputTokens + d.outputTokens, 0)
    const previousTotal = previousData.reduce((sum, d) => sum + d.inputTokens + d.outputTokens, 0)

    const percentChange = previousTotal > 0
      ? ((recentTotal - previousTotal) / previousTotal) * 100
      : 0

    const avgDaily = recentData.length > 0 ? Math.floor(recentTotal / recentData.length) : 0

    const totalInput = recentData.reduce((sum, d) => sum + d.inputTokens, 0)
    const totalOutput = recentData.reduce((sum, d) => sum + d.outputTokens, 0)

    // Calculate total cache from modelUsage if available, otherwise from daily data
    let totalCache = 0
    if (analytics.claudeStats?.modelUsage) {
      totalCache = Object.values(analytics.claudeStats.modelUsage).reduce(
        (sum, model) => sum + model.cacheReadInputTokens + model.cacheCreationInputTokens, 0
      )
    } else {
      totalCache = recentData.reduce((sum, d) => sum + d.cacheRead + d.cacheWrite, 0)
    }

    return {
      total: recentTotal,
      percentChange,
      avgDaily,
      totalInput,
      totalOutput,
      totalCache,
    }
  }, [analytics.tokenUsage, analytics.claudeStats, timeRange])

  // Refresh data - fetch fresh from Claude Code stats
  const handleRefresh = useCallback(async () => {
    const claudeStats = await fetchClaudeStats()

    if (claudeStats && claudeStats.dailyTokenUsage.length > 0) {
      const tokenUsage: TokenUsage[] = claudeStats.dailyTokenUsage.map(day => ({
        date: day.date,
        inputTokens: day.inputTokens,
        outputTokens: day.outputTokens,
        cacheRead: day.cacheRead,
        cacheWrite: day.cacheWrite,
      }))

      const sessions: Session[] = claudeStats.dailyActivity.map((day, i) => ({
        id: `session-${day.date}-${i}`,
        name: `Day ${day.date}`,
        project: "All Projects",
        startTime: new Date(day.date + "T12:00:00").toISOString(),
        endTime: new Date(day.date + "T12:00:00").toISOString(),
        status: "completed" as const,
        totalTokens: claudeStats.dailyTokenUsage.find(t => t.date === day.date)?.totalTokens || 0,
        messageCount: day.messageCount,
        toolCalls: day.toolCallCount,
        sessionCount: day.sessionCount,
      }))

      const realData: StoredAnalytics = {
        tokenUsage,
        sessions,
        lastUpdated: new Date().toISOString(),
        claudeStats,
        isRealData: true,
      }

      setAnalytics(realData)
      saveAnalytics(realData)
    } else {
      // Fallback to demo if API unavailable
      const demo = generateDemoData()
      setAnalytics(demo)
      saveAnalytics(demo)
    }
  }, [])

  // Clear all data
  const handleClearData = useCallback(() => {
    const empty: StoredAnalytics = {
      tokenUsage: [],
      sessions: [],
      lastUpdated: new Date().toISOString(),
    }
    setAnalytics(empty)
    saveAnalytics(empty)
  }, [])

  // Active sessions
  const activeSessions = useMemo(() => {
    return analytics.sessions.filter((s) => s.status === "active" || s.status === "paused")
  }, [analytics.sessions])

  // Recent sessions
  const recentSessions = useMemo(() => {
    return [...analytics.sessions]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 10)
  }, [analytics.sessions])

  return (
    <div className="p-6 space-y-6" data-tabz-section="analytics">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Claude Code usage statistics and session monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(tokenSummary.total)}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${tokenSummary.percentChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {tokenSummary.percentChange >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(tokenSummary.percentChange).toFixed(1)}%</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Avg {formatNumber(tokenSummary.avgDaily)}/day
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold text-foreground">{activeSessions.length}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.totalConversations} total sessions
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(stats.totalMessages)}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Avg {stats.avgMessagesPerConversation}/session
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cache Savings</p>
                <p className="text-2xl font-bold text-emerald-500">{formatNumber(tokenSummary.totalCache)}</p>
              </div>
              <Zap className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tokens saved via caching
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Token Usage Chart */}
        <Card className="glass border-border lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Token Usage
              </CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">Input</p>
                  <p className="font-medium text-primary">{formatNumber(tokenSummary.totalInput)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Output</p>
                  <p className="font-medium text-emerald-500">{formatNumber(tokenSummary.totalOutput)}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TokenUsageChart data={analytics.tokenUsage} timeRange={timeRange} />
          </CardContent>
        </Card>

        {/* Tool Usage */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Top Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.mostUsedTools.map((tool, i) => {
                const maxCount = stats.mostUsedTools[0]?.count || 1
                const percentage = (tool.count / maxCount) * 100

                return (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{tool.name}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(tool.count)}</span>
                    </div>
                    <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      <Card className="glass border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Sessions
            </CardTitle>
            <Badge variant="outline">{analytics.sessions.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent">
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="gap-2">
                <Circle className="h-3 w-3 text-green-500 fill-green-500" />
                Active ({activeSessions.length})
              </TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <ScrollArea className="h-[300px]">
                {activeSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    <p>No active sessions</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        expanded={expandedSession === session.id}
                        onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recent">
              <ScrollArea className="h-[300px]">
                {recentSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Clock className="h-8 w-8 mb-2 opacity-50" />
                    <p>No sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        expanded={expandedSession === session.id}
                        onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <p>Last updated: {timeAgo(analytics.lastUpdated)}</p>
          {analytics.claudeStats?.liveData && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live data active
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleClearData} className="gap-2 text-red-500 hover:text-red-600">
          <Trash2 className="h-3 w-3" />
          Clear Data
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// SESSION CARD COMPONENT
// ============================================================================

function SessionCard({
  session,
  expanded,
  onToggle,
}: {
  session: Session
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      className={`rounded-lg border p-3 transition-colors ${
        expanded ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(session.status)}
            <div>
              <p className="font-medium text-foreground">{session.name}</p>
              <p className="text-xs text-muted-foreground">{session.project}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={getStatusColor(session.status)}>
              {session.status}
            </Badge>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Separator className="my-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Sessions</p>
                <p className="font-medium flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {session.sessionCount ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tokens</p>
                <p className="font-medium flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {formatNumber(session.totalTokens)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Messages</p>
                <p className="font-medium flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {session.messageCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tool Calls</p>
                <p className="font-medium flex items-center gap-1">
                  <Terminal className="h-3 w-3" />
                  {session.toolCalls}
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Started {timeAgo(session.startTime)}
              {session.endTime && ` • Ended ${timeAgo(session.endTime)}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
