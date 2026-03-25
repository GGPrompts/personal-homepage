import { NextResponse } from 'next/server'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { kittyListAllWindows } from '@/lib/terminal-native'

const CLAUDE_PROJECTS_DIR = join(process.env.HOME || '', '.claude', 'projects')

interface ActiveSession {
  windowId: number
  title: string
  cwd: string
  socket: string
  sessionId: string | null
}

/**
 * Find the most recently modified JSONL file in a project's session directory.
 * Returns the session UUID (filename without .jsonl) or null.
 */
function findMostRecentSession(projectSlug: string): string | null {
  const dir = join(CLAUDE_PROJECTS_DIR, projectSlug)
  try {
    const entries = readdirSync(dir)
    let best: { name: string; mtime: number } | null = null
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue
      try {
        const stat = statSync(join(dir, entry))
        if (!best || stat.mtimeMs > best.mtime) {
          best = { name: entry.replace('.jsonl', ''), mtime: stat.mtimeMs }
        }
      } catch { /* skip */ }
    }
    return best?.name ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const active: ActiveSession[] = []

  try {
    const windows = kittyListAllWindows()

    for (const win of windows) {
      const isClaudeRunning = win.foreground_processes.some(p =>
        p.cmdline.some(arg => arg === 'claude' || arg.endsWith('/claude'))
      )
      if (!isClaudeRunning) continue

      // Strategy 1: title match for homepage-spawned sessions (claude-XXXXXXXX)
      const titleMatch = win.title.match(/claude-([a-f0-9]{8})/)
      let sessionId: string | null = null

      if (titleMatch) {
        sessionId = titleMatch[1]
      } else {
        // Strategy 2: match cwd to project slug, find most recent JSONL
        const projectSlug = win.cwd.replace(/\//g, '-')
        sessionId = findMostRecentSession(projectSlug)
      }

      active.push({
        windowId: win.id,
        title: win.title,
        cwd: win.cwd,
        socket: win.socket,
        sessionId,
      })
    }
  } catch {
    // kitty not running or remote control not enabled
  }

  return NextResponse.json({ active })
}
