/**
 * CLI Flags Definitions for AI Backends
 *
 * Defines available CLI flags for each backend (Claude, Codex, Gemini)
 * Used to build spawn commands and display reference panels in the Agent Editor.
 *
 * Focus: Print mode flags for agent spawning (not interactive mode)
 */

/**
 * Backend type identifier
 */
export type AIBackend = 'claude' | 'codex' | 'gemini'

/**
 * Flag value type
 */
export type FlagType = 'string' | 'number' | 'boolean' | 'array' | 'enum'

/**
 * CLI flag definition
 */
export interface CLIFlag {
  /** Flag name without dashes (e.g., 'model', 'permission-mode') */
  name: string
  /** Short alias if available (e.g., 'm' for --model) */
  alias?: string
  /** Human-readable description */
  description: string
  /** Value type */
  type: FlagType
  /** Allowed values for enum type */
  values?: string[]
  /** Default value if any */
  defaultValue?: string | number | boolean
  /** Whether this flag can be used multiple times */
  multiple?: boolean
  /** Example usage */
  example?: string
  /** Category for grouping in UI */
  category: 'model' | 'permissions' | 'tools' | 'directories' | 'advanced'
}

/**
 * Claude CLI flags (print mode)
 * Reference: claude --help
 */
export const CLAUDE_FLAGS: CLIFlag[] = [
  // Model flags
  {
    name: 'model',
    alias: 'm',
    description: 'Model to use for responses',
    type: 'enum',
    values: ['sonnet', 'opus', 'haiku', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-haiku-20241022'],
    defaultValue: 'sonnet',
    example: '--model opus',
    category: 'model',
  },
  {
    name: 'agent',
    alias: 'a',
    description: 'Use a named agent from ~/.claude/agents/',
    type: 'string',
    example: '--agent weather-helper',
    category: 'model',
  },

  // Permission flags
  {
    name: 'permission-mode',
    description: 'Permission handling mode',
    type: 'enum',
    values: ['default', 'acceptEdits', 'bypassPermissions', 'plan'],
    defaultValue: 'default',
    example: '--permission-mode acceptEdits',
    category: 'permissions',
  },
  {
    name: 'allowed-tools',
    description: 'Comma-separated list of allowed tool names',
    type: 'array',
    multiple: true,
    example: '--allowed-tools Read,Write,Bash',
    category: 'permissions',
  },
  {
    name: 'disallowed-tools',
    description: 'Comma-separated list of disallowed tool names',
    type: 'array',
    multiple: true,
    example: '--disallowed-tools Bash',
    category: 'permissions',
  },

  // Tool/MCP flags
  {
    name: 'tools',
    description: 'Tool patterns to use',
    type: 'array',
    multiple: true,
    example: '--tools "mcp__*"',
    category: 'tools',
  },
  {
    name: 'mcp-config',
    description: 'Path to MCP configuration file',
    type: 'string',
    multiple: true,
    example: '--mcp-config ~/.config/mcp/servers.json',
    category: 'tools',
  },
  {
    name: 'strict-mcp-config',
    description: 'Only use tools from MCP config (no built-in tools)',
    type: 'boolean',
    category: 'tools',
  },
  {
    name: 'disable-slash-commands',
    description: 'Disable slash commands in prompts',
    type: 'boolean',
    category: 'tools',
  },

  // Directory flags
  {
    name: 'add-dir',
    alias: 'd',
    description: 'Additional directories to include in context',
    type: 'string',
    multiple: true,
    example: '--add-dir ~/projects/shared',
    category: 'directories',
  },
  {
    name: 'plugin-dir',
    description: 'Plugin directories to load',
    type: 'string',
    multiple: true,
    example: '--plugin-dir ~/.claude/plugins/my-plugin',
    category: 'directories',
  },

  // Advanced flags
  {
    name: 'append-system-prompt',
    description: 'Additional text to append to system prompt',
    type: 'string',
    example: '--append-system-prompt "Always respond in JSON"',
    category: 'advanced',
  },
  {
    name: 'max-budget-usd',
    description: 'Maximum budget in USD for this session',
    type: 'number',
    example: '--max-budget-usd 5.00',
    category: 'advanced',
  },
  {
    name: 'betas',
    description: 'Enable beta features',
    type: 'array',
    multiple: true,
    example: '--betas computer-use',
    category: 'advanced',
  },
  {
    name: 'no-cache',
    description: 'Disable prompt caching',
    type: 'boolean',
    category: 'advanced',
  },
]

/**
 * Codex CLI flags (print mode)
 * Reference: codex --help
 */
export const CODEX_FLAGS: CLIFlag[] = [
  // Model flags
  {
    name: 'model',
    alias: 'm',
    description: 'Model to use (provider-specific)',
    type: 'string',
    defaultValue: 'o4-mini',
    example: '--model o4-mini',
    category: 'model',
  },
  {
    name: 'provider',
    description: 'Model provider to use',
    type: 'enum',
    values: ['openai', 'anthropic', 'gemini', 'ollama'],
    defaultValue: 'openai',
    example: '--provider anthropic',
    category: 'model',
  },

  // Permission flags
  {
    name: 'sandbox',
    description: 'Sandbox mode for file operations',
    type: 'enum',
    values: ['read-only', 'workspace-write', 'danger-full-access'],
    defaultValue: 'workspace-write',
    example: '--sandbox read-only',
    category: 'permissions',
  },
  {
    name: 'ask-for-approval',
    description: 'When to ask for approval',
    type: 'enum',
    values: ['untrusted', 'on-failure', 'on-request', 'never'],
    defaultValue: 'untrusted',
    example: '--ask-for-approval never',
    category: 'permissions',
  },

  // Tool flags
  {
    name: 'search',
    description: 'Enable web search capability',
    type: 'boolean',
    category: 'tools',
  },
  {
    name: 'profile',
    description: 'Use a named profile from ~/.codex/profiles/',
    type: 'string',
    example: '--profile my-profile',
    category: 'tools',
  },

  // Directory flags
  {
    name: 'add-dir',
    alias: 'd',
    description: 'Additional directories to include',
    type: 'string',
    multiple: true,
    example: '--add-dir ~/shared-code',
    category: 'directories',
  },

  // Advanced flags
  {
    name: 'temperature',
    description: 'Sampling temperature (0-2)',
    type: 'number',
    defaultValue: 0.7,
    example: '--temperature 0.5',
    category: 'advanced',
  },
  {
    name: 'max-tokens',
    description: 'Maximum tokens in response',
    type: 'number',
    example: '--max-tokens 4096',
    category: 'advanced',
  },
  {
    name: 'verbose',
    alias: 'v',
    description: 'Enable verbose output',
    type: 'boolean',
    category: 'advanced',
  },
]

/**
 * Gemini CLI flags (print mode)
 * Reference: gemini --help
 */
export const GEMINI_FLAGS: CLIFlag[] = [
  // Model flags
  {
    name: 'model',
    alias: 'm',
    description: 'Gemini model to use',
    type: 'enum',
    values: ['gemini-2.0-flash', 'gemini-2.0-flash-thinking', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultValue: 'gemini-2.0-flash',
    example: '--model gemini-2.0-flash-thinking',
    category: 'model',
  },

  // Permission flags
  {
    name: 'approval-mode',
    description: 'Approval mode for operations',
    type: 'enum',
    values: ['default', 'auto_edit', 'yolo', 'plan'],
    defaultValue: 'default',
    example: '--approval-mode auto_edit',
    category: 'permissions',
  },
  {
    name: 'sandbox',
    description: 'Run in sandbox mode',
    type: 'boolean',
    category: 'permissions',
  },

  // Tool flags
  {
    name: 'allowed-tools',
    description: 'List of allowed tool names',
    type: 'array',
    multiple: true,
    example: '--allowed-tools read_file,write_file',
    category: 'tools',
  },
  {
    name: 'extensions',
    description: 'Enable Gemini extensions',
    type: 'array',
    multiple: true,
    example: '--extensions code_execution,web_search',
    category: 'tools',
  },
  {
    name: 'disable-code-execution',
    description: 'Disable code execution capability',
    type: 'boolean',
    category: 'tools',
  },

  // Directory flags
  {
    name: 'add-dir',
    description: 'Additional directories to include',
    type: 'string',
    multiple: true,
    example: '--add-dir ~/projects',
    category: 'directories',
  },

  // Advanced flags
  {
    name: 'temperature',
    description: 'Sampling temperature',
    type: 'number',
    defaultValue: 0.7,
    example: '--temperature 0.3',
    category: 'advanced',
  },
  {
    name: 'safety-settings',
    description: 'Safety filter settings',
    type: 'string',
    example: '--safety-settings low',
    category: 'advanced',
  },
]

/**
 * Get flags for a specific backend
 */
export function getFlagsForBackend(backend: AIBackend): CLIFlag[] {
  switch (backend) {
    case 'claude':
      return CLAUDE_FLAGS
    case 'codex':
      return CODEX_FLAGS
    case 'gemini':
      return GEMINI_FLAGS
    default:
      return []
  }
}

/**
 * Get flags grouped by category
 */
export function getFlagsByCategory(backend: AIBackend): Record<string, CLIFlag[]> {
  const flags = getFlagsForBackend(backend)
  return flags.reduce((acc, flag) => {
    if (!acc[flag.category]) {
      acc[flag.category] = []
    }
    acc[flag.category].push(flag)
    return acc
  }, {} as Record<string, CLIFlag[]>)
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<string, string> = {
  model: 'Model',
  permissions: 'Permissions',
  tools: 'Tools & MCP',
  directories: 'Directories',
  advanced: 'Advanced',
}

/**
 * Build a flag string from name and value
 */
export function buildFlagString(flag: CLIFlag, value: string | number | boolean | string[]): string {
  const flagName = `--${flag.name}`

  if (flag.type === 'boolean') {
    return value ? flagName : ''
  }

  if (Array.isArray(value)) {
    if (flag.multiple) {
      return value.map(v => `${flagName} "${v}"`).join(' ')
    }
    return `${flagName} "${value.join(',')}"`
  }

  // Quote strings with spaces
  const valueStr = typeof value === 'string' && value.includes(' ') ? `"${value}"` : String(value)
  return `${flagName} ${valueStr}`
}

/**
 * Parse a spawn command string into flag/value pairs
 */
export function parseSpawnCommand(command: string): Record<string, string | boolean | string[]> {
  const result: Record<string, string | boolean | string[]> = {}

  // Match --flag value or --flag (for boolean)
  const regex = /--([a-z-]+)(?:\s+(?:"([^"]+)"|'([^']+)'|([^\s-][^\s]*)))?/gi
  let match

  while ((match = regex.exec(command)) !== null) {
    const flagName = match[1]
    const value = match[2] || match[3] || match[4]

    if (value === undefined) {
      // Boolean flag
      result[flagName] = true
    } else if (result[flagName]) {
      // Multiple values - convert to array
      const existing = result[flagName]
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[flagName] = [existing as string, value]
      }
    } else {
      result[flagName] = value
    }
  }

  return result
}

/**
 * Get the CLI executable name for a backend
 */
export function getExecutableName(backend: AIBackend): string {
  switch (backend) {
    case 'claude':
      return 'claude'
    case 'codex':
      return 'codex'
    case 'gemini':
      return 'gemini'
    default:
      return 'claude'
  }
}
