import { COLUMN_PRESETS, AgentType, ColumnAgentConfig } from '../types'

export type BoardTemplateKey =
  | 'simple'
  | 'standard'
  | 'feature'
  | 'bugfix'
  | 'fullPipeline'
  | 'docs'

export interface BoardTemplateColumn {
  title: string
  color: string
  agent?: AgentType
  agentConfig?: ColumnAgentConfig
}

export interface BoardTemplate {
  name: string
  description: string
  icon: string
  columns: BoardTemplateColumn[]
}

export const BOARD_TEMPLATES: Record<BoardTemplateKey, BoardTemplate> = {
  simple: {
    name: 'Simple',
    description: 'Basic 3-column kanban board',
    icon: 'Columns3',
    columns: [
      { title: 'Backlog', color: COLUMN_PRESETS.backlog.color },
      { title: 'In Progress', color: COLUMN_PRESETS.inProgress.color },
      { title: 'Done', color: COLUMN_PRESETS.done.color },
    ],
  },

  standard: {
    name: 'Standard',
    description: 'Classic kanban with review step',
    icon: 'Kanban',
    columns: [
      { title: 'Backlog', color: COLUMN_PRESETS.backlog.color },
      { title: 'Ready', color: COLUMN_PRESETS.ready.color },
      { title: 'In Progress', color: COLUMN_PRESETS.inProgress.color },
      { title: 'Review', color: COLUMN_PRESETS.review.color },
      { title: 'Done', color: COLUMN_PRESETS.done.color },
    ],
  },

  feature: {
    name: 'Feature Dev',
    description: 'Full AI-assisted feature development pipeline',
    icon: 'Sparkles',
    columns: [
      { title: 'Backlog', color: 'border-t-slate-500' },
      {
        title: 'Refine',
        color: 'border-t-purple-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Analyze this task and break it down into clear, actionable implementation steps. Identify any ambiguities, dependencies, or potential challenges. Create a detailed plan.',
          autoAdvance: true,
        },
      },
      {
        title: 'Setup',
        color: 'border-t-cyan-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Create a git worktree and branch for this task. Set up any necessary configuration or dependencies. Ensure the development environment is ready.',
          autoAdvance: true,
        },
      },
      {
        title: 'Code',
        color: 'border-t-emerald-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Implement the feature according to the plan. Write clean, well-documented code following project conventions. Include appropriate error handling.',
        },
      },
      {
        title: 'Test',
        color: 'border-t-amber-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Test the implementation using browser screenshots (tabz MCP) to verify the UI. Run automated tests. Review code for bugs and improvements.',
          autoAdvance: true,
        },
      },
      {
        title: 'PR',
        color: 'border-t-teal-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Stage changes, create a descriptive commit, and open a pull request. Include a summary of changes, screenshots if applicable, and testing notes.',
        },
      },
      { title: 'Done', color: 'border-t-green-500' },
    ],
  },

  bugfix: {
    name: 'Bug Fix',
    description: 'Streamlined bug investigation and fix pipeline',
    icon: 'Bug',
    columns: [
      { title: 'Reported', color: 'border-t-red-500' },
      {
        title: 'Investigate',
        color: 'border-t-orange-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Investigate this bug report. Reproduce the issue, identify the root cause, and document findings. Search the codebase for related code and potential fixes.',
          autoAdvance: true,
        },
      },
      {
        title: 'Fix',
        color: 'border-t-emerald-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Implement the fix for this bug. Ensure the solution addresses the root cause without introducing regressions. Add tests to prevent recurrence.',
        },
      },
      {
        title: 'Verify',
        color: 'border-t-blue-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Verify the fix works correctly. Use browser screenshots to confirm the issue is resolved. Run related tests and check for side effects.',
          autoAdvance: true,
        },
      },
      {
        title: 'PR',
        color: 'border-t-teal-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Create a commit with a clear message explaining the bug and fix. Open a pull request with reproduction steps and verification evidence.',
        },
      },
      { title: 'Resolved', color: 'border-t-green-500' },
    ],
  },

  fullPipeline: {
    name: 'Full Pipeline',
    description: 'Complete workflow with all AI-assisted stages',
    icon: 'Workflow',
    columns: [
      { title: 'Ideas', color: 'border-t-violet-500' },
      { title: 'Backlog', color: 'border-t-slate-500' },
      {
        title: 'Refine',
        color: 'border-t-purple-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Analyze this task thoroughly. Break it into steps, identify edge cases, and create an implementation plan. Consider architecture implications.',
        },
      },
      {
        title: 'Skills/MCPs',
        color: 'border-t-blue-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Identify which skills, MCP servers, or tools are needed for this task. Configure any necessary integrations (tabz for browser, git tools, etc).',
        },
      },
      {
        title: 'Worktree',
        color: 'border-t-cyan-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Create a git worktree with a descriptive branch name. Set up the working directory and any task-specific configuration.',
          autoAdvance: true,
        },
      },
      {
        title: 'Code',
        color: 'border-t-emerald-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Implement the task according to the plan. Write clean code following project conventions. Include comments for complex logic.',
        },
      },
      {
        title: 'Visual Test',
        color: 'border-t-amber-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Use tabz MCP to take screenshots and verify the UI implementation. Check responsive behavior, styling, and visual consistency.',
        },
      },
      {
        title: 'Update Docs',
        color: 'border-t-pink-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Update documentation including README, code comments, and API docs. Ensure all new features are properly documented.',
        },
      },
      {
        title: 'Commit/PR',
        color: 'border-t-teal-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Stage changes, write a comprehensive commit message, and create a pull request with full description, screenshots, and test notes.',
        },
      },
      { title: 'Done', color: 'border-t-green-500' },
    ],
  },

  docs: {
    name: 'Documentation',
    description: 'Documentation writing and review workflow',
    icon: 'FileText',
    columns: [
      { title: 'To Document', color: 'border-t-slate-500' },
      {
        title: 'Research',
        color: 'border-t-blue-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Research the topic by exploring the codebase. Understand how features work, their APIs, and usage patterns. Gather examples.',
        },
      },
      {
        title: 'Draft',
        color: 'border-t-purple-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Write clear, comprehensive documentation. Include code examples, explanations, and any relevant diagrams. Follow the project\'s documentation style.',
        },
      },
      {
        title: 'Review',
        color: 'border-t-amber-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Review the documentation for accuracy, clarity, and completeness. Check code examples work correctly. Suggest improvements.',
        },
      },
      {
        title: 'Publish',
        color: 'border-t-teal-500',
        agent: 'claude-code',
        agentConfig: {
          systemPrompt: 'Finalize documentation, commit changes, and update any index or navigation. Ensure links work and content is accessible.',
        },
      },
      { title: 'Published', color: 'border-t-green-500' },
    ],
  },
}
