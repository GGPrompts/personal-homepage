/**
 * Agent Prompt Builder
 *
 * Builds system prompt sections with selector knowledge for AI agents.
 * Enables agents to use tabz_click/tabz_fill for browser automation.
 *
 * Format follows docs/tabz-integration.md conventions:
 * - Selector tables with purpose descriptions
 * - Naming: kebab-case for sections, verb-noun for actions
 * - Automation pattern examples
 */

import { AgentProfile } from '../shared/types'

// ============================================================================
// Selector Knowledge Types
// ============================================================================

export interface SelectorEntry {
  /** CSS selector pattern */
  selector: string
  /** Human-readable purpose */
  purpose: string
  /** Optional example values for dynamic selectors */
  examples?: string[]
}

export interface SelectorCategory {
  /** Category name (e.g., "Navigation", "Forms") */
  name: string
  /** Brief description of the category */
  description?: string
  /** Selectors in this category */
  selectors: SelectorEntry[]
}

export interface AutomationPattern {
  /** Pattern name (e.g., "Navigate to Section") */
  name: string
  /** What this pattern accomplishes */
  description: string
  /** Step-by-step commands */
  steps: string[]
}

export interface SectionSelectorKnowledge {
  /** Section identifier (kebab-case) */
  section: string
  /** Human-readable section name */
  displayName: string
  /** Categories of selectors */
  categories: SelectorCategory[]
  /** Common automation patterns */
  patterns?: AutomationPattern[]
}

// ============================================================================
// Homepage Section Selectors
// ============================================================================

/**
 * Kanban board selectors for task management automation
 */
export const KANBAN_SELECTORS: SectionSelectorKnowledge = {
  section: 'kanban',
  displayName: 'Kanban Board',
  categories: [
    {
      name: 'Board Navigation',
      description: 'Navigate and interact with the Kanban board',
      selectors: [
        { selector: '[data-tabz-section="kanban"]', purpose: 'Kanban section container' },
        { selector: '[data-tabz-action="navigate"][data-tabz-section="kanban"]', purpose: 'Navigate to Kanban' },
        { selector: '[data-tabz-column="backlog"]', purpose: 'Backlog column' },
        { selector: '[data-tabz-column="ready"]', purpose: 'Ready column' },
        { selector: '[data-tabz-column="in-progress"]', purpose: 'In Progress column' },
        { selector: '[data-tabz-column="review"]', purpose: 'Review column' },
        { selector: '[data-tabz-column="done"]', purpose: 'Done column' },
      ],
    },
    {
      name: 'Task Cards',
      description: 'Interact with individual task cards',
      selectors: [
        { selector: '[data-tabz-item^="task-"]', purpose: 'Task card (by ID prefix)' },
        { selector: '[data-tabz-item="task-{id}"]', purpose: 'Specific task card', examples: ['task-abc123'] },
        { selector: '[data-ready="true"]', purpose: 'Tasks ready to work (no blockers)' },
        { selector: '[data-blocked="true"]', purpose: 'Blocked tasks' },
        { selector: '[data-critical-path="true"]', purpose: 'Critical path tasks' },
      ],
    },
    {
      name: 'Task Modal',
      description: 'Task detail modal interactions',
      selectors: [
        { selector: '[data-tabz-region="task-modal"]', purpose: 'Task details modal' },
        { selector: '[data-tabz-input="task-title"]', purpose: 'Task title input' },
        { selector: '[data-tabz-input="task-description"]', purpose: 'Task description textarea' },
        { selector: '[data-tabz-input="task-priority"]', purpose: 'Priority selector' },
        { selector: '[data-tabz-input="task-labels"]', purpose: 'Labels input' },
        { selector: '[data-tabz-action="save-task"]', purpose: 'Save task button' },
        { selector: '[data-tabz-action="close-modal"]', purpose: 'Close modal button' },
        { selector: '[data-tabz-action="delete-task"]', purpose: 'Delete task button' },
      ],
    },
    {
      name: 'Task Actions',
      description: 'Actions on tasks',
      selectors: [
        { selector: '[data-tabz-action="create-task"]', purpose: 'Create new task button' },
        { selector: '[data-tabz-action="assign-agent"]', purpose: 'Assign agent to task' },
        { selector: '[data-tabz-action="start-task"]', purpose: 'Start working on task' },
        { selector: '[data-tabz-action="complete-task"]', purpose: 'Mark task complete' },
        { selector: '[data-tabz-action="add-blocker"]', purpose: 'Add blocker dependency' },
        { selector: '[data-tabz-action="remove-blocker"]', purpose: 'Remove blocker dependency' },
      ],
    },
    {
      name: 'Workspace',
      description: 'Workspace and project configuration',
      selectors: [
        { selector: '[data-tabz-input="workspace-path"]', purpose: 'Workspace path input' },
        { selector: '[data-tabz-action="set-workspace"]', purpose: 'Set workspace button' },
        { selector: '[data-tabz-action="refresh-board"]', purpose: 'Refresh board from beads' },
      ],
    },
  ],
  patterns: [
    {
      name: 'Open Task Details',
      description: 'Click a task card to open its details modal',
      steps: [
        'tabz_click(\'[data-tabz-item="task-{id}"]\')',
        '# Modal opens with task details',
      ],
    },
    {
      name: 'Create New Task',
      description: 'Create a new task in the backlog',
      steps: [
        'tabz_click(\'[data-tabz-action="create-task"]\')',
        'tabz_fill(\'[data-tabz-input="task-title"]\', \'My new task\')',
        'tabz_fill(\'[data-tabz-input="task-description"]\', \'Task description...\')',
        'tabz_click(\'[data-tabz-action="save-task"]\')',
      ],
    },
    {
      name: 'Find Ready Tasks',
      description: 'Locate tasks that are ready to work on',
      steps: [
        '# Query ready tasks (no blockers)',
        'tabz_get_element(\'[data-ready="true"]\')',
      ],
    },
  ],
}

