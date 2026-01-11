// AI Kanban Board Types - Mission Control Theme

export interface Board {
  id: string
  name: string
  description?: string
  columns: Column[]
  settings: BoardSettings
  createdAt: Date
  updatedAt: Date
}

// Beads status types for column mapping
export type BeadsStatusType = 'open' | 'in_progress' | 'blocked' | 'closed'

export interface Column {
  id: string
  title: string
  color: string // Tailwind color class e.g., 'border-t-emerald-500'
  order: number
  wipLimit?: number // Work-in-progress limit
  isCollapsed?: boolean
  isHiddenInBeadsMode?: boolean // Hide this column in beads simplified mode

  // Beads integration
  beadsStatus?: BeadsStatusType // Explicit beads status this column maps to

  // BQL (Beads Query Language) for dynamic filtering
  bqlQuery?: string // e.g., "status:open AND priority:1-2"
  isDynamic?: boolean // True if column shows filtered results instead of assigned tasks

  // Agent Station Configuration
  assignedAgent?: AgentType // Agent assigned to this workflow step
  agentConfig?: ColumnAgentConfig // Agent-specific configuration for this column
  autoAssign?: {
    agent?: AgentType
    priority?: Priority
  }
}

// Configuration for an agent assigned to a column/workflow step
export interface ColumnAgentConfig {
  systemPrompt?: string // Custom prompt for this workflow step
  autoStart?: boolean // Auto-start agent when task enters column
  workingDir?: string // Working directory for agent
  permissionMode?: 'bypassPermissions' | 'plan' | 'default'
  skills?: string[] // Skills to use (e.g., 'commit', 'review-pr')
  mcpServers?: string[] // MCP servers to enable
  autoAdvance?: boolean // Auto-move task to next column when done
}

// Workflow step presets for quick column creation
export const WORKFLOW_STEP_PRESETS: Record<string, {
  title: string
  description: string
  color: string
  agent?: AgentType
  prompt?: string
  icon: string
}> = {
  backlog: {
    title: 'Backlog',
    description: 'Tasks waiting to be worked on',
    color: 'border-t-slate-500',
    icon: 'Inbox',
  },
  refine: {
    title: 'Refine',
    description: 'Clarify requirements and break down tasks',
    color: 'border-t-purple-500',
    agent: 'claude-code',
    prompt: 'Analyze this task and break it down into clear, actionable steps. Identify any ambiguities or missing requirements. Create a detailed implementation plan.',
    icon: 'Sparkles',
  },
  skills: {
    title: 'Add Skills/MCPs',
    description: 'Identify and configure needed tools',
    color: 'border-t-blue-500',
    agent: 'claude-code',
    prompt: 'Review the task requirements and identify which skills, MCP servers, or tools would be helpful. List specific capabilities needed (file operations, git, browser automation, etc).',
    icon: 'Puzzle',
  },
  worktree: {
    title: 'Setup Worktree',
    description: 'Create git branch and worktree',
    color: 'border-t-cyan-500',
    agent: 'claude-code',
    prompt: 'Create a new git worktree and branch for this task. Use a descriptive branch name based on the task title. Ensure the working directory is properly configured.',
    icon: 'GitBranch',
  },
  code: {
    title: 'Code',
    description: 'Implement the feature or fix',
    color: 'border-t-emerald-500',
    agent: 'claude-code',
    prompt: 'Implement the task according to the plan. Write clean, well-documented code following project conventions. Include appropriate error handling and tests.',
    icon: 'Code2',
  },
  test: {
    title: 'Test & Review',
    description: 'Visual testing and code review',
    color: 'border-t-amber-500',
    agent: 'claude-code',
    prompt: 'Test the implementation visually using browser screenshots. Verify the UI matches expectations. Run any automated tests. Review the code for bugs, security issues, and best practices.',
    icon: 'Eye',
  },
  docs: {
    title: 'Update Docs',
    description: 'Update documentation and comments',
    color: 'border-t-pink-500',
    agent: 'claude-code',
    prompt: 'Update relevant documentation including README, inline comments, and any API docs. Ensure new features are properly documented.',
    icon: 'FileText',
  },
  pr: {
    title: 'Commit & PR',
    description: 'Create commit and pull request',
    color: 'border-t-teal-500',
    agent: 'claude-code',
    prompt: 'Stage all changes, create a descriptive commit message, and open a pull request. Include a summary of changes and testing notes in the PR description.',
    icon: 'GitPullRequest',
  },
  done: {
    title: 'Done',
    description: 'Completed tasks',
    color: 'border-t-green-500',
    icon: 'CheckCircle2',
  },
}

