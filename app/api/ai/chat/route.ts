/**
 * AI Chat API
 * Handles chat requests with streaming responses
 * Supports multi-model conversations via JSONL storage
 */

import { NextRequest } from 'next/server'
import { streamClaude } from '@/lib/ai/claude'
import { streamDockerModel } from '@/lib/ai/docker'
import { streamMock } from '@/lib/ai/mock'
import { streamGemini } from '@/lib/ai/gemini'
import { streamCodex } from '@/lib/ai/codex'
import {
  getOrCreateSession as getCodexMcpSession,
  codexFirstTurn,
  codexReply,
  hasSession as hasCodexMcpSession,
} from '@/lib/ai/codex-mcp'
import {
  readConversation,
  appendMessage,
  buildModelContext,
  createConversation,
  type ModelId
} from '@/lib/ai/conversation'
import type { ChatRequest, AIBackend, ChatSettings, PermissionMode } from '@/lib/ai/types'

/**
 * Validate ChatSettings before passing to backend
 * Returns validated settings or throws error for invalid values
 */
function validateSettings(settings: ChatSettings | undefined, backend: AIBackend): ChatSettings | undefined {
  if (!settings) return undefined

  const validated = { ...settings }

  // Validate common settings
  if (validated.temperature !== undefined) {
    validated.temperature = Math.max(0, Math.min(2, validated.temperature))
  }
  if (validated.maxTokens !== undefined) {
    validated.maxTokens = Math.max(1, Math.min(128000, validated.maxTokens))
  }

  // Validate backend-specific settings
  if (backend === 'claude' && validated.claude) {
    // Validate permission mode
    const validModes: PermissionMode[] = ['acceptEdits', 'bypassPermissions', 'default', 'plan']
    if (validated.claude.permissionMode && !validModes.includes(validated.claude.permissionMode)) {
      validated.claude.permissionMode = 'default'
    }
    // Validate max budget (must be positive)
    if (validated.claude.maxBudgetUsd !== undefined && validated.claude.maxBudgetUsd < 0) {
      validated.claude.maxBudgetUsd = undefined
    }
  }

  if (backend === 'codex' && validated.codex) {
    // Validate sandbox mode
    const validSandbox = ['read-only', 'full', 'off'] as const
    if (validated.codex.sandbox && !validSandbox.includes(validated.codex.sandbox)) {
      validated.codex.sandbox = 'read-only'
    }
    // Validate approval mode
    const validApproval = ['always', 'never', 'dangerous'] as const
    if (validated.codex.approvalMode && !validApproval.includes(validated.codex.approvalMode)) {
      validated.codex.approvalMode = undefined
    }
    // Validate reasoning effort
    const validEffort = ['low', 'medium', 'high'] as const
    if (validated.codex.reasoningEffort && !validEffort.includes(validated.codex.reasoningEffort)) {
      validated.codex.reasoningEffort = 'high'
    }
  }

  if (backend === 'gemini' && validated.gemini) {
    // Validate temperature
    if (validated.gemini.temperature !== undefined) {
      validated.gemini.temperature = Math.max(0, Math.min(2, validated.gemini.temperature))
    }
    // Validate harm block threshold
    const validThresholds = ['BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_HIGH_AND_ABOVE'] as const
    if (validated.gemini.harmBlockThreshold && !validThresholds.includes(validated.gemini.harmBlockThreshold)) {
      validated.gemini.harmBlockThreshold = undefined
    }
  }

  return validated
}

/**
 * Stream Codex responses using MCP server for persistent sessions
 */
async function streamCodexMcp(
  conversationKey: string,
  message: string,
  settings?: ChatSettings,
  cwd?: string
): Promise<ReadableStream<string>> {
  return new ReadableStream<string>({
    async start(controller) {
      try {
        const session = await getCodexMcpSession(conversationKey, settings, cwd)

        let resultText: string

        // Check if this is a new session or continuation
        const isFirstTurn = !hasCodexMcpSession(conversationKey) || !session.conversationId

        if (isFirstTurn) {
          const r = await codexFirstTurn(session, message)
          resultText = r.text
        } else {
          const r = await codexReply(session, message)
          resultText = r.text
        }

        // Stream the response in chunks for better UX
        const chunkSize = 50
        for (let i = 0; i < resultText.length; i += chunkSize) {
          controller.enqueue(resultText.slice(i, i + chunkSize))
        }

        controller.close()
      } catch (error) {
        console.error('Codex MCP error:', error)
        // Fall back to one-shot mode on error
        const context = {
          systemPrompt: settings?.systemPrompt || '',
          messages: [{ role: 'user' as const, content: message }]
        }
        const fallbackStream = await streamCodex(context, settings, cwd)
        const reader = fallbackStream.getReader()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }

        controller.close()
      }
    }
  })
}

