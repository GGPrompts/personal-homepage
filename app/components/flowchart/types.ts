// Node types for workflow steps
export type NodeType =
  | 'human-entry'   // User types these commands (gg-plan, gg-spawn, gg-auto)
  | 'skill'         // Claude-invoked skills (/skillname)
  | 'agent'         // Background agents (worker-watcher)
  | 'mcp'           // MCP tool calls (mcp__beads__*, tabz_*)
  | 'bash'          // Shell commands (bd worktree, finalize-issue.sh)
  | 'decision'      // Decision points
  | 'complete'      // Completion states
  | 'group';        // Collapsible group container for organizing nodes

// Skill frontmatter metadata (from SKILL.md)
export interface SkillMetadata {
  allowedTools?: string[];          // Tools Claude can use without asking permission
  model?: string;                   // Model to use when skill is active
  context?: string;                 // 'fork' to run in subagent context
  agent?: string;                   // Subagent type when context: fork
  hooks?: string[];                 // Hooks scoped to skill lifecycle
  disableModelInvocation?: boolean; // Prevent Claude from auto-loading
  userInvocable?: boolean;          // Show in / menu (default true)
}

// Workflow step definition
export interface Step {
  id: string;
  label: string;
  description: string;
  nodeType: NodeType;
  skillPath?: string;  // Path to skill folder, e.g., "~/.claude/skills/code-review"
  skillMetadata?: SkillMetadata;  // SKILL.md frontmatter fields
  promptPath?: string;  // Path to .prompty file for TFE integration
}

// Edge connection between nodes
export interface EdgeConnection {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// Note panel definition
export interface Note {
  id: string;
  appearsWithStep: number;
  position: { x: number; y: number };
  color: { bg: string; border: string };
  content: string;
  width?: number;
  height?: number;
}

// Node position
export interface NodePosition {
  x: number;
  y: number;
}

// Saved workflow data
export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: Step[];
  positions: Record<string, NodePosition>;
  edges: EdgeConnection[];
  notes: Note[];
  createdAt: string;
  updatedAt?: string;
}

// Prompt template
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  nodeType?: NodeType;  // Optional: which node types this applies to
  createdAt: string;
  updatedAt?: string;
}

// Workflow template definition
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  edges: EdgeConnection[];
  notes: Note[];
  positions: Record<string, { x: number; y: number }>;
  isBuiltIn?: boolean;  // true for pre-built templates
}

// LocalStorage keys
export const STORAGE_KEYS = {
  WORKFLOWS: 'flowchart-workflows',
  PROMPTS: 'flowchart-prompts',
  TEMPLATES: 'flowchart-templates',
  SIDEBAR_COLLAPSED: 'flowchart-sidebar-collapsed',
  DEFAULT_WORKFLOW: 'flowchart-default-workflow',
} as const;
