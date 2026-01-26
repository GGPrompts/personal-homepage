# Flowchart

ReactFlow-based workflow editor for visualizing Claude Code automation pipelines.

## Files

- `app/sections/flowchart.tsx` - Section wrapper with ReactFlowProvider
- `app/components/flowchart/` - All flowchart components

### Core Components

| File | Purpose |
|------|---------|
| `components/FlowEditor.tsx` | Main editor with canvas, controls, context menus |
| `Sidebar.tsx` | Workflow/template/node palette sidebar |
| `types.ts` | TypeScript types for nodes, edges, workflows |

### Node Components

| File | Purpose |
|------|---------|
| `components/nodes/CustomNode.tsx` | Standard workflow node with inline editing |
| `components/nodes/NoteNode.tsx` | Sticky note for annotations |
| `components/nodes/GroupNode.tsx` | Collapsible container for grouping nodes |

### Edge Components

| File | Purpose |
|------|---------|
| `components/edges/EditableEdge.tsx` | Edge with inline label editing |

### Context Menus

| File | Purpose |
|------|---------|
| `components/menus/CanvasContextMenu.tsx` | Right-click on empty canvas |
| `components/menus/NodeContextMenu.tsx` | Right-click on nodes |
| `components/menus/EdgeContextMenu.tsx` | Right-click on edges |

### Hooks

| File | Purpose |
|------|---------|
| `hooks/useLocalStorage.ts` | Persist data to localStorage |
| `hooks/useFileStorage.ts` | Sync data with file-based API |
| `hooks/useHistory.ts` | Undo/redo state management |
| `hooks/useTabzConnection.ts` | TabzChrome WebSocket connection |
| `hooks/useDragAndDrop.ts` | Drag nodes from sidebar to canvas |
| `hooks/useContextMenu.ts` | Context menu positioning |
| `hooks/useKeyboardShortcuts.ts` | Keyboard shortcut handling |

### Utilities

| File | Purpose |
|------|---------|
| `utils/nodeFactory.ts` | Create node objects |
| `utils/edgeFactory.ts` | Create edge objects |
| `utils/depthGroups.ts` | Compute depth-based node grouping |
| `utils/promptyParser.ts` | Parse .prompty file format |

### Constants

| File | Purpose |
|------|---------|
| `constants/nodeTypes.ts` | Node type definitions and colors |
| `constants/layoutUtils.ts` | Dagre auto-layout algorithm |
| `constants/initialData.ts` | Default workflow data |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workflows` | GET | List all workflows from `~/BeadsHive/docs/flowchart/workflows/` |
| `/api/workflows` | PUT | Bulk save workflows (array) |
| `/api/templates` | GET | List workflow templates |
| `/api/templates` | PUT | Bulk save templates |
| `/api/prompts` | GET | List .prompty files from `~/.prompts/` |
| `/api/prompts/{path}` | GET | Read individual prompty file content |

## Node Types

| Type | Color | Purpose |
|------|-------|---------|
| `human-entry` | Green | User command entry point (gg-plan, gg-spawn) |
| `skill` | Purple | Claude skill invocation (/skillname) |
| `agent` | Yellow | Background agent (worker-watcher) |
| `mcp` | Blue | MCP tool call (mcp__beads__*, tabz_*) |
| `bash` | Cyan | Shell command (bd worktree, finalize-issue.sh) |
| `decision` | Orange | Branching logic / decision point |
| `complete` | Gold | Completion state |
| `group` | Indigo | Collapsible container for grouping nodes |
| `note` | Gray | Sticky note for annotations |

## Features

### Canvas Interaction

- **Drag nodes** from sidebar palette onto canvas
- **Right-click** context menus for nodes, edges, and canvas
- **Double-click** nodes or edges to edit inline
- **Drag handles** to create new connections
- **Multi-select** nodes with Shift+Click or box selection
- **Group nodes** by selecting multiple and clicking "Group Selected"

### Step-by-Step Reveal

- Nodes are organized by depth (distance from entry points)
- Use Previous/Next buttons to progressively reveal workflow
- "Show All" displays entire workflow
- "Reset" returns to first step

### Auto-Layout

- Dagre algorithm arranges nodes hierarchically
- Toggle between vertical (top-to-bottom) and horizontal (left-to-right)
- Preserves edge connections during layout

### Undo/Redo

- Full history tracking for all changes
- Undo: Ctrl+Z (Cmd+Z on Mac)
- Redo: Ctrl+Y or Ctrl+Shift+Z

### Workflow Management

- **New Workflow**: Start with empty canvas
- **Save Workflow**: Save current state with name
- **Update Workflow**: Overwrite loaded workflow
- **Export JSON**: Download workflow as file
- **Import JSON**: Load workflow from file
- **Set Default**: Auto-load workflow on startup

### Templates

- Built-in templates: Basic Flow, Decision Tree, Pipeline, Loop Pattern, 5-Phase Orchestration
- Save current workflow as reusable template
- Click template to replace canvas
- Drag template onto canvas to merge
- Click "+" to append template to existing workflow

### Prompts Integration

- Lists .prompty files from `~/.prompts/` folder
- Drag prompt onto canvas to create skill node
- Copy prompt content to clipboard
- View prompt variables and tags

### TabzChrome Integration

When TabzChrome is connected (localhost:8129):
- Queue commands to current terminal
- Spawn new terminal tabs with commands
- Right-click skill nodes to open in TFE

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `?` | Show/hide help modal |
| `Delete` / `Backspace` | Delete selected nodes |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+Z` | Redo (alternative) |
| `Ctrl+A` | Select all |
| `Escape` | Deselect all / Close modal |
| Mouse wheel | Zoom in/out |
| Click + Drag | Pan canvas |

## TabzChrome Selectors

- `data-tabz-section="flowchart"` - Container

## Storage

### File-Based (Primary)

- **Workflows**: `~/BeadsHive/docs/flowchart/workflows/*.json`
- **Templates**: `~/BeadsHive/docs/flowchart/templates/*.json`
- **Prompts**: `~/.prompts/**/*.prompty`

### LocalStorage (Fallback)

- `flowchart-workflows` - Saved workflows
- `flowchart-prompts` - Custom prompt templates
- `flowchart-templates` - User-created templates
- `flowchart-sidebar-collapsed` - Sidebar state
- `flowchart-default-workflow` - Default workflow ID

## Workflow JSON Schema

```typescript
interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: Step[];
  positions: Record<string, { x: number; y: number }>;
  edges: EdgeConnection[];
  notes: Note[];
  createdAt: string;
  updatedAt?: string;
}

interface Step {
  id: string;
  label: string;
  description: string;
  nodeType: NodeType;
  skillPath?: string;     // Path to skill folder
  skillMetadata?: SkillMetadata;
  promptPath?: string;    // Path to .prompty file
}

interface EdgeConnection {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

interface Note {
  id: string;
  appearsWithStep: number;
  position: { x: number; y: number };
  color: { bg: string; border: string };
  content: string;
  width?: number;
  height?: number;
}
```

## Connection Validation Rules

1. **Complete nodes** cannot have outgoing connections (terminal state)
2. **Human-entry nodes** cannot have incoming connections (entry points only)
3. **Self-connections** are not allowed
4. **Duplicate edges** (same source and target) are prevented
