# Codex MCP Server Integration

Reference implementation for persistent multi-turn Codex chat using `codex mcp-server`.

> Source: ChatGPT research session (Jan 2026)

## Overview

Codex CLI can run as an MCP server (`codex mcp-server`) exposing two tools:
- `codex()` - start a conversation, returns conversationId
- `codex-reply()` - continue conversation with conversationId

This gives session continuity without re-sending history (like Claude's `--resume`).

## Known Limitation

**GitHub issue #8580**: `codex()` tool does NOT reliably return `conversationId`, which breaks `codex-reply()`.

Fallback: Keep one process per chat alive (session stays in-memory).

## MCP Client Wrapper

```typescript
// lib/ai/codex-mcp.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

export type CodexSession = {
  client: Client;
  transport: StdioClientTransport;
  conversationId?: string;
  tools?: { codex: string; codexReply: string };
  lastUsedAt: number;
};

export async function startCodexMcpServer(): Promise<CodexSession> {
  const transport = new StdioClientTransport({
    command: "codex",
    args: ["mcp-server"],
  });

  const client = new Client(
    { name: "ai-workspace", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  return {
    client,
    transport,
    lastUsedAt: Date.now(),
  };
}

export async function discoverCodexTools(session: CodexSession) {
  const resp = await session.client.request(
    { method: "tools/list" },
    ListToolsResultSchema
  );

  const names = resp.tools.map((t) => t.name);

  // Be tolerant: find by substring to survive renames
  const codex = resp.tools.find((t) => t.name === "codex")?.name
    ?? resp.tools.find((t) =>
        t.name.toLowerCase().includes("codex") &&
        !t.name.toLowerCase().includes("reply")
       )?.name;

  const codexReply = resp.tools.find((t) => t.name === "codex-reply")?.name
    ?? resp.tools.find((t) => t.name.toLowerCase().includes("reply"))?.name;

  if (!codex || !codexReply) {
    throw new Error(`Could not find codex tools. tools/list returned: ${names.join(", ")}`);
  }

  session.tools = { codex, codexReply };
  return resp.tools;
}

function extractText(result: any): string {
  const blocks = result?.content ?? result?.result?.content ?? [];
  const texts = Array.isArray(blocks)
    ? blocks
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
    : [];
  return texts.join("");
}

function extractConversationId(result: any): string | undefined {
  // Codex currently may omit this due to known issues
  return (
    result?.conversationId ??
    result?.conversation_id ??
    result?.result?.conversationId ??
    result?.result?.conversation_id ??
    result?.structured_content?.conversationId ??
    result?.structured_content?.conversation_id
  );
}

export async function codexFirstTurn(session: CodexSession, userMessage: string) {
  if (!session.tools) await discoverCodexTools(session);

  // Input schema may vary - check tools/list inputSchema
  const args = { prompt: userMessage };

  const res = await session.client.request(
    {
      method: "tools/call",
      params: { name: session.tools!.codex, arguments: args }
    },
    CallToolResultSchema
  );

  const text = extractText(res);
  const conversationId = extractConversationId(res);
  if (conversationId) session.conversationId = conversationId;

  session.lastUsedAt = Date.now();
  return { text, conversationId, raw: res };
}

export async function codexReply(session: CodexSession, userMessage: string) {
  if (!session.tools) await discoverCodexTools(session);

  if (!session.conversationId) {
    throw new Error(
      "Missing conversationId; cannot call codex-reply (known Codex MCP server limitation)."
    );
  }

  const args = { conversationId: session.conversationId, prompt: userMessage };

  const res = await session.client.request(
    {
      method: "tools/call",
      params: { name: session.tools!.codexReply, arguments: args }
    },
    CallToolResultSchema
  );

  const text = extractText(res);
  session.lastUsedAt = Date.now();
  return { text, raw: res };
}

export async function stopCodexSession(session: CodexSession) {
  try { await session.client.close(); } catch {}
  try { await session.transport.close(); } catch {}
}
```

## Next.js API Route (SSE Streaming)

```typescript
// app/api/ai/chat/codex-mcp/route.ts
import { NextRequest } from "next/server";
import {
  CodexSession,
  startCodexMcpServer,
  codexFirstTurn,
  codexReply,
  stopCodexSession,
  discoverCodexTools,
} from "@/lib/ai/codex-mcp";

export const runtime = "nodejs";

// In-memory session map (swap with Redis for horizontal scaling)
const sessions = new Map<string, CodexSession>();

function sseFormat(event: string, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function getOrCreateSession(conversationKey: string): Promise<CodexSession> {
  const existing = sessions.get(conversationKey);
  if (existing) return existing;

  const session = await startCodexMcpServer();
  await discoverCodexTools(session);
  sessions.set(conversationKey, session);
  return session;
}

export async function POST(req: NextRequest) {
  const { conversationKey, message } = await req.json() as {
    conversationKey: string;
    message: string;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start: async (controller) => {
      const send = (event: string, payload: any) =>
        controller.enqueue(encoder.encode(sseFormat(event, payload)));

      try {
        send("meta", { status: "starting" });

        const session = await getOrCreateSession(conversationKey);

        let resultText: string;

        if (!session.conversationId) {
          send("meta", { status: "first_turn" });
          const r = await codexFirstTurn(session, message);
          send("meta", { conversationId: r.conversationId ?? null });
          resultText = r.text;
        } else {
          send("meta", { status: "reply" });
          const r = await codexReply(session, message);
          resultText = r.text;
        }

        send("message", { role: "assistant", content: resultText });
        send("done", { ok: true });
      } catch (err: any) {
        send("error", { message: err?.message ?? String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
```

## Fallback Strategies

### A) Keep process alive per chat (recommended)

Don't restart the codex mcp-server process. Session stays in-memory as long as process lives.

### B) Compact history mode

If conversationId missing, fall back to summary + last N turns (similar to current `codex exec` approach but optimized).

### C) Use Codex SDK

OpenAI recommends the Codex SDK as "more comprehensive and flexible than non-interactive mode" for true multi-turn chat.

## Operational Tips

1. **Log tool schemas**: Run `tools/list` once to see exact input schema (might be `prompt`, `input`, or `message`)
2. **Process lifecycle**: Codex mcp-server exits when client closes - keep connection open for chat lifetime
3. **Rate limits**: Implement retry with backoff; fallback to `gpt-5.1-codex-mini` under pressure
4. **Idle timeout**: Kill sessions after 15-60 min inactive; can rehydrate with compact summary

## References

- [Codex MCP Server docs](https://developers.openai.com/codex/guides/agents-sdk/)
- [GitHub issue #8580 - conversationId bug](https://github.com/openai/codex/issues/8580)
- [MCP Node client tutorial](https://modelcontextprotocol.info/docs/tutorials/building-a-client-node/)
