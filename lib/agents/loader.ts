/**
 * File-based Agent Loader
 * Loads agent configurations from the agents/ directory structure.
 *
 * Directory structure:
 * agents/
 *   └── {agent-name}/
 *       ├── CLAUDE.md    - System prompt (markdown)
 *       └── agent.json   - Configuration (model, tools, selectors, etc.)
 */

import fs from 'fs'
import path from 'path'
import type { CreateAgentInput } from './types'

const AGENTS_DIR = path.join(process.cwd(), 'agents')

/**
 * Agent configuration from agent.json (without system_prompt)
 */
interface AgentJsonConfig {
  name: string
  avatar: string
  description: string
  personality: string[]
  config: {
    model: string
    temperature: number
    max_tokens: number
    stream?: boolean
    timeout_ms?: number
  }
  sections?: string[]
  enabled: boolean
  mcp_tools: Array<{
    name: string
    description: string
    permission: 'read' | 'write' | 'execute'
    server?: string
  }>
  selectors: Array<{
    selector: string
    description: string
    action_type: string
    section?: string
    example?: string
  }>
  pluginPath?: string
  profileId?: string
}

/**
 * Load a single agent from its directory
 */
export async function loadAgentFromDirectory(agentDir: string): Promise<CreateAgentInput | null> {
  const claudeMdPath = path.join(agentDir, 'CLAUDE.md')
  const agentJsonPath = path.join(agentDir, 'agent.json')

  // Check if both files exist
  if (!fs.existsSync(claudeMdPath) || !fs.existsSync(agentJsonPath)) {
    console.warn(`Agent directory ${agentDir} missing CLAUDE.md or agent.json`)
    return null
  }

  try {
    // Read system prompt from CLAUDE.md
    const systemPrompt = fs.readFileSync(claudeMdPath, 'utf-8').trim()

    // Read configuration from agent.json
    const configJson = fs.readFileSync(agentJsonPath, 'utf-8')
    const config: AgentJsonConfig = JSON.parse(configJson)

    // Combine into CreateAgentInput
    const agent: CreateAgentInput = {
      name: config.name,
      avatar: config.avatar,
      description: config.description,
      personality: config.personality as any[],
      system_prompt: systemPrompt,
      mcp_tools: config.mcp_tools as any[],
      selectors: config.selectors as any[],
      config: config.config as any,
      sections: config.sections,
      enabled: config.enabled,
      pluginPath: config.pluginPath,
      profileId: config.profileId,
    }

    return agent
  } catch (error) {
    console.error(`Error loading agent from ${agentDir}:`, error)
    return null
  }
}

/**
 * Load all agents from the agents/ directory
 */
export async function loadAgentsFromFiles(): Promise<CreateAgentInput[]> {
  const agents: CreateAgentInput[] = []

  // Check if agents directory exists
  if (!fs.existsSync(AGENTS_DIR)) {
    console.warn(`Agents directory not found: ${AGENTS_DIR}`)
    return agents
  }

  // Read all subdirectories
  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const agentDir = path.join(AGENTS_DIR, entry.name)
      const agent = await loadAgentFromDirectory(agentDir)
      if (agent) {
        agents.push(agent)
      }
    }
  }

  return agents
}

/**
 * Get the path to the agents directory
 */
export function getAgentsDirectoryPath(): string {
  return AGENTS_DIR
}

/**
 * Get list of available agent directories with metadata
 */
export async function listAgentDirectories(): Promise<Array<{
  name: string
  path: string
  hasClaudeMd: boolean
  hasAgentJson: boolean
}>> {
  if (!fs.existsSync(AGENTS_DIR)) {
    return []
  }

  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
  const directories: Array<{
    name: string
    path: string
    hasClaudeMd: boolean
    hasAgentJson: boolean
  }> = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = path.join(AGENTS_DIR, entry.name)
      directories.push({
        name: entry.name,
        path: dirPath,
        hasClaudeMd: fs.existsSync(path.join(dirPath, 'CLAUDE.md')),
        hasAgentJson: fs.existsSync(path.join(dirPath, 'agent.json')),
      })
    }
  }

  return directories
}

/**
 * Check if agents directory exists and is valid
 */
export function isAgentsDirectoryValid(): boolean {
  return fs.existsSync(AGENTS_DIR) && fs.statSync(AGENTS_DIR).isDirectory()
}

/**
 * Create a new agent directory with template files
 */
export async function createAgentTemplate(agentName: string): Promise<string> {
  const slug = agentName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const agentDir = path.join(AGENTS_DIR, slug)

  if (fs.existsSync(agentDir)) {
    throw new Error(`Agent directory already exists: ${slug}`)
  }

  // Create directory
  fs.mkdirSync(agentDir, { recursive: true })

  // Create template CLAUDE.md
  const claudeMd = `# ${agentName}

You are ${agentName} for a personal dashboard.

Your role is to help users with [describe the agent's purpose].

## Capabilities

- [Capability 1]
- [Capability 2]
- [Capability 3]

## Page Interaction

When interacting with the page:
- [Interaction guideline 1]
- [Interaction guideline 2]

## Guidelines

[Additional guidelines for the agent's behavior]
`

  // Create template agent.json
  const agentJson: AgentJsonConfig = {
    name: agentName,
    avatar: "🤖",
    description: `[Description of ${agentName}]`,
    personality: ["helpful", "concise"],
    config: {
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 1024,
      stream: true
    },
    sections: [],
    enabled: true,
    mcp_tools: [],
    selectors: []
  }

  fs.writeFileSync(path.join(agentDir, 'CLAUDE.md'), claudeMd)
  fs.writeFileSync(path.join(agentDir, 'agent.json'), JSON.stringify(agentJson, null, 2))

  return agentDir
}