// Map API backend names to conversation ModelId
function toModelId(backend: AIBackend): ModelId {
  if (backend === 'mock') return 'claude' // Mock pretends to be Claude
  return backend as ModelId
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    const { messages, backend, model, settings: rawSettings, cwd, conversationId, claudeSessionId } = body

    // Validate and sanitize settings
    const settings = validateSettings(rawSettings, backend)

    // Validate we have either messages or a conversationId
    if ((!messages || messages.length === 0) && !conversationId) {
      return new Response(
        JSON.stringify({ error: 'No messages or conversationId provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let stream: ReadableStream<string>
    let messageId: string | undefined
    let convId = conversationId
    let getSessionId: (() => string | null) | undefined

    try {
      // JSONL conversation mode - multi-model aware
      if (conversationId || body.conversationId) {
        convId = conversationId || createConversation()

        // Get the last user message from the request
        const lastUserMessage = messages?.findLast(m => m.role === 'user')
        if (!lastUserMessage) {
          return new Response(
            JSON.stringify({ error: 'No user message found' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Append user message to conversation
        const userMsg = appendMessage(convId, {
          role: 'user',
          content: lastUserMessage.content
        })

        // Read full conversation and build model-aware context
        const history = readConversation(convId)
        const modelId = toModelId(backend)
        const context = buildModelContext(
          history,
          modelId,
          settings?.systemPrompt,
          50 // max messages for context
        )

        // Get stream from appropriate backend with model-aware context
        if (backend === 'claude') {
          // Claude uses its own conversation format for now
          // Pass session ID for multi-turn context
          const result = await streamClaude(messages, settings, cwd, claudeSessionId)
          stream = result.stream
          getSessionId = result.getSessionId
        } else if (backend === 'gemini') {
          stream = await streamGemini(context, settings, cwd)
        } else if (backend === 'codex') {
          // Use MCP server for persistent multi-turn sessions
          stream = await streamCodexMcp(convId!, lastUserMessage.content, settings, cwd)
        } else if (backend === 'docker') {
          if (!model) {
            return new Response(
              JSON.stringify({ error: 'Model required for Docker backend' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }
          stream = await streamDockerModel(model, messages, settings)
        } else {
          stream = await streamMock(messages)
        }

        // We'll append the assistant response after streaming completes
        messageId = `msg_${Date.now()}_pending`

      } else {
        // Legacy mode - no JSONL, just pass messages directly
        if (backend === 'claude') {
          const result = await streamClaude(messages, settings, cwd, claudeSessionId)
          stream = result.stream
          getSessionId = result.getSessionId
        } else if (backend === 'gemini') {
          const context = {
            systemPrompt: settings?.systemPrompt || '',
            messages: messages.map(m => ({ role: m.role, content: m.content }))
          }
          stream = await streamGemini(context, settings, cwd)
        } else if (backend === 'codex') {
          // Use MCP server for persistent multi-turn sessions
          // Generate a session key from messages if no conversationId
          const sessionKey = `codex_legacy_${Date.now()}`
          const lastMsg = messages.findLast(m => m.role === 'user')
          stream = await streamCodexMcp(sessionKey, lastMsg?.content || '', settings, cwd)
        } else if (backend === 'docker') {
          if (!model) {
            return new Response(
              JSON.stringify({ error: 'Model required for Docker backend' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }
          stream = await streamDockerModel(model, messages, settings)
        } else {
          stream = await streamMock(messages)
        }
      }
    } catch (error) {
      console.error('Backend error, falling back to mock:', error)
      stream = await streamMock(messages)
    }

    // Convert to SSE (Server-Sent Events) format
    // Also collect full response for JSONL storage
    const encoder = new TextEncoder()
    let fullResponse = ''
    let capturedUsage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheCreationTokens?: number; totalTokens: number } | undefined

    // Helper to parse Claude events from stream chunks
    const parseClaudeEvents = (chunk: string): { text: string; events: Array<{ type: string; usage?: typeof capturedUsage; sessionId?: string }> } => {
      const events: Array<{ type: string; usage?: typeof capturedUsage; sessionId?: string }> = []
      let text = chunk

      // Extract __CLAUDE_EVENT__....__END_EVENT__ markers
      const eventRegex = /__CLAUDE_EVENT__(.*?)__END_EVENT__/g
      let match
      while ((match = eventRegex.exec(chunk)) !== null) {
        try {
          const event = JSON.parse(match[1])
          events.push(event)
          text = text.replace(match[0], '')
        } catch {
          // Invalid JSON, skip
        }
      }

      return { text: text.replace(/\n{3,}/g, '\n\n'), events }
    }

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // If using JSONL mode, save the assistant response
              if (convId) {
                appendMessage(convId, {
                  role: 'assistant',
                  content: fullResponse,
                  model: toModelId(backend),
                  metadata: {
                    cwd
                  }
                })
              }

              // Send done event with conversation metadata and usage
              const doneData = JSON.stringify({
                done: true,
                conversationId: convId,
                model: backend,
                claudeSessionId: getSessionId?.() || undefined,
                usage: capturedUsage
              })
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
              controller.close()
              break
            }

            // Parse out Claude events (usage, tool use, etc.) from the stream
            const { text, events } = parseClaudeEvents(value)

            // Capture usage from done events
            for (const event of events) {
              if (event.type === 'done' && event.usage) {
                capturedUsage = event.usage
              }
            }

            // Accumulate clean text for JSONL storage (without event markers)
            if (text) {
              fullResponse += text
            }

            // Send content chunk with RAW value (preserving event markers for client-side parsing)
            // The client needs the event markers to render tool uses
            if (value) {
              const data = JSON.stringify({
                content: value,
                done: false,
                model: backend,
                conversationId: convId
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
        } catch (error) {
          // Send error event
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const data = JSON.stringify({ error: errorMessage, done: true })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
