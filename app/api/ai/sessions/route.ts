import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync, openSync, readSync, closeSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync, execFileSync, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { extractFirstUserMessage } from '@/lib/ai/jsonl-parser'

const CLAUDE_PROJECTS_DIR = join(process.env.HOME || '', '.claude', 'projects')
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAFE_PATH_RE = /^\/[\w.\-/]+$/

/**
 * Resolve a Claude project slug back to a real filesystem path.
 * Slugs encode '/' as '-', so naive replace is lossy when dir names contain dashes.
 * We try the naive decode first, then progressively merge segments with dashes
 * and check which path actually exists on disk.
 */
function resolveProjectPath(slug: string): string {
  // Naive decode: -home-builder-projects-foo → /home/builder/projects/foo
  const naive = '/' + slug.slice(1).replace(/-/g, '/')
  if (existsSync(naive)) return naive

  // Try merging segments with dashes to find actual directory names
  // e.g. segments [home, builder, projects, personal, homepage] →
  //   try /home/builder/projects/personal-homepage
  const segments = slug.slice(1).split('-')
  return tryMergeSegments(segments, '') || naive
}

function tryMergeSegments(segments: string[], prefix: string): string | null {
  if (segments.length === 0) return prefix || null

  // Try progressively longer merged segments
  for (let len = 1; len <= segments.length; len++) {
    const part = segments.slice(0, len).join('-')
    const candidate = prefix + '/' + part
    const remaining = segments.slice(len)

    if (remaining.length === 0) {
      if (existsSync(candidate)) return candidate
    } else if (existsSync(candidate)) {
      const result = tryMergeSegments(remaining, candidate)
      if (result) return result
    }
  }
  return null
}

interface SessionInfo {
  path: string
  sessionId: string
  project: string
  projectSlug: string
  projectPath: string
  size: number
  mtime: number
  isSubagent: boolean
  parentSessionId: string | null
  firstMessage: string | null
}

function walkJsonl(dir: string, results: SessionInfo[], projectSlug: string): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        walkJsonl(fullPath, results, projectSlug)
      } else if (entry.name.endsWith('.jsonl')) {
        try {
          const stat = statSync(fullPath)
          const sessionId = entry.name.replace('.jsonl', '')

          const projectName = projectSlug
            .replace(/^-home-[^-]+-projects-/, '')
            .replace(/^-home-[^-]+-/, '')
            || projectSlug

          const isSubagent = fullPath.includes('/subagents/')

          let parentSessionId: string | null = null
          if (isSubagent) {
            const parts = fullPath.split('/')
            const subagentsIdx = parts.lastIndexOf('subagents')
            if (subagentsIdx > 0) {
              parentSessionId = parts[subagentsIdx - 1]
            }
          }

          let firstMessage: string | null = null
          try {
            const fd = openSync(fullPath, 'r')
            // Try progressively larger reads: 4KB, then 16KB if no user message found
            for (const size of [4096, 16384]) {
              const buf = Buffer.alloc(size)
              const bytesRead = readSync(fd, buf, 0, size, 0)
              if (bytesRead > 0) {
                firstMessage = extractFirstUserMessage(buf.toString('utf-8', 0, bytesRead))
              }
              if (firstMessage || bytesRead < size) break
            }
            closeSync(fd)
          } catch {
            // skip if we can't read the file
          }

          // Decode projectSlug back to filesystem path
          // Slug is the absolute path with '/' replaced by '-', e.g. -home-builder-projects-foo
          // Simple replace is lossy (dashes in dir names become slashes), so verify against fs
          const projectPath = resolveProjectPath(projectSlug)

          results.push({
            path: fullPath,
            sessionId,
            project: projectName,
            projectSlug,
            projectPath,
            size: stat.size,
            mtime: Math.floor(stat.mtimeMs),
            isSubagent,
            parentSessionId,
            firstMessage,
          })
        } catch {
          // skip files we can't stat
        }
      }
    }
  } catch {
    // directory may not exist
  }
}

