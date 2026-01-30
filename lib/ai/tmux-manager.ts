/**
 * tmux Session Manager for AI Workspace
 *
 * Manages long-running Claude CLI processes in tmux sessions for:
 * - Process persistence across page navigations
 * - Output recovery after disconnection
 * - Clean process termination
 *
 * All AI workspace processes run in the 'ai-workspace' tmux session,
 * with each conversation getting its own window.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, chmodSync } from 'fs'

const execAsync = promisify(exec)

const SESSION_NAME = 'ai-workspace'
const OUTPUT_DIR = '/tmp/ai-workspace'

// ============================================================================
// Output Directory Management
// ============================================================================

/**
 * Ensure output directory exists for capturing process output
 */
export function ensureOutputDir(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

/**
 * Get output file path for a conversation
 */
export function getOutputPath(conversationId: string): string {
  return `${OUTPUT_DIR}/${conversationId}.out`
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Check if tmux is installed
 */
async function checkTmuxInstalled(): Promise<void> {
  try {
    await execAsync('which tmux')
  } catch {
    throw new Error('tmux is required but not installed')
  }
}

/**
 * Check if the ai-workspace session exists
 */
async function sessionExists(): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t ${SESSION_NAME} 2>/dev/null`)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure tmux session exists (create if not)
 */
export async function ensureSession(): Promise<void> {
  await checkTmuxInstalled()

  if (await sessionExists()) {
    return
  }

  try {
    await execAsync(`tmux new-session -d -s ${SESSION_NAME}`)
  } catch (error) {
    // Session might have been created by another process
    if (!(await sessionExists())) {
      throw error
    }
  }
}

// ============================================================================
// Window Management
// ============================================================================

/**
 * Spawn command in new tmux window
 *
 * @param windowName - Unique name for the window (typically conversationId)
 * @param command - Command to execute in the window
 * @param cwd - Working directory for the command
 */
export async function spawnInWindow(
  windowName: string,
  command: string,
  cwd: string
): Promise<void> {
  await ensureSession()
  ensureOutputDir()

  const outputPath = getOutputPath(windowName)

  // Write command to a temp script file to avoid shell escaping issues
  // This is more reliable than trying to escape nested quotes
  const scriptPath = `${OUTPUT_DIR}/${windowName}.sh`
  const scriptContent = `#!/bin/bash
cd ${JSON.stringify(cwd)}
${command} > ${JSON.stringify(outputPath)} 2>&1
`

  writeFileSync(scriptPath, scriptContent)
  chmodSync(scriptPath, '755')

  try {
    await execAsync(
      `tmux new-window -t ${SESSION_NAME} -n '${windowName}' '${scriptPath}'`
    )
  } catch (error) {
    const err = error as Error & { stderr?: string }
    throw new Error(`Failed to spawn window: ${err.stderr || err.message}`)
  }
}

/**
 * Check if window exists and has running process
 */
export async function getWindowStatus(windowName: string): Promise<{
  exists: boolean
  running: boolean
}> {
  // First check if session exists
  if (!(await sessionExists())) {
    return { exists: false, running: false }
  }

  try {
    // Check if window exists and get pane status
    const { stdout } = await execAsync(
      `tmux list-panes -t '${SESSION_NAME}:${windowName}' -F '#{pane_dead}' 2>/dev/null`
    )

    const paneDead = stdout.trim()

    // Window exists
    // pane_dead=1 means process exited, pane_dead=0 means still running
    return {
      exists: true,
      running: paneDead === '0'
    }
  } catch {
    // Window doesn't exist
    return { exists: false, running: false }
  }
}

/**
 * Kill a window
 *
 * @returns true if window was killed, false if it didn't exist
 */
export async function killWindow(windowName: string): Promise<boolean> {
  if (!(await sessionExists())) {
    return false
  }

  try {
    await execAsync(`tmux kill-window -t '${SESSION_NAME}:${windowName}'`)
    return true
  } catch {
    return false
  }
}

/**
 * List all active windows in the session
 */
export async function listWindows(): Promise<string[]> {
  if (!(await sessionExists())) {
    return []
  }

  try {
    const { stdout } = await execAsync(
      `tmux list-windows -t ${SESSION_NAME} -F '#{window_name}'`
    )

    return stdout
      .trim()
      .split('\n')
      .filter(name => name.length > 0)
  } catch {
    return []
  }
}

// ============================================================================
// Output File Management
// ============================================================================

/**
 * Read captured output (for recovery)
 *
 * @returns Output content or null if file doesn't exist
 */
export async function readOutput(conversationId: string): Promise<string | null> {
  const outputPath = getOutputPath(conversationId)

  if (!existsSync(outputPath)) {
    return null
  }

  try {
    return readFileSync(outputPath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Clean up output file
 */
export async function cleanupOutput(conversationId: string): Promise<void> {
  const outputPath = getOutputPath(conversationId)

  if (existsSync(outputPath)) {
    try {
      unlinkSync(outputPath)
    } catch {
      // Ignore cleanup errors
    }
  }
}