export interface Task {
  id: string
  title: string
  description?: string
  columnId: string
  order: number
  priority: Priority
  labels: string[]

  // Dependency graph
  blockedBy?: string[]     // IDs of tasks that block this one
  blocking?: string[]       // IDs of tasks this one blocks
  isReady?: boolean         // True if no blockers or all blockers resolved
  criticalPath?: boolean    // True if this is a zero-slack keystone task

  // AI Agent integration
  agent?: AgentInfo

  // Per-task Claude settings
  claudeSettings?: TaskClaudeSettings

  // Active capabilities for this task execution
  // Allows toggling which agent capabilities are used for this specific task
  activeCapabilities?: TaskActiveCapabilities

  // Chat thread (like AI Workspace)
  messages?: Message[]

  // Git integration
  git?: GitInfo

  // Code review
  diff?: DiffInfo

  // Beads integration (issue tracker metadata)
  beadsMetadata?: BeadsTaskMetadata

  // Metadata
  estimate?: string // e.g., "2h", "1d"
  dueDate?: Date
  assignee?: string
  activities?: TaskActivity[]
  createdAt: Date
  updatedAt: Date
}

// Metadata from beads issue tracker
export interface BeadsTaskMetadata {
  // Issue type classification
  type?: 'feature' | 'bug' | 'chore' | 'docs' | 'test' | 'refactor'
  // Closure reason when status is 'closed'
  closeReason?: string
  // Original beads status
  beadsStatus?: string
  // Whether this task originated from beads
  isBeadsTask: boolean
  // When the issue was closed
  closedAt?: Date
}

// Per-task Claude CLI configuration
export interface TaskClaudeSettings {
  // Agent from ~/.claude/agents/
  agent?: string

  // Working directory for task context
  workingDir?: string

  // Additional directories to include
  additionalDirs?: string[]

  // Permission mode
  permissionMode?: 'bypassPermissions' | 'plan' | 'default'

  // Tool permissions
  allowedTools?: string[]
  disallowedTools?: string[]

  // Custom system prompt for this task
  systemPrompt?: string
}

/**
 * Active capabilities for a specific task execution.
 * Stores which capabilities from the agent profile are enabled for this task.
 * Uses string arrays for toggleable items, booleans for flags.
 */
export interface TaskActiveCapabilities {
  // Skills enabled for this task (subset of agent's skills)
  skills?: string[]

  // MCP servers enabled for this task
  mcpServers?: string[]

  // Subagents allowed for this task
  subagents?: string[]

  // Slash commands available for this task
  slashCommands?: string[]

  // Capability flags
  canCreateWorktree?: boolean
  canCreatePR?: boolean
  canRunBash?: boolean

  // Track if capabilities have been explicitly configured for this task
  isConfigured?: boolean
}

export interface AgentInfo {
  type: AgentType
  status: AgentStatus
  sessionId?: string
  worktreePath?: string
  startedAt?: Date
  logs?: string[]
  lastActivity?: AgentActivity // Most recent agent action
  tokenUsage?: TokenUsage // Token consumption
}

// Represents a single agent action/activity
export interface AgentActivity {
  type: 'tool_use' | 'message' | 'thinking' | 'error'
  tool?: string // e.g., 'Read', 'Edit', 'Bash'
  summary: string // e.g., 'Reading src/app/page.tsx'
  timestamp: Date
}

// Token usage tracking
export interface TokenUsage {
  input: number
  output: number
  cacheRead?: number
  cacheCreation?: number
  contextPercentage?: number // % of context window used
}

export interface GitInfo {
  worktree?: string        // Path to git worktree
  branch?: string          // Branch name
  baseBranch?: string      // Base branch (main/develop)
  prNumber?: number        // GitHub PR number
  prStatus?: 'draft' | 'open' | 'merged' | 'closed'
  prUrl?: string           // PR URL
  commits?: Commit[]       // Recent commits
}

export interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

export interface DiffInfo {
  files: DiffFile[]
  status: 'pending' | 'approved' | 'changes_requested'
}

export interface DiffFile {
  path: string
  additions: number
  deletions: number
  hunks: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  toolUses?: ToolUse[]
}

export interface ToolUse {
  name: string
  input: Record<string, unknown>
  output?: string
}

export interface BoardSettings {
  theme?: string
  showEstimates?: boolean
  showAgentStatus?: boolean
  defaultAgent?: AgentType
  projectPath?: string // For cwd context
  syncToGitHub?: boolean
}

export type AgentType = 'claude-code' | 'gemini-cli' | 'codex' | 'copilot' | 'amp' | 'cursor' | 'custom'
export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * CLI configuration for running an agent.
 * Mirrors TaskClaudeSettings but scoped to agent-level defaults.
 */
