/**
 * Claude CLI Integration
 * Uses the @anthropic-ai/claude-code CLI with Max subscription
 *
 * Spawns Claude in tmux windows for:
 * - Process persistence across page navigations
 * - Output recovery after disconnection
 * - Clean process termination
 */

import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, promises as fs } from 'fs'
import type { ChatMessage, ChatSettings, ClaudeSettings } from './types'
import {
  ensureSession,
  ensureOutputDir,
  spawnInWindow,
  getOutputPath,
  getWindowStatus,
  killWindow
} from './tmux-manager'

// Path to the Claude CLI binary - check common install locations, fall back to PATH
const CLAUDE_PATHS = [
  join(homedir(), '.local', 'bin', 'claude'),      // npm global install
  join(homedir(), '.claude', 'local', 'claude'),   // claude local install
  '/usr/local/bin/claude',                          // system install
]

// Debug: log what we find
const foundPath = CLAUDE_PATHS.find(p => {
  const exists = existsSync(p)
  console.log(`[Claude CLI] Checking ${p}: ${exists ? 'EXISTS' : 'NOT FOUND'}`)
  return exists
})
const CLAUDE_BIN = foundPath || 'claude'
console.log(`[Claude CLI] Using binary: ${CLAUDE_BIN}`)

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

// Expand ~ to home directory (Node.js spawn doesn't do this automatically)
function expandTilde(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2))
  }
  if (path === '~') {
    return homedir()
  }
  return path
}

/**
 * Determine effective working directory based on settings
 */
function resolveWorkingDirectory(cwd: string | undefined, settings: ChatSettings | undefined): string {
  let effectiveCwd = cwd ? expandTilde(cwd) : process.cwd()

  // 'user' mode: Use agent's directory (no beads hooks, gets agent's CLAUDE.md)
  // 'dev' mode (default): Use provided cwd or process.cwd() for full dev context
  if (settings?.agentMode === 'user') {
    if (settings?.agentDir) {
      // Path resolution:
      // - Absolute paths (/path/to/agent): use as-is
      // - Tilde paths (~/path): expand to home directory
      // - Relative paths with ./ prefix: relative to Next.js project (process.cwd())
      // - Plain relative paths: relative to home directory (user context)
      if (settings.agentDir.startsWith('/')) {
        effectiveCwd = settings.agentDir
      } else if (settings.agentDir.startsWith('~/')) {
        effectiveCwd = join(homedir(), settings.agentDir.slice(2))
      } else if (settings.agentDir.startsWith('./')) {
        effectiveCwd = join(process.cwd(), settings.agentDir.slice(2))
      } else {
        effectiveCwd = join(homedir(), settings.agentDir)
      }
    } else {
      effectiveCwd = homedir()
    }
  }

  return effectiveCwd
}

/**
 * Escape a string for use in shell command
 */
