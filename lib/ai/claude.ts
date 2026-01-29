/**
 * Claude CLI Integration
 * Uses the @anthropic-ai/claude-code CLI with Max subscription
 */

import { spawn, ChildProcess } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { ChatMessage, ChatSettings, ClaudeSettings } from './types'

// Path to the Claude CLI binary - check common install locations, fall back to PATH
const CLAUDE_PATHS = [
  join(homedir(), '.local', 'bin', 'claude'),      // npm global install
  join(homedir(), '.claude', 'local', 'claude'),   // claude local install
  '/usr/local/bin/claude',                          // system install
]
const CLAUDE_BIN = CLAUDE_PATHS.find(p => existsSync(p)) || 'claude'

// Content block types from Claude CLI stream-json
interface TextBlock {
  type: 'text'
  text: string
}

interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

interface ClaudeUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

interface ClaudeStreamEvent {
  type: 'system' | 'assistant' | 'result' | 'error' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_stop'
  subtype?: string
  session_id?: string
  message?: {
    content: ContentBlock[]
  }
  index?: number
  content_block?: ContentBlock
  result?: string
  is_error?: boolean
  usage?: ClaudeUsage
  delta?: {
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
  error?: {
    type: string
    message: string
  }
}

// Stream chunk types for the client
export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_input' | 'tool_end' | 'heartbeat' | 'error' | 'done'
  content?: string
  tool?: {
    id: string
    name: string
    input?: string
  }
  error?: string
  sessionId?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
    totalTokens: number
  }
}

export interface ClaudeStreamResult {
  stream: ReadableStream<string>
  getSessionId: () => string | null
}

// Heartbeat interval in ms (send every 15 seconds to keep connection alive)
const HEARTBEAT_INTERVAL = 15000

/**
 * Build CLI args from ClaudeSettings
 * Handles both legacy flat settings and nested claude settings
 */
export function buildClaudeArgs(settings: ChatSettings): string[] {
  const args: string[] = []

  // Get claude-specific settings, prefer nested over flat legacy
  const claude = settings.claude || {}

  // System prompt (from top-level or nested)
  const systemPrompt = claude.systemPrompt || settings.systemPrompt
  if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt)
  }

  // Model (prefer nested, fall back to legacy flat)
  const model = claude.model || settings.claudeModel
  if (model) {
    args.push('--model', model)
  }

  // Agent (prefer nested, fall back to legacy flat)
  const agent = claude.agent || settings.claudeAgent
  if (agent) {
    args.push('--agent', agent)
  }

  // Additional directories (prefer nested, fall back to legacy flat)
  const additionalDirs = claude.additionalDirs || settings.additionalDirs
  if (additionalDirs && additionalDirs.length > 0) {
    args.push('--add-dir', ...additionalDirs)
  }

  // Allowed tools (prefer nested, fall back to legacy flat)
  const allowedTools = claude.allowedTools || settings.allowedTools
  if (allowedTools && allowedTools.length > 0) {
    args.push('--allowed-tools', ...allowedTools)
  }

  // Disallowed tools (prefer nested, fall back to legacy flat)
  const disallowedTools = claude.disallowedTools || settings.disallowedTools
  if (disallowedTools && disallowedTools.length > 0) {
    args.push('--disallowed-tools', ...disallowedTools)
  }

  // Permission mode (prefer nested, fall back to legacy flat)
  const permissionMode = claude.permissionMode || settings.permissionMode
  if (permissionMode) {
    args.push('--permission-mode', permissionMode)
  }

  // MCP config files
  if (claude.mcpConfig && claude.mcpConfig.length > 0) {
    for (const configPath of claude.mcpConfig) {
      args.push('--mcp-config', configPath)
    }
  }

  // Strict MCP config (only use specified MCP servers)
  if (claude.strictMcpConfig) {
    args.push('--strict-mcp-config')
  }

  // Plugin directories
  if (claude.pluginDirs && claude.pluginDirs.length > 0) {
    for (const pluginDir of claude.pluginDirs) {
      args.push('--plugin-dir', pluginDir)
    }
  }

  // Max budget in USD
  if (claude.maxBudgetUsd !== undefined) {
    args.push('--max-budget-usd', claude.maxBudgetUsd.toString())
  }

  // Beta feature flags
  if (claude.betas && claude.betas.length > 0) {
    for (const beta of claude.betas) {
      args.push('--beta', beta)
    }
  }

  // Verbose mode
  if (claude.verbose) {
    args.push('--verbose')
  }

  // Dangerous: skip permissions (use with caution)
  if (claude.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions')
  }

  return args
}

