import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync, openSync, readSync, closeSync } from 'fs'
import { join } from 'path'
import { execSync, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { extractFirstUserMessage } from '@/lib/ai/jsonl-parser'

const CLAUDE_PROJECTS_DIR = join(process.env.HOME || '', '.claude', 'projects')

interface SessionInfo {
  path: string
  sessionId: string
  project: string
  projectSlug: string
  projectPath: string
  size: number
  mtime: number
  isSubagent: boolean
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
          const projectPath = '/' + projectSlug.slice(1).replace(/-/g, '/')

          results.push({
            path: fullPath,
            sessionId,
            project: projectName,
            projectSlug,
            projectPath,
            size: stat.size,
            mtime: Math.floor(stat.mtimeMs),
            isSubagent,
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

    const cwd = projectPath || process.env.HOME || '/home'

    // Try thc first (Thermal Conductor daemon)
    let hasThc = false
    try {
      execSync('which thc', { stdio: 'ignore' })
      hasThc = true
    } catch {
      // thc not installed
    }

    if (hasThc) {
      try {
        const output = execSync(`thc spawn -p '${cwd}'`, {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim()

        // thc handles session creation — JSONL discovery will pick up the new session
        return NextResponse.json({
          sessionId: null,
          jsonlPath: null,
          projectPath: cwd,
          spawner: 'thc',
          thcOutput: output,
        })
      } catch (thcErr) {
        // thc failed (daemon not running, etc.) — fall through to Kitty
        console.warn('thc spawn failed, falling back to Kitty:', thcErr instanceof Error ? thcErr.message : thcErr)
      }
    }

    // Fallback: spawn Claude in a detached Kitty terminal
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, prompt } = body as { sessionId?: string; prompt?: string }

    if (!sessionId || !prompt) {
      return NextResponse.json(
        { error: 'sessionId and prompt are required' },
        { status: 400 }
      )
    }

    const sessionPrefix = sessionId.slice(0, 8)

    // Try kitty @ send-text first (primary — works with any Kitty-spawned session)
    let hasKitty = false
    try {
      execSync('which kitty', { stdio: 'ignore' })
      hasKitty = true
    } catch {
      // kitty not available
    }

    if (hasKitty) {
      try {
        // Escape the prompt for kitty send-text: newline at end to submit
        const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/'/g, "'\\''")
        execSync(
          `kitty @ send-text --match 'title:^claude-${sessionPrefix}' '${escapedPrompt}\n'`,
          { encoding: 'utf-8', timeout: 10000 }
        )
        return NextResponse.json({ ok: true, method: 'kitty' })
      } catch {
        // kitty send-text failed — window not found or remote control disabled
      }
    }

    // Fall back to thc send (if thc daemon is running)
    let hasThc = false
    try {
      execSync('which thc', { stdio: 'ignore' })
      hasThc = true
    } catch {
      // thc not installed
    }

    if (hasThc) {
      try {
        const output = execSync(`thc send ${sessionId} ${JSON.stringify(prompt)}`, {
          encoding: 'utf-8',
          timeout: 10000,
        }).trim()
        return NextResponse.json({ ok: true, method: 'thc', output })
      } catch {
        // thc send failed
      }
    }

    // Both methods failed
    const methods = [
      hasKitty ? 'kitty (window not found — ensure session is running in a Kitty window with matching title, and allow_remote_control is enabled in kitty.conf)' : 'kitty (not installed)',
      hasThc ? 'thc (send failed — is the daemon running?)' : 'thc (not installed)',
    ]
    return NextResponse.json(
      { error: `Failed to send input. Tried: ${methods.join('; ')}` },
      { status: 500 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send prompt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
