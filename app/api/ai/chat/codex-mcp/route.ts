/**
 * Codex MCP Chat API
 *
 * SSE streaming endpoint for Codex conversations using MCP server.
 * Maintains persistent sessions per conversation for true multi-turn chat.
 */

import { NextRequest } from "next/server"
import {
  getOrCreateSession,
  codexFirstTurn,
  codexReply,
  hasSession,
} from "@/lib/ai/codex-mcp"
import type { ChatSettings } from "@/lib/ai/types"

export const runtime = "nodejs"

interface CodexMcpRequest {
  conversationKey: string
  message: string
  settings?: ChatSettings
  cwd?: string
  isFirstMessage?: boolean
}

function sseFormat(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const body: CodexMcpRequest = await req.json()
  const { conversationKey, message, settings, cwd, isFirstMessage } = body

  if (!conversationKey || !message) {
    return new Response(
      JSON.stringify({ error: "conversationKey and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start: async (controller) => {
      const send = (event: string, payload: unknown) =>
        controller.enqueue(encoder.encode(sseFormat(event, payload)))

      try {
        send("meta", { status: "starting" })

        const session = await getOrCreateSession(conversationKey, settings, cwd)

        let resultText: string

        // Determine if this is the first turn in this session
        const isFirst = isFirstMessage || !session.conversationId

        if (isFirst && !hasSession(conversationKey)) {
          // Brand new session - first turn
          send("meta", { status: "first_turn" })
          const r = await codexFirstTurn(session, message)
          send("meta", { conversationId: r.conversationId ?? null })
          resultText = r.text
        } else if (!session.conversationId) {
          // Session exists but no conversationId (fallback mode)
          send("meta", { status: "fallback_turn" })
          const r = await codexFirstTurn(session, message)
          send("meta", { conversationId: r.conversationId ?? null })
          resultText = r.text
        } else {
          // Continue with existing conversation
          send("meta", { status: "reply" })
          const r = await codexReply(session, message)
          resultText = r.text
        }

        // Stream the response in chunks for better UX
        // Codex returns full response at once, so we simulate streaming
        const chunks = splitIntoChunks(resultText, 50)
        for (const chunk of chunks) {
          send("chunk", { content: chunk })
          // Small delay for streaming effect
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        send("message", { role: "assistant", content: resultText })
        send("done", { ok: true })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error("Codex MCP error:", errorMessage)
        send("error", { message: errorMessage })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  })
}

/**
 * Split text into chunks for simulated streaming
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * GET endpoint for session status
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversationKey = searchParams.get("conversationKey")

  if (!conversationKey) {
    return new Response(
      JSON.stringify({ error: "conversationKey is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({
      hasSession: hasSession(conversationKey),
    }),
    { headers: { "Content-Type": "application/json" } }
  )
}
