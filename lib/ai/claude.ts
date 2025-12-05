/**
 * Claude CLI Integration
 * Uses the @anthropic-ai/claude-code CLI with Max subscription
 */

import { spawn } from 'child_process'
import type { ChatMessage, ChatSettings } from './types'

interface ClaudeStreamEvent {
  type: 'system' | 'assistant' | 'result' | 'error' | 'content_block_delta' | 'message_stop'
  subtype?: string
  session_id?: string
  message?: {
    content: Array<{ type: 'text'; text: string }>
  }
  result?: string
  is_error?: boolean
  delta?: {
    type: 'text_delta'
    text: string
  }
  error?: {
    type: string
    message: string
  }
}

export interface ClaudeStreamResult {
  stream: ReadableStream<string>
  getSessionId: () => string | null
}

/**
 * Stream chat completions from Claude CLI
 * Returns stream and a function to get the captured session_id
 */
export async function streamClaude(
  messages: ChatMessage[],
  settings?: ChatSettings,
  cwd?: string,
  sessionId?: string
): Promise<ClaudeStreamResult> {
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
    '--output-format', 'stream-json',
    '--verbose'
  ]

  // Resume existing session if we have a session ID
  if (sessionId) {
    args.push('--resume', sessionId)
  }

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

  // Capture session_id from stream events
  let capturedSessionId: string | null = null

  const stream = new ReadableStream<string>({
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

            // Capture session_id from init event (first priority)
            if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
              capturedSessionId = event.session_id
            }

            // Handle Claude CLI stream-json format
            if (event.type === 'assistant' && event.message?.content) {
              // Extract text from assistant message
              for (const block of event.message.content) {
                if (block.type === 'text' && block.text) {
                  controller.enqueue(block.text)
                }
              }
            } else if (event.type === 'result') {
              // Also capture session_id from result event (backup)
              if (event.session_id) {
                capturedSessionId = event.session_id
              }
              // End of stream
              if (event.is_error) {
                controller.error(new Error(event.result || 'Claude CLI error'))
              } else {
                controller.close()
              }
            } else if (event.type === 'content_block_delta' && event.delta?.text) {
              // Legacy format support
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

  return {
    stream,
    getSessionId: () => capturedSessionId
  }
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
