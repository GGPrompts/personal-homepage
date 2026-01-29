/**
 * File-based Agent Loader
 * Loads agent configurations from agents/custom-agents.json
 */

import fs from 'fs'
import path from 'path'
import type { AgentCard, AgentRegistryFile, CreateAgentInput } from './types'

const AGENTS_DIR = path.join(process.cwd(), 'agents')
const CONFIG_PATH = path.join(AGENTS_DIR, 'custom-agents.json')

/**
 * Load all agents from custom-agents.json
 */
export async function loadAgents(): Promise<AgentCard[]> {
  if (!fs.existsSync(CONFIG_PATH)) {
    return []
  }

  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const registry: AgentRegistryFile = JSON.parse(content)
    const now = new Date().toISOString()

    // Ensure all agents have required fields with defaults
    return (registry.agents || []).map(agent => ({
      ...agent,
      flags: agent.flags || [],
      created_at: agent.created_at || now,
      updated_at: agent.updated_at || now,
    }))
  } catch (error) {
    console.error('Error loading agents config:', error)
    return []
  }
}

/**
 * Save agents to custom-agents.json
 */
export async function saveAgents(agents: AgentCard[]): Promise<boolean> {
  try {
    // Ensure directory exists
    if (!fs.existsSync(AGENTS_DIR)) {
      fs.mkdirSync(AGENTS_DIR, { recursive: true })
    }

    const registry: AgentRegistryFile = {
      version: 1,
      agents,
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(registry, null, 2))
    return true
  } catch (error) {
    console.error('Error saving agents config:', error)
    return false
  }
}

/**
 * Add a new agent
 */
export async function addAgent(input: CreateAgentInput): Promise<AgentCard | null> {
  const agents = await loadAgents()

  // Generate ID from name
  const id = input.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  // Check for duplicate
  if (agents.some(a => a.id === id)) {
    console.error(`Agent with id "${id}" already exists`)
    return null
  }

  const now = new Date().toISOString()
  const agent: AgentCard = {
    ...input,
    id,
    flags: input.flags || [],
    created_at: now,
    updated_at: now,
  }

  agents.push(agent)
  const saved = await saveAgents(agents)

  return saved ? agent : null
}

/**
 * Update an existing agent
 */
export async function updateAgent(id: string, updates: Partial<CreateAgentInput>): Promise<AgentCard | null> {
  const agents = await loadAgents()
  const index = agents.findIndex(a => a.id === id)

  if (index === -1) {
    console.error(`Agent with id "${id}" not found`)
    return null
  }

  const now = new Date().toISOString()
  agents[index] = {
    ...agents[index],
    ...updates,
    updated_at: now,
  }

  const saved = await saveAgents(agents)
  return saved ? agents[index] : null
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string): Promise<boolean> {
  const agents = await loadAgents()
  const filtered = agents.filter(a => a.id !== id)

  if (filtered.length === agents.length) {
    console.error(`Agent with id "${id}" not found`)
    return false
  }

  return saveAgents(filtered)
}

/**
 * Get the path to the agents directory
 */
export function getAgentsDirectoryPath(): string {
  return AGENTS_DIR
}

/**
 * Check if agents directory exists and is valid
 */
export function isAgentsDirectoryValid(): boolean {
  return fs.existsSync(AGENTS_DIR) && fs.statSync(AGENTS_DIR).isDirectory()
}
