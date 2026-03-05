import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const CONFIG_DIR = path.join(process.env.HOME || "~", ".config", "homepage")
const MONITORS_FILE = path.join(CONFIG_DIR, "uptime-monitors.json")
const HISTORY_FILE = path.join(CONFIG_DIR, "uptime-history.json")

// ============================================================================
// TYPES
// ============================================================================

interface MonitorConfig {
  id: string
  name: string
  url: string
  type: "http" | "statuspage"
  enabled: boolean
  interval: number // seconds
  icon?: string // lucide icon name
  group?: string // e.g. "external", "personal"
  statusUrl?: string // human-readable status page URL
}

interface CheckResult {
  monitorId: string
  timestamp: string
  status: "up" | "down" | "degraded"
  responseTime: number // ms
  statusCode?: number
  error?: string
  statusPageData?: {
    indicator: string
    description: string
  }
}

interface HistoryEntry {
  date: string // YYYY-MM-DD
  checks: number
  upChecks: number
  avgResponseTime: number
  incidents: number
}

interface MonitorHistory {
  [monitorId: string]: {
    recent: CheckResult[] // last 100 checks
    daily: HistoryEntry[] // last 90 days
  }
}

// ============================================================================
// DEFAULT MONITORS
// ============================================================================

const DEFAULT_MONITORS: MonitorConfig[] = [
  // External status pages (Atlassian Statuspage API)
  {
    id: "github",
    name: "GitHub",
    url: "https://www.githubstatus.com/api/v2/status.json",
    type: "statuspage",
    enabled: true,
    interval: 300,
    group: "external",
    statusUrl: "https://www.githubstatus.com",
  },
  {
    id: "anthropic",
    name: "Anthropic / Claude",
    url: "https://status.anthropic.com/api/v2/status.json",
    type: "statuspage",
    enabled: true,
    interval: 300,
    group: "external",
    statusUrl: "https://status.anthropic.com",
  },
  {
    id: "vercel",
    name: "Vercel",
    url: "https://www.vercel-status.com/api/v2/status.json",
    type: "statuspage",
    enabled: true,
    interval: 300,
    group: "external",
    statusUrl: "https://www.vercel-status.com",
  },
  {
    id: "supabase",
    name: "Supabase",
    url: "https://status.supabase.com/api/v2/status.json",
    type: "statuspage",
    enabled: true,
    interval: 300,
    group: "external",
    statusUrl: "https://status.supabase.com",
  },
  {
    id: "openai",
    name: "OpenAI",
    url: "https://status.openai.com/api/v2/status.json",
    type: "statuspage",
    enabled: true,
    interval: 300,
    group: "external",
    statusUrl: "https://status.openai.com",
  },
  // Personal endpoints
  {
    id: "homepage",
    name: "Homepage (localhost)",
    url: "http://localhost:3001",
    type: "http",
    enabled: true,
    interval: 60,
    group: "personal",
  },
]

// ============================================================================
// HELPERS
// ============================================================================

async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true })
}

async function loadMonitors(): Promise<MonitorConfig[]> {
  try {
    const data = await fs.readFile(MONITORS_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return DEFAULT_MONITORS
  }
}

async function saveMonitors(monitors: MonitorConfig[]) {
  await ensureConfigDir()
  await fs.writeFile(MONITORS_FILE, JSON.stringify(monitors, null, 2))
}

async function loadHistory(): Promise<MonitorHistory> {
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function saveHistory(history: MonitorHistory) {
  await ensureConfigDir()
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history))
}

