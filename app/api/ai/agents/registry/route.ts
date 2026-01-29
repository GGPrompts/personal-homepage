import { NextRequest, NextResponse } from 'next/server'
import { loadAgents, saveAgents, getAgentsDirectoryPath } from '@/lib/agents/loader'
import type { AgentCard, CreateAgentInput } from '@/lib/agents/types'

/**
 * GET /api/ai/agents/registry
 * Returns all registered agents
 */
export async function GET() {
  try {
    const agents = await loadAgents()

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

/**
 * POST /api/ai/agents/registry
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentInput = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Generate ID from name
    const id = body.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    // Load existing agents
    const existingAgents = await loadAgents()

    // Check if agent with this ID already exists
    if (existingAgents.some(a => a.id === id)) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      )
    }

    // Create new agent
    const now = new Date().toISOString()
    const agent: AgentCard = {
      id,
      name: body.name,
      avatar: body.avatar || '',
      description: body.description || '',
      backend: body.backend || 'claude',
      flags: body.flags || [],
      workingDir: body.workingDir || null,
      pluginPath: body.pluginPath,
      sections: body.sections || [],
      enabled: body.enabled ?? true,
      mode: body.mode,
      category: body.category,
      suggestedPrompts: body.suggestedPrompts,
      created_at: now,
      updated_at: now,
    }

    // Add to existing agents and save
    const updatedAgents = [...existingAgents, agent]
    const saved = await saveAgents(updatedAgents)

    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to save agent configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { agent, message: 'Agent created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
