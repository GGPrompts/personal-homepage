/**
 * Backend Icon Configuration and Utilities
 *
 * Shared configuration for AI backend icons used across components.
 * Matches the CATEGORY_CONFIG in AgentGallery for consistency.
 */

import * as React from 'react'
import { Bot, Code, Gem, Plane, Layout, type LucideIcon } from 'lucide-react'
import type { AIBackend, AgentCard } from '@/lib/agents/types'

// ============================================================================
// Types
// ============================================================================

export type BackendKey = AIBackend | 'page-assistant'

/**
 * Minimal agent info needed to derive backend icon
 * Allows use with both full AgentCard and minimal agent references
 */
export interface MinimalAgentInfo {
  id: string
  backend?: AIBackend
  category?: 'page-assistant'
  sections?: string[]
}

export interface BackendConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Backend configuration with icons and colors
 * Matches CATEGORY_CONFIG in AgentGallery for visual consistency
 */
export const BACKEND_CONFIG: Record<BackendKey, BackendConfig> = {
  claude: {
    label: 'Claude',
    icon: Bot,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  codex: {
    label: 'Codex',
    icon: Code,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  copilot: {
    label: 'Copilot',
    icon: Plane,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  gemini: {
    label: 'Gemini',
    icon: Gem,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  'page-assistant': {
    label: 'Page Assistant',
    icon: Layout,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the backend key from an agent
 *
 * Derives the backend from:
 * 1. Vanilla agent ID pattern (__vanilla_<backend>__)
 * 2. Page assistant (has sections or category)
 * 3. Explicit backend property
 * 4. Falls back to 'claude'
 *
 * Accepts either a full AgentCard or minimal agent info
 */
export function getAgentBackend(agent: MinimalAgentInfo | AgentCard | null | undefined): BackendKey {
  if (!agent) return 'claude'

  // Vanilla agents: extract from ID
  if (agent.id.startsWith('__vanilla_')) {
    const backend = agent.id.replace('__vanilla_', '').replace('__', '')
    if (['claude', 'codex', 'copilot', 'gemini'].includes(backend)) {
      return backend as BackendKey
    }
  }

  // Page assistants: explicit category or has sections
  if (agent.category === 'page-assistant') {
    return 'page-assistant'
  }
  if (agent.sections && agent.sections.length > 0) {
    return 'page-assistant'
  }

  // Explicit backend
  if (agent.backend && ['claude', 'codex', 'copilot', 'gemini'].includes(agent.backend)) {
    return agent.backend
  }

  // Default to claude
  return 'claude'
}

/**
 * Get backend config for an agent
 */
export function getAgentBackendConfig(agent: MinimalAgentInfo | AgentCard | null | undefined): BackendConfig {
  const backend = getAgentBackend(agent)
  return BACKEND_CONFIG[backend]
}

// ============================================================================
// Components
// ============================================================================

export interface BackendIconProps {
  /** The agent to get the backend icon for (accepts full AgentCard or minimal info with id) */
  agent: MinimalAgentInfo | AgentCard | null | undefined
  /** Icon size class (default: h-4 w-4) */
  className?: string
  /** Whether to include the color class (default: true) */
  colored?: boolean
}

/**
 * Render the appropriate backend icon for an agent
 *
 * Usage:
 * ```tsx
 * <BackendIcon agent={agent} className="h-5 w-5" />
 * ```
 */
export function BackendIcon({ agent, className = 'h-4 w-4', colored = true }: BackendIconProps) {
  const config = getAgentBackendConfig(agent)
  const Icon = config.icon
  return <Icon className={colored ? `${className} ${config.color}` : className} />
}

export default BackendIcon
