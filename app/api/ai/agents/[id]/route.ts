import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { AgentCard, CreateAgentInput } from '@/lib/agents/types'
import { loadAgentFromDirectory } from '@/lib/agents/loader'

const AGENTS_DIR = path.join(process.cwd(), 'agents')

/**
 * Parse agent ID to get directory name
 * IDs are formatted as: file-{slug}-{index}
 */
function parseAgentId(id: string): string | null {
  // Handle file-based agent IDs: file-{slug}-{index}
  if (id.startsWith('file-')) {
    const parts = id.split('-')
    // Remove 'file' prefix and numeric suffix
    parts.shift() // remove 'file'
    parts.pop() // remove index
    return parts.join('-')
  }
  // Handle direct slug
  return id
}

/**
 * Find agent directory by name/slug
 */
function findAgentDirectory(idOrSlug: string): string | null {
  const slug = parseAgentId(idOrSlug)
  if (!slug) return null

  // Check if directory exists directly
  const directPath = path.join(AGENTS_DIR, slug)
  if (fs.existsSync(directPath) && fs.statSync(directPath).isDirectory()) {
    return directPath
  }

  // Search for matching directory
  if (!fs.existsSync(AGENTS_DIR)) return null

  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirSlug = entry.name.toLowerCase()
      if (dirSlug === slug || dirSlug.includes(slug)) {
        return path.join(AGENTS_DIR, entry.name)
      }
    }
  }

  return null
}

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
    const agentDir = findAgentDirectory(id)

    if (!agentDir) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    const agentInput = await loadAgentFromDirectory(agentDir)
    if (!agentInput) {
      return NextResponse.json(
        { error: 'Failed to load agent' },
        { status: 500 }
      )
    }

    const agent: AgentCard = {
      ...agentInput,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    const body: CreateAgentInput = await request.json()
    const agentDir = findAgentDirectory(id)

    if (!agentDir) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Update CLAUDE.md (system prompt)
    const claudeMdPath = path.join(agentDir, 'CLAUDE.md')
    fs.writeFileSync(claudeMdPath, body.system_prompt)

    // Update agent.json (configuration)
    const agentJsonPath = path.join(agentDir, 'agent.json')
    const agentConfig = {
      name: body.name,
      avatar: body.avatar,
      description: body.description,
      personality: body.personality,
      config: body.config,
      sections: body.sections,
      enabled: body.enabled,
      mcp_tools: body.mcp_tools,
      selectors: body.selectors || [],
      pluginPath: body.pluginPath,
      profileId: body.profileId,
      mode: body.mode,
      spawnCommand: body.spawnCommand,
      workingDir: body.workingDir,
    }
    fs.writeFileSync(agentJsonPath, JSON.stringify(agentConfig, null, 2))

    // Return updated agent
    const agent: AgentCard = {
      ...body,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ agent, message: 'Agent updated successfully' })
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
    const agentDir = findAgentDirectory(id)

    if (!agentDir) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Delete agent directory recursively
    fs.rmSync(agentDir, { recursive: true, force: true })

    return NextResponse.json({ message: 'Agent deleted successfully' })
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
