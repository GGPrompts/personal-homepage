/**
 * Backend Icon Configuration and Utilities
 */

import * as React from 'react'
import { Bot, Code, Gem, Plane, type LucideIcon } from 'lucide-react'
import type { AIBackend, LaunchProfile } from '@/lib/agents/types'

// Keep for backwards compat
export type { LaunchProfile as AgentCard } from '@/lib/agents/types'

export type BackendKey = AIBackend

export interface MinimalAgentInfo {
  id: string
  backend?: AIBackend
}

export interface BackendConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
}

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
}

export function getAgentBackend(agent: MinimalAgentInfo | LaunchProfile | null | undefined): BackendKey {
  if (!agent) return 'claude'
  if (agent.backend && agent.backend in BACKEND_CONFIG) return agent.backend
  return 'claude'
}

export function getAgentBackendConfig(agent: MinimalAgentInfo | LaunchProfile | null | undefined): BackendConfig {
  return BACKEND_CONFIG[getAgentBackend(agent)]
}

export interface BackendIconProps {
  agent: MinimalAgentInfo | LaunchProfile | null | undefined
  className?: string
  colored?: boolean
}

export function BackendIcon({ agent, className = 'h-4 w-4', colored = true }: BackendIconProps) {
  const config = getAgentBackendConfig(agent)
  const Icon = config.icon
  return <Icon className={colored ? `${className} ${config.color}` : className} />
}

export default BackendIcon
