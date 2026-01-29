/**
 * Agent Cards - Type Definitions
 * CLI-based AI agents with specialized configurations for Claude, Codex, Gemini, Copilot
 */

import { z } from 'zod'

// ============================================================================
// Core Types
// ============================================================================

/**
 * CLI backend type
 */
export type AIBackend = 'claude' | 'codex' | 'gemini' | 'copilot'

/**
 * Agent execution mode
 * - 'dev': Agent runs in project context (gets CLAUDE.md, beads, etc.)
 * - 'user': Agent runs in isolated context (home directory, no dev tooling)
 */
export type AgentMode = 'dev' | 'user'

/**
 * Agent category for gallery organization
 * - 'page-assistant': Section-specific agents for homepage pages
 * - 'development': Development-focused agents
 * - undefined: Categorized by backend (claude, codex, gemini, copilot)
 */
export type AgentCategory = 'page-assistant' | 'development'

// ============================================================================
// Agent Card (Simplified for CLI-only)
// ============================================================================

/**
 * Core agent definition for CLI spawning
 * All AI configuration (temperature, system prompts, etc.) is handled by the CLI tools
 * and their respective settings directories (CLAUDE.md, config files, etc.)
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
  /** CLI backend: claude, codex, gemini, copilot */
  backend?: AIBackend
  /** CLI flags to pass when spawning (e.g., ['--model', 'sonnet']) */
  flags: string[]
  /** Working directory for this agent */
  workingDir?: string | null
  /** Plugin directory path for --plugin-dir spawning (optional) */
  pluginPath?: string
  /** Sections this agent specializes in */
  sections?: string[]
  /** Whether this agent is enabled */
  enabled: boolean
  /** Execution mode: 'dev' for project context, 'user' for isolated user context */
  mode?: AgentMode
  /** Category for gallery organization (derived from sections/backend if not set) */
  category?: AgentCategory
  /** Suggested prompts shown as quick-start buttons in chat */
  suggestedPrompts?: string[]
  /** Creation timestamp (ISO string) */
  created_at: string
  /** Last update timestamp (ISO string) */
  updated_at: string
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

/**
 * Container for agent configs in custom-agents.json
 */
export interface AgentRegistryFile {
  /** Schema version */
  version: number
  /** Array of agent configs */
  agents: AgentCard[]
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for AIBackend
 */
export const AIBackendSchema = z.enum(['claude', 'codex', 'gemini', 'copilot'])

/**
 * Zod schema for AgentMode
 */
export const AgentModeSchema = z.enum(['dev', 'user'])

/**
 * Zod schema for AgentCategory
 */
export const AgentCategorySchema = z.enum(['page-assistant', 'development'])

/**
 * Zod schema for AgentCard
 */
export const AgentCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  avatar: z.string(),
  description: z.string(),
  backend: AIBackendSchema.optional(),
  flags: z.array(z.string()),
  workingDir: z.string().nullable().optional(),
  pluginPath: z.string().optional(),
  sections: z.array(z.string()).optional(),
  enabled: z.boolean(),
  mode: AgentModeSchema.optional(),
  category: AgentCategorySchema.optional(),
  suggestedPrompts: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
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
export type AgentCardSummary = Pick<AgentCard, 'id' | 'name' | 'avatar' | 'description' | 'enabled' | 'sections' | 'backend'>