async function checkStatusPage(url: string): Promise<CheckResult> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" })
    clearTimeout(timeout)
    const responseTime = Date.now() - start
    const data = await res.json()

    // Atlassian Statuspage format
    const indicator = data?.status?.indicator || "unknown"
    const description = data?.status?.description || ""

    // Atlassian Statuspage indicators: none, minor, major, critical
    let status: "up" | "down" | "degraded" = "up"
    if (indicator === "critical") {
      status = "down"
    } else if (indicator === "major" || indicator === "minor" || indicator === "maintenance") {
      status = "degraded"
    }

    return {
      monitorId: "",
      timestamp: new Date().toISOString(),
      status,
      responseTime,
      statusCode: res.status,
      statusPageData: { indicator, description },
    }
  } catch (err) {
    return {
      monitorId: "",
      timestamp: new Date().toISOString(),
      status: "down",
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function checkHttp(url: string): Promise<CheckResult> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    })
    clearTimeout(timeout)
    const responseTime = Date.now() - start

    let status: "up" | "down" | "degraded" = "up"
    if (res.status >= 500) {
      status = "down"
    } else if (res.status >= 400) {
      status = "degraded"
    } else if (responseTime > 5000) {
      status = "degraded"
    }

    return {
      monitorId: "",
      timestamp: new Date().toISOString(),
      status,
      responseTime,
      statusCode: res.status,
    }
  } catch (err) {
    return {
      monitorId: "",
      timestamp: new Date().toISOString(),
      status: "down",
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function updateHistory(
  history: MonitorHistory,
  monitorId: string,
  result: CheckResult
): MonitorHistory {
  if (!history[monitorId]) {
    history[monitorId] = { recent: [], daily: [] }
  }

  const entry = history[monitorId]

  // Add to recent (keep last 100)
  entry.recent.push(result)
  if (entry.recent.length > 100) {
    entry.recent = entry.recent.slice(-100)
  }

  // Update daily aggregation
  const today = new Date().toISOString().split("T")[0]
  let todayEntry = entry.daily.find((d) => d.date === today)
  if (!todayEntry) {
    todayEntry = { date: today, checks: 0, upChecks: 0, avgResponseTime: 0, incidents: 0 }
    entry.daily.push(todayEntry)
  }

  const prevTotal = todayEntry.avgResponseTime * todayEntry.checks
  todayEntry.checks++
  if (result.status === "up") todayEntry.upChecks++
  if (result.status === "down") todayEntry.incidents++
  todayEntry.avgResponseTime = (prevTotal + result.responseTime) / todayEntry.checks

  // Keep last 90 days
  if (entry.daily.length > 90) {
    entry.daily = entry.daily.slice(-90)
  }

  return history
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// GET: Check all monitors and return results + history
export async function GET(request: NextRequest) {
  const monitors = await loadMonitors()
  let history = await loadHistory()

  const forceCheck = request.nextUrl.searchParams.get("check") === "true"

  // Run checks in parallel
  const results: (CheckResult & { monitor: MonitorConfig })[] = await Promise.all(
    monitors
      .filter((m) => m.enabled)
      .map(async (monitor) => {
        // Only check if forced or no recent data
        const lastCheck = history[monitor.id]?.recent?.slice(-1)[0]
        const timeSinceLastCheck = lastCheck
          ? (Date.now() - new Date(lastCheck.timestamp).getTime()) / 1000
          : Infinity

        let result: CheckResult
        if (forceCheck || timeSinceLastCheck >= monitor.interval) {
          if (monitor.type === "statuspage") {
            result = await checkStatusPage(monitor.url)
          } else {
            result = await checkHttp(monitor.url)
          }
          result.monitorId = monitor.id
          history = updateHistory(history, monitor.id, result)
        } else {
          // Use cached result
          result = lastCheck!
        }

        return { ...result, monitor }
      })
  )

  // Save updated history
  if (forceCheck || results.some((r) => r.monitorId)) {
    await saveHistory(history)
  }

  return NextResponse.json({
    monitors: monitors.map((m) => ({
      ...m,
      lastCheck: history[m.id]?.recent?.slice(-1)[0] || null,
    })),
    results,
    history,
    checkedAt: new Date().toISOString(),
  })
}

// POST: Add or update a monitor
export async function POST(request: NextRequest) {
  const body = await request.json()
  const monitors = await loadMonitors()

  if (body.action === "add") {
    const newMonitor: MonitorConfig = {
      id: `custom-${Date.now()}`,
      name: body.name,
      url: body.url,
      type: body.type || "http",
      enabled: true,
      interval: body.interval || 60,
      group: body.group || "personal",
    }
    monitors.push(newMonitor)
    await saveMonitors(monitors)
    return NextResponse.json({ success: true, monitor: newMonitor })
  }

  if (body.action === "remove") {
    const filtered = monitors.filter((m) => m.id !== body.id)
    await saveMonitors(filtered)
    return NextResponse.json({ success: true })
  }

  if (body.action === "toggle") {
    const monitor = monitors.find((m) => m.id === body.id)
    if (monitor) {
      monitor.enabled = !monitor.enabled
      await saveMonitors(monitors)
    }
    return NextResponse.json({ success: true })
  }

  if (body.action === "reset") {
    await saveMonitors(DEFAULT_MONITORS)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