/**
 * AI Workspace selectors for chat interactions
 */
export const AI_WORKSPACE_SELECTORS: SectionSelectorKnowledge = {
  section: 'ai-workspace',
  displayName: 'AI Workspace',
  categories: [
    {
      name: 'Chat Interface',
      description: 'Send and receive chat messages',
      selectors: [
        { selector: '[data-tabz-section="ai-workspace"]', purpose: 'AI Workspace container' },
        { selector: '[data-tabz-input="chat-message"]', purpose: 'Chat input textarea' },
        { selector: '[data-tabz-action="submit-message"]', purpose: 'Send message button' },
        { selector: '[data-tabz-list="messages"]', purpose: 'Message list container' },
        { selector: '[data-tabz-item^="message-"]', purpose: 'Individual message' },
      ],
    },
    {
      name: 'Conversations',
      description: 'Manage chat conversations',
      selectors: [
        { selector: '[data-tabz-list="conversations"]', purpose: 'Conversation list' },
        { selector: '[data-tabz-item^="conversation-"]', purpose: 'Conversation item' },
        { selector: '[data-tabz-action="new-conversation"]', purpose: 'New conversation button' },
        { selector: '[data-tabz-action="delete-conversation"]', purpose: 'Delete conversation' },
      ],
    },
    {
      name: 'Settings',
      description: 'AI workspace configuration',
      selectors: [
        { selector: '[data-tabz-input="model-selector"]', purpose: 'Model selection dropdown' },
        { selector: '[data-tabz-input="project-selector"]', purpose: 'Project context dropdown' },
        { selector: '[data-tabz-action="open-settings"]', purpose: 'Settings button' },
      ],
    },
  ],
  patterns: [
    {
      name: 'Send Chat Message',
      description: 'Send a message in the AI workspace',
      steps: [
        'tabz_fill(\'[data-tabz-input="chat-message"]\', \'Your message here\')',
        'tabz_click(\'[data-tabz-action="submit-message"]\')',
      ],
    },
  ],
}

/**
 * Bookmarks selectors for terminal commands
 */
export const BOOKMARKS_SELECTORS: SectionSelectorKnowledge = {
  section: 'bookmarks',
  displayName: 'Bookmarks',
  categories: [
    {
      name: 'Navigation',
      description: 'Browse bookmarks and folders',
      selectors: [
        { selector: '[data-tabz-section="bookmarks"]', purpose: 'Bookmarks container' },
        { selector: '[data-tabz-list="bookmark-list"]', purpose: 'Bookmark list' },
        { selector: '[data-tabz-item^="bookmark-"]', purpose: 'Bookmark items' },
        { selector: '[data-tabz-item^="folder-"]', purpose: 'Folder items' },
      ],
    },
    {
      name: 'Terminal Commands',
      description: 'Execute terminal bookmarks',
      selectors: [
        { selector: '[data-tabz-action="spawn-terminal"]', purpose: 'Run command in terminal' },
        { selector: '[data-tabz-command]', purpose: 'Element with terminal command' },
        { selector: '[data-tabz-project]', purpose: 'Element with working directory' },
        { selector: '[data-tabz-action="send-chat"]', purpose: 'Send to TabzChrome chat' },
      ],
    },
  ],
  patterns: [
    {
      name: 'Run Terminal Command',
      description: 'Execute a terminal bookmark',
      steps: [
        '# Find and click terminal bookmark by command',
        'tabz_click(\'[data-tabz-command="npm run dev"]\')',
      ],
    },
  ],
}

