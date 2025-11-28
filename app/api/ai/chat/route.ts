/**
 * AI Chat API
 * Handles chat requests with streaming responses
 */

import { NextRequest } from 'next/server'
import { streamClaude } from '@/lib/ai/claude'
import { streamDockerModel } from '@/lib/ai/docker'
import { streamMock } from '@/lib/ai/mock'
import type { ChatRequest } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    const { messages, backend, model, settings, cwd } = body

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the appropriate stream based on backend
    let stream: ReadableStream<string>

    try {
      if (backend === 'claude') {
        stream = await streamClaude(messages, settings, cwd)
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
    } catch (error) {
      console.error('Backend error, falling back to mock:', error)
      // Fallback to mock if the selected backend fails
      stream = await streamMock(messages)
    }

    // Convert to SSE (Server-Sent Events) format
    const encoder = new TextEncoder()
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // Send done event
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            // Send content chunk
            const data = JSON.stringify({ content: value, done: false })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
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
