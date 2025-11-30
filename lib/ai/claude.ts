/**
 * Claude CLI Integration
 * Uses the @anthropic-ai/claude-code CLI with Max subscription
 */

import { spawn } from 'child_process'
import type { ChatMessage, ChatSettings } from './types'

interface ClaudeStreamEvent {
  type: 'message_start' | 'content_block_delta' | 'message_delta' | 'message_stop' | 'error'
  delta?: {
    type: 'text_delta'
    text: string
  }
  message?: {
    content: Array<{ type: 'text'; text: string }>
  }
  error?: {
    type: string
    message: string
  }
}

/**
 * Stream chat completions from Claude CLI
 */
export async function streamClaude(
  messages: ChatMessage[],
  settings?: ChatSettings,
  cwd?: string
): Promise<ReadableStream<string>> {
  // Build the conversation context
  const systemPrompt = settings?.systemPrompt || ''
  const conversationHistory = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  // Get the last user message as the prompt
  const lastUserMessage = messages.findLast(m => m.role === 'user')
  if (!lastUserMessage) {
    throw new Error('No user message found')
  }

  const args = [
    '--print',
    '--output-format', 'stream-json'
  ]

  if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt)
  }

  // Add Claude-specific model
  if (settings?.claudeModel) {
    args.push('--model', settings.claudeModel)
  }

  // Add additional directories
  if (settings?.additionalDirs && settings.additionalDirs.length > 0) {
    args.push('--add-dir', ...settings.additionalDirs)
  }

  // Add tool permissions
  if (settings?.allowedTools && settings.allowedTools.length > 0) {
    args.push('--allowed-tools', ...settings.allowedTools)
  }

  if (settings?.disallowedTools && settings.disallowedTools.length > 0) {
    args.push('--disallowed-tools', ...settings.disallowedTools)
  }

  // Add permission mode
  if (settings?.permissionMode) {
    args.push('--permission-mode', settings.permissionMode)
  }

  // Add the prompt as the last argument
  args.push(lastUserMessage.content)

  // Note: Claude CLI doesn't directly support conversation history in the command
  // For multi-turn conversations, we'd need to include context in the prompt
  // or use the API directly. For now, we'll pass just the user message.

  const claude = spawn('claude', args, {
    env: {
      ...process.env,
      // Remove ANTHROPIC_API_KEY to force subscription auth
      ANTHROPIC_API_KEY: undefined
    },
    cwd: cwd || process.cwd(), // Use project path if provided
    stdio: ['ignore', 'pipe', 'pipe'], // Don't inherit stdin, pipe stdout/stderr
    detached: false
  })

  return new ReadableStream<string>({
    start(controller) {
      let buffer = ''

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
              controller.enqueue(event.delta.text)
            } else if (event.type === 'message_stop') {
              controller.close()
            } else if (event.type === 'error') {
              controller.error(new Error(event.error?.message || 'Claude CLI error'))
            }
          } catch (error) {
            console.error('Failed to parse Claude stream-json:', line, error)
          }
        }
      })

      claude.stderr.on('data', (chunk: Buffer) => {
        console.error('Claude CLI stderr:', chunk.toString())
      })

      claude.on('close', (code) => {
        if (code !== 0) {
          controller.error(new Error(`Claude CLI exited with code ${code}`))
          return
        }
        // Controller might already be closed by message_stop event
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      claude.on('error', (error) => {
        controller.error(error)
      })
    },

    cancel() {
      claude.kill()
    }
  })
}

/**
 * Check if Claude CLI is authenticated
 */
export async function isClaudeAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    const claude = spawn('claude', ['--version'])

    claude.on('close', (code) => {
      resolve(code === 0)
    })

    claude.on('error', () => {
      resolve(false)
    })
  })
}
