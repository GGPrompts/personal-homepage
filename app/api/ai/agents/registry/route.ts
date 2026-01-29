import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { loadAgentsFromFiles, getAgentsDirectoryPath } from '@/lib/agents/loader'
import type { AgentCard, CreateAgentInput } from '@/lib/agents/types'

const AGENTS_DIR = path.join(process.cwd(), 'agents')

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

/**
 * POST /api/ai/agents/registry
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentInput = await request.json()

    // Validate required fields
    if (!body.name || !body.description || !body.system_prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, system_prompt' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const agentDir = path.join(AGENTS_DIR, slug)

    // Check if agent already exists
    if (fs.existsSync(agentDir)) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      )
    }

    // Create agents directory if it doesn't exist
    if (!fs.existsSync(AGENTS_DIR)) {
      fs.mkdirSync(AGENTS_DIR, { recursive: true })
    }

    // Create agent directory
    fs.mkdirSync(agentDir, { recursive: true })

    // Write CLAUDE.md (system prompt)
    const claudeMdPath = path.join(agentDir, 'CLAUDE.md')
    fs.writeFileSync(claudeMdPath, body.system_prompt)

    // Write agent.json (configuration)
    const agentJsonPath = path.join(agentDir, 'agent.json')
    const agentConfig = {
      name: body.name,
      avatar: body.avatar || '🤖',
      description: body.description,
      personality: body.personality || ['helpful'],
      config: body.config || {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      },
      sections: body.sections || [],
      enabled: body.enabled ?? true,
      mcp_tools: body.mcp_tools || [],
      selectors: body.selectors || [],
      pluginPath: body.pluginPath,
      profileId: body.profileId,
      mode: body.mode,
      spawnCommand: body.spawnCommand,
      workingDir: body.workingDir,
    }
    fs.writeFileSync(agentJsonPath, JSON.stringify(agentConfig, null, 2))

    // Return created agent
    const now = new Date().toISOString()
    const agent: AgentCard = {
      ...body,
      id: `file-${slug}-0`,
      created_at: now,
      updated_at: now,
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
