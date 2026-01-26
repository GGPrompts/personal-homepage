import type { Step, Note, EdgeConnection } from '../types';

export const allSteps: Step[] = [
  // PHASE 1: PLANNING (Human entry: gg-plan)
  { id: '1', label: 'gg-plan', description: 'Human entry point', nodeType: 'human-entry' },
  { id: '2', label: 'Load Beads Context', description: '/brainstorming', nodeType: 'skill' },
  { id: '3', label: 'Brainstorm / Decompose', description: 'Route A, B, or C', nodeType: 'decision' },
  { id: '4', label: 'Create Issues', description: 'mcp__beads__create()', nodeType: 'mcp' },
  { id: '5', label: 'Wire Dependencies', description: 'mcp__beads__dep()', nodeType: 'mcp' },
  { id: '6', label: 'Groom Backlog', description: '/plan-backlog', nodeType: 'skill' },
  { id: '7', label: 'Craft Prompts', description: 'gg-write-all', nodeType: 'skill' },
  { id: '8', label: 'Mark Ready', description: 'Add ready label', nodeType: 'mcp' },

  // PHASE 2: EXECUTION (Human entry: gg-auto or gg-spawn)
  { id: '9', label: 'gg-auto / gg-spawn', description: 'Human entry point', nodeType: 'human-entry' },
  { id: '10', label: 'Pre-flight Checks', description: 'TabzChrome + beads daemon', nodeType: 'bash' },
  { id: '11', label: 'Get Ready Issues', description: 'mcp__beads__ready()', nodeType: 'mcp' },
  { id: '12', label: 'Create Worktrees', description: 'bd worktree create', nodeType: 'bash' },
  { id: '13', label: 'Spawn Workers', description: 'tabz_spawn_profile()', nodeType: 'mcp' },
  { id: '14', label: 'Send Prompts', description: 'tabz_send_keys()', nodeType: 'mcp' },
  { id: '15', label: 'Claim Issues', description: 'status -> in_progress', nodeType: 'mcp' },

  // PHASE 3: MONITORING
  { id: '16', label: 'Start Watcher', description: 'worker-watcher agent', nodeType: 'agent' },
  { id: '17', label: 'Poll Workers', description: 'tmuxplexer + beads check', nodeType: 'bash' },
  { id: '18', label: 'Event Detected?', description: 'completed/critical/asking/stale', nodeType: 'decision' },

  // PHASE 4: COMPLETION
  { id: '19', label: 'Run Quality Gates', description: 'gate-runner.sh', nodeType: 'bash' },
  { id: '20', label: 'Finalize Issue', description: 'finalize-issue.sh', nodeType: 'bash' },
  { id: '21', label: 'More Ready?', description: 'Check bd ready', nodeType: 'decision' },
  { id: '22', label: 'Wave Done', description: 'gg-wave-done', nodeType: 'skill' },
  { id: '23', label: 'Sync & Push', description: 'bd sync && git push', nodeType: 'complete' },
];

export const notes: Note[] = [
  {
    id: 'note-legend',
    appearsWithStep: 1,
    position: { x: 520, y: 20 },
    color: { bg: '#1f2428', border: '#30363d' },
    content: `LEGEND
━━━━━━━━━━━━━━━━━━━━
Green: Human Entry Points
Purple: Claude Skills
Yellow: Background Agents
Blue: MCP Tool Calls
Cyan: Shell Commands
Orange: Decisions
Gold: Complete`,
  },
  {
    id: 'note-plan',
    appearsWithStep: 3,
    position: { x: 520, y: 200 },
    color: { bg: '#1f2428', border: '#a371f7' },
    content: `Route A: Brainstorm (no args)
Route B: Decompose (feature desc)
Route C: Groom (has backlog)

Each route may invoke skills:
- /breakdown
- /plan-backlog`,
  },
  {
    id: 'note-spawn',
    appearsWithStep: 13,
    position: { x: 520, y: 520 },
    color: { bg: '#1f2428', border: '#3fb950' },
    content: `Workers run in isolated worktrees
BEADS_WORKING_DIR points to
main repo's database.

Wait 4-8s for Claude to boot
before sending prompts.`,
  },
  {
    id: 'note-events',
    appearsWithStep: 18,
    position: { x: 520, y: 720 },
    color: { bg: '#1f2428', border: '#d29922' },
    content: `Watcher events:
- completed -> Run gates, finalize
- critical -> Context >=75%, notify
- asking -> Needs user input
- stale -> Worker inactive
- timeout -> Re-poll`,
  },
  {
    id: 'note-gates',
    appearsWithStep: 19,
    position: { x: 520, y: 920 },
    color: { bg: '#1f2428', border: '#f0883e' },
    content: `Quality gates from labels:
- gate:test-runner
- gate:codex-review
- gate:visual-qa
- gate:docs-check
- gate:security-scan`,
  },
];

