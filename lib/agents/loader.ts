/**
 * File-based Agent Loader
 * Loads agent configurations from the agents/ directory structure.
 *
 * Supports two formats:
 * 1. Unified format: agents/custom-agents.json (new simplified format)
 * 2. Directory format: agents/{agent-name}/agent.json + CLAUDE.md (legacy)
 *
 * Directory structure:
 * agents/
 *   ├── custom-agents.json    - Unified agent configs (new format)
 *   └── {agent-name}/
 *       ├── CLAUDE.md         - System prompt (markdown)
 *       └── agent.json        - Configuration (model, tools, selectors, etc.)
 */

import fs from 'fs'
import path from 'path'
import type { CreateAgentInput, UnifiedAgentConfig, UnifiedAgentRegistry, AgentPersonalityTrait, MCPTool, SelectorDoc, AgentConfig } from './types'

const AGENTS_DIR = path.join(process.cwd(), 'agents')
const UNIFIED_CONFIG_PATH = path.join(AGENTS_DIR, 'custom-agents.json')

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
  mode?: 'dev' | 'user'
  spawnCommand?: string[]
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
      mode: config.mode,
      spawnCommand: config.spawnCommand,
      workingDir: agentDir, // Set agent's directory for 'user' mode isolation
    }

    return agent
  } catch (error) {
    console.error(`Error loading agent from ${agentDir}:`, error)
    return null
  }
}

/**
 * Load unified agent configs from custom-agents.json
 */
export async function loadUnifiedAgents(): Promise<UnifiedAgentConfig[]> {
  if (!fs.existsSync(UNIFIED_CONFIG_PATH)) {
    return []
  }

  try {
    const content = fs.readFileSync(UNIFIED_CONFIG_PATH, 'utf-8')
    const registry: UnifiedAgentRegistry = JSON.parse(content)
    return registry.agents || []
  } catch (error) {
    console.error('Error loading unified agents config:', error)
    return []
  }
}

/**
 * Save unified agent configs to custom-agents.json
 */
export async function saveUnifiedAgents(agents: UnifiedAgentConfig[]): Promise<boolean> {
  try {
    const registry: UnifiedAgentRegistry = {
      version: 1,
      agents,
    }
    fs.writeFileSync(UNIFIED_CONFIG_PATH, JSON.stringify(registry, null, 2))
    return true
  } catch (error) {
    console.error('Error saving unified agents config:', error)
    return false
  }
}

/**
 * Convert a UnifiedAgentConfig to CreateAgentInput format
 * This loads the system prompt from CLAUDE.md in the settingsDir
 */
export async function unifiedToCreateInput(unified: UnifiedAgentConfig): Promise<CreateAgentInput> {
  // Resolve settingsDir path (can be relative to agents/ or absolute)
  const settingsDir = unified.settingsDir.startsWith('./')
    ? path.join(process.cwd(), unified.settingsDir.slice(2))
    : unified.settingsDir.startsWith('~/')
    ? path.join(process.env.HOME || '', unified.settingsDir.slice(2))
    : unified.settingsDir

  // Try to load system prompt from CLAUDE.md
  let systemPrompt = ''
  const claudeMdPath = path.join(settingsDir, 'CLAUDE.md')
  if (fs.existsSync(claudeMdPath)) {
    systemPrompt = fs.readFileSync(claudeMdPath, 'utf-8').trim()
  }

  // Try to load additional config from agent.json (for MCP tools, selectors, etc.)
  let legacyConfig: AgentJsonConfig | null = null
  const agentJsonPath = path.join(settingsDir, 'agent.json')
  if (fs.existsSync(agentJsonPath)) {
    try {
      legacyConfig = JSON.parse(fs.readFileSync(agentJsonPath, 'utf-8'))
    } catch {
      // Ignore parse errors
    }
  }

  return {
    name: unified.name,
    avatar: unified.avatar,
    description: unified.description,
    personality: (legacyConfig?.personality || ['helpful']) as AgentPersonalityTrait[],
    system_prompt: systemPrompt || `You are ${unified.name}. ${unified.description}`,
    mcp_tools: (legacyConfig?.mcp_tools || []) as MCPTool[],
    selectors: (legacyConfig?.selectors || []) as SelectorDoc[],
    config: (legacyConfig?.config || {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }) as AgentConfig,
    sections: unified.sections,
    enabled: unified.enabled,
    mode: unified.mode,
    workingDir: unified.workingDir || settingsDir,
  }
}

/**
 * Load all agents from the agents/ directory
 * Now loads from both unified config and legacy directory structure
 */
export async function loadAgentsFromFiles(): Promise<CreateAgentInput[]> {
  const agents: CreateAgentInput[] = []
  const seenIds = new Set<string>()

  // Check if agents directory exists
  if (!fs.existsSync(AGENTS_DIR)) {
    console.warn(`Agents directory not found: ${AGENTS_DIR}`)
    return agents
  }

  // 1. First, load from unified config (custom-agents.json)
  const unifiedAgents = await loadUnifiedAgents()
  for (const unified of unifiedAgents) {
    const agent = await unifiedToCreateInput(unified)
    agents.push(agent)
    // Track by name to avoid duplicates from legacy dirs
    seenIds.add(unified.id)
  }

  // 2. Then load from legacy directory structure (for backward compatibility)
  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Skip .claude and other hidden directories
      if (entry.name.startsWith('.')) continue

      // Generate ID from directory name
      const dirId = entry.name.toLowerCase().replace(/\s+/g, '-')

      // Skip if already loaded from unified config
      if (seenIds.has(dirId)) continue

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
