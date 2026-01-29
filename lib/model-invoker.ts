/**
 * Model Invoker Service
 * Handles CLI invocation of AI models for the Prompts Playground
 */

import { spawn, ChildProcess } from 'child_process'
import { getModelById, type ModelDefinition } from './models-registry'

export interface InvocationRequest {
  modelId: string
  prompt: string
  systemPrompt?: string
  workspace?: string
  timeout?: number // ms, default 120000
}

export interface InvocationResult {
  success: boolean
  response: string
  timing: number // ms
  error?: string
  modelId: string
  modelName?: string
}

export interface StreamCallbacks {
  onData: (chunk: string) => void
  onError: (error: string) => void
  onComplete: (result: InvocationResult) => void
}

/**
 * Parse CLI command from model definition
 * Converts "claude --model haiku" into { command: "claude", args: ["--model", "haiku"] }
 */
function parseCliCommand(cli: string): { command: string; args: string[] } {
  // Handle special cases like "claude --model sonnet (x3)" for swarms
  const cleanCli = cli.replace(/\s*\(x\d+\)\s*$/, '').trim()

  const parts = cleanCli.split(/\s+/)
  const command = parts[0]
  const args = parts.slice(1)

  return { command, args }
}

/**
 * Build the full command arguments for model invocation
 */
function buildArgs(
  model: ModelDefinition,
  prompt: string,
  systemPrompt?: string
): string[] {
  const { args: baseArgs } = parseCliCommand(model.cli)
  const args = [...baseArgs]

  // Add prompt flag based on CLI type
  if (model.cli.startsWith('claude')) {
    args.push('-p', prompt)
    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt)
    }
    // Add print flag for non-interactive output
    args.push('--print')
  } else if (model.cli.startsWith('codex')) {
    // Codex uses positional prompt
    args.push(prompt)
    if (systemPrompt) {
      args.push('--instructions', systemPrompt)
    }
    // Add quiet mode for cleaner output
    args.push('--quiet')
  } else if (model.cli.startsWith('gemini')) {
    // Gemini native CLI
    args.push(prompt)
  } else if (model.cli.startsWith('copilot')) {
    // GitHub Copilot CLI
    args.push('explain', prompt)
  }

  return args
}

/**
 * Expand ~ to home directory in workspace path
 */
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    return path.replace(/^~/, home)
  }
  return path
}

/**
 * Invoke a model via CLI and return the result
 * Non-streaming version for simple use cases
 */
export async function invokeModel(request: InvocationRequest): Promise<InvocationResult> {
  const startTime = Date.now()
  const { modelId, prompt, systemPrompt, workspace, timeout = 120000 } = request

  const model = getModelById(modelId)
  if (!model) {
    return {
      success: false,
      response: '',
      timing: 0,
      error: `Unknown model: ${modelId}`,
      modelId,
    }
  }

  // Skip swarm models for now (they require special handling)
  if (model.icon === 'swarm') {
    return {
      success: false,
      response: '',
      timing: Date.now() - startTime,
      error: 'Swarm models are not yet supported for direct invocation',
      modelId,
      modelName: model.name,
    }
  }

  const { command } = parseCliCommand(model.cli)
  const args = buildArgs(model, prompt, systemPrompt)

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let resolved = false

    const cwd = workspace ? expandPath(workspace) : process.cwd()

    const proc = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        // Ensure we get clean output
        NO_COLOR: '1',
        TERM: 'dumb',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true
        proc.kill('SIGTERM')
        resolve({
          success: false,
          response: stdout,
          timing: Date.now() - startTime,
          error: `Timeout after ${timeout}ms`,
          modelId,
          modelName: model.name,
        })
      }
    }, timeout)

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeoutId)

        resolve({
          success: code === 0,
          response: stdout.trim(),
          timing: Date.now() - startTime,
          error: code !== 0 ? stderr.trim() || `Process exited with code ${code}` : undefined,
          modelId,
          modelName: model.name,
        })
      }
    })

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeoutId)

        resolve({
          success: false,
          response: '',
          timing: Date.now() - startTime,
          error: `Failed to spawn process: ${err.message}`,
          modelId,
          modelName: model.name,
        })
      }
    })
  })
}

