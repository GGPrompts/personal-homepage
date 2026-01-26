import type { NodeType } from '../types';

// Default labels for new nodes by type
export const defaultNodeLabels: Record<NodeType, { label: string; description: string }> = {
  'human-entry': { label: 'New Entry Point', description: 'User command' },
  'skill': { label: 'New Skill', description: '/skill-name' },
  'agent': { label: 'New Agent', description: 'Background agent' },
  'mcp': { label: 'New MCP', description: 'mcp__tool__()' },
  'bash': { label: 'New Bash', description: 'Shell command' },
  'decision': { label: 'New Decision', description: 'Decision point' },
  'complete': { label: 'New Complete', description: 'Completion state' },
  'group': { label: 'New Group', description: 'Collapsible container' },
};

// Node dimensions for layout calculations
export const nodeWidth = 220;
export const nodeHeight = 70;

// Dark theme colors - distinct for each node type
export const nodeColors: Record<NodeType, { bg: string; border: string }> = {
  'human-entry': { bg: '#0d2818', border: '#3fb950' },    // Bright green - human starts here
  'skill': { bg: '#1c1c2e', border: '#a371f7' },          // Purple - Claude skills
  'agent': { bg: '#2d2a1c', border: '#d29922' },          // Yellow - background agents
  'mcp': { bg: '#0d1a2d', border: '#58a6ff' },            // Blue - MCP calls
  'bash': { bg: '#1a2d2d', border: '#39d0d0' },           // Cyan - shell commands
  'decision': { bg: '#2d1c1c', border: '#f0883e' },       // Orange - decisions
  'complete': { bg: '#1a1a0d', border: '#fbbf24' },       // Gold - achievement/done
  'group': { bg: '#1a1a2e', border: '#8b5cf6' },          // Indigo - group containers
};

// All available node types for the Change Type submenu
export const allNodeTypes: { type: NodeType; label: string }[] = [
  { type: 'human-entry', label: 'Human Entry' },
  { type: 'skill', label: 'Skill' },
  { type: 'agent', label: 'Agent' },
  { type: 'mcp', label: 'MCP' },
  { type: 'bash', label: 'Bash' },
  { type: 'decision', label: 'Decision' },
  { type: 'complete', label: 'Complete' },
  { type: 'group', label: 'Group' },
];
