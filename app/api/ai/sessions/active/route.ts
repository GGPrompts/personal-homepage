import { NextResponse } from 'next/server'
import { execFileSync } from 'child_process'

interface KittyWindow {
  id: number
  title: string
  cwd: string
  foreground_processes: Array<{ cmdline: string[] }>
}

interface KittyTab {
  windows: KittyWindow[]
}

interface KittyOSWindow {
  tabs: KittyTab[]
}

interface ActiveSession {
  windowId: number
  title: string
  cwd: string
  /** Session ID extracted from window title (claude-XXXXXXXX pattern) */
  sessionId: string | null
}

export async function GET() {
  const active: ActiveSession[] = []

  try {
    const lsOutput = execFileSync('kitty', ['@', 'ls'], {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const osWindows: KittyOSWindow[] = JSON.parse(lsOutput)

    for (const osWin of osWindows) {
      for (const tab of osWin.tabs) {
        for (const win of tab.windows) {
          const isClaudeRunning = win.foreground_processes.some(p =>
            p.cmdline.some(arg => arg === 'claude' || arg.endsWith('/claude'))
          )
          if (!isClaudeRunning) continue

          // Extract session ID from title like "claude-abcd1234"
          const titleMatch = win.title.match(/claude-([a-f0-9]{8})/)
          const sessionId = titleMatch?.[1] ?? null

          active.push({
            windowId: win.id,
            title: win.title,
            cwd: win.cwd,
            sessionId,
          })
        }
      }
    }
  } catch {
    // kitty not running or remote control not enabled
  }

  return NextResponse.json({ active })
}
