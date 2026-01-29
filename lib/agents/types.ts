/**
 * Agent Cards - Type Definitions
 * Specialized AI agents with page-specific knowledge, MCP tool access, and embeddable assistants
 */

import { z } from 'zod'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Action types for page selectors
 */
export type SelectorActionType =
  | 'navigate'      // Navigation to section/page
  | 'click'         // Button/link click
  | 'input'         // Text input field
  | 'select'        // Dropdown/select element
  | 'toggle'        // Toggle/checkbox
  | 'list'          // List container
  | 'item'          // List item
  | 'region'        // Named region/container
  | 'command'       // Terminal command
  | 'submit'        // Form submission

/**
 * MCP tool permission levels
 */
export type MCPToolPermission = 'read' | 'write' | 'execute'

/**
 * Agent execution mode
 * - 'dev': Agent runs in project context (gets CLAUDE.md, beads, etc.)
 * - 'user': Agent runs in isolated context (home directory, no dev tooling)
 */
export type AgentMode = 'dev' | 'user'

/**
 * Agent personality traits for consistent behavior
 */
export type AgentPersonalityTrait =
  | 'helpful'
  | 'concise'
  | 'detailed'
  | 'technical'
  | 'friendly'
  | 'formal'
  | 'creative'
  | 'analytical'

// ============================================================================
// Selector Documentation
// ============================================================================

/**
 * Page selector documentation for agent page awareness
 * Describes interactive elements the agent can target via MCP tools
 */
export interface SelectorDoc {
  /** CSS selector for the element (e.g., '[data-tabz-action="submit"]') */
  selector: string
  /** Human-readable description of what the element does */
  description: string
  /** Type of action this selector performs */
  action_type: SelectorActionType
  /** Optional section this selector belongs to */
  section?: string
  /** Optional example usage */
  example?: string
}

// ============================================================================
// MCP Tool Configuration
// ============================================================================

/**
 * MCP tool definition for agent capabilities
 */
export interface MCPTool {
  /** Tool name (e.g., 'tabz_click', 'tabz_fill') */
  name: string
  /** Human-readable description of the tool's purpose */
  description: string
  /** Permission level required for this tool */
  permission: MCPToolPermission
  /** MCP server that provides this tool */
  server?: string
}

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Runtime configuration for agent AI behavior
 */
export interface AgentConfig {
  /** AI model to use (e.g., 'claude-sonnet-4-20250514', 'gpt-4o') */
  model: string
  /** Temperature for response generation (0-2, lower = more deterministic) */
  temperature: number
  /** Maximum tokens in response */
  max_tokens: number
  /** Optional timeout in milliseconds */
  timeout_ms?: number
  /** Whether to stream responses */
  stream?: boolean
}

// ============================================================================
// Agent Card
// ============================================================================

/**
 * Core agent definition
 * Represents a specialized AI assistant with specific knowledge and capabilities
 */
export interface AgentCard {
  /** Unique identifier for the agent */
  id: string
  /** Display name for the agent */
  name: string
  /** Avatar URL or emoji for visual representation */
  avatar: string
  /** Short description of the agent's purpose */
  description: string
  /** Personality traits that guide agent behavior */
  personality: AgentPersonalityTrait[]
  /** System prompt defining agent behavior and knowledge */
  system_prompt: string
  /** MCP tools the agent can use */
  mcp_tools: MCPTool[]
  /** Page selectors the agent knows about */
  selectors: SelectorDoc[]
  /** Runtime configuration */
  config: AgentConfig
  /** Sections this agent specializes in */
  sections?: string[]
  /** Whether this agent is enabled */
  enabled: boolean
  /** Creation timestamp (ISO string) */
  created_at: string
  /** Last update timestamp (ISO string) */
  updated_at: string
  /** Plugin directory path for --plugin-dir spawning (optional) */
  pluginPath?: string
  /** TabzChrome profile ID for pre-configured terminal spawning (optional) */
  profileId?: string
  /** Working directory for this agent (falls back to global workingDir if not set) */
  workingDir?: string
  /** Execution mode: 'dev' for project context, 'user' for isolated user context */
  mode?: AgentMode
  /** Pre-built CLI spawn command args (takes precedence over individual settings) */
  spawnCommand?: string[]
}

// ============================================================================
// Agent Registry
// ============================================================================

/**
 * Collection of agents for management
 */
export type AgentRegistry = Map<string, AgentCard>

/**
 * Serializable agent registry for storage
 */