/**
 * Global navigation selectors
 */
export const NAVIGATION_SELECTORS: SectionSelectorKnowledge = {
  section: 'navigation',
  displayName: 'Navigation',
  categories: [
    {
      name: 'Sidebar',
      description: 'Main sidebar navigation',
      selectors: [
        { selector: '[data-tabz-container="sidebar"]', purpose: 'Sidebar container' },
        { selector: '[data-tabz-action="toggle-sidebar"]', purpose: 'Collapse/expand sidebar' },
        { selector: '[data-tabz-action="toggle-mobile-menu"]', purpose: 'Mobile menu toggle' },
      ],
    },
    {
      name: 'Section Navigation',
      description: 'Navigate to sections',
      selectors: [
        { selector: '[data-tabz-section="{name}"][data-tabz-action="navigate"]', purpose: 'Navigate to section', examples: ['weather', 'bookmarks', 'ai-workspace', 'kanban'] },
        { selector: '[data-tabz-container="main"]', purpose: 'Main content area' },
      ],
    },
  ],
  patterns: [
    {
      name: 'Navigate to Section',
      description: 'Switch to a different section',
      steps: [
        'tabz_click(\'[data-tabz-section="kanban"][data-tabz-action="navigate"]\')',
      ],
    },
  ],
}

// ============================================================================
// All Available Section Selectors
// ============================================================================

export const ALL_SECTION_SELECTORS: SectionSelectorKnowledge[] = [
  NAVIGATION_SELECTORS,
  KANBAN_SELECTORS,
  AI_WORKSPACE_SELECTORS,
  BOOKMARKS_SELECTORS,
]

// ============================================================================
// Prompt Builder Functions
// ============================================================================

/**
 * Format a selector category as a markdown table
 */
function formatSelectorTable(category: SelectorCategory): string {
  const lines: string[] = []

  if (category.description) {
    lines.push(`${category.description}\n`)
  }

  lines.push('| Selector | Purpose |')
  lines.push('|----------|---------|')

  for (const entry of category.selectors) {
    const selector = entry.selector.replace(/\|/g, '\\|')
    const purpose = entry.purpose.replace(/\|/g, '\\|')
    lines.push(`| \`${selector}\` | ${purpose} |`)
  }

  return lines.join('\n')
}

/**
 * Format automation patterns as code examples
 */