export interface AgentCLIConfig {
  /** Agent definition file from ~/.claude/agents/ */
  agent?: string

  /** Default working directory for agent sessions */
  workingDir?: string

  /** Additional directories to include in context */
  additionalDirs?: string[]

  /** Permission mode: bypassPermissions, plan, or default */
  permissionMode?: 'bypassPermissions' | 'plan' | 'default'

  /** Tools this agent is allowed to use */
  allowedTools?: string[]

  /** Tools this agent is not allowed to use */
  disallowedTools?: string[]

  /** Custom system prompt prepended to agent sessions */
  systemPrompt?: string

  /** Environment variables to set for agent sessions */
  envVars?: Record<string, string>

  /** Additional CLI flags to pass (e.g., ['--verbose', '--no-cache']) */
  cliFlags?: string[]
}

/**
 * Capabilities and integrations available to an agent.
 */
export interface AgentCapabilities {
  /** Skills this agent can invoke (e.g., 'commit', 'review-pr') */
  skills?: string[]

  /** MCP servers this agent has access to (e.g., 'tabz', 'shadcn') */
  mcpServers?: string[]

  /** Subagent types this agent can spawn */
  subagents?: string[]

  /** Slash commands registered for this agent */
  slashCommands?: string[]

  /** Whether this agent can create git worktrees */
  canCreateWorktree?: boolean

  /** Whether this agent can create pull requests */
  canCreatePR?: boolean

  /** Whether this agent can run arbitrary bash commands */
  canRunBash?: boolean
}

/**
 * Custom agent profile extending a base agent type with metadata and configuration.
 * Stored in Zustand and persisted to localStorage.
 */
export interface AgentProfile {
  /** Unique identifier for this agent profile */
  id: string

  /** Display name for the agent */
  name: string

  /** Avatar URL or Lucide icon name */
  avatar?: string

  /** Short description of what this agent does */
  description?: string

  /** Base agent type this profile extends */
  baseType: AgentType

  /** Agent capabilities and integrations */
  capabilities?: AgentCapabilities

  /** CLI configuration for running this agent */
  cliConfig?: AgentCLIConfig

  /** Whether this agent is enabled */
  isEnabled?: boolean

  /** When this profile was created */
  createdAt: Date

  /** When this profile was last updated */
  updatedAt: Date
}

// Agent display metadata
export const AGENT_META: Record<AgentType, {
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  icon: string // Lucide icon name
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

export const AGENT_STATUS_META: Record<AgentStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  idle: { label: 'Idle', color: 'text-slate-400', bgColor: 'bg-slate-500' },
  running: { label: 'Running', color: 'text-emerald-400', bgColor: 'bg-emerald-500' },
  paused: { label: 'Paused', color: 'text-amber-400', bgColor: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500' },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500' },
}

// Column presets
export const COLUMN_PRESETS = {
  ideas: { title: 'Ideas', color: 'border-t-purple-500' },
  triage: { title: 'Triage', color: 'border-t-orange-500' },
  backlog: { title: 'Backlog', color: 'border-t-slate-500' },
  spec: { title: 'Spec', color: 'border-t-blue-500' },
  ready: { title: 'Ready', color: 'border-t-cyan-500' },
  inProgress: { title: 'In Progress', color: 'border-t-yellow-500' },
  aiWorking: { title: 'AI Working', color: 'border-t-emerald-500' },
  review: { title: 'Review', color: 'border-t-pink-500' },
  qa: { title: 'QA', color: 'border-t-indigo-500' },
  done: { title: 'Done', color: 'border-t-green-500' },
  deployed: { title: 'Deployed', color: 'border-t-teal-500' },
  blocked: { title: 'Blocked', color: 'border-t-red-500' },
} as const

export const COLUMN_COLORS = [
  'border-t-emerald-500',
  'border-t-cyan-500',
  'border-t-blue-500',
  'border-t-purple-500',
  'border-t-pink-500',
  'border-t-red-500',
  'border-t-orange-500',
  'border-t-yellow-500',
  'border-t-green-500',
  'border-t-teal-500',
  'border-t-indigo-500',
  'border-t-slate-500',
] as const

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

// Task activity for timeline
export interface TaskActivity {
  id: string
  type: 'created' | 'updated' | 'moved' | 'commented'
  description: string
  timestamp: Date
}

// Per-column UI state (scroll position, selection)
export interface ColumnState {
  selectedIndex: number
  scrollOffset: number
}

// Undo history entry for state restoration
export interface UndoEntry {
  action: string
  data: Task
  timestamp: Date
}
