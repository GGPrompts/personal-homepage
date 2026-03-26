import { NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { execSync } from 'child_process'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const STATE_DIR = '/tmp/claude-code-state'
const STALE_THRESHOLD_MS = 60 * 1000

// Tailscale hosts to check for remote agents
const TAILSCALE_HOSTS: Record<string, { host: string; label: string; device: string }> = {
  // Add remote devices here, e.g.:
  // 'pocketforge': { host: 'pocketforge', label: 'PocketForge', device: 'phone' },
  // 'desktop': { host: 'desktop', label: 'Desktop', device: 'kitty' },
}

export interface AgentInfo {
  id: string
  sessionName: string
  status: 'idle' | 'running' | 'tool_use' | 'awaiting_input' | 'stale' | 'unknown'
  currentTool?: string
  issueId?: string
  contextPercent?: number
  lastActivity: string
  workingDir: string
  device: 'local' | string
  deviceLabel: string
  pid?: number
  subagentCount: number
  permissionMode?: string
  tmuxPane?: string
  claudeSessionId?: string
}

/**
 * List tmux sessions matching agent patterns
 */
function listTmuxSessions(): string[] {
  try {
    const output = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim()
    if (!output) return []
    return output.split('\n').filter(name =>
      name.startsWith('claude-agent-') ||
      name.startsWith('pf-agent-') ||
      name.startsWith('worker-') ||
      name.startsWith('claude-')
    )
  } catch {
    return []
  }
}

/**
 * List tmux sessions on a remote host via Tailscale SSH
 */
function listRemoteTmuxSessions(host: string): string[] {
  try {
    const output = execSync(
      `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${host} 'tmux list-sessions -F "#{session_name}" 2>/dev/null'`,
      { encoding: 'utf-8', timeout: 8000 }
    ).trim()
    if (!output) return []
    return output.split('\n').filter(name =>
      name.startsWith('claude-agent-') ||
      name.startsWith('pf-agent-') ||
      name.startsWith('worker-') ||
      name.startsWith('claude-')
    )
  } catch {
    return []
  }
}

/**
 * Read worker state files from /tmp/claude-code-state
 */
async function readLocalWorkerStates(): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = []

  try {
    await stat(STATE_DIR)
  } catch {
    return agents
  }

  try {
    const files = await readdir(STATE_DIR)
    const stateFiles = files.filter(f =>
      f.endsWith('.json') &&
      !f.includes('-context') &&
      f.startsWith('_')
    )

    const now = Date.now()

    const results = await Promise.allSettled(
      stateFiles.map(async (file) => {
        const filePath = join(STATE_DIR, file)
        const content = await readFile(filePath, 'utf-8')
        const data = JSON.parse(content)

        const lastUpdated = data.last_updated ? new Date(data.last_updated).getTime() : 0
        const isStale = now - lastUpdated > STALE_THRESHOLD_MS

        // Try reading context percent from companion file
        let contextPercent: number | undefined
        if (data.claude_session_id) {
          try {
            const contextFile = join(STATE_DIR, `${data.claude_session_id}-context.json`)
            const ctxContent = await readFile(contextFile, 'utf-8')
            const ctxData = JSON.parse(ctxContent)
            contextPercent = ctxData.context_pct ?? undefined
          } catch { /* no context file */ }
        }

        // Extract issue ID from working dir or session name
        const issueId = extractIssueId(data.working_dir || '', data.session_id || '')

        let status: AgentInfo['status'] = data.status ?? 'unknown'
        if (isStale && status !== 'unknown') {
          status = 'stale'
        }

        const agent: AgentInfo = {
          id: data.session_id || file.replace('.json', ''),
          sessionName: data.tmux_pane || data.session_id || file.replace('.json', ''),
          status,
          currentTool: data.current_tool,
          issueId,
          contextPercent,
          lastActivity: data.last_updated || new Date().toISOString(),
          workingDir: data.working_dir || '',
          device: 'local',
          deviceLabel: 'Local (Kitty)',
          pid: data.pid,
          subagentCount: data.subagent_count ?? 0,
          permissionMode: data.permission_mode,
          tmuxPane: data.tmux_pane,
          claudeSessionId: data.claude_session_id,
        }

        return agent
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        agents.push(result.value)
      }
    }
  } catch {
    // state dir not readable
  }

  return agents
}

/**
 * Extract issue ID from working directory or session name
 */
function extractIssueId(workingDir: string, sessionName: string): string | undefined {
  // Check for beads-style issue IDs in path: hp-xxxx, tc-xxxx, bd-xxxx, etc
  const beadsPattern = /\b([a-z]{2,4}-[a-z0-9]{3,6})\b/
  const combined = `${workingDir} ${sessionName}`
  const match = combined.match(beadsPattern)
  if (match) return match[1]
  return undefined
}

/**
 * Cross-reference tmux sessions with worker state files
 * to build a complete picture of running agents
 */
async function buildAgentList(): Promise<AgentInfo[]> {
  // Get worker states from state files (primary source)
  const stateAgents = await readLocalWorkerStates()
  const stateAgentIds = new Set(stateAgents.map(a => a.id))

  // Get local tmux sessions
  const tmuxSessions = listTmuxSessions()

  // Add any tmux sessions that don't have state files
  for (const sessionName of tmuxSessions) {
    if (!stateAgentIds.has(sessionName)) {
      stateAgents.push({
        id: sessionName,
        sessionName,
        status: 'unknown',
        lastActivity: new Date().toISOString(),
        workingDir: '',
        device: 'local',
        deviceLabel: 'Local (Kitty)',
        subagentCount: 0,
      })
    }
  }

  // Check remote devices via Tailscale
  for (const [key, config] of Object.entries(TAILSCALE_HOSTS)) {
    try {
      const remoteSessions = listRemoteTmuxSessions(config.host)
      for (const sessionName of remoteSessions) {
        stateAgents.push({
          id: `${key}:${sessionName}`,
          sessionName,
          status: 'running',
          lastActivity: new Date().toISOString(),
          workingDir: '',
          device: config.device,
          deviceLabel: config.label,
          subagentCount: 0,
        })
      }
    } catch {
      // Remote host unreachable
    }
  }

  // Sort: active first, then by last activity
  stateAgents.sort((a, b) => {
    const activeStates = ['running', 'tool_use', 'awaiting_input']
    const aActive = activeStates.includes(a.status) ? 0 : 1
    const bActive = activeStates.includes(b.status) ? 0 : 1
    if (aActive !== bActive) return aActive - bActive
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  })

  return stateAgents
}

export async function GET() {
  try {
    const agents = await buildAgentList()
    const activeCount = agents.filter(a =>
      ['running', 'tool_use', 'awaiting_input', 'idle'].includes(a.status)
    ).length

    return NextResponse.json({
      agents,
      total: agents.length,
      active: activeCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get agent status:', error)
    return NextResponse.json(
      { error: 'Failed to get agent status', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, sessionName, projectPath, prompt } = body

    if (action === 'spawn') {
      // Spawn a new claude agent in tmux
      const name = sessionName || `claude-agent-${Date.now().toString(36)}`
      const cwd = projectPath || process.env.HOME || '/home'

      const claudeCmd = prompt
        ? `claude --dangerously-skip-permissions -p "${prompt.replace(/"/g, '\\"')}"`
        : 'claude --dangerously-skip-permissions'

      execSync(
        `tmux new-session -d -s "${name}" -c "${cwd}" "${claudeCmd}"`,
        { timeout: 10000 }
      )

      return NextResponse.json({ success: true, sessionName: name })
    }

    if (action === 'kill') {
      if (!sessionName) {
        return NextResponse.json({ error: 'sessionName required' }, { status: 400 })
      }
      // Validate session name to prevent injection
      if (!/^[\w-:.]+$/.test(sessionName)) {
        return NextResponse.json({ error: 'Invalid session name' }, { status: 400 })
      }
      execSync(`tmux kill-session -t "${sessionName}" 2>/dev/null`, { timeout: 5000 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Agent control error:', error)
    return NextResponse.json(
      { error: 'Agent control failed', details: String(error) },
      { status: 500 }
    )
  }
}
