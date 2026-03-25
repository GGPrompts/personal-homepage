import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync, openSync, readSync, closeSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { extractFirstUserMessage } from '@/lib/ai/jsonl-parser'
import { kittyRemote, kittyListAllWindows } from '@/lib/terminal-native'

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
    const resume = body.resume as boolean | undefined
    const resumeSessionId = body.sessionId as string | undefined
    const prompt = body.prompt as string | undefined

    const cwd = projectPath || process.env.HOME || '/home'

    // Validate cwd to prevent command injection
    if (!SAFE_PATH_RE.test(cwd)) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      )
    }

    if (resume && resumeSessionId && !UUID_RE.test(resumeSessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
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

    const sessionId = resume && resumeSessionId ? resumeSessionId : randomUUID()
    const encodedPath = cwd.replace(/\//g, '-')
    const jsonlPath = join(CLAUDE_PROJECTS_DIR, encodedPath, `${sessionId}.jsonl`)

    const claudeArgs = resume
      ? ['claude', '--resume', '--session-id', sessionId]
      : ['claude', '--session-id', sessionId]

    const child = spawn('kitty', [
      '--detach',
      '--title', `claude-${sessionId.slice(0, 8)}`,
      '--working-directory', cwd,
      '--', ...claudeArgs,
    ], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()

    // If a prompt was provided, wait for Claude to start then send it
    if (prompt) {
      sendPromptAfterStartup(sessionId, prompt).catch(() => {})
    }

    return NextResponse.json({
      sessionId,
      jsonlPath,
      projectPath: cwd,
      spawner: 'kitty',
      resumed: !!resume,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spawn session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Wait for a kitty window with the given session title to appear, then send a prompt.
 * Polls kitty @ ls up to ~8 seconds for the window to be ready.
 */
async function sendPromptAfterStartup(sessionId: string, prompt: string): Promise<void> {
  const prefix = sessionId.slice(0, 8)
  const maxAttempts = 8

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      const windows = kittyListAllWindows()

      for (const win of windows) {
        const isClaudeWindow = win.title.startsWith(`claude-${prefix}`) ||
          (win.foreground_processes.some(p =>
            p.cmdline.some(arg => arg === 'claude' || arg.endsWith('/claude'))
          ) && win.title.includes(prefix))

        if (!isClaudeWindow) continue

        const claudeRunning = win.foreground_processes.some(p =>
          p.cmdline.some(arg => arg === 'claude' || arg.endsWith('/claude'))
        )
        if (!claudeRunning) continue

        // Give Claude CLI a moment to render its prompt
        await new Promise(resolve => setTimeout(resolve, 1500))
        await kittySendText(win.id, prompt, win.socket)
        return
      }
    } catch {
      // kitty not ready yet, retry
    }
  }
}

/**
 * Send text to a kitty window, then press Enter after a short delay.
 * Claude CLI needs time to process pasted input before the newline submits it.
 */
async function kittySendText(windowId: number, text: string, socket?: string): Promise<void> {
  // Send the prompt text (without newline)
  kittyRemote(['send-text', '--match', `id:${windowId}`, text], 10000, socket)
  // Wait for Claude CLI to process the input
  await new Promise(resolve => setTimeout(resolve, 400))
  // Send Enter to submit
  kittyRemote(['send-key', '--match', `id:${windowId}`, 'Return'], 10000, socket)
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, prompt, backend } = body as { sessionId?: string; prompt?: string; backend?: string }

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    if (sessionId && !UUID_RE.test(sessionId) && !/^[a-f0-9]{8}$/i.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
        { status: 400 }
      )
    }

    const projectPath = (body as { projectPath?: string }).projectPath

    // Find the right kitty window across all instances
    try {
      const windows = kittyListAllWindows()

      const sessionPrefix = sessionId ? sessionId.slice(0, 8) : null
      let cwdMatch: (typeof windows)[number] | null = null

      for (const win of windows) {
        // Strategy 1: title match (homepage-spawned sessions)
        if (sessionPrefix && win.title.startsWith(`claude-${sessionPrefix}`)) {
          await kittySendText(win.id, prompt, win.socket)
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
            cwdMatch = win
          }
        }
      }

      // Use cwd match if no title match found
      if (cwdMatch) {
        await kittySendText(cwdMatch.id, prompt, cwdMatch.socket)
        return NextResponse.json({ ok: true, method: 'kitty-cwd', windowId: cwdMatch.id })
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
