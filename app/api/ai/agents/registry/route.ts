import { NextResponse } from 'next/server'
import { SEED_AGENTS } from '@/lib/agents/seed-agents'
import type { AgentCard } from '@/lib/agents/types'

/**
 * GET /api/ai/agents/registry
 * Returns all registered agents from the seed agents and any stored agents
 */
export async function GET() {
  try {
    // Convert seed agents to full AgentCard format with IDs and timestamps
    const now = new Date().toISOString()
    const agents: AgentCard[] = SEED_AGENTS.map((agent, index) => ({
      ...agent,
      id: `seed-${agent.name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      created_at: now,
      updated_at: now,
    }))

    return NextResponse.json({
      agents,
      total: agents.length,
    })
  } catch (error) {
    console.error('Failed to fetch agent registry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents', agents: [] },
      { status: 500 }
    )
  }
}