/**
 * Stream chat completions from Claude CLI
 * Returns stream and a function to get the captured session_id
 *
 * Features:
 * - Heartbeat to keep connection alive during long operations
 * - Tool use events surfaced to client
 * - Proper cleanup on cancel/error
 * - Protection against double-close
 */
export async function streamClaude(
  messages: ChatMessage[],
  settings?: ChatSettings,
  cwd?: string,
  sessionId?: string
): Promise<ClaudeStreamResult> {
  // Build the conversation context
  const systemPrompt = settings?.systemPrompt || ''

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

  // Check if we have a pre-built spawn command (takes precedence)
  if (settings?.spawnCommand && settings.spawnCommand.length > 0) {
    // Use pre-built spawn command args
    args.push(...settings.spawnCommand)
  } else if (settings) {
    // Build from individual settings using helper
    args.push(...buildClaudeArgs(settings))
  } else if (systemPrompt) {
    // Fallback for minimal settings
    args.push('--append-system-prompt', systemPrompt)
  }

  // Always add the prompt as the last argument
  args.push(lastUserMessage.content)

  // Determine working directory based on agent mode
  // - 'user' mode: Use agent's directory (no beads hooks, gets agent's CLAUDE.md)
  // - 'dev' mode (default): Use provided cwd or process.cwd() for full dev context
  let effectiveCwd = cwd || process.cwd()
  if (settings?.agentMode === 'user') {
    if (settings?.agentDir) {
      // Use agent's directory - has .claude/settings.json that disables hooks
      // and includes the agent's CLAUDE.md for personality
      effectiveCwd = settings.agentDir.startsWith('/')
        ? settings.agentDir
        : join(process.cwd(), settings.agentDir)
    } else {
      // Fallback to home directory if no agentDir specified
      effectiveCwd = homedir()
    }
  }

  const claude = spawn(CLAUDE_BIN, args, {
    env: {
      ...process.env,
      // Remove ANTHROPIC_API_KEY to force subscription auth
      ANTHROPIC_API_KEY: undefined
    },
    cwd: effectiveCwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  // Capture session_id from stream events
  let capturedSessionId: string | null = null

  // Track stream state to prevent double operations
  let isClosed = false
  let heartbeatInterval: NodeJS.Timeout | null = null
  let lastActivity = Date.now()

  // Track current tool use for streaming input
  const activeTools = new Map<number, { id: string; name: string; input: string }>()

  // Helper to safely close the stream
  const safeClose = (controller: ReadableStreamDefaultController<string>) => {
    if (isClosed) return
    isClosed = true

    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }

    // Kill process if still running
    if (!claude.killed) {
      claude.kill()
    }

    try {
      controller.close()
    } catch {
      // Already closed
    }
  }

  // Helper to safely error the stream
  const safeError = (controller: ReadableStreamDefaultController<string>, error: Error) => {
    if (isClosed) return
    isClosed = true

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }

    if (!claude.killed) {
      claude.kill()
    }

    try {
      controller.error(error)
    } catch {
      // Already closed/errored
    }
  }

  // Helper to enqueue with JSON encoding for structured data
  const enqueueChunk = (controller: ReadableStreamDefaultController<string>, chunk: StreamChunk) => {
    if (isClosed) return
    lastActivity = Date.now()

    // For text content, just send the raw text for backwards compatibility
    if (chunk.type === 'text' && chunk.content) {
      controller.enqueue(chunk.content)
    } else {
      // For structured events (tool use, heartbeat), send as JSON with marker
      controller.enqueue(`\n__CLAUDE_EVENT__${JSON.stringify(chunk)}__END_EVENT__\n`)
    }
  }

  const stream = new ReadableStream<string>({
    start(controller) {
      let buffer = ''

      // Start heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (isClosed) return

        const timeSinceActivity = Date.now() - lastActivity
        if (timeSinceActivity >= HEARTBEAT_INTERVAL) {
          enqueueChunk(controller, { type: 'heartbeat' })
        }
      }, HEARTBEAT_INTERVAL)

      // Process stream-json format from Claude CLI
      claude.stdout.on('data', (chunk: Buffer) => {
        if (isClosed) return

        buffer += chunk.toString()
        lastActivity = Date.now()

        // Process complete JSON lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const event: ClaudeStreamEvent = JSON.parse(line)

            // Capture session_id from init event
            if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
              capturedSessionId = event.session_id
            }

            // Handle different event types
            switch (event.type) {
              case 'assistant':
                // Full assistant message with content blocks
                if (event.message?.content) {
                  for (const block of event.message.content) {
                    if (block.type === 'text' && block.text) {
                      enqueueChunk(controller, { type: 'text', content: block.text })
                    } else if (block.type === 'tool_use') {
                      // Tool use in assistant message
                      enqueueChunk(controller, {
                        type: 'tool_start',
                        tool: {
                          id: block.id,
                          name: block.name,
                          input: JSON.stringify(block.input, null, 2)
                        }
                      })
                      enqueueChunk(controller, {
                        type: 'tool_end',
                        tool: { id: block.id, name: block.name }
                      })
                    }
                  }
                }
                break

              case 'content_block_start':
                // Start of a content block (text or tool_use)
                if (event.content_block?.type === 'tool_use' && event.index !== undefined) {
                  const tool = event.content_block as ToolUseBlock
                  activeTools.set(event.index, { id: tool.id, name: tool.name, input: '' })
                  enqueueChunk(controller, {
                    type: 'tool_start',
                    tool: { id: tool.id, name: tool.name }
                  })
                }
                break

              case 'content_block_delta':
                if (event.delta?.type === 'text_delta' && event.delta.text) {
                  // Text streaming
                  enqueueChunk(controller, { type: 'text', content: event.delta.text })
                } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json && event.index !== undefined) {
                  // Tool input streaming
                  const activeTool = activeTools.get(event.index)
                  if (activeTool) {
                    activeTool.input += event.delta.partial_json
                    enqueueChunk(controller, {
                      type: 'tool_input',
                      tool: {
                        id: activeTool.id,
                        name: activeTool.name,
                        input: event.delta.partial_json
                      }
                    })
                  }
                }
                break

              case 'content_block_stop':
                // End of a content block
                if (event.index !== undefined) {
                  const activeTool = activeTools.get(event.index)
                  if (activeTool) {
                    enqueueChunk(controller, {
                      type: 'tool_end',
                      tool: {
                        id: activeTool.id,
                        name: activeTool.name,
                        input: activeTool.input
                      }
                    })
                    activeTools.delete(event.index)
                  }
                }
                break

              case 'result':
                // Capture session_id from result event
                if (event.session_id) {
                  capturedSessionId = event.session_id
                }
                // End of stream
                if (event.is_error) {
                  safeError(controller, new Error(event.result || 'Claude CLI error'))
                } else {
                  // Send done event with usage data if available
                  if (event.usage) {
                    const totalTokens = event.usage.input_tokens +
                      event.usage.output_tokens +
                      (event.usage.cache_read_input_tokens || 0) +
                      (event.usage.cache_creation_input_tokens || 0)
                    enqueueChunk(controller, {
                      type: 'done',
                      sessionId: capturedSessionId || undefined,
                      usage: {
                        inputTokens: event.usage.input_tokens,
                        outputTokens: event.usage.output_tokens,
                        cacheReadTokens: event.usage.cache_read_input_tokens,
                        cacheCreationTokens: event.usage.cache_creation_input_tokens,
                        totalTokens
                      }
                    })
                  }
                  safeClose(controller)
                }
                break

              case 'message_stop':
                safeClose(controller)
                break

              case 'error':
                safeError(controller, new Error(event.error?.message || 'Claude CLI error'))
                break
            }
          } catch (error) {
            console.error('Failed to parse Claude stream-json:', line, error)
          }
        }
      })

      claude.stderr.on('data', (chunk: Buffer) => {
        const stderr = chunk.toString()
        console.error('Claude CLI stderr:', stderr)

        // Check for fatal errors in stderr
        if (stderr.includes('Error:') || stderr.includes('FATAL')) {
          safeError(controller, new Error(`Claude CLI: ${stderr.trim()}`))
        }
      })

      claude.on('close', (code) => {
        if (isClosed) return

        if (code !== 0 && code !== null) {
          safeError(controller, new Error(`Claude CLI exited with code ${code}`))
        } else {
          safeClose(controller)
        }
      })

      claude.on('error', (error) => {
        safeError(controller, error)
      })
    },

    cancel() {
      isClosed = true

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }

      if (!claude.killed) {
        claude.kill()
      }
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
    const claude = spawn(CLAUDE_BIN, ['--version'])

    claude.on('close', (code) => {
      resolve(code === 0)
    })

    claude.on('error', () => {
      resolve(false)
    })
  })
}
