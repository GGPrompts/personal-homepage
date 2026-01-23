import { NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const STATE_DIR = '/tmp/claude-code-state'
const STALE_THRESHOLD_MS = 60 * 1000 // 60 seconds - worker is stale if no update

/**
 * Worker state from state tracker files
 */
export interface WorkerState {
  session_id: string
  status: 'idle' | 'tool_use' | 'awaiting_input' | 'unknown'
  current_tool?: string
  subagent_count: number
  working_dir: string
  last_updated: string
  tmux_pane?: string
  pid?: number
  hook_type?: string
  details?: {
    event?: string
    tool?: string
    args?: Record<string, unknown>
  }
  permission_mode?: string
  claude_session_id?: string
  // Computed fields
  isStale: boolean
  matchedIssueId?: string
  contextPercent?: number
}

/**
 * Response format for worker status API
 */
export interface WorkerStatusResponse {
  workers: WorkerState[]
  total: number
  active: number
  timestamp: string
}

/**
 * Parse issue ID from working directory path
 * Looks for patterns like: personal-homepage-abc123 or bd-abc123
 */
function extractIssueId(workingDir: string): string | undefined {
  // Match issue ID patterns in path
  // e.g., /path/to/personal-homepage-bmi5 -> personal-homepage-bmi5
  // e.g., /path/to/feature/bd-abc -> bd-abc
  const patterns = [
    /personal-homepage-([a-z0-9]+)/i,
    /bd-([a-z0-9]+)/i,
    /-([a-z0-9]{4,})$/i, // Generic short ID at end of path
  ]

  for (const pattern of patterns) {
    const match = workingDir.match(pattern)
    if (match) {
      // Return the full matched issue ID
      if (pattern.source.includes('personal-homepage')) {
        return `personal-homepage-${match[1]}`
      }
      if (pattern.source.includes('bd-')) {
        return `bd-${match[1]}`
      }
      return match[1]
    }
  }

  return undefined
}

/**
 * Read context percent from companion context file
 */
async function getContextPercent(claudeSessionId: string | undefined): Promise<number | undefined> {
  if (!claudeSessionId) return undefined

  try {
    const contextFile = join(STATE_DIR, `${claudeSessionId}-context.json`)
    const content = await readFile(contextFile, 'utf-8')
    const data = JSON.parse(content)
    return data.context_pct ?? undefined
  } catch {
    return undefined
  }
}

export async function GET() {
  try {
    // Check if state directory exists
    try {
      await stat(STATE_DIR)
    } catch {
      return NextResponse.json({
        workers: [],
        total: 0,
        active: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Read all JSON files in state directory
    const files = await readdir(STATE_DIR)
    const stateFiles = files.filter(f =>
      f.endsWith('.json') &&
      !f.includes('-context') && // Skip context-only files
      f.startsWith('_') // Worker state files start with underscore
    )

    const now = Date.now()
    const workers: WorkerState[] = []

    // Read and parse each state file in parallel
    const results = await Promise.allSettled(
      stateFiles.map(async (file) => {
        const filePath = join(STATE_DIR, file)
        const content = await readFile(filePath, 'utf-8')
        const data = JSON.parse(content)

        // Check if worker is stale
        const lastUpdated = data.last_updated ? new Date(data.last_updated).getTime() : 0
        const isStale = now - lastUpdated > STALE_THRESHOLD_MS

        // Extract issue ID from working directory
        const matchedIssueId = data.working_dir
          ? extractIssueId(data.working_dir)
          : undefined

        // Get context percent from companion file
        const contextPercent = await getContextPercent(data.claude_session_id)

        const worker: WorkerState = {
          session_id: data.session_id,
          status: data.status ?? 'unknown',
          current_tool: data.current_tool,
          subagent_count: data.subagent_count ?? 0,
          working_dir: data.working_dir ?? '',
          last_updated: data.last_updated,
          tmux_pane: data.tmux_pane,
          pid: data.pid,
          hook_type: data.hook_type,
          details: data.details,
          permission_mode: data.permission_mode,
          claude_session_id: data.claude_session_id,
          isStale,
          matchedIssueId,
          contextPercent,
        }

        return worker
      })
    )

    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        workers.push(result.value)
      }
    }

    // Sort by last_updated (most recent first), then by non-stale first
    workers.sort((a, b) => {
      if (a.isStale !== b.isStale) return a.isStale ? 1 : -1
      const aTime = a.last_updated ? new Date(a.last_updated).getTime() : 0
      const bTime = b.last_updated ? new Date(b.last_updated).getTime() : 0
      return bTime - aTime
    })

    const activeCount = workers.filter(w => !w.isStale).length

    return NextResponse.json({
      workers,
      total: workers.length,
      active: activeCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get worker status:', error)
    return NextResponse.json(
      { error: 'Failed to get worker status', details: String(error) },
      { status: 500 }
    )
  }
}
