/**
 * Gemini CLI Integration
 * Uses the Google gemini CLI for chat
 */

import { spawn } from 'child_process'
import type { ChatSettings, GeminiSettings } from './types'
import type { ModelContext } from './conversation'

/**
 * Build CLI args from GeminiSettings
 * Handles both legacy flat settings and nested gemini settings
 */
export function buildGeminiArgs(settings?: ChatSettings): string[] {
  const args: string[] = []

  // Get gemini-specific settings, prefer nested over flat legacy
  const gemini = settings?.gemini || {}

  // Model (prefer nested, fall back to legacy flat)
  const model = gemini.model || settings?.geminiModel
  if (model) {
    args.push('--model', model)
  }

  // Temperature
  if (gemini.temperature !== undefined) {
    args.push('--temperature', gemini.temperature.toString())
  }

  // Max output tokens
  if (gemini.maxOutputTokens !== undefined) {
    args.push('--max-output-tokens', gemini.maxOutputTokens.toString())
  }

  // System instruction (use nested gemini.systemInstruction or top-level systemPrompt)
  const systemInstruction = gemini.systemInstruction || settings?.systemPrompt
  if (systemInstruction) {
    args.push('--system-instruction', systemInstruction)
  }

  // Safety settings / harm block threshold
  if (gemini.harmBlockThreshold) {
    args.push('--harm-block-threshold', gemini.harmBlockThreshold)
  }

  return args
}

/**
 * Stream chat completions from Gemini CLI
 * Uses context built by the conversation system for multi-model awareness
 */
export async function streamGemini(
  context: ModelContext,
  settings?: ChatSettings,
  cwd?: string
): Promise<ReadableStream<string>> {
  // Build the prompt with system context and conversation history
  const parts: string[] = []

  // Add system prompt as context
  if (context.systemPrompt) {
    parts.push(`<system>\n${context.systemPrompt}\n</system>\n`)
  }

  // Add conversation history
  for (const msg of context.messages) {
    if (msg.role === 'user') {
      parts.push(`User: ${msg.content}`)
    } else if (msg.role === 'assistant') {
      parts.push(`Assistant: ${msg.content}`)
    }
  }

  // The full prompt for Gemini
  const fullPrompt = parts.join('\n\n')

  const args: string[] = []

  // Check if we have a pre-built spawn command (takes precedence)
  if (settings?.spawnCommand && settings.spawnCommand.length > 0) {
    // Use pre-built spawn command args
    args.push(...settings.spawnCommand)
    // Add prompt if not already in spawnCommand
    if (!settings.spawnCommand.includes('-p')) {
      args.push('-p', fullPrompt)
    }
  } else {
    // Build from individual settings using helper
    args.push(...buildGeminiArgs(settings))
    // Always add the prompt
    args.push('-p', fullPrompt)
  }

  const gemini = spawn('gemini', args, {
    cwd: cwd || process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  return new ReadableStream<string>({
    start(controller) {
      let buffer = ''

      gemini.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        buffer += text
        // Stream chunks as they arrive
        controller.enqueue(text)
      })

      gemini.stderr.on('data', (chunk: Buffer) => {
        console.error('Gemini CLI stderr:', chunk.toString())
      })

      gemini.on('close', (code) => {
        if (code !== 0) {
          controller.error(new Error(`Gemini CLI exited with code ${code}`))
          return
        }
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      gemini.on('error', (error) => {
        controller.error(error)
      })
    },

    cancel() {
      gemini.kill()
    }
  })
}

/**
 * Simple prompt version (for backwards compatibility)
 */
export async function streamGeminiSimple(
  prompt: string,
  systemPrompt?: string,
  cwd?: string
): Promise<ReadableStream<string>> {
  const context: ModelContext = {
    systemPrompt: systemPrompt || '',
    messages: [{ role: 'user', content: prompt }]
  }

  return streamGemini(context, undefined, cwd)
}

/**
 * Check if Gemini CLI is available
 */
export async function isGeminiAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const gemini = spawn('gemini', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    gemini.on('close', (code) => {
      resolve(code === 0)
    })

    gemini.on('error', () => {
      resolve(false)
    })

    // Timeout after 5 seconds
    setTimeout(() => {
      gemini.kill()
      resolve(false)
    }, 5000)
  })
}
