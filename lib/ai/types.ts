/**
 * AI Types - Single Source of Truth
 * All AI type definitions for backends, chat, and settings
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

/** All supported AI backends */
export type AIBackend = 'claude' | 'gemini' | 'codex' | 'docker' | 'mock'

/** Permission mode for Claude CLI */
export type PermissionMode = 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan'

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/** Basic chat message for API requests */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/** Tool use tracking for streaming responses */
export interface ToolUse {
  id: string
  name: string
  input?: string
  status: 'running' | 'complete'
}

/** Rich message with metadata for UI display */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  feedback?: 'up' | 'down'
  isStreaming?: boolean
  model?: AIBackend
  toolUses?: ToolUse[]
}

// ============================================================================
// TOKEN USAGE & TRACKING
// ============================================================================

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
  totalTokens: number
}

/** Cumulative token usage across a session */
export interface CumulativeUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  contextTokens: number
  messageCount: number
  lastUpdated: Date
}

// ============================================================================
// BACKEND-SPECIFIC SETTINGS
// ============================================================================

/**
 * Claude CLI Settings
 * Maps to claude --help flags
 */
export interface ClaudeSettings {
  // Model selection
  model?: string                          // --model (sonnet, opus, haiku, or full model name)

  // Agent configuration
  agent?: string                          // --agent (agent name from ~/.claude/agents/)

  // Permission mode
  permissionMode?: PermissionMode         // --permission-mode

  // Tool permissions
  allowedTools?: string[]                 // --allowed-tools
  disallowedTools?: string[]              // --disallowed-tools

  // MCP configuration
  mcpConfig?: string[]                    // --mcp-config (paths to MCP config files)
  strictMcpConfig?: boolean               // --strict-mcp-config (only use specified MCP servers)

  // Directory access
  additionalDirs?: string[]               // --add-dir (additional directories to include)

  // Plugin configuration
  pluginDirs?: string[]                   // --plugin-dir (custom plugin directories)

  // Budget limits
  maxBudgetUsd?: number                   // --max-budget-usd

  // Beta features
  betas?: string[]                        // --beta (beta feature flags)

  // Output format
  outputFormat?: 'text' | 'json' | 'stream-json'  // --output-format

  // System prompt
  systemPrompt?: string                   // --system-prompt

  // Working directory
  workingDir?: string                     // Working directory for context

  // Verbose mode
  verbose?: boolean                       // --verbose

  // Skip permissions (dangerous)
  dangerouslySkipPermissions?: boolean    // --dangerously-skip-permissions
}

/**
 * Codex CLI Settings
 * Maps to codex --help flags
 */
export interface CodexSettings {
  // Model selection
  model?: string                          // Default: gpt-5

  // Reasoning effort (o3/o4 models)
  reasoningEffort?: 'low' | 'medium' | 'high'  // --reasoning-effort

  // Sandbox mode
  sandbox?: 'read-only' | 'full' | 'off'  // --sandbox

  // Approval mode
  approvalMode?: 'always' | 'never' | 'dangerous'  // --approval-mode

  // Working directory
  workingDir?: string

  // System prompt
  systemPrompt?: string

  // Max tokens
  maxTokens?: number
}

/**
 * Gemini CLI Settings
 * Maps to gemini --help flags
 */
export interface GeminiSettings {
  // Model selection
  model?: string                          // --model (e.g., flash-2.5, pro-2.5)

  // Temperature
  temperature?: number                    // --temperature (0.0-2.0)

  // Max output tokens
  maxOutputTokens?: number               // --max-output-tokens

  // System instruction
  systemInstruction?: string             // --system-instruction

  // Safety settings
  harmBlockThreshold?: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH_AND_ABOVE'

  // Working directory
  workingDir?: string
}

/**
 * Docker/Local Model Settings
 * For Ollama, LM Studio, etc.
 */
export interface DockerSettings {
  // Model name (e.g., llama3, mistral, codellama)
  model?: string

  // Server endpoint
  endpoint?: string                       // Default: http://localhost:11434

  // Temperature
  temperature?: number                    // 0.0-2.0

  // Max tokens
  maxTokens?: number

  // System prompt
  systemPrompt?: string

  // Context window size
  contextSize?: number

  // Stop sequences
  stop?: string[]
}

// ============================================================================
// UNIFIED CHAT SETTINGS
// ============================================================================

/** Suggested prompt for quick actions */
export interface SuggestedPrompt {
  text: string
  category: string
}