// Layout: staircase down-right for plan, then down-left for execute/monitor/complete
export const positions: { [key: string]: { x: number; y: number } } = {
  // Phase 1: Planning (staircase down-right)
  '1': { x: 20, y: 20 },
  '2': { x: 50, y: 100 },
  '3': { x: 80, y: 180 },
  '4': { x: 110, y: 260 },
  '5': { x: 140, y: 340 },
  '6': { x: 170, y: 420 },
  '7': { x: 200, y: 500 },
  '8': { x: 230, y: 580 },

  // Phase 2: Execution (staircase down-left from right side)
  '9': { x: 260, y: 660 },
  '10': { x: 230, y: 740 },
  '11': { x: 200, y: 820 },
  '12': { x: 170, y: 900 },
  '13': { x: 140, y: 980 },
  '14': { x: 110, y: 1060 },
  '15': { x: 80, y: 1140 },

  // Phase 3: Monitoring
  '16': { x: 50, y: 1220 },
  '17': { x: 20, y: 1300 },
  '18': { x: 50, y: 1380 },

  // Phase 4: Completion (branch right)
  '19': { x: 260, y: 1380 },
  '20': { x: 290, y: 1460 },
  '21': { x: 320, y: 1540 },
  '22': { x: 200, y: 1620 },
  '23': { x: 140, y: 1700 },

  // Notes
  'note-legend': { x: 520, y: 20 },
  'note-plan': { x: 520, y: 200 },
  'note-spawn': { x: 520, y: 520 },
  'note-events': { x: 520, y: 850 },
  'note-gates': { x: 520, y: 1100 },
};

export const edgeConnections: EdgeConnection[] = [
  // Phase 1: Planning flow
  { source: '1', target: '2', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '2', target: '3', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '3', target: '4', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '4', target: '5', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '5', target: '6', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '6', target: '7', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '7', target: '8', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '8', target: '9', sourceHandle: 'bottom', targetHandle: 'top' },

  // Phase 2: Execution flow
  { source: '9', target: '10', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '10', target: '11', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '11', target: '12', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '12', target: '13', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '13', target: '14', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '14', target: '15', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '15', target: '16', sourceHandle: 'bottom', targetHandle: 'top' },

  // Phase 3: Monitoring flow
  { source: '16', target: '17', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '17', target: '18', sourceHandle: 'bottom', targetHandle: 'top' },

  // Phase 4: Completion branches
  { source: '18', target: '19', sourceHandle: 'right', targetHandle: 'left', label: 'completed' },
  { source: '18', target: '17', sourceHandle: 'left-source', targetHandle: 'left', label: 'poll again' },
  { source: '19', target: '20', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '20', target: '21', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '21', target: '13', sourceHandle: 'top-source', targetHandle: 'right-target', label: 'Yes' },
  { source: '21', target: '22', sourceHandle: 'bottom', targetHandle: 'top', label: 'No' },
  { source: '22', target: '23', sourceHandle: 'bottom', targetHandle: 'top' },
];
