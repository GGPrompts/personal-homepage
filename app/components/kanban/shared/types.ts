// Kanban shared component types

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

export type AgentType = 'claude-code' | 'gemini-cli' | 'codex' | 'copilot' | 'amp' | 'cursor' | 'custom'
export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export interface AgentInfo {
  type: AgentType
  status: AgentStatus
  sessionId?: string
  worktreePath?: string
  startedAt?: Date
  logs?: string[]
}

export interface AgentCLIConfig {
  agent?: string
  workingDir?: string
  additionalDirs?: string[]
  permissionMode?: 'bypassPermissions' | 'plan' | 'default'
  allowedTools?: string[]
  disallowedTools?: string[]
  systemPrompt?: string
  envVars?: Record<string, string>
  cliFlags?: string[]
  /** Section selectors to include in system prompt for browser automation */
  selectorKnowledge?: string[]
}

export interface AgentCapabilities {
  skills?: string[]
  mcpServers?: string[]
  subagents?: string[]
  slashCommands?: string[]
  canCreateWorktree?: boolean
  canCreatePR?: boolean
  canRunBash?: boolean
}

export interface AgentProfile {
  id: string
  name: string
  avatar?: string
  description?: string
  baseType: AgentType
  capabilities?: AgentCapabilities
  cliConfig?: AgentCLIConfig
  isEnabled?: boolean
  createdAt: Date
  updatedAt: Date
}

export const AGENT_META: Record<AgentType, {
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
}> = {
  'claude-code': {
    label: 'Claude Code',
    shortLabel: 'Claude',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/50',
    icon: 'Sparkles',
  },
  'gemini-cli': {
    label: 'Gemini CLI',
    shortLabel: 'Gemini',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    icon: 'Gem',
  },
  'codex': {
    label: 'OpenAI Codex',
    shortLabel: 'Codex',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    icon: 'Code2',
  },
  'copilot': {
    label: 'GitHub Copilot',
    shortLabel: 'Copilot',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    icon: 'Github',
  },
  'amp': {
    label: 'Amp',
    shortLabel: 'Amp',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-500/50',
    icon: 'Zap',
  },
  'cursor': {
    label: 'Cursor AI',
    shortLabel: 'Cursor',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/50',
    icon: 'MousePointer2',
  },
  'custom': {
    label: 'Custom Agent',
    shortLabel: 'Custom',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/50',
    icon: 'Bot',
  },
}

// Token usage for context indicator
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  contextPercentage: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
}

export const CONTEXT_LIMIT = 200000