function shellEscape(str: string): string {
  // Use single quotes and escape any single quotes within
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

/**
 * Create a stream that tails the output file and parses Claude events
 */
function createTailStream(
  filePath: string,
  conversationId: string,
  onSessionId: (sessionId: string) => void
): ReadableStream<string> {
  let position = 0
  let buffer = ''
  let isClosed = false
  let heartbeatInterval: NodeJS.Timeout | null = null
  let pollTimeout: NodeJS.Timeout | null = null
  let lastActivity = Date.now()

  // Track current tool use for streaming input
  const activeTools = new Map<number, { id: string; name: string; input: string }>()

  return new ReadableStream<string>({
    async start(controller) {
      // Helper to safely close the stream
      const safeClose = () => {
        if (isClosed) return
        isClosed = true

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        if (pollTimeout) {
          clearTimeout(pollTimeout)
          pollTimeout = null
        }

        try {
          controller.close()
        } catch {
          // Already closed
        }
      }

      // Helper to safely error the stream
      const safeError = (error: Error) => {
        if (isClosed) return
        isClosed = true

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        if (pollTimeout) {
          clearTimeout(pollTimeout)
          pollTimeout = null
        }

        try {
          controller.error(error)
        } catch {
          // Already closed/errored
        }
      }

      // Helper to enqueue chunks with proper formatting
      const enqueueChunk = (chunk: StreamChunk) => {
        if (isClosed) return
        lastActivity = Date.now()

        if (chunk.type === 'text' && chunk.content) {
          controller.enqueue(chunk.content)
        } else {
          controller.enqueue(`\n__CLAUDE_EVENT__${JSON.stringify(chunk)}__END_EVENT__\n`)
        }
      }

      // Process a complete JSON line from Claude's stream-json output
      const processLine = (line: string) => {
        if (!line.trim()) return

        try {
          const event: ClaudeStreamEvent = JSON.parse(line)

          // Capture session_id from init event
          if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
            onSessionId(event.session_id)
          }

          switch (event.type) {
            case 'assistant':
              if (event.message?.content) {
                for (const block of event.message.content) {
                  if (block.type === 'text' && block.text) {
                    enqueueChunk({ type: 'text', content: block.text })
                  } else if (block.type === 'tool_use') {
                    enqueueChunk({
                      type: 'tool_start',
                      tool: {
                        id: block.id,
                        name: block.name,
                        input: JSON.stringify(block.input, null, 2)
                      }
                    })
                    enqueueChunk({
                      type: 'tool_end',
                      tool: { id: block.id, name: block.name }
                    })
                  }
                }
              }
              break

            case 'content_block_start':
              if (event.content_block?.type === 'tool_use' && event.index !== undefined) {
                const tool = event.content_block as ToolUseBlock
                activeTools.set(event.index, { id: tool.id, name: tool.name, input: '' })
                enqueueChunk({
                  type: 'tool_start',
                  tool: { id: tool.id, name: tool.name }
                })
              }
              break

            case 'content_block_delta':
              if (event.delta?.type === 'text_delta' && event.delta.text) {
                enqueueChunk({ type: 'text', content: event.delta.text })
              } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json && event.index !== undefined) {
                const activeTool = activeTools.get(event.index)
                if (activeTool) {
                  activeTool.input += event.delta.partial_json
                  enqueueChunk({
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
              if (event.index !== undefined) {
                const activeTool = activeTools.get(event.index)
                if (activeTool) {
                  enqueueChunk({
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
              if (event.session_id) {
                onSessionId(event.session_id)
              }
              if (event.is_error) {
                safeError(new Error(event.result || 'Claude CLI error'))
              } else {
                if (event.usage) {
                  const totalTokens = event.usage.input_tokens +
                    event.usage.output_tokens +
                    (event.usage.cache_read_input_tokens || 0) +
                    (event.usage.cache_creation_input_tokens || 0)
                  enqueueChunk({
                    type: 'done',
                    sessionId: undefined,  // Will be set by caller
                    usage: {
                      inputTokens: event.usage.input_tokens,
                      outputTokens: event.usage.output_tokens,
                      cacheReadTokens: event.usage.cache_read_input_tokens,
                      cacheCreationTokens: event.usage.cache_creation_input_tokens,
                      totalTokens
                    }
                  })
                }
                safeClose()
              }
              break

            case 'message_stop':
              safeClose()
              break

            case 'error':
              safeError(new Error(event.error?.message || 'Claude CLI error'))
              break
          }
        } catch (error) {
          console.error('[Claude CLI] Failed to parse stream-json:', line, error)
        }
      }

      // Start heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (isClosed) return
        const timeSinceActivity = Date.now() - lastActivity
        if (timeSinceActivity >= HEARTBEAT_INTERVAL) {
          enqueueChunk({ type: 'heartbeat' })
        }
      }, HEARTBEAT_INTERVAL)

      // Poll the output file for new content
      const checkFile = async () => {
        if (isClosed) return

        try {
          // Read file content
          let content: string
          try {
            content = await fs.readFile(filePath, 'utf-8')
          } catch (err) {
            // File might not exist yet, keep polling
            pollTimeout = setTimeout(checkFile, 50)
            return
          }

          // Process any new content
          if (content.length > position) {
            const newContent = content.slice(position)
            position = content.length

            // Add to buffer and process complete lines
            buffer += newContent
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              processLine(line)
              if (isClosed) return
            }
          }

          // Check if process still running
          const status = await getWindowStatus(conversationId)
          if (!status.running) {
            // Process any remaining buffer content
            if (buffer.trim()) {
              processLine(buffer)
            }
            safeClose()
            return
          }

          // Schedule next poll
          pollTimeout = setTimeout(checkFile, 50)
        } catch (err) {
          console.error('[Claude CLI] Tail stream error:', err)
          safeError(err instanceof Error ? err : new Error(String(err)))
        }
      }

      // Start polling
      checkFile()
    },

    async cancel() {
      isClosed = true

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
      if (pollTimeout) {
        clearTimeout(pollTimeout)
        pollTimeout = null
      }

      // Kill the tmux window
      await killWindow(conversationId)
    }
  })
}

/**
 * Stream chat completions from Claude CLI (spawned in tmux)
 *
 * Spawns Claude in a tmux window with output captured via tee for:
 * - Process persistence across page navigations
 * - Output recovery after disconnection
 * - Clean process termination
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
  sessionId?: string,
  conversationId?: string
): Promise<ClaudeStreamResult> {
  if (!conversationId) {
    throw new Error('conversationId is required for tmux-based streaming')
  }

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
    '--verbose'  // Required when using --output-format=stream-json with --print
  ]

  // Session persistence: use --resume for existing sessions, --session-id for new ones
  if (sessionId) {
    args.push('--resume', sessionId)
  } else {
    const newSessionId = randomUUID()
    args.push('--session-id', newSessionId)
  }

  // Check if we have a pre-built spawn command (takes precedence)
  if (settings?.spawnCommand && settings.spawnCommand.length > 0) {
    args.push(...settings.spawnCommand)
  } else if (settings) {
    args.push(...buildClaudeArgs(settings))
  } else if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt)
  }

  // Always add the prompt as the last argument
  args.push(lastUserMessage.content)

  // Resolve working directory
  const effectiveCwd = resolveWorkingDirectory(cwd, settings)

  console.log(`[Claude CLI] Spawning in tmux: ${CLAUDE_BIN}`)
  console.log(`[Claude CLI] Args: ${args.slice(0, 5).join(' ')}...`)
  console.log(`[Claude CLI] CWD: ${effectiveCwd}`)
  console.log(`[Claude CLI] Conversation ID: ${conversationId}`)

  // Ensure tmux session exists
  await ensureSession()

  // Prepare output file
  const outputPath = getOutputPath(conversationId)
  ensureOutputDir()

  // Truncate output file if exists
  await fs.writeFile(outputPath, '')

  // Build command with proper escaping
  // We need to escape each arg individually for the shell
  const escapedArgs = args.map(arg => shellEscape(arg)).join(' ')

  // Build command that pipes through tee to capture output
  // Note: We unset ANTHROPIC_API_KEY to force subscription auth
  const command = `ANTHROPIC_API_KEY= ${CLAUDE_BIN} ${escapedArgs} 2>&1 | tee ${shellEscape(outputPath)}`

  console.log(`[Claude CLI] Command: ${command.slice(0, 100)}...`)

  // Spawn in tmux window
  await spawnInWindow(conversationId, command, effectiveCwd)

  // Capture session_id from stream events
  let capturedSessionId: string | null = null

  // Create stream that tails the output file
  const stream = createTailStream(
    outputPath,
    conversationId,
    (sid) => { capturedSessionId = sid }
  )

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
