/**
 * AI Process Management API
 *
 * Provides endpoints to check status and kill tmux-managed Claude processes.
 * Used for reconnection detection and clean process termination.
 */

import { NextRequest } from 'next/server'
import { getWindowStatus, listWindows, killWindow } from '@/lib/ai/tmux-manager'

/**
 * GET /api/ai/process
 *
 * Check process status for a conversation, or list all active processes.
 *
 * Query params:
 *   - conversationId (optional): If provided, returns status for that conversation.
 *                                If omitted, lists all active processes.
 *
 * Response:
 *   With conversationId: { conversationId, hasProcess, running }
 *   Without conversationId: { processes: string[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    // If no conversationId, list all active processes
    if (!conversationId) {
      const windows = await listWindows()
      return Response.json({ processes: windows })
    }

    const status = await getWindowStatus(conversationId)

    return Response.json({
      conversationId,
      hasProcess: status.exists,
      running: status.running
    })
  } catch (error) {
    console.error('Process status error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/process
 *
 * Kill the process for a conversation.
 *
 * Query params:
 *   - conversationId (required): The conversation whose process should be killed.
 *
 * Response:
 *   { success: boolean, message: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return Response.json(
        { success: false, error: 'conversationId required' },
        { status: 400 }
      )
    }

    const killed = await killWindow(conversationId)

    return Response.json({
      success: killed,
      message: killed ? 'Process killed' : 'No active process found'
    })
  } catch (error) {
    console.error('Process kill error:', error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
