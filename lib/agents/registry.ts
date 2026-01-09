/**
 * Agent Registry - Manages AgentCard configurations with MCP tool access control.
 *
 * Provides in-memory storage with optional persistence via callbacks.
 * Supports filtering agents by MCP tool access and capability queries.
 */

import {
  AgentCard,
  AgentType,
  MCPToolPattern,
  agentHasMCPToolAccess,
  filterMCPToolsForAgent,
} from './types'

/**
 * Storage adapter interface for persisting agent cards.
 */
export interface AgentStorageAdapter {
  load(): Promise<AgentCard[]>
  save(agents: AgentCard[]): Promise<void>
}

/**
 * Options for creating an agent registry.
 */
export interface AgentRegistryOptions {
  /** Optional storage adapter for persistence */
  storage?: AgentStorageAdapter
  /** Initial agents to populate the registry */
  initialAgents?: AgentCard[]
}

/**
 * AgentRegistry manages a collection of AgentCard configurations.
 *
 * Features:
 * - CRUD operations for agent cards
 * - MCP tool access queries
 * - Filtering by capabilities
 * - Optional persistence via storage adapter
 */
export class AgentRegistry {
  private agents: Map<string, AgentCard> = new Map()
  private storage?: AgentStorageAdapter
  private initialized = false

  constructor(options: AgentRegistryOptions = {}) {
    this.storage = options.storage

    // Load initial agents
    if (options.initialAgents) {
      for (const agent of options.initialAgents) {
        this.agents.set(agent.id, agent)
      }
    }
  }

  /**
   * Initialize the registry, loading from storage if available.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    if (this.storage) {
      const loaded = await this.storage.load()
      for (const agent of loaded) {
        this.agents.set(agent.id, agent)
      }
    }

    this.initialized = true
  }

  /**
   * Save current state to storage if available.
   */
  private async persist(): Promise<void> {
    if (this.storage) {
      await this.storage.save(Array.from(this.agents.values()))
    }
  }

  /**
   * Get all registered agents.
   */
  getAll(): AgentCard[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get all enabled agents.
   */
  getEnabled(): AgentCard[] {
    return this.getAll().filter((agent) => agent.isEnabled !== false)
  }

  /**
   * Get an agent by ID.
   */
  get(id: string): AgentCard | undefined {
    return this.agents.get(id)
  }

  /**
   * Get agents by base type.
   */
  getByType(type: AgentType): AgentCard[] {
    return this.getAll().filter((agent) => agent.baseType === type)
  }

  /**
   * Register a new agent card.
   */
  async register(agent: AgentCard): Promise<void> {
    const now = new Date()
    const card: AgentCard = {
      ...agent,
      createdAt: agent.createdAt ?? now,
      updatedAt: now,
    }
    this.agents.set(card.id, card)
    await this.persist()
  }

  /**
   * Update an existing agent card.
   */
  async update(id: string, updates: Partial<AgentCard>): Promise<AgentCard | undefined> {
    const existing = this.agents.get(id)
    if (!existing) return undefined

    const updated: AgentCard = {
      ...existing,
      ...updates,
      id, // Prevent ID change
      updatedAt: new Date(),
    }
    this.agents.set(id, updated)
    await this.persist()
    return updated
  }

  /**
   * Remove an agent card.
   */
  async remove(id: string): Promise<boolean> {
    const deleted = this.agents.delete(id)
    if (deleted) {
      await this.persist()
    }
    return deleted
  }

  /**
   * Set MCP tool patterns for an agent.
   */
  async setMCPTools(id: string, mcpTools: MCPToolPattern[]): Promise<AgentCard | undefined> {
    return this.update(id, { mcpTools })
  }

  /**
   * Add MCP tool patterns to an agent.
   */
  async addMCPTools(id: string, patterns: MCPToolPattern[]): Promise<AgentCard | undefined> {
    const agent = this.agents.get(id)
    if (!agent) return undefined

    const existing = agent.mcpTools ?? []
    const unique = [...new Set([...existing, ...patterns])]
    return this.update(id, { mcpTools: unique })
  }

  /**
   * Remove MCP tool patterns from an agent.
   */
  async removeMCPTools(id: string, patterns: MCPToolPattern[]): Promise<AgentCard | undefined> {
    const agent = this.agents.get(id)
    if (!agent) return undefined

    const existing = agent.mcpTools ?? []
    const filtered = existing.filter((p) => !patterns.includes(p))
    return this.update(id, { mcpTools: filtered })
  }

  /**
   * Check if an agent has access to a specific MCP tool.
   */
  hasToolAccess(agentId: string, tool: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    return agentHasMCPToolAccess(agent, tool)
  }

  /**
   * Get all agents that have access to a specific MCP tool.
   */
  getAgentsWithToolAccess(tool: string): AgentCard[] {
    return this.getEnabled().filter((agent) => agentHasMCPToolAccess(agent, tool))
  }

  /**
   * Get the list of MCP tools an agent can access from a given list.
   */
  getAccessibleTools(agentId: string, availableTools: string[]): string[] {
    const agent = this.agents.get(agentId)
    if (!agent) return []
    return filterMCPToolsForAgent(agent, availableTools)
  }

  /**
   * Find agents that have a specific skill.
   */
  getAgentsWithSkill(skill: string): AgentCard[] {
    return this.getEnabled().filter(
      (agent) => agent.skills?.includes(skill)
    )
  }

  /**
   * Find agents that can spawn a specific subagent type.
   */
  getAgentsWithSubagent(subagent: string): AgentCard[] {
    return this.getEnabled().filter(
      (agent) => agent.subagents?.includes(subagent)
    )
  }

  /**
   * Get a summary of all MCP tools used across all agents.
   */
  getMCPToolSummary(): Map<string, string[]> {
    const summary = new Map<string, string[]>()

    for (const agent of this.getAll()) {
      if (agent.mcpTools) {
        for (const pattern of agent.mcpTools) {
          const agentIds = summary.get(pattern) ?? []
          agentIds.push(agent.id)
          summary.set(pattern, agentIds)
        }
      }
    }

    return summary
  }

  /**
   * Clear all agents from the registry.
   */
  async clear(): Promise<void> {
    this.agents.clear()
    await this.persist()
  }

  /**
   * Get the number of registered agents.
   */
  get size(): number {
    return this.agents.size
  }
}

/**
 * Create a localStorage-based storage adapter for browser environments.
 */
export function createLocalStorageAdapter(key: string): AgentStorageAdapter {
  return {
    async load(): Promise<AgentCard[]> {
      if (typeof window === 'undefined') return []
      const data = localStorage.getItem(key)
      if (!data) return []
      try {
        const parsed = JSON.parse(data)
        // Restore Date objects
        return parsed.map((agent: AgentCard) => ({
          ...agent,
          createdAt: agent.createdAt ? new Date(agent.createdAt) : undefined,
          updatedAt: agent.updatedAt ? new Date(agent.updatedAt) : undefined,
        }))
      } catch {
        return []
      }
    },
    async save(agents: AgentCard[]): Promise<void> {
      if (typeof window === 'undefined') return
      localStorage.setItem(key, JSON.stringify(agents))
    },
  }
}

/**
 * Default registry instance with localStorage persistence.
 */
let defaultRegistry: AgentRegistry | null = null

/**
 * Get the default agent registry instance.
 * Creates one with localStorage persistence if it doesn't exist.
 */
export function getDefaultRegistry(): AgentRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new AgentRegistry({
      storage: createLocalStorageAdapter('agent-registry'),
    })
  }
  return defaultRegistry
}
