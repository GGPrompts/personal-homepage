import { NextRequest, NextResponse } from "next/server"
import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

export const dynamic = "force-dynamic"

export interface AgentConfig {
  name: string
  avatar?: string
  description?: string
  personality?: string[]
  config?: {
    model?: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }
  sections?: string[]
  enabled?: boolean
  mcp_tools?: Array<{
    name: string
    description?: string
    permission?: string
    server?: string
  }>
}

export interface ProjectAgent {
  folder: string
  config: AgentConfig | null
  claudePreview: string | null
  hasAvatar: boolean
  error?: string
}

function readAgentFolder(agentPath: string, folderName: string): ProjectAgent {
  const agent: ProjectAgent = {
    folder: folderName,
    config: null,
    claudePreview: null,
    hasAvatar: false,
  }

  // Check for agent.json
  const agentJsonPath = join(agentPath, "agent.json")
  if (existsSync(agentJsonPath)) {
    try {
      const content = readFileSync(agentJsonPath, "utf-8")
      agent.config = JSON.parse(content)
    } catch (error) {
      agent.error = `Failed to parse agent.json: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }

  // Check for CLAUDE.md
  const claudeMdPath = join(agentPath, "CLAUDE.md")
  if (existsSync(claudeMdPath)) {
    try {
      const content = readFileSync(claudeMdPath, "utf-8")
      // Get first 500 characters as preview
      agent.claudePreview = content.slice(0, 500) + (content.length > 500 ? "..." : "")
    } catch {
      // Ignore read errors
    }
  }

  // Check for avatar
  const avatarExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]
  agent.hasAvatar = avatarExtensions.some((ext) =>
    existsSync(join(agentPath, `avatar${ext}`))
  )

  return agent
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectPath = searchParams.get("project")

  if (!projectPath) {
    return NextResponse.json(
      { error: "Missing 'project' parameter (project path required)" },
      { status: 400 }
    )
  }

  // The projectPath should be the full local path to the project
  const agentsDir = join(projectPath, "agents")

  // Check if agents directory exists
  if (!existsSync(agentsDir)) {
    return NextResponse.json({
      agents: [],
      count: 0,
      hasAgentsDir: false,
      projectPath,
    })
  }

  // Check if it's a directory
  try {
    const stat = statSync(agentsDir)
    if (!stat.isDirectory()) {
      return NextResponse.json({
        agents: [],
        count: 0,
        hasAgentsDir: false,
        projectPath,
        error: "'agents' exists but is not a directory",
      })
    }
  } catch {
    return NextResponse.json({
      agents: [],
      count: 0,
      hasAgentsDir: false,
      projectPath,
    })
  }

  try {
    const agents: ProjectAgent[] = []
    const entries = readdirSync(agentsDir)

    for (const entry of entries) {
      // Skip hidden directories
      if (entry.startsWith(".")) continue

      const agentPath = join(agentsDir, entry)

      // Only process directories
      try {
        const stat = statSync(agentPath)
        if (!stat.isDirectory()) continue
      } catch {
        continue
      }

      const agent = readAgentFolder(agentPath, entry)

      // Only include if it has either agent.json or CLAUDE.md
      if (agent.config || agent.claudePreview) {
        agents.push(agent)
      }
    }

    // Sort by name
    agents.sort((a, b) => {
      const nameA = a.config?.name || a.folder
      const nameB = b.config?.name || b.folder
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json({
      agents,
      count: agents.length,
      hasAgentsDir: true,
      projectPath,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to scan agents"
    console.error("Agents scan error:", message)
    return NextResponse.json(
      { error: message, agents: [], projectPath },
      { status: 500 }
    )
  }
}