/**
 * Unified Chat Settings
 * Common settings + backend-specific overrides
 */
export interface ChatSettings {
  // Active model ID
  model: string

  // Common settings (used as defaults, backend-specific takes precedence)
  temperature: number
  maxTokens: number
  systemPrompt: string

  // Quick prompts
  suggestedPrompts?: SuggestedPrompt[]

  // Backend-specific settings
  claude?: ClaudeSettings
  codex?: CodexSettings
  gemini?: GeminiSettings
  docker?: DockerSettings

  // Legacy flat properties (for backwards compatibility)
  // These are deprecated - use backend-specific objects instead
  additionalDirs?: string[]               // Use claude.additionalDirs
  claudeModel?: string                    // Use claude.model
  claudeAgent?: string                    // Use claude.agent
  allowedTools?: string[]                 // Use claude.allowedTools
  disallowedTools?: string[]              // Use claude.disallowedTools
  permissionMode?: PermissionMode         // Use claude.permissionMode
  agentMode?: 'dev' | 'user'              // Agent context isolation mode
  agentDir?: string                        // Agent directory for 'user' mode (e.g., 'agents/music-dj')
  geminiModel?: string                    // Use gemini.model
  codexModel?: string                     // Use codex.model
  reasoningEffort?: 'low' | 'medium' | 'high'  // Use codex.reasoningEffort
  sandbox?: 'read-only' | 'full' | 'off'  // Use codex.sandbox
}

/** Settings stored per-conversation */
export interface ConversationSettings {
  systemPrompt?: string

  // Claude CLI specific (legacy flat structure)
  claudeModel?: string
  additionalDirs?: string[]
  allowedTools?: string[]
  disallowedTools?: string[]
  permissionMode?: PermissionMode

  // Docker model options
  temperature?: number
  maxTokens?: number

  // Backend-specific (new nested structure)
  claude?: ClaudeSettings
  codex?: CodexSettings
  gemini?: GeminiSettings
  docker?: DockerSettings
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  model?: string
  projectPath?: string | null
  settings?: ConversationSettings
  claudeSessionId?: string | null
  usage?: TokenUsage | null
  cumulativeUsage?: CumulativeUsage | null
  agentId?: string | null
}

// ============================================================================
// MODEL & BACKEND TYPES
// ============================================================================

export interface Model {
  id: string
  name: string
  backend: AIBackend
  description?: string
}

/** Alias for Model (used in some components) */
export interface ModelInfo {
  id: string
  name: string
  backend: AIBackend
  description?: string
}

export interface BackendStatus {
  backend: string
  available: boolean
  error?: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ChatRequest {
  messages: ChatMessage[]
  backend: AIBackend
  model?: string
  settings?: ChatSettings
  stream?: boolean
  cwd?: string
  conversationId?: string
  claudeSessionId?: string
}

export interface StreamChunk {
  content: string
  done: boolean
  error?: string
  model?: AIBackend
  messageId?: string
}

// ============================================================================
// STREAM EVENT TYPES
// ============================================================================

/** Claude stream event types (from lib/ai/claude.ts) */
export interface ClaudeStreamEvent {
  type: 'text' | 'tool_start' | 'tool_input' | 'tool_end' | 'heartbeat' | 'error' | 'done'
  content?: string
  tool?: {
    id: string
    name: string
    input?: string
  }
  error?: string
  sessionId?: string
}

/** Content block types from Claude CLI stream-json */
export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export interface ClaudeUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

/** Raw Claude CLI stream event */
export interface ClaudeRawStreamEvent {
  type: 'system' | 'assistant' | 'result' | 'error' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_stop'
  subtype?: string
  session_id?: string
  message?: {
    content: ContentBlock[]
  }
  index?: number
  content_block?: ContentBlock
  result?: string
  is_error?: boolean
  usage?: ClaudeUsage
  delta?: {
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
  error?: {
    type: string
    message: string
  }
}

export interface ClaudeStreamResult {
  stream: ReadableStream<string>
  getSessionId: () => string | null
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface GeneratingState {
  startedAt: number
  model: string
}

export type GeneratingConversations = Record<string, GeneratingState>

// ============================================================================
// AGENT TYPES (for AI Workspace agent selection)
// ============================================================================

/** Available Claude agents (populated from filesystem) */
export interface ClaudeAgent {
  name: string
  description?: string
  path: string
}