export async function GET() {
  const sessions: SessionInfo[] = []

  try {
    const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
    for (const dir of projectDirs) {
      if (dir.isDirectory()) {
        walkJsonl(join(CLAUDE_PROJECTS_DIR, dir.name), sessions, dir.name)
      }
    }
  } catch {
    // ~/.claude/projects/ may not exist
  }

  sessions.sort((a, b) => b.mtime - a.mtime)

  return NextResponse.json({ sessions })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const projectPath = body.projectPath as string | undefined
    const backend = (body.backend as string) || 'native'

    const cwd = projectPath || process.env.HOME || '/home'

    // Validate cwd to prevent command injection
    if (!SAFE_PATH_RE.test(cwd)) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      )
    }

    // Spawn Claude in a detached Kitty terminal
    try {
      execSync('which claude', { stdio: 'ignore' })
    } catch {
      return NextResponse.json(
        { error: 'claude CLI is required but not installed' },
        { status: 500 }
      )
    }

    const sessionId = randomUUID()
    const encodedPath = cwd.replace(/\//g, '-')
    const jsonlPath = join(CLAUDE_PROJECTS_DIR, encodedPath, `${sessionId}.jsonl`)

    const child = spawn('kitty', [
      '--detach',
      '--title', `claude-${sessionId.slice(0, 8)}`,
      '--working-directory', cwd,
      '--', 'claude', '--session-id', sessionId,
    ], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()

    return NextResponse.json({
      sessionId,
      jsonlPath,
      projectPath: cwd,
      spawner: 'kitty',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spawn session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Send text to a kitty window, then press Enter after a short delay.
 * Claude CLI needs time to process pasted input before the newline submits it.
 */
async function kittySendText(windowId: number, text: string): Promise<void> {
  // Send the prompt text (without newline)
  execFileSync(
    'kitty', ['@', 'send-text', '--match', `id:${windowId}`, text],
    { encoding: 'utf-8', timeout: 10000 }
  )
  // Wait for Claude CLI to process the input
  await new Promise(resolve => setTimeout(resolve, 400))
  // Send Enter to submit
  execFileSync(
    'kitty', ['@', 'send-key', '--match', `id:${windowId}`, 'Return'],
    { encoding: 'utf-8', timeout: 10000 }
  )
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, prompt, backend } = body as { sessionId?: string; prompt?: string; backend?: string }

    if (!sessionId || !prompt) {
      return NextResponse.json(
        { error: 'sessionId and prompt are required' },
        { status: 400 }
      )
    }

    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
        { status: 400 }
      )
    }

    const projectPath = (body as { projectPath?: string }).projectPath

    // Use kitty @ ls to find the right window
    try {
      const lsOutput = execFileSync('kitty', ['@', 'ls'], { encoding: 'utf-8', timeout: 5000 })
      const osWindows = JSON.parse(lsOutput) as Array<{
        tabs: Array<{
          windows: Array<{
            id: number
            title: string
            cwd: string
            foreground_processes: Array<{ cmdline: string[] }>
          }>
        }>
      }>

      const sessionPrefix = sessionId.slice(0, 8)
      let cwdMatch: number | null = null

      for (const osWin of osWindows) {
        for (const tab of osWin.tabs) {
          for (const win of tab.windows) {
            // Strategy 1: title match (homepage-spawned sessions)
            if (win.title.startsWith(`claude-${sessionPrefix}`)) {
              await kittySendText(win.id, prompt)
              return NextResponse.json({ ok: true, method: 'kitty-title', windowId: win.id })
            }

            // Strategy 2: track cwd + claude process match for fallback
            if (projectPath && !cwdMatch) {
              const resolvedProject = projectPath.startsWith('~')
                ? projectPath.replace('~', process.env.HOME || '')
                : projectPath
              const isClaudeRunning = win.foreground_processes.some(p =>
                p.cmdline.some(arg => arg === 'claude' || arg.endsWith('/claude'))
              )
              if (isClaudeRunning && win.cwd === resolvedProject) {
                cwdMatch = win.id
              }
            }
          }
        }
      }

      // Use cwd match if no title match found
      if (cwdMatch) {
        await kittySendText(cwdMatch, prompt)
        return NextResponse.json({ ok: true, method: 'kitty-cwd', windowId: cwdMatch })
      }
    } catch (err) {
      // kitty @ ls or send-text failed
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `Kitty remote control failed: ${msg}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'No Kitty window found running Claude for this project — is the session still active?' },
      { status: 500 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send prompt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
