/**
 * AI Process Output Recovery API
 *
 * Provides endpoint to recover captured output from tmux-managed processes.
 * Used when user reconnects after being disconnected from a streaming response.
 */

import { NextRequest } from 'next/server'
import { readOutput } from '@/lib/ai/tmux-manager'

/**
 * GET /api/ai/process/output
 *
 * Recover captured output for a conversation.
 *
 * Query params:
 *   - conversationId (required): The conversation to get output for.
 *
 * Response:
 *   Success: { success: true, output: string }
 *   Not found: { success: false, error: 'No output file found' } (404)
 *   Missing param: { success: false, error: 'conversationId required' } (400)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return Response.json(
        { success: false, error: 'conversationId required' },
        { status: 400 }
      )
    }

    const output = await readOutput(conversationId)

    if (output === null) {
      return Response.json(
        { success: false, error: 'No output file found' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      output
    })
  } catch (error) {
    console.error('Output read error:', error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
