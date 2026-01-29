/**
 * Codex CLI Integration
 * Uses OpenAI's codex CLI for chat
 */

import { spawn } from 'child_process'
import type { CodexSettings, ChatSettings } from './types'
import type { ModelContext } from './conversation'

/**
 * Build CLI args from CodexSettings
 * Handles both legacy flat settings and nested codex settings
 */
function buildCodexArgs(chatSettings?: ChatSettings, codexSettings?: CodexSettings): string[] {
  const args: string[] = []

  // Get codex-specific settings, prefer explicit codexSettings, then nested, then legacy flat
  const codex = codexSettings || chatSettings?.codex || {}

  // Model selection (prefer nested, fall back to legacy flat, default to gpt-5)
  const model = codex.model || chatSettings?.codexModel || 'gpt-5'
  args.push('-m', model)

  // Reasoning effort (prefer nested, fall back to legacy flat, default to high)
  const effort = codex.reasoningEffort || chatSettings?.reasoningEffort || 'high'
  args.push('-c', `model_reasoning_effort="${effort}"`)

  // Sandbox mode (prefer nested, fall back to legacy flat, default to read-only)
  const sandbox = codex.sandbox || chatSettings?.sandbox || 'read-only'
  args.push('--sandbox', sandbox)

  // Approval mode
  if (codex.approvalMode) {
    args.push('--approval-mode', codex.approvalMode)
  }

  // Max tokens
  if (codex.maxTokens !== undefined) {
    args.push('--max-tokens', codex.maxTokens.toString())
  }

  return args
}

/**
 * Stream chat completions from Codex CLI
 * Uses context built by the conversation system for multi-model awareness
 */
export async function streamCodex(
  context: ModelContext,
  settings?: CodexSettings,
  cwd?: string,
  chatSettings?: ChatSettings
): Promise<ReadableStream<string>> {
  // Build the prompt with system context and conversation history
  const parts: string[] = []

  // Add system prompt as context
  if (context.systemPrompt) {
    parts.push(`System: ${context.systemPrompt}`)
  }

  // Add conversation history
  for (const msg of context.messages) {
    if (msg.role === 'user') {
      parts.push(`User: ${msg.content}`)
    } else if (msg.role === 'assistant') {
      parts.push(`Assistant: ${msg.content}`)
    }
  }

  parts.push('Assistant:') // Prompt for response

  const fullPrompt = parts.join('\n\n')

  const args = ['exec']

  // Check if we have a pre-built spawn command (takes precedence)
  if (chatSettings?.spawnCommand && chatSettings.spawnCommand.length > 0) {
    // Use pre-built spawn command args
    args.push(...chatSettings.spawnCommand)
  } else {
    // Build from individual settings using helper
    args.push(...buildCodexArgs(chatSettings, settings))
  }

  // Always add the prompt last
  args.push(fullPrompt)

  const codex = spawn('codex', args, {
    cwd: cwd || process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  return new ReadableStream<string>({
    start(controller) {
      codex.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        controller.enqueue(text)
      })

      codex.stderr.on('data', (chunk: Buffer) => {
        console.error('Codex CLI stderr:', chunk.toString())
      })

      codex.on('close', (code) => {
        if (code !== 0) {
          controller.error(new Error(`Codex CLI exited with code ${code}`))
          return
        }
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      codex.on('error', (error) => {
        controller.error(error)
      })
    },

    cancel() {
      codex.kill()
    }
  })
}

/**
 * Simple prompt version (for backwards compatibility)
 */
export async function streamCodexSimple(
  prompt: string,
  systemPrompt?: string,
  cwd?: string
): Promise<ReadableStream<string>> {
  const context: ModelContext = {
    systemPrompt: systemPrompt || '',
    messages: [{ role: 'user', content: prompt }]
  }

  return streamCodex(context, undefined, cwd)
}

/**
 * Check if Codex CLI is available
 */
export async function isCodexAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const codex = spawn('codex', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    codex.on('close', (code) => {
      resolve(code === 0)
    })

    codex.on('error', () => {
      resolve(false)
    })

    // Timeout after 5 seconds
    setTimeout(() => {
      codex.kill()
      resolve(false)
    }, 5000)
  })
}
