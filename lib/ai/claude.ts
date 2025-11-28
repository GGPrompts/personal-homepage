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
  settings?: ChatSettings
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
    '--print'
  ]

  if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt)
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
    stdio: ['ignore', 'pipe', 'pipe'], // Don't inherit stdin, pipe stdout/stderr
    detached: false
  })

  return new ReadableStream<string>({
    start(controller) {
      let fullResponse = ''

      // In --print mode, Claude outputs plain text, not stream-json
      // We'll accumulate the full response and stream it word by word
      claude.stdout.on('data', (chunk: Buffer) => {
        fullResponse += chunk.toString()
      })

      claude.stderr.on('data', (chunk: Buffer) => {
        console.error('Claude CLI stderr:', chunk.toString())
      })

      claude.on('close', async (code) => {
        if (code !== 0) {
          controller.error(new Error(`Claude CLI exited with code ${code}`))
          return
        }

        // Stream the response word by word for better UX
        const words = fullResponse.trim().split(/(\s+)/)
        for (const word of words) {
          if (word) {
            controller.enqueue(word)
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 20))
          }
        }

        controller.close()
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
