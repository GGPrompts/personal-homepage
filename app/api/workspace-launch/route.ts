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
  defaultWorkingDir?: string
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

/**
 * Set a one-shot Hyprland window rule that fires once then auto-removes.
 * Uses title matching to target the specific window we're about to spawn.
 */
function setWindowRule(rule: string, titleMatch: string): void {
  hyprctl(["keyword", "windowrulev2", `${rule}, title:^(${titleMatch})$`])
}

function removeWindowRule(rule: string, titleMatch: string): void {
  try {
    hyprctl(["keyword", "windowrulev2", `unset, ${rule}, title:^(${titleMatch})$`])
  } catch {
    // Rule may already be consumed
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LaunchRequest
    const defaultWorkingDir = body.defaultWorkingDir

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

    // 2. Get monitor info for position calculations
    const monitor = getMonitorInfo()

    // 3. Spawn each window with one-shot Hyprland rules for positioning
    //    Rules are set BEFORE spawning so Hyprland applies them at window creation.
    const spawnedTitles: string[] = []

    for (let i = 0; i < body.windows.length; i++) {
      const win = body.windows[i]

      // Unique title so window rules target only this window
      const title = `bp-${workspaceId}-${i}-${win.label.replace(/[^a-zA-Z0-9]/g, "")}`

      // Convert percentage positions to pixel coords
      const pixelX = Math.floor(monitor.x + (win.position.x / 100) * monitor.width)
      const pixelY = Math.floor(monitor.y + (win.position.y / 100) * monitor.height)
      const pixelW = Math.floor((win.position.w / 100) * monitor.width)
      const pixelH = Math.floor((win.position.h / 100) * monitor.height)

      // Set one-shot rules: float, position, size, and target workspace
      setWindowRule(`workspace ${workspaceId} silent`, title)
      setWindowRule("float", title)
      setWindowRule(`move ${pixelX} ${pixelY}`, title)
      setWindowRule(`size ${pixelW} ${pixelH}`, title)

      if (win.type === "browser") {
        if (!win.url) continue
        // Firefox: use --name for WM_CLASS matching isn't reliable, use kitty wrapper or
        // launch via a script. Simpler: open in a kitty window running firefox.
        const child = spawn("firefox", ["--new-window", win.url], {
          detached: true,
          stdio: "ignore",
        })
        child.unref()
        // Firefox doesn't respect our title, so we need to re-match after spawn
        spawnedTitles.push(title)
      } else if (win.type === "terminal") {
        const args: string[] = ["--detach", "--title", title]
        const cwd = win.workingDir
          ? expandHome(win.workingDir)
          : defaultWorkingDir
            ? expandHome(defaultWorkingDir)
            : undefined
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
        spawnedTitles.push(title)
      }

      // Small delay between spawns so Hyprland processes each window
      await sleep(400)
    }

    // 4. Wait for windows to settle, then handle Firefox windows.
    //    Firefox ignores --title so we find its new windows by workspace + class and
    //    reposition them. Kitty windows already have correct titles and got rules applied.
    await sleep(1000)

    const clients = hyprctlJson<HyprClient[]>(["clients"])
    const wsClients = clients.filter((c) => c.workspace.id === workspaceId)

    // Find Firefox clients that didn't get rules applied (no matching title)
    const firefoxWindows = body.windows
      .map((win, i) => ({ win, index: i }))
      .filter(({ win }) => win.type === "browser")

    const firefoxClients = wsClients.filter(
      (c) => c.class === "firefox" || c.class === "Firefox" || c.class.toLowerCase().includes("firefox")
    )

    for (let i = 0; i < Math.min(firefoxWindows.length, firefoxClients.length); i++) {
      const { win } = firefoxWindows[i]
      const client = firefoxClients[i]
      if (!client?.address) continue

      const pixelX = Math.floor(monitor.x + (win.position.x / 100) * monitor.width)
      const pixelY = Math.floor(monitor.y + (win.position.y / 100) * monitor.height)
      const pixelW = Math.floor((win.position.w / 100) * monitor.width)
      const pixelH = Math.floor((win.position.h / 100) * monitor.height)

      try {
        hyprctl(["dispatch", "setfloating", `address:${client.address}`])
        hyprctl(["dispatch", "movewindowpixel", `exact ${pixelX} ${pixelY}`, `address:${client.address}`])
        hyprctl(["dispatch", "resizewindowpixel", `exact ${pixelW} ${pixelH}`, `address:${client.address}`])
      } catch {
        // Window may have closed
      }
    }

    // 5. Clean up one-shot rules that may not have been consumed
    for (const title of spawnedTitles) {
      removeWindowRule("float", title)
      removeWindowRule(`workspace ${workspaceId} silent`, title)
      removeWindowRule(`move .*`, title)
      removeWindowRule(`size .*`, title)
    }

    // 6. Switch to the new workspace
    hyprctl(["dispatch", "workspace", String(workspaceId)])

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
