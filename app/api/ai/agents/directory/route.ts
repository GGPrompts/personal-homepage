import { NextResponse } from 'next/server'
import { getAgentsDirectoryPath, isAgentsDirectoryValid, loadAgents } from '@/lib/agents/loader'

/**
 * GET /api/ai/agents/directory
 * Returns information about the agents directory for file management
 */
export async function GET() {
  try {
    const directoryPath = getAgentsDirectoryPath()
    const isValid = isAgentsDirectoryValid()
    const agents = await loadAgents()

    return NextResponse.json({
      path: directoryPath,
      isValid,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        enabled: a.enabled,
      })),
      total: agents.length,
    })
  } catch (error) {
    console.error('Failed to get agents directory info:', error)
    return NextResponse.json(
      { error: 'Failed to get agents directory info', path: null },
      { status: 500 }
    )
  }
}
