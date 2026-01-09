/**
 * Agent configuration types for per-agent MCP tool access control.
 *
 * This module defines the AgentCard type which allows agents to specify
 * which MCP tools they can access using glob-like patterns.
 */

/**
 * Base agent types supported by the system.
 */
export type AgentType =
  | 'claude-code'
  | 'gemini-cli'
  | 'codex'
  | 'copilot'
  | 'amp'
  | 'cursor'
  | 'custom'

/**
 * Agent execution status.
 */
export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

/**
 * MCP tool pattern for fine-grained access control.
 *
 * Patterns follow glob-like syntax:
 * - `server/*` - All tools from a server (e.g., `tabz/*`)
 * - `server/tool` - Specific tool (e.g., `beads/show`)
 * - `*` - All tools from all servers (use with caution)
 *
 * @example
 * ```ts
 * const patterns: MCPToolPattern[] = [
 *   'tabz/*',           // All tabz tools
 *   'beads/show',       // Only beads show tool
 *   'beads/list',       // Only beads list tool
 *   'shadcn/*',         // All shadcn tools
 * ]
 * ```
 */
export type MCPToolPattern = string

/**
 * AgentCard represents an agent configuration with MCP tool access control.
 *
 * The `mcpTools` field allows specifying which MCP server/tool patterns
 * this agent is allowed to use. This provides fine-grained control over
 * agent capabilities beyond just enabling/disabling entire MCP servers.
 */
export interface AgentCard {
  /** Unique identifier for this agent */
  id: string

  /** Display name for the agent */
  name: string

  /** Short description of what this agent does */
  description?: string

  /** Avatar URL or icon name (Lucide icon) */
  avatar?: string

  /** Base agent type this card extends */
  baseType: AgentType

  /** Current execution status */
  status?: AgentStatus

  /**
   * MCP tool patterns this agent is allowed to use.
   *
   * Patterns follow glob-like syntax:
   * - `server/*` - All tools from a server
   * - `server/tool` - Specific tool
   * - `*` - All tools (use with caution)
   *
   * If undefined or empty, the agent has no MCP tool access.
   *
   * @example
   * ```ts
   * mcpTools: [
   *   'tabz/tabz_screenshot',
   *   'tabz/tabz_click',
   *   'beads/*',
   *   'shadcn/view_items_in_registries',
   * ]
   * ```
   */
  mcpTools?: MCPToolPattern[]

  /**
   * Skills this agent can invoke (e.g., 'commit', 'review-pr').
   */
  skills?: string[]

  /**
   * Subagent types this agent can spawn.
   */
  subagents?: string[]

  /**
   * Slash commands available to this agent.
   */
  slashCommands?: string[]

  /**
   * Custom system prompt for this agent.
   */
  systemPrompt?: string

  /**
   * Working directory for agent sessions.
   */
  workingDir?: string

  /**
   * Permission mode for tool execution.
   */
  permissionMode?: 'bypassPermissions' | 'plan' | 'default'

  /** Whether this agent is enabled */
  isEnabled?: boolean

  /** When this agent card was created */
  createdAt?: Date

  /** When this agent card was last updated */
  updatedAt?: Date
}

/**
 * Check if an MCP tool pattern matches a specific tool.
 *
 * @param pattern - The pattern to check (e.g., 'tabz/*' or 'beads/show')
 * @param tool - The tool to match against (e.g., 'tabz/tabz_screenshot')
 * @returns True if the pattern matches the tool
 *
 * @example
 * ```ts
 * matchesMCPTool('tabz/*', 'tabz/tabz_screenshot') // true
 * matchesMCPTool('beads/show', 'beads/show') // true
 * matchesMCPTool('beads/show', 'beads/list') // false
 * matchesMCPTool('*', 'anything/here') // true
 * ```
 */
export function matchesMCPTool(pattern: MCPToolPattern, tool: string): boolean {
  // Wildcard matches everything
  if (pattern === '*') {
    return true
  }

  // Server wildcard (e.g., 'tabz/*')
  if (pattern.endsWith('/*')) {
    const server = pattern.slice(0, -2)
    return tool.startsWith(`${server}/`)
  }

  // Exact match
  return pattern === tool
}

/**
 * Check if an agent has access to a specific MCP tool.
 *
 * @param agent - The agent card to check
 * @param tool - The MCP tool in server/tool format (e.g., 'tabz/tabz_screenshot')
 * @returns True if the agent has access to the tool
 */
export function agentHasMCPToolAccess(agent: AgentCard, tool: string): boolean {
  // No tools configured means no access
  if (!agent.mcpTools || agent.mcpTools.length === 0) {
    return false
  }

  // Check if any pattern matches
  return agent.mcpTools.some((pattern) => matchesMCPTool(pattern, tool))
}

/**
 * Filter a list of tools to only those an agent has access to.
 *
 * @param agent - The agent card to check
 * @param tools - List of MCP tools in server/tool format
 * @returns Filtered list of tools the agent can access
 */
export function filterMCPToolsForAgent(
  agent: AgentCard,
  tools: string[]
): string[] {
  if (!agent.mcpTools || agent.mcpTools.length === 0) {
    return []
  }

  return tools.filter((tool) => agentHasMCPToolAccess(agent, tool))
}
