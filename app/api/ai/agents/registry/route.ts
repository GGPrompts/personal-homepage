import { NextResponse } from 'next/server'
import { loadAgentsFromFiles, getAgentsDirectoryPath } from '@/lib/agents/loader'
import type { AgentCard } from '@/lib/agents/types'

/**
 * GET /api/ai/agents/registry
 * Returns all registered agents loaded from the agents/ directory
 */
export async function GET() {
  try {
    // Load agents from file-based configuration
    const agentInputs = await loadAgentsFromFiles()

    // Convert to full AgentCard format with IDs and timestamps
    const now = new Date().toISOString()
    const agents: AgentCard[] = agentInputs.map((agent, index) => ({
      ...agent,
      id: `file-${agent.name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      created_at: now,
      updated_at: now,
    }))

    return NextResponse.json({
      agents,
      total: agents.length,
      agentsDirectory: getAgentsDirectoryPath(),
    })
  } catch (error) {
    console.error('Failed to fetch agent registry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents', agents: [] },
      { status: 500 }
    )
  }
}