/**
 * Invoke a model with streaming output
 * Returns a ReadableStream for real-time output
 */
export function invokeModelStream(
  request: InvocationRequest
): { stream: ReadableStream<string>; abort: () => void } {
  const startTime = Date.now()
  const { modelId, prompt, systemPrompt, workspace, timeout = 120000 } = request

  let proc: ChildProcess | null = null
  let aborted = false

  const stream = new ReadableStream<string>({
    async start(controller) {
      const model = getModelById(modelId)
      if (!model) {
        controller.enqueue(JSON.stringify({
          type: 'error',
          error: `Unknown model: ${modelId}`,
        }) + '\n')
        controller.close()
        return
      }

      // Skip swarm models
      if (model.icon === 'swarm') {
        controller.enqueue(JSON.stringify({
          type: 'error',
          error: 'Swarm models are not yet supported',
        }) + '\n')
        controller.close()
        return
      }

      const { command } = parseCliCommand(model.cli)
      const args = buildArgs(model, prompt, systemPrompt)
      const cwd = workspace ? expandPath(workspace) : process.cwd()

      // Send start event
      controller.enqueue(JSON.stringify({
        type: 'start',
        modelId,
        modelName: model.name,
        command: `${command} ${args.join(' ')}`,
      }) + '\n')

      try {
        proc = spawn(command, args, {
          cwd,
          env: {
            ...process.env,
            NO_COLOR: '1',
            TERM: 'dumb',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        const timeoutId = setTimeout(() => {
          if (proc && !aborted) {
            aborted = true
            proc.kill('SIGTERM')
            controller.enqueue(JSON.stringify({
              type: 'error',
              error: `Timeout after ${timeout}ms`,
            }) + '\n')
            controller.close()
          }
        }, timeout)

        proc.stdout?.on('data', (data: Buffer) => {
          if (!aborted) {
            controller.enqueue(JSON.stringify({
              type: 'data',
              content: data.toString(),
            }) + '\n')
          }
        })

        proc.stderr?.on('data', (data: Buffer) => {
          if (!aborted) {
            controller.enqueue(JSON.stringify({
              type: 'stderr',
              content: data.toString(),
            }) + '\n')
          }
        })

        proc.on('close', (code) => {
          clearTimeout(timeoutId)
          if (!aborted) {
            controller.enqueue(JSON.stringify({
              type: 'complete',
              success: code === 0,
              timing: Date.now() - startTime,
              exitCode: code,
            }) + '\n')
            controller.close()
          }
        })

        proc.on('error', (err) => {
          clearTimeout(timeoutId)
          if (!aborted) {
            aborted = true
            controller.enqueue(JSON.stringify({
              type: 'error',
              error: `Failed to spawn: ${err.message}`,
            }) + '\n')
            controller.close()
          }
        })
      } catch (err) {
        controller.enqueue(JSON.stringify({
          type: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        }) + '\n')
        controller.close()
      }
    },

    cancel() {
      aborted = true
      if (proc) {
        proc.kill('SIGTERM')
      }
    },
  })

  return {
    stream,
    abort: () => {
      aborted = true
      if (proc) {
        proc.kill('SIGTERM')
      }
    },
  }
}

/**
 * Invoke multiple models in parallel
 */
export async function invokeModelsParallel(
  requests: InvocationRequest[]
): Promise<Map<string, InvocationResult>> {
  const results = new Map<string, InvocationResult>()

  const promises = requests.map(async (request) => {
    const result = await invokeModel(request)
    results.set(request.modelId, result)
    return result
  })

  await Promise.allSettled(promises)

  return results
}
