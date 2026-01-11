/**
 * Codex MCP Server Integration
 *
 * Uses `codex mcp-server` for persistent multi-turn chat sessions.
 * Keeps one process per conversation alive (session stays in-memory).
 *
 * Known limitation: GitHub issue #8580 - conversationId may not reliably
 * be returned, so we keep the process alive per chat as a fallback.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { ListToolsResultSchema, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js"
import type { ChatSettings } from './types'

// Session state for a Codex MCP connection
export interface CodexSession {
  client: Client
  transport: StdioClientTransport
  conversationId?: string
  tools?: { codex: string; codexReply: string }
  lastUsedAt: number
  model?: string
  cwd?: string
}

// In-memory session store (keyed by conversation ID)
const sessions = new Map<string, CodexSession>()

// Idle timeout (15 minutes)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000

/**
 * Start a new Codex MCP server process
 */
export async function startCodexMcpServer(
  model?: string,
  cwd?: string
): Promise<CodexSession> {
  const args = ["mcp-server"]

  // Add model flag if specified
  if (model && model !== 'default') {
    args.push("-m", model)
  }

  const transport = new StdioClientTransport({
    command: "codex",
    args,
    cwd: cwd || process.cwd(),
    env: process.env as Record<string, string>,
  })

  const client = new Client(
    { name: "ai-workspace", version: "1.0.0" },
    { capabilities: {} }
  )

  await client.connect(transport)

  return {
    client,
    transport,
    lastUsedAt: Date.now(),
    model,
    cwd,
  }
}

/**
 * Discover available tools from the Codex MCP server
 */
export async function discoverCodexTools(session: CodexSession) {
  const resp = await session.client.request(
    { method: "tools/list" },
    ListToolsResultSchema
  )

  const names = resp.tools.map((t) => t.name)

  // Be tolerant: find by substring to survive renames
  const codex = resp.tools.find((t) => t.name === "codex")?.name
    ?? resp.tools.find((t) =>
        t.name.toLowerCase().includes("codex") &&
        !t.name.toLowerCase().includes("reply")
       )?.name

  const codexReply = resp.tools.find((t) => t.name === "codex-reply")?.name
    ?? resp.tools.find((t) => t.name.toLowerCase().includes("reply"))?.name

  if (!codex || !codexReply) {
    throw new Error(`Could not find codex tools. tools/list returned: ${names.join(", ")}`)
  }

  session.tools = { codex, codexReply }
  return resp.tools
}

/**
 * Extract text content from MCP tool response
 */
function extractText(result: unknown): string {
  const r = result as Record<string, unknown>
  const blocks = r?.content ?? (r?.result as Record<string, unknown>)?.content ?? []
  const texts = Array.isArray(blocks)
    ? blocks
        .filter((b): b is { type: string; text: string } =>
          typeof b === 'object' && b !== null &&
          (b as Record<string, unknown>)?.type === "text" &&
          typeof (b as Record<string, unknown>)?.text === "string"
        )
        .map((b) => b.text)
    : []
  return texts.join("")
}

/**
 * Extract conversationId from response (may not be reliably present - issue #8580)
 */
function extractConversationId(result: unknown): string | undefined {
  const r = result as Record<string, unknown>
  const res = r?.result as Record<string, unknown> | undefined
  const sc = r?.structured_content as Record<string, unknown> | undefined

  return (
    r?.conversationId as string ??
    r?.conversation_id as string ??
    res?.conversationId as string ??
    res?.conversation_id as string ??
    sc?.conversationId as string ??
    sc?.conversation_id as string
  )
}

/**
 * Send first message to start a conversation
 */
export async function codexFirstTurn(
  session: CodexSession,
  userMessage: string
): Promise<{ text: string; conversationId?: string; raw: unknown }> {
  if (!session.tools) await discoverCodexTools(session)

  // Input schema may vary - check tools/list inputSchema
  const args = { prompt: userMessage }

  const res = await session.client.request(
    {
      method: "tools/call",
      params: { name: session.tools!.codex, arguments: args }
    },
    CallToolResultSchema
  )

  const text = extractText(res)
  const conversationId = extractConversationId(res)
  if (conversationId) session.conversationId = conversationId

  session.lastUsedAt = Date.now()
  return { text, conversationId, raw: res }
}

/**
 * Send follow-up message to continue conversation
 */
export async function codexReply(
  session: CodexSession,
  userMessage: string
): Promise<{ text: string; raw: unknown }> {
  if (!session.tools) await discoverCodexTools(session)

  // If we have a conversationId, use codex-reply
  if (session.conversationId) {
    const args = { conversationId: session.conversationId, prompt: userMessage }

    const res = await session.client.request(
      {
        method: "tools/call",
        params: { name: session.tools!.codexReply, arguments: args }
      },
      CallToolResultSchema
    )

    const text = extractText(res)
    session.lastUsedAt = Date.now()
    return { text, raw: res }
  }

  // Fallback: no conversationId (known Codex limitation)
  // The session state is still in-memory in the process
  // Just call codex() again - context is preserved in the process
  const args = { prompt: userMessage }

  const res = await session.client.request(
    {
      method: "tools/call",
      params: { name: session.tools!.codex, arguments: args }
    },
    CallToolResultSchema
  )

  const text = extractText(res)
  session.lastUsedAt = Date.now()
  return { text, raw: res }
}

/**
 * Stop and cleanup a Codex session
 */
export async function stopCodexSession(session: CodexSession) {
  try { await session.client.close() } catch { /* ignore */ }
  try { await session.transport.close() } catch { /* ignore */ }
}

/**
 * Get or create a session for a conversation
 */
export async function getOrCreateSession(
  conversationKey: string,
  settings?: ChatSettings,
  cwd?: string
): Promise<CodexSession> {
  const existing = sessions.get(conversationKey)
  if (existing) {
    existing.lastUsedAt = Date.now()
    return existing
  }

  const model = settings?.codexModel
  const session = await startCodexMcpServer(model, cwd)
  await discoverCodexTools(session)
  sessions.set(conversationKey, session)
  return session
}

/**
 * Check if a session exists for a conversation
 */
export function hasSession(conversationKey: string): boolean {
  return sessions.has(conversationKey)
}

/**
 * Remove a session from the store
 */
export async function removeSession(conversationKey: string): Promise<void> {
  const session = sessions.get(conversationKey)
  if (session) {
    await stopCodexSession(session)
    sessions.delete(conversationKey)
  }
}

/**
 * Cleanup idle sessions (call periodically)
 */
export async function cleanupIdleSessions(): Promise<number> {
  const now = Date.now()
  const toRemove: string[] = []

  for (const [key, session] of sessions.entries()) {
    if (now - session.lastUsedAt > IDLE_TIMEOUT_MS) {
      toRemove.push(key)
    }
  }

  for (const key of toRemove) {
    await removeSession(key)
  }

  return toRemove.length
}

/**
 * Get session count (for monitoring)
 */
export function getSessionCount(): number {
  return sessions.size
}

// Periodic cleanup every 5 minutes
setInterval(() => {
  cleanupIdleSessions().then(count => {
    if (count > 0) {
      console.log(`Cleaned up ${count} idle Codex sessions`)
    }
  }).catch(console.error)
}, 5 * 60 * 1000)
