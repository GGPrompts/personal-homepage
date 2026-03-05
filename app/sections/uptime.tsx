"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Plus,
  RefreshCw,
  TrendingUp,
  XCircle,
  Pause,
  Trash2,
  ExternalLink,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type MonitorStatus = "up" | "down" | "degraded"

interface MonitorConfig {
  id: string
  name: string
  url: string
  type: "http" | "statuspage"
  enabled: boolean
  interval: number
  group?: string
  statusUrl?: string
  lastCheck?: CheckResult | null
}

interface CheckResult {
  monitorId: string
  timestamp: string
  status: MonitorStatus
  responseTime: number
  statusCode?: number
  error?: string
  statusPageData?: {
    indicator: string
    description: string
  }
}

interface HistoryEntry {
  date: string
  checks: number
  upChecks: number
  avgResponseTime: number
  incidents: number
}

interface MonitorHistory {
  [monitorId: string]: {
    recent: CheckResult[]
    daily: HistoryEntry[]
  }
}

interface UptimeResponse {
  monitors: MonitorConfig[]
  results: (CheckResult & { monitor: MonitorConfig })[]
  history: MonitorHistory
  checkedAt: string
}

// ============================================================================
// COMPONENT
// ============================================================================

interface UptimeSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function UptimeSection({ activeSubItem, onSubItemHandled }: UptimeSectionProps) {
  const queryClient = useQueryClient()
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newType, setNewType] = useState<"http" | "statuspage">("http")

  // Fetch uptime data
  const { data, isLoading, refetch, isFetching } = useQuery<UptimeResponse>({
    queryKey: ["uptime"],
    queryFn: async () => {
      const res = await fetch("/api/uptime?check=true")
      if (!res.ok) throw new Error("Failed to fetch uptime data")
      return res.json()
    },
    refetchInterval: 60000, // Re-check every minute
    staleTime: 30000,
  })

  // Add monitor mutation
  const addMonitor = useMutation({
    mutationFn: async (monitor: { name: string; url: string; type: string }) => {
      const res = await fetch("/api/uptime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...monitor }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uptime"] })
      setShowAddForm(false)
      setNewName("")
      setNewUrl("")
    },
  })

  // Remove monitor mutation
  const removeMonitor = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/uptime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      })
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uptime"] }),
  })

  const monitors = data?.monitors || []
  const history = data?.history || {}

  // Auto-select first monitor
  useEffect(() => {
    if (!selectedMonitorId && monitors.length > 0) {
      setSelectedMonitorId(monitors[0].id)
    }
  }, [monitors, selectedMonitorId])

  // Compute stats
  const enabledMonitors = monitors.filter((m) => m.enabled)
  const upCount = enabledMonitors.filter((m) => m.lastCheck?.status === "up").length
  const downCount = enabledMonitors.filter((m) => m.lastCheck?.status === "down").length
  const degradedCount = enabledMonitors.filter((m) => m.lastCheck?.status === "degraded").length

  const overallStatus: MonitorStatus =
    downCount > 0 ? "down" : degradedCount > 0 ? "degraded" : "up"

  // Get response time chart data for selected monitor
  const selectedHistory = selectedMonitorId ? history[selectedMonitorId] : null
  const responseTimeData = (selectedHistory?.recent || []).slice(-24).map((r, i) => ({
    index: i,
    time: r.responseTime,
    label: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }))

  // Get daily uptime data for selected monitor
  const dailyData = (selectedHistory?.daily || []).map((d) => ({
    date: d.date,
    uptime: d.checks > 0 ? (d.upChecks / d.checks) * 100 : 100,
    incidents: d.incidents,
    avgResponseTime: Math.round(d.avgResponseTime),
  }))

  const selectedMonitor = monitors.find((m) => m.id === selectedMonitorId)

  // Compute uptime percentage for a monitor
  const getUptimePercent = (monitorId: string): string => {
    const h = history[monitorId]
    if (!h?.daily?.length) return "---"
    const totalChecks = h.daily.reduce((a, d) => a + d.checks, 0)
    const totalUp = h.daily.reduce((a, d) => a + d.upChecks, 0)
    if (totalChecks === 0) return "---"
    return ((totalUp / totalChecks) * 100).toFixed(2)
  }

  // Compute avg response time for a monitor
  const getAvgResponse = (monitorId: string): string => {
    const h = history[monitorId]
    if (!h?.recent?.length) return "---"
    const avg = h.recent.reduce((a, r) => a + r.responseTime, 0) / h.recent.length
    return `${Math.round(avg)}ms`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold terminal-glow font-mono">Uptime Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status for {enabledMonitors.length} endpoints
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-tabz-action="refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Monitor
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <Card className={`glass ${overallStatus === "down" ? "border-red-500/50" : overallStatus === "degraded" ? "border-amber-500/50" : "border-emerald-500/30"}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {overallStatus === "up" ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              ) : overallStatus === "degraded" ? (
                <AlertCircle className="w-10 h-10 text-amber-400" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {overallStatus === "up"
                  ? "All Systems Operational"
                  : overallStatus === "degraded"
                    ? "Partial Degradation"
                    : "Service Disruption Detected"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {upCount} up, {degradedCount > 0 ? `${degradedCount} degraded, ` : ""}
                {downCount > 0 ? `${downCount} down` : "0 down"}
              </p>
            </div>
            {data?.checkedAt && (
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(data.checkedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Operational", value: upCount, total: enabledMonitors.length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Degraded", value: degradedCount, icon: AlertCircle, color: "text-amber-400" },
          { label: "Down", value: downCount, icon: XCircle, color: "text-red-400" },
          { label: "Monitored", value: enabledMonitors.length, icon: Activity, color: "text-primary" },
        ].map((metric) => (
          <Card key={metric.label} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
                {metric.total !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {metric.value}/{metric.total}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Monitor Form */}
      {showAddForm && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Add Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  className="glass-dark"
                  placeholder="My API"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  className="glass-dark"
                  placeholder="https://api.example.com/health"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as "http" | "statuspage")}>
                  <SelectTrigger className="glass-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP Check</SelectItem>
                    <SelectItem value="statuspage">Status Page (Atlassian)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => addMonitor.mutate({ name: newName, url: newUrl, type: newType })}
                disabled={!newName || !newUrl || addMonitor.isPending}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitor List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Monitors</CardTitle>
          <CardDescription>Click a monitor for detailed history</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Checking endpoints...</div>
          ) : (
            <div className="space-y-2">
              {/* Group by external vs personal */}
              {["external", "personal"].map((group) => {
                const groupMonitors = monitors.filter((m) => (m.group || "personal") === group)
                if (groupMonitors.length === 0) return null
                return (
                  <div key={group}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
                      {group === "external" ? "External Services" : "Personal Endpoints"}
                    </h4>
                    {groupMonitors.map((monitor) => {
                      const check = monitor.lastCheck
                      const isSelected = selectedMonitorId === monitor.id
                      const status = check?.status || "down"
                      const timeSince = check?.timestamp
                        ? Math.floor((Date.now() - new Date(check.timestamp).getTime()) / 1000)
                        : null

                      return (
                        <div
                          key={monitor.id}
                          className={`glass-dark p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                            isSelected ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
                          }`}
                          onClick={() => setSelectedMonitorId(monitor.id)}
                          data-tabz-item={monitor.id}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {status === "up" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              ) : status === "degraded" ? (
                                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm truncate">{monitor.name}</h4>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {monitor.type === "statuspage" ? "STATUS" : "HTTP"}
                                  </Badge>
                                  {monitor.statusUrl && (
                                    <a
                                      href={monitor.statusUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                                      title={`Open ${monitor.name} status page`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {monitor.url}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 ml-4">
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">Uptime</p>
                                <p className="text-sm font-semibold">{getUptimePercent(monitor.id)}%</p>
                              </div>
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">Avg</p>
                                <p className="text-sm font-semibold">{getAvgResponse(monitor.id)}</p>
                              </div>
                              <div className="text-right hidden md:block">
                                <p className="text-xs text-muted-foreground">Checked</p>
                                <p className="text-sm font-semibold" suppressHydrationWarning>
                                  {timeSince !== null ? `${timeSince}s ago` : "---"}
                                </p>
                              </div>
                              {check?.statusPageData && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] hidden lg:inline-flex ${
                                    check.statusPageData.indicator === "none"
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                      : check.statusPageData.indicator === "minor"
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                                        : "bg-red-500/20 text-red-400 border-red-500/50"
                                  }`}
                                >
                                  {check.statusPageData.description}
                                </Badge>
                              )}
                              {!DEFAULT_MONITOR_IDS.has(monitor.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeMonitor.mutate(monitor.id)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View for Selected Monitor */}
      {selectedMonitor && (
        <Card className="glass border-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  {selectedMonitor.name}
                </CardTitle>
                <CardDescription className="font-mono mt-1">
                  {selectedMonitor.statusUrl ? (
                    <a
                      href={selectedMonitor.statusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                    >
                      {selectedMonitor.statusUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    selectedMonitor.url
                  )}
                </CardDescription>
              </div>
              {selectedMonitor.lastCheck?.status === "up" && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                  Operational
                </Badge>
              )}
              {selectedMonitor.lastCheck?.status === "degraded" && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                  Degraded
                </Badge>
              )}
              {selectedMonitor.lastCheck?.status === "down" && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Down</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily Uptime Grid (GitHub-style) */}
            {dailyData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Uptime History</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      <span className="text-muted-foreground">Up</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                      <span className="text-muted-foreground">Partial</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                      <span className="text-muted-foreground">Down</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-[3px] flex-wrap">
                  {dailyData.map((day) => (
                    <div
                      key={day.date}
                      className={`w-3 h-3 rounded-sm ${
                        day.uptime >= 99
                          ? "bg-emerald-500"
                          : day.uptime >= 90
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      title={`${day.date}: ${day.uptime.toFixed(1)}% uptime, ${day.avgResponseTime}ms avg`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Response Time Chart */}
            {responseTimeData.length > 1 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Response Time</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={responseTimeData}>
                    <defs>
                      <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickFormatter={(v) => `${v}ms`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => [`${Math.round(value)}ms`, "Response Time"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="time"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#responseGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Checks Table */}
            {selectedHistory?.recent && selectedHistory.recent.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Recent Checks</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...selectedHistory.recent].reverse().slice(0, 20).map((check, i) => (
                    <div key={i} className="flex items-center justify-between text-xs glass-dark p-2 rounded">
                      <div className="flex items-center gap-2">
                        {check.status === "up" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : check.status === "degraded" ? (
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                        <span className="text-muted-foreground" suppressHydrationWarning>
                          {new Date(check.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {check.statusCode && (
                          <span className="text-muted-foreground">{check.statusCode}</span>
                        )}
                        <span className="font-mono">{check.responseTime}ms</span>
                        {check.error && (
                          <span className="text-red-400 truncate max-w-32" title={check.error}>
                            {check.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No data state */}
            {!selectedHistory?.recent?.length && !dailyData.length && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No history yet. Data will accumulate as checks run.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// IDs of default monitors that can't be deleted
const DEFAULT_MONITOR_IDS = new Set([
  "github",
  "anthropic",
  "vercel",
  "supabase",
  "openai",
  "homepage",
])
