import { NextRequest, NextResponse } from 'next/server'
import type { AgentCard, CreateAgentInput } from '@/lib/agents/types'
import { loadAgents, saveAgents, deleteAgent } from '@/lib/agents/loader'

/**
 * GET /api/ai/agents/:id
 * Fetch a single agent by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agents = await loadAgents()
    const agent = agents.find(a => a.id === id)

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ai/agents/:id
 * Update an existing agent
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: Partial<CreateAgentInput> = await request.json()
    const agents = await loadAgents()
    const index = agents.findIndex(a => a.id === id)

    if (index === -1) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Update agent
    const now = new Date().toISOString()
    const updatedAgent: AgentCard = {
      ...agents[index],
      ...body,
      id, // Keep original ID
      updated_at: now,
    }

    agents[index] = updatedAgent
    const saved = await saveAgents(agents)

    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to save agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ agent: updatedAgent, message: 'Agent updated successfully' })
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/agents/:id
 * Delete an agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await deleteAgent(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Agent deleted successfully' })
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
