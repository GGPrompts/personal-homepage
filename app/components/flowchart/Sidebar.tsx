import { useState, useCallback, useRef, useEffect, DragEvent, ChangeEvent, MouseEvent } from 'react';
import { SavedWorkflow, PromptTemplate, WorkflowTemplate, STORAGE_KEYS, NodeType, Step, EdgeConnection, Note } from './types';
import { useLocalStorage, generateId } from './hooks/useLocalStorage';
import { useFileStorage } from './hooks/useFileStorage';
import { parsePromptyFile, ParsedPrompt } from './utils/promptyParser';

// Pre-built workflow templates
// Pre-built workflow templates
const builtInTemplates: WorkflowTemplate[] = [
  {
    id: 'basic-flow',
    name: 'Basic Flow',
    description: 'Simple human-entry to agent to complete',
    isBuiltIn: true,
    steps: [
      { id: 't1-1', label: 'Start Command', description: 'User entry point', nodeType: 'human-entry' },
      { id: 't1-2', label: 'Process', description: 'Agent processes task', nodeType: 'agent' },
      { id: 't1-3', label: 'Done', description: 'Task completed', nodeType: 'complete' },
    ],
    edges: [
      { source: 't1-1', target: 't1-2', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't1-2', target: 't1-3', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    notes: [],
    positions: {
      't1-1': { x: 100, y: 50 },
      't1-2': { x: 100, y: 150 },
      't1-3': { x: 100, y: 250 },
    },
  },
  {
    id: 'decision-tree',
    name: 'Decision Tree',
    description: 'Entry point with branching decision',
    isBuiltIn: true,
    steps: [
      { id: 't2-1', label: 'Start', description: 'User entry point', nodeType: 'human-entry' },
      { id: 't2-2', label: 'Evaluate', description: 'Check condition', nodeType: 'decision' },
      { id: 't2-3', label: 'Path A', description: 'First branch', nodeType: 'agent' },
      { id: 't2-4', label: 'Path B', description: 'Second branch', nodeType: 'agent' },
      { id: 't2-5', label: 'Complete', description: 'Finished', nodeType: 'complete' },
    ],
    edges: [
      { source: 't2-1', target: 't2-2', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't2-2', target: 't2-3', sourceHandle: 'left-source', targetHandle: 'top', label: 'Yes' },
      { source: 't2-2', target: 't2-4', sourceHandle: 'right', targetHandle: 'top', label: 'No' },
      { source: 't2-3', target: 't2-5', sourceHandle: 'bottom', targetHandle: 'left' },
      { source: 't2-4', target: 't2-5', sourceHandle: 'bottom', targetHandle: 'right-target' },
    ],
    notes: [],
    positions: {
      't2-1': { x: 200, y: 50 },
      't2-2': { x: 200, y: 150 },
      't2-3': { x: 50, y: 280 },
      't2-4': { x: 350, y: 280 },
      't2-5': { x: 200, y: 400 },
    },
  },
  {
    id: 'pipeline',
    name: 'Pipeline',
    description: 'Skill to agent to MCP to complete',
    isBuiltIn: true,
    steps: [
      { id: 't3-1', label: 'Command', description: 'User starts pipeline', nodeType: 'human-entry' },
      { id: 't3-2', label: 'Load Context', description: '/skill-name', nodeType: 'skill' },
      { id: 't3-3', label: 'Process Task', description: 'Agent handles work', nodeType: 'agent' },
      { id: 't3-4', label: 'Call Tool', description: 'mcp__tool__()', nodeType: 'mcp' },
      { id: 't3-5', label: 'Finished', description: 'Pipeline complete', nodeType: 'complete' },
    ],
    edges: [
      { source: 't3-1', target: 't3-2', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't3-2', target: 't3-3', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't3-3', target: 't3-4', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't3-4', target: 't3-5', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    notes: [],
    positions: {
      't3-1': { x: 100, y: 50 },
      't3-2': { x: 100, y: 150 },
      't3-3': { x: 100, y: 250 },
      't3-4': { x: 100, y: 350 },
      't3-5': { x: 100, y: 450 },
    },
  },
  {
    id: 'loop-pattern',
    name: 'Loop Pattern',
    description: 'Processing loop with retry logic',
    isBuiltIn: true,
    steps: [
      { id: 't4-1', label: 'Start', description: 'Begin loop', nodeType: 'human-entry' },
      { id: 't4-2', label: 'Execute', description: 'Run command', nodeType: 'bash' },
      { id: 't4-3', label: 'Check Result', description: 'Success?', nodeType: 'decision' },
      { id: 't4-4', label: 'Done', description: 'Loop complete', nodeType: 'complete' },
    ],
    edges: [
      { source: 't4-1', target: 't4-2', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't4-2', target: 't4-3', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't4-3', target: 't4-4', sourceHandle: 'right', targetHandle: 'top', label: 'Yes' },
      { source: 't4-3', target: 't4-2', sourceHandle: 'left-source', targetHandle: 'left', label: 'Retry' },
    ],
    notes: [],
    positions: {
      't4-1': { x: 150, y: 50 },
      't4-2': { x: 150, y: 150 },
      't4-3': { x: 150, y: 280 },
      't4-4': { x: 350, y: 280 },
    },
  },
  {
    id: '5-phase-orchestration',
    name: '5-Phase Orchestration',
    description: 'Assess -> Design -> Implement -> Validate -> Deploy with contract edges',
    isBuiltIn: true,
    steps: [
      { id: 't5-1', label: 'Start', description: 'Begin orchestration', nodeType: 'human-entry' },
      { id: 't5-2', label: 'Assess', description: 'Analyze requirements and context', nodeType: 'agent' },
      { id: 't5-3', label: 'Assess Gate', description: 'Analysis complete?', nodeType: 'decision' },
      { id: 't5-4', label: 'Design', description: 'Create architecture and plan', nodeType: 'agent' },
      { id: 't5-5', label: 'Design Gate', description: 'Design approved?', nodeType: 'decision' },
      { id: 't5-6', label: 'Implement', description: 'Build the solution', nodeType: 'agent' },
      { id: 't5-7', label: 'Validate', description: 'Run tests and quality checks', nodeType: 'bash' },
      { id: 't5-8', label: 'Validate Gate', description: 'All checks pass?', nodeType: 'decision' },
      { id: 't5-9', label: 'Deploy', description: 'Ship to production', nodeType: 'complete' },
    ],
    edges: [
      { source: 't5-1', target: 't5-2', sourceHandle: 'bottom', targetHandle: 'top' },
      { source: 't5-2', target: 't5-3', sourceHandle: 'bottom', targetHandle: 'top', label: 'analysis.json' },
      { source: 't5-3', target: 't5-4', sourceHandle: 'bottom', targetHandle: 'top', label: 'Pass' },
      { source: 't5-3', target: 't5-2', sourceHandle: 'left-source', targetHandle: 'left', label: 'Revise' },
      { source: 't5-4', target: 't5-5', sourceHandle: 'bottom', targetHandle: 'top', label: 'design.md' },
      { source: 't5-5', target: 't5-6', sourceHandle: 'bottom', targetHandle: 'top', label: 'Pass' },
      { source: 't5-5', target: 't5-4', sourceHandle: 'left-source', targetHandle: 'left', label: 'Revise' },
      { source: 't5-6', target: 't5-7', sourceHandle: 'bottom', targetHandle: 'top', label: 'impl.json' },
      { source: 't5-7', target: 't5-8', sourceHandle: 'bottom', targetHandle: 'top', label: 'results.json' },
      { source: 't5-8', target: 't5-9', sourceHandle: 'bottom', targetHandle: 'top', label: 'Pass' },
      { source: 't5-8', target: 't5-6', sourceHandle: 'left-source', targetHandle: 'left', label: 'Fix' },
    ],
    notes: [],
    positions: {
      't5-1': { x: 200, y: 50 },
      't5-2': { x: 200, y: 130 },
      't5-3': { x: 200, y: 230 },
      't5-4': { x: 200, y: 330 },
      't5-5': { x: 200, y: 430 },
      't5-6': { x: 200, y: 530 },
      't5-7': { x: 200, y: 630 },
      't5-8': { x: 200, y: 730 },
      't5-9': { x: 200, y: 830 },
    },
  },
];

// Node type metadata for the palette
const nodeTypeInfo: { type: NodeType | 'note'; label: string; description: string; color: string }[] = [
  { type: 'human-entry', label: 'Human Entry', description: 'User-typed commands', color: '#3fb950' },
  { type: 'skill', label: 'Skill', description: 'Claude-invoked skills', color: '#a371f7' },
  { type: 'agent', label: 'Agent', description: 'Background agents', color: '#d29922' },
  { type: 'mcp', label: 'MCP', description: 'MCP tool calls', color: '#58a6ff' },
  { type: 'bash', label: 'Bash', description: 'Shell commands', color: '#39d0d0' },
  { type: 'decision', label: 'Decision', description: 'Decision points', color: '#f0883e' },
  { type: 'complete', label: 'Complete', description: 'Completion states', color: '#3fb950' },
  { type: 'note', label: 'Note', description: 'Sticky notes for annotations', color: '#8b949e' },
];

interface SidebarProps {
  onLoadWorkflow: (workflow: SavedWorkflow) => void;
  onMergeTemplate?: (template: { steps: Step[]; edges: EdgeConnection[]; notes: Note[]; positions: Record<string, { x: number; y: number }> }) => void;
  onSaveWorkflow: () => { name: string } & Omit<SavedWorkflow, 'id' | 'name' | 'createdAt' | 'updatedAt'>;
  onNewWorkflow: () => void;
  currentWorkflowName?: string;
  loadedWorkflowId?: string;
  hasUnsavedChanges?: boolean;
}

export function Sidebar({ onLoadWorkflow, onMergeTemplate, onSaveWorkflow, onNewWorkflow, currentWorkflowName, loadedWorkflowId, hasUnsavedChanges }: SidebarProps) {
  const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  const { data: workflows, setData: setWorkflows, isLoading: workflowsLoading, error: workflowsError } = useFileStorage<SavedWorkflow[]>(
    '/api/workflows',
    { fallbackKey: STORAGE_KEYS.WORKFLOWS, initialValue: [] }
  );
  // Local prompts stored in localStorage (user-created)
  const [localPrompts, setLocalPrompts] = useLocalStorage<PromptTemplate[]>(STORAGE_KEYS.PROMPTS, []);
  // File-based prompts loaded from .prompts/ folder via API
  const [filePrompts, setFilePrompts] = useState<ParsedPrompt[]>([]);
  const [filePromptsLoading, setFilePromptsLoading] = useState(true);
  const [filePromptsError, setFilePromptsError] = useState<string | null>(null);
  const [defaultWorkflowId, setDefaultWorkflowId] = useLocalStorage<string | null>(STORAGE_KEYS.DEFAULT_WORKFLOW, null);
  // User-created templates stored in files (like workflows)
  const { data: fileTemplates, setData: setFileTemplates } = useFileStorage<WorkflowTemplate[]>(
    '/api/templates',
    { fallbackKey: STORAGE_KEYS.TEMPLATES, initialValue: [] }
  );

  // Combine built-in and file-based user templates
  const allTemplates = [...builtInTemplates, ...(fileTemplates || [])];

  // Load prompts from .prompts/ folder via API
  useEffect(() => {
    async function loadPrompts() {
      try {
        setFilePromptsError(null);
        // GET /api/prompts returns list of {path, name} objects
        const res = await fetch('/api/prompts');
        if (!res.ok) {
          throw new Error(`Failed to fetch prompts: ${res.status}`);
        }
        const promptFiles: { path: string; name: string }[] = await res.json();

        // Fetch and parse each .prompty file
        const parsed = await Promise.all(
          promptFiles.map(async (file) => {
            const contentRes = await fetch(`/api/prompts/${encodeURIComponent(file.path)}`);
            if (!contentRes.ok) {
              console.warn(`Failed to fetch prompt ${file.path}: ${contentRes.status}`);
              return null;
            }
            const content = await contentRes.text();
            return parsePromptyFile(content, file.path);
          })
        );

        // Filter out any failed fetches
        setFilePrompts(parsed.filter((p): p is ParsedPrompt => p !== null));
      } catch (err) {
        console.error('Failed to load prompts:', err);
        setFilePromptsError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setFilePromptsLoading(false);
      }
    }
    loadPrompts();
  }, []);

  // UI state
  const [activeSection, setActiveSection] = useState<'workflows' | 'prompts' | 'nodes' | 'templates'>('workflows');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [saveWorkflowName, setSaveWorkflowName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create new workflow (clear canvas)
  const handleNewWorkflow = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Create a new workflow anyway?')) {
        onNewWorkflow();
      }
    } else {
      onNewWorkflow();
    }
  }, [hasUnsavedChanges, onNewWorkflow]);

  // Save current workflow
  const handleSaveWorkflow = useCallback(async () => {
    const workflowData = onSaveWorkflow();
    const currentWorkflows = workflows ?? [];
    const name = saveWorkflowName.trim() || `Workflow ${currentWorkflows.length + 1}`;
    const now = new Date().toISOString();

    const newWorkflow: SavedWorkflow = {
      id: generateId(),
      ...workflowData,
      name,
      createdAt: now,
    };

    await setWorkflows([...currentWorkflows, newWorkflow]);
    setSaveWorkflowName('');
    setShowSaveDialog(false);

    // Show save feedback
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [onSaveWorkflow, saveWorkflowName, workflows, setWorkflows]);

  // Update existing workflow
  const handleUpdateWorkflow = useCallback(async () => {
    if (!loadedWorkflowId) return;

    const workflowData = onSaveWorkflow();
    const now = new Date().toISOString();
    const currentWorkflows = workflows ?? [];

    await setWorkflows(
      currentWorkflows.map((w) =>
        w.id === loadedWorkflowId
          ? {
              ...w,
              ...workflowData,
              updatedAt: now,
            }
          : w
      )
    );

    // Show save feedback
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [loadedWorkflowId, onSaveWorkflow, setWorkflows, workflows]);

  // Load workflow
  const handleLoadWorkflow = useCallback((workflow: SavedWorkflow) => {
    onLoadWorkflow(workflow);
  }, [onLoadWorkflow]);

  // Delete workflow
  const handleDeleteWorkflow = useCallback(async (id: string) => {
    if (confirm('Delete this workflow?')) {
      const currentWorkflows = workflows ?? [];
      await setWorkflows(currentWorkflows.filter((w) => w.id !== id));
      // Clear default if deleted workflow was the default
      if (defaultWorkflowId === id) {
        setDefaultWorkflowId(null);
      }
    }
  }, [setWorkflows, workflows, defaultWorkflowId, setDefaultWorkflowId]);

  // Set/unset default workflow
  const handleToggleDefault = useCallback((id: string) => {
    setDefaultWorkflowId(defaultWorkflowId === id ? null : id);
  }, [defaultWorkflowId, setDefaultWorkflowId]);

  // Rename workflow
  const handleRenameWorkflow = useCallback(async (id: string) => {
    if (editName.trim()) {
      const currentWorkflows = workflows ?? [];
      await setWorkflows(
        currentWorkflows.map((w) =>
          w.id === id ? { ...w, name: editName.trim(), updatedAt: new Date().toISOString() } : w
        )
      );
      setEditingId(null);
      setEditName('');
    }
  }, [editName, setWorkflows, workflows]);

  // Start editing workflow name
  const startEditing = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  }, []);

  // Add prompt template (local only)
  const handleAddPrompt = useCallback(() => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;

    const now = new Date().toISOString();
    const newPrompt: PromptTemplate = {
      id: generateId(),
      name: newPromptName.trim(),
      content: newPromptContent.trim(),
      createdAt: now,
    };

    setLocalPrompts((prev) => [...prev, newPrompt]);
    setNewPromptName('');
    setNewPromptContent('');
    setShowNewPrompt(false);
  }, [newPromptName, newPromptContent, setLocalPrompts]);

  // Delete local prompt
  const handleDeletePrompt = useCallback((id: string) => {
    if (confirm('Delete this prompt template?')) {
      setLocalPrompts((prev) => prev.filter((p) => p.id !== id));
    }
  }, [setLocalPrompts]);

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Load a workflow template
  const handleLoadTemplate = useCallback((template: WorkflowTemplate) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Load this template anyway?')) {
        return;
      }
    }

    // Convert template to SavedWorkflow format
    const now = new Date().toISOString();
    const workflow: SavedWorkflow = {
      id: generateId(),
      name: template.name,
      steps: template.steps,
      positions: template.positions,
      edges: template.edges,
      notes: template.notes,
      createdAt: now,
    };

    onLoadWorkflow(workflow);
  }, [hasUnsavedChanges, onLoadWorkflow]);

  // Merge a template into the current canvas
  const handleMergeTemplateClick = useCallback((template: WorkflowTemplate, event: MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the load action
    if (onMergeTemplate) {
      onMergeTemplate({
        steps: template.steps,
        edges: template.edges,
        notes: template.notes,
        positions: template.positions,
      });
    }
  }, [onMergeTemplate]);

  // Save current workflow as a reusable template
  const handleSaveAsTemplate = useCallback(() => {
    const workflowData = onSaveWorkflow();
    const name = prompt('Template name:', currentWorkflowName || 'My Template');
    if (!name) return;

    const description = prompt('Template description (optional):', '') || '';

    const newTemplate: WorkflowTemplate = {
      id: `user-template-${generateId()}`,
      name,
      description,
      steps: workflowData.steps,
      edges: workflowData.edges,
      notes: workflowData.notes,
      positions: workflowData.positions,
      isBuiltIn: false,
    };

    setFileTemplates([...(fileTemplates || []), newTemplate]);
  }, [onSaveWorkflow, currentWorkflowName, setFileTemplates, fileTemplates]);

  // Delete a user-created template
  const handleDeleteTemplate = useCallback((templateId: string, event: MouseEvent) => {
    event.stopPropagation();
    if (confirm('Delete this template?')) {
      setFileTemplates((fileTemplates || []).filter(t => t.id !== templateId));
    }
  }, [setFileTemplates, fileTemplates]);

  // Export current workflow as JSON file
  const handleExportWorkflow = useCallback(() => {
    const workflowData = onSaveWorkflow();
    const now = new Date().toISOString();

    const exportWorkflow: SavedWorkflow = {
      id: loadedWorkflowId || generateId(),
      ...workflowData,
      name: currentWorkflowName || workflowData.name || 'Untitled Workflow',
      createdAt: now,
    };

    const json = JSON.stringify(exportWorkflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportWorkflow.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [onSaveWorkflow, loadedWorkflowId, currentWorkflowName]);

  // Validate imported workflow structure
  const validateWorkflow = useCallback((data: unknown): data is SavedWorkflow => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;

    // Required fields
    if (typeof obj.name !== 'string') return false;
    if (!Array.isArray(obj.steps)) return false;
    if (!obj.positions || typeof obj.positions !== 'object') return false;
    if (!Array.isArray(obj.edges)) return false;
    if (!Array.isArray(obj.notes)) return false;

    // Validate steps have required fields
    for (const step of obj.steps) {
      if (!step || typeof step !== 'object') return false;
      const s = step as Record<string, unknown>;
      if (typeof s.id !== 'string') return false;
      if (typeof s.label !== 'string') return false;
      if (typeof s.nodeType !== 'string') return false;
    }

    return true;
  }, []);

  // Handle file import
  const handleImportFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!validateWorkflow(parsed)) {
          setImportError('Invalid workflow file structure');
          return;
        }

        // Assign new ID to avoid conflicts with existing workflows
        const importedWorkflow: SavedWorkflow = {
          ...parsed,
          id: generateId(),
          createdAt: parsed.createdAt || new Date().toISOString(),
        };

        // Add to saved workflows list
        const currentWorkflows = workflows ?? [];
        await setWorkflows([...currentWorkflows, importedWorkflow]);

        // Load the imported workflow
        onLoadWorkflow(importedWorkflow);
      } catch {
        setImportError('Failed to parse JSON file');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input so the same file can be imported again
    event.target.value = '';
  }, [validateWorkflow, setWorkflows, workflows, onLoadWorkflow]);

  // Trigger file input click
  const handleImportClick = useCallback(() => {
    setImportError(null);
    fileInputRef.current?.click();
  }, []);

  // Handle drag start for node palette
  const handleDragStart = useCallback((event: DragEvent<HTMLDivElement>, nodeType: NodeType | 'note') => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drag start for prompt cards
  const handlePromptDragStart = useCallback((event: DragEvent<HTMLDivElement>, prompt: ParsedPrompt) => {
    const promptData = JSON.stringify({
      name: prompt.name,
      description: prompt.description,
      filePath: prompt.filePath,
    });
    event.dataTransfer.setData('application/prompt', promptData);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drag start for template cards
  const handleTemplateDragStart = useCallback((event: DragEvent<HTMLDivElement>, template: WorkflowTemplate) => {
    const templateData = JSON.stringify({
      steps: template.steps,
      edges: template.edges,
      notes: template.notes,
      positions: template.positions,
    });
    event.dataTransfer.setData('application/template', templateData);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  if (collapsed) {
    return (
      <div className="sidebar collapsed">
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
        >
          <span className="toggle-icon">›</span>
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Saved Items</h2>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
        >
          <span className="toggle-icon">‹</span>
        </button>
      </div>

      {/* Section tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeSection === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveSection('workflows')}
        >
          Workflows
        </button>
        <button
          className={`sidebar-tab ${activeSection === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveSection('templates')}
        >
          Templates
        </button>
        <button
          className={`sidebar-tab ${activeSection === 'prompts' ? 'active' : ''}`}
          onClick={() => setActiveSection('prompts')}
        >
          Prompts
        </button>
        <button
          className={`sidebar-tab ${activeSection === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveSection('nodes')}
        >
          Nodes
        </button>
      </div>

      <div className="sidebar-content">
        {activeSection === 'workflows' && (
          <div className="sidebar-section">
            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />

            {/* Save/Update/New buttons */}
            {!showSaveDialog ? (
              <div className="sidebar-action-buttons">
                <button className="sidebar-action-btn new-btn" onClick={handleNewWorkflow}>
                  + New Workflow
                </button>
                <button className="sidebar-action-btn" onClick={() => setShowSaveDialog(true)}>
                  + Save Current Workflow
                </button>
                {loadedWorkflowId && (
                  <button
                    className={`sidebar-action-btn update-btn ${saveStatus === 'saved' ? 'saved' : ''}`}
                    onClick={handleUpdateWorkflow}
                  >
                    {saveStatus === 'saved' ? 'Saved!' : `Update "${currentWorkflowName}"`}
                  </button>
                )}
                <div className="sidebar-action-row">
                  <button className="sidebar-action-btn export-btn" onClick={handleExportWorkflow}>
                    Export JSON
                  </button>
                  <button className="sidebar-action-btn import-btn" onClick={handleImportClick}>
                    Import JSON
                  </button>
                </div>
                {importError && (
                  <div className="import-error">{importError}</div>
                )}
                {saveStatus === 'saved' && (
                  <div className="save-success">Workflow saved!</div>
                )}
              </div>
            ) : (
              <div className="save-dialog">
                <input
                  type="text"
                  placeholder="Workflow name..."
                  value={saveWorkflowName}
                  onChange={(e) => setSaveWorkflowName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveWorkflow()}
                  autoFocus
                />
                <div className="save-dialog-buttons">
                  <button onClick={handleSaveWorkflow}>Save</button>
                  <button onClick={() => setShowSaveDialog(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Workflow list */}
            <div className="item-list">
              {workflowsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>Loading workflows...</span>
                </div>
              ) : workflowsError && !workflows ? (
                <div className="error-state">Failed to load workflows</div>
              ) : !workflows || workflows.length === 0 ? (
                <div className="empty-state">No saved workflows yet</div>
              ) : (
                workflows.map((workflow) => (
                  <div key={workflow.id} className={`item-card ${defaultWorkflowId === workflow.id ? 'is-default' : ''}`}>
                    {editingId === workflow.id ? (
                      <div className="edit-name">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameWorkflow(workflow.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                        />
                        <button onClick={() => handleRenameWorkflow(workflow.id)}>✓</button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="item-name"
                          onClick={() => handleLoadWorkflow(workflow)}
                          title="Click to load"
                        >
                          {workflow.name}
                        </div>
                        <div className="item-meta">
                          {workflow.steps.length} steps · {new Date(workflow.createdAt).toLocaleDateString()}
                        </div>
                        <div className="item-actions">
                          <button
                            onClick={() => handleToggleDefault(workflow.id)}
                            title={defaultWorkflowId === workflow.id ? "Remove as default" : "Set as default (loads on startup)"}
                            className={defaultWorkflowId === workflow.id ? 'is-default' : ''}
                          >
                            {defaultWorkflowId === workflow.id ? '★' : '☆'}
                          </button>
                          <button
                            onClick={() => startEditing(workflow.id, workflow.name)}
                            title="Rename"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSection === 'templates' && (
          <div className="sidebar-section">
            <button
              className="save-template-btn"
              onClick={handleSaveAsTemplate}
              title="Save current workflow as a reusable template"
            >
              Save Current as Template
            </button>
            <div className="template-hint">
              Drag onto canvas, click to load, or + to merge
            </div>
            <div className="template-list">
              {allTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${template.isBuiltIn ? 'built-in' : 'user-template'}`}
                  draggable
                  onDragStart={(e) => handleTemplateDragStart(e, template)}
                  onClick={() => handleLoadTemplate(template)}
                  title="Drag onto canvas to add at cursor, or click to load as new workflow"
                >
                  <div className="template-header">
                    <div className="template-name">
                      {template.name}
                      {!template.isBuiltIn && <span className="user-badge">Custom</span>}
                    </div>
                    <div className="template-actions">
                      {!template.isBuiltIn && (
                        <button
                          className="template-delete-btn"
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          title="Delete template"
                        >
                          ×
                        </button>
                      )}
                      {onMergeTemplate && (
                        <button
                          className="template-merge-btn"
                          onClick={(e) => handleMergeTemplateClick(template, e)}
                          title="Add to end of current canvas"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="template-description">{template.description}</div>
                  <div className="template-meta">
                    {template.steps.length} nodes · {template.edges.length} edges
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'prompts' && (
          <div className="sidebar-section">
            {/* File-based prompts from .prompts/ folder */}
            <div className="prompts-subsection">
              <div className="prompts-subsection-header">From .prompts/ folder</div>
              <div className="item-list">
                {filePromptsLoading ? (
                  <div className="loading-state">
                    <div className="loading-spinner" />
                    <span>Loading prompts...</span>
                  </div>
                ) : filePromptsError ? (
                  <div className="empty-state">
                    {filePromptsError.includes('404') || filePromptsError.includes('Failed')
                      ? 'No .prompts/ folder found'
                      : `Error: ${filePromptsError}`}
                  </div>
                ) : filePrompts.length === 0 ? (
                  <div className="empty-state">No .prompty files in .prompts/ folder</div>
                ) : (
                  filePrompts.map((prompt) => (
                    <div
                      key={prompt.filePath || prompt.name}
                      className="item-card prompt-card file-prompt"
                      draggable
                      onDragStart={(e) => handlePromptDragStart(e, prompt)}
                      title="Drag onto canvas to create a workflow node"
                    >
                      <div className="item-name">{prompt.name}</div>
                      {prompt.description && (
                        <div className="prompt-description">{prompt.description}</div>
                      )}
                      <div className="prompt-meta">
                        {prompt.variables.length > 0 && (
                          <span className="prompt-variables">
                            {prompt.variables.length} variable{prompt.variables.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {prompt.tags && prompt.tags.length > 0 && (
                          <span className="prompt-tags">
                            {prompt.tags.slice(0, 3).join(', ')}
                            {prompt.tags.length > 3 && '...'}
                          </span>
                        )}
                      </div>
                      <div className="item-actions">
                        <button
                          onClick={() => handleCopyPrompt(prompt.template)}
                          title="Copy template to clipboard"
                        >
                          Copy
                        </button>
                        {prompt.url && (
                          <a
                            href={prompt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="prompt-link"
                            title="Open URL"
                          >
                            Link
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Local prompts (user-created) */}
            <div className="prompts-subsection">
              <div className="prompts-subsection-header">Custom Prompts</div>
              {/* Add prompt button */}
              {!showNewPrompt ? (
                <button className="sidebar-action-btn" onClick={() => setShowNewPrompt(true)}>
                  + Add Prompt Template
                </button>
              ) : (
                <div className="new-prompt-form">
                  <input
                    type="text"
                    placeholder="Template name..."
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    placeholder="Prompt content..."
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    rows={4}
                  />
                  <div className="save-dialog-buttons">
                    <button onClick={handleAddPrompt}>Add</button>
                    <button onClick={() => setShowNewPrompt(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Local prompt list */}
              <div className="item-list">
                {localPrompts.length === 0 ? (
                  <div className="empty-state">No custom prompts yet</div>
                ) : (
                  localPrompts.map((prompt) => (
                    <div key={prompt.id} className="item-card prompt-card">
                      <div className="item-name">{prompt.name}</div>
                      <div className="prompt-preview">
                        {prompt.content.length > 100 ? `${prompt.content.slice(0, 100)}...` : prompt.content}
                      </div>
                      <div className="item-actions">
                        <button
                          onClick={() => handleCopyPrompt(prompt.content)}
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          title="Delete"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'nodes' && (
          <div className="sidebar-section">
            <div className="node-palette-hint">
              Drag nodes onto the canvas to add them
            </div>
            <div className="node-palette">
              {nodeTypeInfo.map((info) => (
                <div
                  key={info.type}
                  className="node-palette-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, info.type)}
                  style={{
                    borderColor: info.color,
                  }}
                >
                  <div
                    className="node-palette-indicator"
                    style={{ backgroundColor: info.color }}
                  />
                  <div className="node-palette-content">
                    <div className="node-palette-label">{info.label}</div>
                    <div className="node-palette-description">{info.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentWorkflowName && (
        <div className="sidebar-footer">
          Current: {currentWorkflowName}
        </div>
      )}
    </div>
  );
}