function formatPatterns(patterns: AutomationPattern[]): string {
  const lines: string[] = []

  for (const pattern of patterns) {
    lines.push(`**${pattern.name}**`)
    lines.push(pattern.description)
    lines.push('```python')
    lines.push(pattern.steps.join('\n'))
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format a section's selector knowledge as markdown
 */
function formatSectionKnowledge(section: SectionSelectorKnowledge): string {
  const lines: string[] = []

  lines.push(`### ${section.displayName} Section`)
  lines.push('')

  for (const category of section.categories) {
    lines.push(`#### ${category.name}`)
    lines.push('')
    lines.push(formatSelectorTable(category))
    lines.push('')
  }

  if (section.patterns && section.patterns.length > 0) {
    lines.push('#### Common Patterns')
    lines.push('')
    lines.push(formatPatterns(section.patterns))
  }

  return lines.join('\n')
}

/**
 * Build selector knowledge prompt for specific sections
 */
export function buildSelectorPrompt(
  sections: SectionSelectorKnowledge[],
  options?: {
    includeConventions?: boolean
    includePreamble?: boolean
  }
): string {
  const { includeConventions = true, includePreamble = true } = options ?? {}
  const lines: string[] = []

  if (includePreamble) {
    lines.push('# Browser Automation Selectors')
    lines.push('')
    lines.push('Use these selectors with `tabz_click()` and `tabz_fill()` for browser automation.')
    lines.push('All interactive elements have `data-tabz-*` attributes for reliable targeting.')
    lines.push('')
  }

  if (includeConventions) {
    lines.push('## Naming Conventions')
    lines.push('')
    lines.push('| Attribute | Format | Examples |')
    lines.push('|-----------|--------|----------|')
    lines.push('| `data-tabz-section` | kebab-case | `weather`, `ai-workspace`, `kanban` |')
    lines.push('| `data-tabz-action` | verb-noun | `submit-form`, `create-task`, `refresh-data` |')
    lines.push('| `data-tabz-input` | noun | `chat-message`, `task-title`, `workspace-path` |')
    lines.push('| `data-tabz-item` | prefix-id | `task-abc123`, `bookmark-1` |')
    lines.push('| `data-tabz-list` | plural | `tasks`, `bookmarks`, `messages` |')
    lines.push('| `data-tabz-region` | noun | `header`, `sidebar`, `task-modal` |')
    lines.push('')
  }

  lines.push('## Section Selectors')
  lines.push('')

  for (const section of sections) {
    lines.push(formatSectionKnowledge(section))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Build a complete agent system prompt with selector knowledge
 */
export function buildAgentSystemPrompt(
  profile: AgentProfile,
  options?: {
    /** Sections to include selector knowledge for */
    sections?: SectionSelectorKnowledge[]
    /** Additional context to prepend */
    additionalContext?: string
    /** Working directory for the task */
    workingDir?: string
    /** Task description */
    taskDescription?: string
  }
): string {
  const {
    sections = ALL_SECTION_SELECTORS,
    additionalContext,
    workingDir,
    taskDescription,
  } = options ?? {}

  const lines: string[] = []

  // Agent identity
  lines.push(`# Agent: ${profile.name}`)
  lines.push('')
  if (profile.description) {
    lines.push(profile.description)
    lines.push('')
  }

  // Task context
  if (taskDescription) {
    lines.push('## Current Task')
    lines.push('')
    lines.push(taskDescription)
    lines.push('')
  }

  // Working directory
  if (workingDir) {
    lines.push('## Working Directory')
    lines.push('')
    lines.push(`\`${workingDir}\``)
    lines.push('')
  }

  // Additional context
  if (additionalContext) {
    lines.push(additionalContext)
    lines.push('')
  }

  // Capabilities summary
  if (profile.capabilities) {
    const caps = profile.capabilities
    const capLines: string[] = []

    if (caps.skills && caps.skills.length > 0) {
      capLines.push(`- **Skills**: ${caps.skills.join(', ')}`)
    }
    if (caps.mcpServers && caps.mcpServers.length > 0) {
      capLines.push(`- **MCP Servers**: ${caps.mcpServers.join(', ')}`)
    }
    if (caps.subagents && caps.subagents.length > 0) {
      capLines.push(`- **Subagents**: ${caps.subagents.join(', ')}`)
    }
    if (caps.canCreateWorktree) {
      capLines.push('- Can create git worktrees')
    }
    if (caps.canCreatePR) {
      capLines.push('- Can create pull requests')
    }
    if (caps.canRunBash) {
      capLines.push('- Can run bash commands')
    }

    if (capLines.length > 0) {
      lines.push('## Capabilities')
      lines.push('')
      lines.push(capLines.join('\n'))
      lines.push('')
    }
  }

  // Selector knowledge
  if (sections.length > 0) {
    lines.push(buildSelectorPrompt(sections))
  }

  return lines.join('\n')
}

/**
 * Get selector knowledge for a specific section by name
 */
export function getSectionSelectors(sectionName: string): SectionSelectorKnowledge | undefined {
  return ALL_SECTION_SELECTORS.find(s => s.section === sectionName)
}

/**
 * Build a minimal selector reference for inline hints
 */
export function buildQuickReference(sections: string[]): string {
  const lines: string[] = []

  lines.push('## Quick Selector Reference')
  lines.push('')

  for (const sectionName of sections) {
    const section = getSectionSelectors(sectionName)
    if (!section) continue

    lines.push(`**${section.displayName}**`)

    // Just list the most important selectors
    const keySelectors = section.categories.flatMap(c => c.selectors.slice(0, 2))
    for (const sel of keySelectors.slice(0, 5)) {
      lines.push(`- \`${sel.selector}\` - ${sel.purpose}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