export interface AgentRegistryData {
  /** Array of agent cards */
  agents: AgentCard[]
  /** Schema version for migrations */
  version: number
}

// ============================================================================
// Unified Agent Config (new simplified format)
// ============================================================================

/**
 * Unified agent configuration - simpler format stored in custom-agents.json
 */
export interface UnifiedAgentConfig {
  /** Unique identifier for the agent */
  id: string
  /** Display name for the agent */
  name: string
  /** CLI command to run (e.g., 'claude', 'codex') */
  command: string
  /** Additional CLI flags (e.g., ['--model', 'sonnet']) */
  flags: string[]
  /** Working directory for the agent (null for default) */
  workingDir: string | null
  /** Avatar URL or emoji */
  avatar: string
  /** Short description */
  description: string
  /** Sections this agent specializes in */
  sections: string[]
  /** Path to settings directory for agent configuration */
  settingsDir: string
  /** Whether the agent is enabled */
  enabled: boolean
  /** Execution mode: 'dev' or 'user' */
  mode?: AgentMode
}

/**
 * Container for unified agent configs
 */
export interface UnifiedAgentRegistry {
  /** Schema version */
  version: number
  /** Array of unified agent configs */
  agents: UnifiedAgentConfig[]
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for SelectorActionType
 */
export const SelectorActionTypeSchema = z.enum([
  'navigate',
  'click',
  'input',
  'select',
  'toggle',
  'list',
  'item',
  'region',
  'command',
  'submit',
])

/**
 * Zod schema for MCPToolPermission
 */
export const MCPToolPermissionSchema = z.enum(['read', 'write', 'execute'])

/**
 * Zod schema for AgentMode
 */
export const AgentModeSchema = z.enum(['dev', 'user'])

/**
 * Zod schema for AgentPersonalityTrait
 */
export const AgentPersonalityTraitSchema = z.enum([
  'helpful',
  'concise',
  'detailed',
  'technical',
  'friendly',
  'formal',
  'creative',
  'analytical',
])

/**
 * Zod schema for SelectorDoc
 */
export const SelectorDocSchema = z.object({
  selector: z.string().min(1),
  description: z.string().min(1),
  action_type: SelectorActionTypeSchema,
  section: z.string().optional(),
  example: z.string().optional(),
})

/**
 * Zod schema for MCPTool
 */
export const MCPToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  permission: MCPToolPermissionSchema,
  server: z.string().optional(),
})

/**
 * Zod schema for AgentConfig
 */
export const AgentConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().positive(),
  timeout_ms: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
})

/**
 * Zod schema for AgentCard
 */
export const AgentCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  avatar: z.string().min(1),
  description: z.string().min(1),
  personality: z.array(AgentPersonalityTraitSchema),
  system_prompt: z.string().min(1),
  mcp_tools: z.array(MCPToolSchema),
  selectors: z.array(SelectorDocSchema),
  config: AgentConfigSchema,
  sections: z.array(z.string()).optional(),
  enabled: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  pluginPath: z.string().optional(),
  profileId: z.string().optional(),
  workingDir: z.string().optional(),
  mode: AgentModeSchema.optional(),
  spawnCommand: z.array(z.string()).optional(),
})

/**
 * Zod schema for AgentRegistryData
 */
export const AgentRegistryDataSchema = z.object({
  agents: z.array(AgentCardSchema),
  version: z.number().int().nonnegative(),
})

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid AgentCard
 */
export function isAgentCard(value: unknown): value is AgentCard {
  return AgentCardSchema.safeParse(value).success
}

/**
 * Type guard to check if a value is a valid SelectorDoc
 */
export function isSelectorDoc(value: unknown): value is SelectorDoc {
  return SelectorDocSchema.safeParse(value).success
}

/**
 * Type guard to check if a value is a valid AgentConfig
 */
export function isAgentConfig(value: unknown): value is AgentConfig {
  return AgentConfigSchema.safeParse(value).success
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Create agent input (without auto-generated fields)
 */
export type CreateAgentInput = Omit<AgentCard, 'id' | 'created_at' | 'updated_at'>

/**
 * Update agent input (partial, without auto-generated fields)
 */
export type UpdateAgentInput = Partial<Omit<AgentCard, 'id' | 'created_at' | 'updated_at'>>

/**
 * Agent card summary for list views
 */
export type AgentCardSummary = Pick<AgentCard, 'id' | 'name' | 'avatar' | 'description' | 'enabled' | 'sections'>
