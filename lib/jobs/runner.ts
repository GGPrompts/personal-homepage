/**
 * Claude Jobs - Runner
 * Executes jobs against projects with pre-checks and parallel limits
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import type { PreCheck, JobStreamEvent, ProjectRunResult } from './types'

const execAsync = promisify(exec)

const DEFAULT_MAX_PARALLEL = 3

interface ClaudeStreamEvent {
  type: 'message_start' | 'content_block_delta' | 'message_delta' | 'message_stop' | 'error'
  delta?: {
    type: 'text_delta'
    text: string
  }
  error?: {
    type: string
    message: string
  }
}

/**
 * Get project name from path
 */
export function getProjectName(projectPath: string): string {
  return path.basename(projectPath)
}

/**
 * Run pre-check command for a project
 * Returns { skip: boolean, output: string }
 */
export async function runPreCheck(
  projectPath: string,
  preCheck: PreCheck
): Promise<{ skip: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync(preCheck.command, {
      cwd: projectPath,
      timeout: 30000, // 30 second timeout for pre-checks
      env: process.env
    })

    const output = (stdout + stderr).trim()

    let skip = false
    switch (preCheck.skipIf) {
      case 'empty':
        skip = output.length === 0
        break
      case 'non-empty':
        skip = output.length > 0
        break
      case 'matches':
        if (preCheck.pattern) {
          const regex = new RegExp(preCheck.pattern)
          skip = regex.test(output)
        }
        break
    }

    return { skip, output }
  } catch (error) {
    // Command failed (non-zero exit) - treat as non-empty output
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { skip: preCheck.skipIf === 'empty', output: errorMessage }
  }
}

/**
 * Run Claude against a project and stream results
 */
export async function runClaudeOnProject(
  projectPath: string,
  prompt: string,
  onEvent: (event: JobStreamEvent) => void
): Promise<ProjectRunResult> {
  const projectName = getProjectName(projectPath)
  const startedAt = new Date().toISOString()

  // Emit start event
  onEvent({
    type: 'start',
    project: projectPath,
    projectName
  })

  return new Promise((resolve) => {
    let fullOutput = ''
    let buffer = ''
    let hasError = false
    let errorMessage = ''

    const args = [
      '--print',
      '--output-format', 'stream-json',
      prompt
    ]

    const claude = spawn('claude', args, {
      cwd: projectPath,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: undefined
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    // Process stream-json format from Claude CLI
    claude.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()

      // Process complete JSON lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const event: ClaudeStreamEvent = JSON.parse(line)

          if (event.type === 'content_block_delta' && event.delta?.text) {
            const text = event.delta.text
            fullOutput += text
            onEvent({
              type: 'content',
              project: projectPath,
              projectName,
              text
            })
          } else if (event.type === 'error') {
            hasError = true
            errorMessage = event.error?.message || 'Claude CLI error'
          }
        } catch (err) {
          console.error('Failed to parse Claude stream-json:', line, err)
        }
      }
    })

    claude.stderr.on('data', (chunk: Buffer) => {
      console.error('Claude CLI stderr:', chunk.toString())
    })

    claude.on('close', (code) => {
      if (code !== 0 && !hasError) {
        hasError = true
        errorMessage = `Claude CLI exited with code ${code}`
      }

      // Check if output indicates need for human review
      const needsHuman = detectNeedsHuman(fullOutput)

      const result: ProjectRunResult = {
        path: projectPath,
        name: projectName,
        preCheckSkipped: false,
        output: fullOutput,
        error: hasError ? errorMessage : undefined,
        needsHuman,
        startedAt,
        completedAt: new Date().toISOString()
      }

      // Emit complete event
      onEvent({
        type: 'complete',
        project: projectPath,
        projectName,
        output: fullOutput,
        needsHuman,
        error: hasError ? errorMessage : undefined
      })

      resolve(result)
    })

    claude.on('error', (error) => {
      hasError = true
      errorMessage = error.message

      const result: ProjectRunResult = {
        path: projectPath,
        name: projectName,
        preCheckSkipped: false,
        error: errorMessage,
        needsHuman: false,
        startedAt,
        completedAt: new Date().toISOString()
      }

      onEvent({
        type: 'error',
        project: projectPath,
        projectName,
        error: errorMessage
      })

      resolve(result)
    })
  })
}

/**
 * Detect if Claude's output indicates need for human review
 * Looks for common patterns that Claude uses to flag issues
 */
function detectNeedsHuman(output: string): boolean {
  const patterns = [
    /needs?.human/i,
    /requires?.human/i,
    /human.review/i,
    /manual.intervention/i,
    /please.review/i,
    /attention.required/i,
    /conflict/i,
    /critical.vulnerability/i,
    /high.severity/i,
    /security.issue/i
  ]

  return patterns.some(pattern => pattern.test(output))
}

/**
 * Run a job against multiple projects with parallel limit
 */
export async function runJobOnProjects(
  prompt: string,
  projectPaths: string[],
  preCheck: PreCheck | undefined,
  maxParallel: number = DEFAULT_MAX_PARALLEL,
  onEvent: (event: JobStreamEvent) => void
): Promise<ProjectRunResult[]> {
  const results: ProjectRunResult[] = []
  const queue = [...projectPaths]
  const running = new Set<Promise<void>>()

  while (queue.length > 0 || running.size > 0) {
    // Start new tasks up to the parallel limit
    while (queue.length > 0 && running.size < maxParallel) {
      const projectPath = queue.shift()!
      const projectName = getProjectName(projectPath)

      const task = (async () => {
        // Run pre-check if configured
        if (preCheck) {
          const { skip, output } = await runPreCheck(projectPath, preCheck)

          onEvent({
            type: 'pre-check',
            project: projectPath,
            projectName,
            skipped: skip,
            preCheckOutput: output
          })

          if (skip) {
            results.push({
              path: projectPath,
              name: projectName,
              preCheckSkipped: true,
              preCheckOutput: output,
              needsHuman: false,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString()
            })
            return
          }
        }

        // Run Claude on the project
        const result = await runClaudeOnProject(projectPath, prompt, onEvent)
        results.push(result)
      })()

      const trackedTask = task.then(() => {
        running.delete(trackedTask)
      })

      running.add(trackedTask)
    }

    // Wait for at least one task to complete
    if (running.size > 0) {
      await Promise.race(running)
    }
  }

  return results
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
