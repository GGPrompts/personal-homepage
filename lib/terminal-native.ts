import { spawn, execFileSync } from "child_process"
import { homedir } from "os"
import { stat } from "fs/promises"
import { readdirSync, statSync } from "fs"

export function expandHome(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return path.replace("~", homedir())
  }
  return path
}

export async function validateWorkDir(path: string): Promise<boolean> {
  try {
    const expanded = expandHome(path)
    const stats = await stat(expanded)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * Find all live kitty remote control sockets.
 * Multiple kitty instances (e.g. from thc/workspace managers) each have their own socket.
 */
export function findKittySockets(): string[] {
  const sockets: string[] = []
  try {
    const entries = readdirSync('/tmp')
    for (const entry of entries) {
      if (!entry.startsWith('kitty-')) continue
      try {
        const st = statSync(`/tmp/${entry}`)
        if (!st.isSocket?.()) continue
      } catch { continue }

      const socketPath = `unix:/tmp/${entry}`
      try {
        execFileSync('kitty', ['@', '--to', socketPath, 'ls'], {
          encoding: 'utf-8',
          timeout: 2000,
          stdio: ['pipe', 'pipe', 'pipe'],
        })
        sockets.push(socketPath)
      } catch { continue }
    }
  } catch {
    // /tmp not readable
  }
  return sockets
}

interface KittyWindowInfo {
  id: number
  title: string
  cwd: string
  foreground_processes: Array<{ pid: number; cmdline: string[] }>
  /** Which socket this window belongs to (needed for send-text/send-key) */
  socket: string
}

/**
 * List all windows across all kitty instances.
 */
export function kittyListAllWindows(): KittyWindowInfo[] {
  const windows: KittyWindowInfo[] = []
  for (const socket of findKittySockets()) {
    try {
      const output = execFileSync('kitty', ['@', '--to', socket, 'ls'], {
        encoding: 'utf-8',
        timeout: 3000,
      })
      const osWindows = JSON.parse(output) as Array<{
        tabs: Array<{ windows: Array<Omit<KittyWindowInfo, 'socket'>> }>
      }>
      for (const osWin of osWindows) {
        for (const tab of osWin.tabs) {
          for (const win of tab.windows) {
            windows.push({ ...win, socket })
          }
        }
      }
    } catch { continue }
  }
  return windows
}

/**
 * Run a kitty @ remote command against a specific socket.
 */
export function kittyRemote(args: string[], timeout = 5000, socket?: string): string {
  if (!socket) {
    const sockets = findKittySockets()
    socket = sockets[0]
  }
  const fullArgs = socket
    ? ['@', '--to', socket, ...args]
    : ['@', ...args]
  return execFileSync('kitty', fullArgs, {
    encoding: 'utf-8',
    timeout,
  })
}

export function spawnKittyTerminal(opts: {
  command?: string
  workingDir?: string
  name?: string
}): void {
  const args: string[] = ["--detach"]

  if (opts.name) {
    args.push("--title", opts.name)
  }

  const cwd = opts.workingDir ? expandHome(opts.workingDir) : homedir()
  args.push("--working-directory", cwd)

  if (opts.command) {
    const shell = process.env.SHELL || "sh"
    args.push("--", shell, "-c", opts.command)
  }

  const child = spawn("kitty", args, {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
}
