import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const STATE_DIR = '/tmp/claude-code-state'

interface SessionState {
  session_id: string
  status: string
  current_tool?: string
  context_percent: number
  working_dir?: string
  last_updated?: string
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  try {
    if (sessionId) {
      const filePath = join(STATE_DIR, `${sessionId}.json`)
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8')) as SessionState
        return NextResponse.json({
          contextPercent: data.context_percent ?? null,
          status: data.status,
          currentTool: data.current_tool,
          workingDir: data.working_dir,
          lastUpdated: data.last_updated,
        })
      } catch {
        return NextResponse.json({ contextPercent: null, status: 'unknown' })
      }
    }

    // No sessionId — return all active sessions
    const sessions: Record<string, { contextPercent: number | null; status: string }> = {}
    try {
      const files = readdirSync(STATE_DIR).filter(f => f.endsWith('.json'))
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(STATE_DIR, file), 'utf-8')) as SessionState
          sessions[data.session_id] = {
            contextPercent: data.context_percent ?? null,
            status: data.status,
          }
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // STATE_DIR may not exist
    }

    return NextResponse.json({ sessions })
  } catch {
    return NextResponse.json({ contextPercent: null, status: 'error' }, { status: 500 })
  }
}
