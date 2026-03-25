/**
 * Launch Profiles - Type Definitions
 * Simple launch configurations for CLI-based AI backends
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * CLI backend type
 */
export type AIBackend = 'claude' | 'codex' | 'gemini' | 'copilot'

/**
 * A launch profile is a named CLI configuration:
 * name + backend + flags = a launch command
 */
export interface LaunchProfile {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Avatar emoji */
  avatar: string
  /** Short description */
  description: string
  /** CLI backend: claude, codex, gemini, copilot */
  backend: AIBackend
  /** CLI flags passed when spawning (e.g., ['--model', 'sonnet']) */
  flags: string[]
  /** Whether this profile is enabled (shown in dropdown) */
  enabled: boolean
}

// Keep AgentCard as alias during migration
export type AgentCard = LaunchProfile
