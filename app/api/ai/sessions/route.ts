import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

const CLAUDE_PROJECTS_DIR = join(process.env.HOME || '', '.claude', 'projects')

interface SessionInfo {
  path: string
  sessionId: string
  project: string
  projectSlug: string
  size: number
  mtime: number
  isSubagent: boolean
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

          results.push({
            path: fullPath,
            sessionId,
            project: projectName,
            projectSlug,
            size: stat.size,
            mtime: Math.floor(stat.mtimeMs),
            isSubagent,
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

    const sessionId = randomUUID()

    let tmuxSessionName = `claude-viewer-${sessionId.slice(0, 8)}`

    let claudeCmd = `claude --session-id ${sessionId}`
    let cwd = process.env.HOME || '/home'

    if (projectPath) {
      cwd = projectPath
    }

    try {
      execSync('which tmux', { stdio: 'ignore' })
    } catch {
      return NextResponse.json(
        { error: 'tmux is required but not installed' },
        { status: 500 }
      )
    }

    try {
      execSync('which claude', { stdio: 'ignore' })
    } catch {
      return NextResponse.json(
        { error: 'claude CLI is required but not installed' },
        { status: 500 }
      )
    }

    const encodedPath = cwd.replace(/\//g, '-')
    const jsonlPath = join(CLAUDE_PROJECTS_DIR, encodedPath, `${sessionId}.jsonl`)

    execSync(
      `tmux new-session -d -s '${tmuxSessionName}' -c '${cwd}' '${claudeCmd}'`,
      { stdio: 'ignore' }
    )

    return NextResponse.json({
      sessionId,
      tmuxSession: tmuxSessionName,
      jsonlPath,
      projectPath: cwd,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spawn session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
