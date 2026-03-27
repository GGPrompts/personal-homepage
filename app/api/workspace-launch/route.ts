import { NextRequest, NextResponse } from "next/server"
import { execFileSync, spawn } from "child_process"
import { expandHome } from "@/lib/terminal-native"

export const dynamic = "force-dynamic"

// ============================================================================
// TYPES
// ============================================================================

interface BlueprintWindow {
  type: "browser" | "terminal"
  url?: string
  command?: string
  workingDir?: string
  label: string
  /** Percentage-based position: x, y, w, h all 0-100 */
  position: { x: number; y: number; w: number; h: number }
}

interface LaunchRequest {
  name: string
  windows: BlueprintWindow[]
}

interface HyprWorkspace {
  id: number
  name: string
  monitor: string
  windows: number
  hasfullscreen: boolean
  lastwindow: string
  lastwindowtitle: string
}

interface HyprClient {
  address: string
  mapped: boolean
  hidden: boolean
  at: [number, number]
  size: [number, number]
  workspace: { id: number; name: string }
  title: string
  initialTitle: string
  pid: number
  class: string
}

interface HyprMonitor {
  id: number
  name: string
  width: number
  height: number
  x: number
  y: number
  activeWorkspace: { id: number; name: string }
  reserved: [number, number, number, number]
  scale: number
}

// ============================================================================
// HELPERS
// ============================================================================

function hyprctl(args: string[]): string {
  return execFileSync("hyprctl", args, {
    encoding: "utf-8",
    timeout: 5000,
  })
}

function hyprctlJson<T>(args: string[]): T {
  const output = hyprctl([...args, "-j"])
  return JSON.parse(output) as T
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Find the next empty Hyprland workspace (lowest ID 2-10 with no clients).
 */
function findEmptyWorkspace(): number | null {
  const workspaces = hyprctlJson<HyprWorkspace[]>(["workspaces"])
  const clients = hyprctlJson<HyprClient[]>(["clients"])

  // Count clients per workspace
  const clientCounts = new Map<number, number>()
  for (const client of clients) {
    if (client.workspace.id < 1) continue // special workspaces
    const count = clientCounts.get(client.workspace.id) || 0
    clientCounts.set(client.workspace.id, count + 1)
  }

  // Workspaces that exist and have clients
  const occupiedIds = new Set<number>()
  for (const ws of workspaces) {
    if (ws.id < 2 || ws.id > 10) continue
    if ((clientCounts.get(ws.id) || 0) > 0) {
      occupiedIds.add(ws.id)
    }
  }

  // Find lowest ID (2-10) not occupied
  for (let id = 2; id <= 10; id++) {
    if (!occupiedIds.has(id)) {
      return id
    }
  }

  return null
}

/**
 * Get the active monitor resolution, accounting for scale and reserved areas.
 */
function getMonitorInfo(): { width: number; height: number; x: number; y: number } {
  const monitors = hyprctlJson<HyprMonitor[]>(["monitors"])
  const active = monitors.find((m) => m.activeWorkspace) || monitors[0]
  if (!active) {
    return { width: 1920, height: 1080, x: 0, y: 0 }
  }

  const scale = active.scale || 1
  const [reservedTop, reservedBottom, reservedLeft, reservedRight] = active.reserved || [0, 0, 0, 0]

  return {
    width: Math.floor(active.width / scale) - reservedLeft - reservedRight,
    height: Math.floor(active.height / scale) - reservedTop - reservedBottom,
    x: active.x + reservedLeft,
    y: active.y + reservedTop,
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LaunchRequest

    if (!body.windows || body.windows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No windows in blueprint" },
        { status: 400 }
      )
    }

    // 1. Find next empty workspace
    const workspaceId = findEmptyWorkspace()
    if (workspaceId === null) {
      return NextResponse.json(
        { success: false, error: "No empty workspaces available (2-10)" },
        { status: 409 }
      )
    }

    // 2. Switch to empty workspace
    hyprctl(["dispatch", "workspace", String(workspaceId)])
    await sleep(200)

    // 3. Get monitor info for position calculations
    const monitor = getMonitorInfo()

    // 4. Spawn each window with a delay between
    const spawnedPids: number[] = []

    for (const win of body.windows) {
      if (win.type === "browser") {
        if (!win.url) continue
        // Launch Firefox with the URL
        const child = spawn("firefox", [win.url], {
          detached: true,
          stdio: "ignore",
        })
        child.unref()
        if (child.pid) spawnedPids.push(child.pid)
      } else if (win.type === "terminal") {
        const args: string[] = ["--detach"]
        if (win.label) {
          args.push("--title", win.label)
        }
        const cwd = win.workingDir ? expandHome(win.workingDir) : undefined
        if (cwd) {
          args.push("--working-directory", cwd)
        }
        if (win.command) {
          const shell = process.env.SHELL || "sh"
          args.push("--", shell, "-c", win.command)
        }
        const child = spawn("kitty", args, {
          detached: true,
          stdio: "ignore",
        })
        child.unref()
        if (child.pid) spawnedPids.push(child.pid)
      }

      // Small delay between window spawns
      await sleep(300)
    }

    // 5. Wait for windows to appear, then tile them
    await sleep(800)

    // Get fresh client list to find our newly spawned windows
    const clients = hyprctlJson<HyprClient[]>(["clients"])
    const wsClients = clients.filter((c) => c.workspace.id === workspaceId)

    // Position windows based on blueprint percentages
    for (let i = 0; i < Math.min(body.windows.length, wsClients.length); i++) {
      const win = body.windows[i]
      const client = wsClients[i]

      if (!client?.address) continue

      // Convert percentage positions to pixel coords
      const pixelX = Math.floor(monitor.x + (win.position.x / 100) * monitor.width)
      const pixelY = Math.floor(monitor.y + (win.position.y / 100) * monitor.height)
      const pixelW = Math.floor((win.position.w / 100) * monitor.width)
      const pixelH = Math.floor((win.position.h / 100) * monitor.height)

      try {
        // Make it floating so we can position it
        hyprctl(["dispatch", "setfloating", `address:${client.address}`])
        // Move and resize
        hyprctl([
          "dispatch",
          "movewindowpixel",
          `exact ${pixelX} ${pixelY}`,
          `address:${client.address}`,
        ])
        hyprctl([
          "dispatch",
          "resizewindowpixel",
          `exact ${pixelW} ${pixelH}`,
          `address:${client.address}`,
        ])
      } catch {
        // Window may have already closed or moved
      }
    }

    return NextResponse.json({
      success: true,
      workspaceId,
      windowCount: body.windows.length,
      matchedClients: wsClients.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[workspace-launch] Error:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
