import { useCallback, useState, useRef, useEffect } from 'react';
import type { Node, Edge, NodeChange, EdgeChange, Connection, IsValidConnection } from '@xyflow/react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../flowchart.css';
import { Sidebar } from '../Sidebar';
import { HelpModal } from './HelpModal';
import { EditableEdge } from './edges';
import { CustomNode, NoteNode, GroupNode } from './nodes';
import { CanvasContextMenu, NodeContextMenu, EdgeContextMenu } from './menus';
import type { CustomNodeData } from './nodes';
import { generateId } from '../hooks/useLocalStorage';
import { useHistory, HistoryState } from '../hooks/useHistory';
import { useContextMenu } from '../hooks/useContextMenu';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { STORAGE_KEYS } from '../types';
import type { NodeType, Step, EdgeConnection, Note, SavedWorkflow, SkillMetadata } from '../types';
import {
  defaultNodeLabels,
  nodeWidth,
  nodeHeight,
  nodeColors,
} from '../constants';
import { getLayoutedElements } from '../constants/layoutUtils';
import { allSteps, notes, positions, edgeConnections } from '../constants/initialData';
import { createNode, createNoteNode, createEdge, computeDepthGroups, getVisibleNodeIds, getNodesAtDepth } from '../utils';

const nodeTypes = { custom: CustomNode, note: NoteNode, group: GroupNode };
const edgeTypes = { editable: EditableEdge };

export interface FlowEditorProps {
  tabzConnected: boolean;
  tabzQueue: (command: string) => void;
  tabzSpawn: (options: { name?: string; workingDir?: string; command?: string }) => Promise<boolean>;
}

export function FlowEditor({ tabzConnected, tabzQueue, tabzSpawn }: FlowEditorProps) {
  // Depth-based step progression: visibleDepth is the current depth level (1-indexed)
  const [visibleDepth, setVisibleDepth] = useState(1);
  // Computed depth groups: array of node ID arrays grouped by depth
  const [depthGroups, setDepthGroups] = useState<string[][]>([]);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string | undefined>();
  const [currentWorkflowDescription, setCurrentWorkflowDescription] = useState<string | undefined>();
  const [loadedWorkflowId, setLoadedWorkflowId] = useState<string | undefined>();
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);
  const nodePositions = useRef<{ [key: string]: { x: number; y: number } }>({ ...positions });
  const [currentSteps, setCurrentSteps] = useState<Step[]>(allSteps);
  const [currentNotes, setCurrentNotes] = useState<Note[]>(notes);
  const [currentEdges, setCurrentEdges] = useState<EdgeConnection[]>(edgeConnections);
  const [lastSavedState, setLastSavedState] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, setCenter, getNode, getZoom, fitView } = useReactFlow();

// Context menu hook
  const {
    contextMenu,
    canvasClickPosition,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    handleCanvasContextMenu,
    closeContextMenu,
  } = useContextMenu({ screenToFlowPosition });

  // Track which node should enter edit mode
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

// Track selected nodes for grouping
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Track collapsed group state: groupId -> boolean (accessed via setter callback)
  const [, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Track group membership: childId -> parentGroupId
  const [nodeParentGroups, setNodeParentGroups] = useState<Record<string, string>>({});

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Background visibility state
  const [showBackground, setShowBackground] = useState(true);

  // Layout direction state for auto-layout: 'TB' (top-bottom) or 'LR' (left-right)
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Compute depth groups when steps or edges change
  useEffect(() => {
    const groups = computeDepthGroups(currentSteps, currentEdges);
    setDepthGroups(groups);
    // Ensure visibleDepth is within valid range
    if (groups.length > 0 && visibleDepth > groups.length) {
      setVisibleDepth(groups.length);
    }
  }, [currentSteps, currentEdges, visibleDepth]);

  // Undo/Redo history
  const initialHistoryState: HistoryState = {
    steps: allSteps,
    notes: notes,
    edges: edgeConnections,
    positions: { ...positions },
  };
  const { canUndo, canRedo, undo, redo, pushState } = useHistory(initialHistoryState);

  // Flag to prevent pushing state during undo/redo restoration
  const isRestoringRef = useRef(false);

  // Capture current state as a history snapshot
  const captureState = useCallback((): HistoryState => {
    return {
      steps: currentSteps,
      notes: currentNotes,
      edges: currentEdges,
      positions: { ...nodePositions.current },
    };
  }, [currentSteps, currentNotes, currentEdges]);

  // Push current state to history (call after meaningful changes)
  const saveToHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    pushState(captureState());
  }, [pushState, captureState]);

  // Restore state from history snapshot (full implementation after getNodes is defined)
  const restoreStateRef = useRef<(state: HistoryState) => void>(() => {});

  // Handle undo action
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      restoreStateRef.current(prevState);
    }
  }, [undo]);

  // Handle redo action
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      restoreStateRef.current(nextState);
    }
  }, [redo]);

  // Keyboard shortcuts for undo/redo and help modal
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleHelp: useCallback(() => setShowHelpModal(prev => !prev), []),
    onCloseHelp: useCallback(() => setShowHelpModal(false), []),
    isHelpModalOpen: showHelpModal,
  });

  // Track unsaved changes by comparing current state to last saved state
  const getCurrentStateHash = useCallback(() => {
    return JSON.stringify({
      steps: currentSteps,
      notes: currentNotes,
      edges: currentEdges,
      positions: nodePositions.current,
    });
  }, [currentSteps, currentNotes, currentEdges]);

  const hasUnsavedChanges = lastSavedState !== null && getCurrentStateHash() !== lastSavedState;

  // Initialize the saved state on mount
  useEffect(() => {
    if (lastSavedState === null) {
      setLastSavedState(getCurrentStateHash());
    }
  }, [lastSavedState, getCurrentStateHash]);

  // Handler for node data changes from inline editing
  const handleNodeDataChange = useCallback((nodeId: string, newTitle: string, newDescription: string, newSkillPath?: string, newSkillMetadata?: SkillMetadata) => {
    // Update the underlying steps data
    setCurrentSteps(prevSteps => {
      const newSteps = prevSteps.map(step =>
        step.id === nodeId
          ? { ...step, label: newTitle, description: newDescription, skillPath: newSkillPath, skillMetadata: newSkillMetadata }
          : step
      );
      // Schedule history save after state update
      setTimeout(() => {
        if (!isRestoringRef.current) {
          pushState({
            steps: newSteps,
            notes: currentNotes,
            edges: currentEdges,
            positions: { ...nodePositions.current },
          });
        }
      }, 0);
      return newSteps;
    });
    // Update the displayed nodes
    setNodes((nds: Node[]) =>
      nds.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                title: newTitle,
                description: newDescription,
                skillPath: newSkillPath,
                skillMetadata: newSkillMetadata,
              },
            }
          : node
      )
    );
  }, [currentNotes, currentEdges, pushState]);

  // Handler for note content changes from inline editing
  // Note: setNodes is stable (setter from useState) so we don't need it in deps
  const handleNoteContentChange = useCallback((noteId: string, newContent: string) => {
    // Update the underlying notes data
    setCurrentNotes(prevNotes => {
      const newNotes = prevNotes.map(note =>
        note.id === noteId
          ? { ...note, content: newContent }
          : note
      );
      // Schedule history save after state update
      setTimeout(() => {
        if (!isRestoringRef.current) {
          pushState({
            steps: currentSteps,
            notes: newNotes,
            edges: currentEdges,
            positions: { ...nodePositions.current },
          });
        }
      }, 0);
      return newNotes;
    });
    // Update the displayed nodes
    setNodes((nds: Node[]) =>
      nds.map(node =>
        node.id === noteId
          ? {
              ...node,
              data: {
                ...node.data,
                content: newContent,
              },
            }
          : node
      )
    );
  }, [currentSteps, currentEdges, pushState]);

  const clearEditingNode = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Get nodes with visibility based on depth level
  // visibleNodeIds: set of node IDs that should be visible (computed from depth groups)
  const getNodesWithVisibility = useCallback((
    visibleNodeIds: Set<string>,
    steps: Step[] = currentSteps,
    notesList: Note[] = currentNotes,
    editNodeId: string | null = null
  ) => {
    const stepNodes = steps.map((step) =>
      createNode(
        step,
        visibleNodeIds.has(step.id),
        nodePositions.current[step.id],
        (newTitle, newDescription, newSkillPath, newSkillMetadata) => handleNodeDataChange(step.id, newTitle, newDescription, newSkillPath, newSkillMetadata),
        handleNodeContextMenu,
        step.id === editNodeId,
        clearEditingNode
      )
    );
    // Notes visibility: show if any of the visible nodes is at or after the note's appearsWithStep
    // For depth-based, we need to check if the depth level >= the note's appearsWithStep
    const noteNodes = notesList.map(note => {
      // Note appears when we've shown enough depth levels
      // appearsWithStep was 1-indexed count, so we compare with depthLevel
      const noteVisible = visibleNodeIds.size > 0 && note.appearsWithStep <= visibleNodeIds.size;
      return createNoteNode(
        note,
        noteVisible,
        nodePositions.current[note.id],
        (newContent) => handleNoteContentChange(note.id, newContent)
      );
    });
    return [...stepNodes, ...noteNodes];
  }, [currentSteps, currentNotes, handleNodeDataChange, handleNodeContextMenu, clearEditingNode, handleNoteContentChange]);

  // Legacy getNodes for compatibility - converts count to visible node IDs using depth groups
  const getNodes = useCallback((depthLevel: number, steps: Step[] = currentSteps, notesList: Note[] = currentNotes, editNodeId: string | null = null) => {
    // Compute depth groups for the given steps and current edges
    const groups = computeDepthGroups(steps, currentEdges);
    const visibleIds = getVisibleNodeIds(groups, depthLevel);
    const visibleSet = new Set(visibleIds);
    return getNodesWithVisibility(visibleSet, steps, notesList, editNodeId);
  }, [currentSteps, currentEdges, getNodesWithVisibility]);

  // Create initial edges without callbacks (callbacks added via useEffect)
  const initialNodes = getNodes(1);
  const initialEdges: Edge[] = edgeConnections.map((conn) =>
    createEdge(conn, false)
  );

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Context menu actions (defined after hooks that provide setNodes/setEdges/nodes)
  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu.nodeId) return;
    // Set the editing node ID to trigger edit mode
    setEditingNodeId(contextMenu.nodeId);
  }, [contextMenu.nodeId]);

  // Update nodes when editingNodeId changes (including clearing triggerEdit when null)
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.type === 'custom') {
        return {
          ...node,
          data: {
            ...node.data,
            triggerEdit: node.id === editingNodeId,
            onEditComplete: clearEditingNode,
          },
        };
      }
      return node;
    }));
  }, [editingNodeId, setNodes, clearEditingNode]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu.nodeId) return;
    const nodeId = contextMenu.nodeId;

    // Remove from currentSteps
    setCurrentSteps(prevSteps => prevSteps.filter(step => step.id !== nodeId));

    // Remove the node
    setNodes(nds => nds.filter(node => node.id !== nodeId));

    // Remove connected edges
    setEdges(eds => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));

    // Clean up position tracking
    delete nodePositions.current[nodeId];
  }, [contextMenu.nodeId, setNodes, setEdges]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (!contextMenu.nodeId) return;

    // Find the original step and node
    const originalStep = currentSteps.find(s => s.id === contextMenu.nodeId);
    const originalNode = nodes.find(n => n.id === contextMenu.nodeId);
    if (!originalStep || !originalNode) return;

    // Generate new ID
    const newId = `node-${generateId()}`;

    // Create new step
    const newStep: Step = {
      id: newId,
      label: `${originalStep.label} (copy)`,
      description: originalStep.description,
      nodeType: originalStep.nodeType,
    };

    // Calculate new position (offset by 50px)
    const newPosition = {
      x: (originalNode.position?.x || 0) + 50,
      y: (originalNode.position?.y || 0) + 50,
    };

    // Add to steps
    setCurrentSteps(prev => [...prev, newStep]);

    // Store position
    nodePositions.current[newId] = newPosition;

    // Create and add the new node
    const newNode = createNode(
      newStep,
      true,
      newPosition,
      (newTitle, newDescription, newSkillPath, newSkillMetadata) => handleNodeDataChange(newId, newTitle, newDescription, newSkillPath, newSkillMetadata),
      handleNodeContextMenu
    );

    setNodes(nds => [...nds, newNode]);
    // Depth will be recalculated by the effect, but show the new node
    setVisibleDepth(prev => prev + 1);
  }, [contextMenu.nodeId, currentSteps, nodes, setNodes, handleNodeDataChange, handleNodeContextMenu]);

  const handleContextMenuChangeType = useCallback((newType: NodeType) => {
    if (!contextMenu.nodeId) return;
    const nodeId = contextMenu.nodeId;

    // Update the step
    setCurrentSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === nodeId
          ? { ...step, nodeType: newType }
          : step
      )
    );

    // Update the node
    setNodes((nds: Node[]) =>
      nds.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                nodeType: newType,
              },
            }
          : node
      )
    );
  }, [contextMenu.nodeId, setNodes]);

  // Handle opening skill folder or prompt file in TFE
  const handleOpenInTFE = useCallback((method: 'spawn' | 'queue') => {
    if (!contextMenu.nodeId) return;

    // Find the node to get its skillPath or promptPath
    const step = currentSteps.find(s => s.id === contextMenu.nodeId);
    const isPrompt = step?.promptPath && !step?.skillPath;

    // For prompts, the path is relative to ~/.prompts/, so prepend that
    // For skills, use the skillPath directly (already absolute or ~-prefixed)
    let editablePath: string | undefined;
    if (isPrompt && step?.promptPath) {
      // promptPath is relative like "folder/file.prompty", prepend ~/.prompts/
      editablePath = `~/.prompts/${step.promptPath}`;
    } else {
      editablePath = step?.skillPath;
    }

    if (!editablePath) return;

    // For prompts, open the file directly; for skills, cd to folder and open
    const tfeCommand = isPrompt ? `tfe "${editablePath}"` : 'tfe .';
    const workingDir = isPrompt
      ? editablePath.substring(0, editablePath.lastIndexOf('/')) || '~/.prompts'
      : editablePath;

    if (method === 'spawn') {
      // Open in new TFE tab
      tabzSpawn({
        name: `TFE: ${step?.label || (isPrompt ? 'Prompt' : 'Skill')}`,
        workingDir: workingDir,
        command: tfeCommand
      });
    } else {
      // Queue command to current terminal
      tabzQueue(tfeCommand);
    }

    // Close context menu
    closeContextMenu();
  }, [contextMenu.nodeId, currentSteps, tabzSpawn, tabzQueue, closeContextMenu]);

  // Toolbar action handlers (accept nodeId directly for use in node components)
  const handleToolbarEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const handleToolbarDelete = useCallback((nodeId: string) => {
    // Remove from currentSteps
    setCurrentSteps(prevSteps => prevSteps.filter(step => step.id !== nodeId));
    // Remove the node
    setNodes(nds => nds.filter(node => node.id !== nodeId));
    // Remove connected edges
    setEdges(eds => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    // Clean up position tracking
    delete nodePositions.current[nodeId];
  }, [setNodes, setEdges]);

  const handleToolbarChangeType = useCallback((nodeId: string, newType: NodeType) => {
    // Update the step
    setCurrentSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === nodeId
          ? { ...step, nodeType: newType }
          : step
      )
    );

    // Update the node
    setNodes((nds: Node[]) =>
      nds.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                nodeType: newType,
              },
            }
          : node
      )
    );
  }, [setNodes]);

  const handleToolbarDuplicate = useCallback((nodeId: string) => {
    // Generate new ID upfront
    const newId = `node-${generateId()}`;

    // Use functional updates to avoid depending on nodes/currentSteps directly
    // This prevents the infinite loop where nodes change -> handler changes -> effect runs -> nodes change
    setCurrentSteps(prevSteps => {
      const originalStep = prevSteps.find(s => s.id === nodeId);
      if (!originalStep) return prevSteps;

      const newStep: Step = {
        id: newId,
        label: `${originalStep.label} (copy)`,
        description: originalStep.description,
        nodeType: originalStep.nodeType,
        skillPath: originalStep.skillPath,
        skillMetadata: originalStep.skillMetadata,
      };
      return [...prevSteps, newStep];
    });

    setNodes(currentNodes => {
      const originalNode = currentNodes.find(n => n.id === nodeId);
      if (!originalNode) return currentNodes;

      // Calculate new position (offset by 50px)
      const newPosition = {
        x: (originalNode.position?.x || 0) + 50,
        y: (originalNode.position?.y || 0) + 50,
      };

      // Store position
      nodePositions.current[newId] = newPosition;

      // Get original data to copy
      const originalData = originalNode.data as unknown as CustomNodeData;

      // Create and add the new node with toolbar callbacks
      const newStep: Step = {
        id: newId,
        label: `${originalData.title} (copy)`,
        description: originalData.description,
        nodeType: originalData.nodeType,
        skillPath: originalData.skillPath,
        skillMetadata: originalData.skillMetadata,
      };

      const newNode = createNode(
        newStep,
        true,
        newPosition,
        (newTitle, newDescription, newSkillPath, newSkillMetadata) => handleNodeDataChange(newId, newTitle, newDescription, newSkillPath, newSkillMetadata),
        handleNodeContextMenu,
        false,
        undefined,
        {
          onToolbarEdit: () => handleToolbarEdit(newId),
          onToolbarDelete: () => handleToolbarDelete(newId),
          onToolbarDuplicate: () => handleToolbarDuplicate(newId),
          onToolbarChangeType: (type: NodeType) => handleToolbarChangeType(newId, type),
        }
      );

      return [...currentNodes, newNode];
    });

    // Depth will be recalculated by the effect, but show the new node
    setVisibleDepth(prev => prev + 1);
  }, [setNodes, handleNodeDataChange, handleNodeContextMenu, handleToolbarEdit, handleToolbarDelete, handleToolbarChangeType]);

  // Update nodes with toolbar callbacks
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.type === 'custom') {
        const nodeId = node.id;
        return {
          ...node,
          data: {
            ...node.data,
            onToolbarEdit: () => handleToolbarEdit(nodeId),
            onToolbarDelete: () => handleToolbarDelete(nodeId),
            onToolbarDuplicate: () => handleToolbarDuplicate(nodeId),
            onToolbarChangeType: (type: NodeType) => handleToolbarChangeType(nodeId, type),
          },
        };
      }
      return node;
    }));
  }, [setNodes, handleToolbarEdit, handleToolbarDelete, handleToolbarDuplicate, handleToolbarChangeType]);

  // Add node from canvas context menu
  const handleAddNodeFromContextMenu = useCallback((nodeType: NodeType, position: { x: number; y: number }) => {
    // Generate a unique ID for the new node
    const newId = `node-${generateId()}`;

    // Get default label for this node type
    const defaults = defaultNodeLabels[nodeType];

    // Create the new step
    const newStep: Step = {
      id: newId,
      label: defaults.label,
      description: defaults.description,
      nodeType: nodeType,
    };

    // Add to current steps
    setCurrentSteps(prev => [...prev, newStep]);

    // Store the position
    nodePositions.current[newId] = position;

    // Create and add the new node
    const newNode = createNode(
      newStep,
      true,
      position,
      (newTitle, newDescription, newSkillPath, newSkillMetadata) => handleNodeDataChange(newId, newTitle, newDescription, newSkillPath, newSkillMetadata),
      handleNodeContextMenu
    );

    setNodes(nds => [...nds, newNode]);

    // Update visible depth to include the new node
    setVisibleDepth(prev => prev + 1);

    // Save to history after adding node
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [setNodes, handleNodeDataChange, handleNodeContextMenu, saveToHistory]);

  // Add a note from canvas context menu
  const handleAddNoteFromContextMenu = useCallback((position: { x: number; y: number }) => {
    const newId = `note-${generateId()}`;

    const newNote: Note = {
      id: newId,
      appearsWithStep: visibleDepth, // Show at current depth level
      position,
      color: { bg: '#1f2428', border: '#30363d' },
      content: 'New note\n\nDouble-click to edit',
      width: 200,
      height: 100,
    };

    // Add to current notes
    setCurrentNotes(prev => [...prev, newNote]);

    // Store the position
    nodePositions.current[newId] = position;

    // Create and add the note node
    const newNoteNode = createNoteNode(
      newNote,
      true,
      position,
      (newContent) => handleNoteContentChange(newId, newContent)
    );
    setNodes(nds => [...nds, newNoteNode]);

    // Save to history
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [setNodes, visibleDepth, saveToHistory, handleNoteContentChange]);

  // Handler for edge label changes from inline editing
  const handleEdgeLabelChange = useCallback((edgeId: string, newLabel: string) => {
    // Parse the edge ID to get source and target
    const match = edgeId.match(/^e(.+)-(.+)$/);
    if (!match) return;
    const [, source, target] = match;

    // Update the underlying edges data
    setCurrentEdges(prevEdges => {
      const newEdges = prevEdges.map(edge =>
        edge.source === source && edge.target === target
          ? { ...edge, label: newLabel }
          : edge
      );
      // Schedule history save after state update
      setTimeout(() => {
        if (!isRestoringRef.current) {
          pushState({
            steps: currentSteps,
            notes: currentNotes,
            edges: newEdges,
            positions: { ...nodePositions.current },
          });
        }
      }, 0);
      return newEdges;
    });

    // Update the displayed edges
    setEdges((eds: Edge[]) =>
      eds.map(edge =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                label: newLabel,
              },
            }
          : edge
      )
    );
  }, [setEdges, currentSteps, currentNotes, pushState]);

  // Handler for flipping edge direction (swap source and target)
  const handleFlipEdgeDirection = useCallback((edgeId: string) => {
    // Parse the edge ID to get source and target
    const match = edgeId.match(/^e(.+)-(.+)$/);
    if (!match) return;
    const [, oldSource, oldTarget] = match;

    // Create new edge ID with swapped source/target
    const newEdgeId = `e${oldTarget}-${oldSource}`;

    // Update the underlying edges data
    setCurrentEdges(prevEdges => {
      const newEdges = prevEdges.map(edge =>
        edge.source === oldSource && edge.target === oldTarget
          ? {
              ...edge,
              source: oldTarget,
              target: oldSource,
              // Swap handles too
              sourceHandle: edge.targetHandle,
              targetHandle: edge.sourceHandle,
            }
          : edge
      );
      // Schedule history save after state update
      setTimeout(() => {
        if (!isRestoringRef.current) {
          pushState({
            steps: currentSteps,
            notes: currentNotes,
            edges: newEdges,
            positions: { ...nodePositions.current },
          });
        }
      }, 0);
      return newEdges;
    });

    // Update the displayed edges
    setEdges((eds: Edge[]) =>
      eds.map(edge =>
        edge.id === edgeId
          ? {
              ...edge,
              id: newEdgeId,
              source: oldTarget,
              target: oldSource,
              sourceHandle: edge.targetHandle,
              targetHandle: edge.sourceHandle,
              data: {
                ...edge.data,
                onLabelChange: (newLabel: string) => handleEdgeLabelChange(newEdgeId, newLabel),
                onFlipDirection: () => handleFlipEdgeDirection(newEdgeId),
              },
            }
          : edge
      )
    );
  }, [setEdges, currentSteps, currentNotes, pushState, handleEdgeLabelChange]);

  // Track which edge should enter edit mode for label
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

  // Handler for deleting an edge from context menu
  const handleDeleteEdge = useCallback((edgeId: string) => {
    // Parse the edge ID to get source and target
    const match = edgeId.match(/^e(.+)-(.+)$/);
    if (!match) return;
    const [, source, target] = match;

    // Update currentEdges
    setCurrentEdges(prevEdges => prevEdges.filter(
      edge => !(edge.source === source && edge.target === target)
    ));

    // Update displayed edges
    setEdges(eds => eds.filter(edge => edge.id !== edgeId));

    // Save to history
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [setEdges, saveToHistory]);

  // Handler for triggering edge label edit from context menu
  const handleEditEdgeLabel = useCallback((edgeId: string) => {
    setEditingEdgeId(edgeId);
  }, []);

  // Define the actual restoreState function now that we have all dependencies
  useEffect(() => {
    restoreStateRef.current = (state: HistoryState) => {
      isRestoringRef.current = true;

      const restoredSteps = state.steps as Step[];
      const restoredNotes = state.notes as Note[];
      const restoredEdges = state.edges as EdgeConnection[];

      // Update positions first
      nodePositions.current = { ...state.positions };

      // Update state
      setCurrentSteps(restoredSteps);
      setCurrentNotes(restoredNotes);
      setCurrentEdges(restoredEdges);

      // Rebuild nodes and edges from restored state with depth-based visibility
      const groups = computeDepthGroups(restoredSteps, restoredEdges);
      const totalDepth = groups.length;
      setVisibleDepth(totalDepth);

      // All nodes should be visible when restoring (show all)
      const stepNodes = restoredSteps.map((step) =>
        createNode(
          step,
          true,
          state.positions[step.id],
          (newTitle, newDescription) => handleNodeDataChange(step.id, newTitle, newDescription)
        )
      );
      const noteNodes = restoredNotes.map(note => {
        return createNoteNode(
          note,
          true,
          state.positions[note.id],
          (newContent) => handleNoteContentChange(note.id, newContent)
        );
      });
      setNodes([...stepNodes, ...noteNodes]);

      // Rebuild edges
      setEdges(
        restoredEdges.map((conn) => {
          const edgeId = `e${conn.source}-${conn.target}`;
          return {
            id: edgeId,
            type: 'editable',
            source: conn.source,
            target: conn.target,
            sourceHandle: conn.sourceHandle,
            targetHandle: conn.targetHandle,
            animated: true,
            style: {
              stroke: '#8b949e',
              strokeWidth: 2,
              opacity: 1,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#8b949e',
            },
            data: {
              label: conn.label,
              onLabelChange: (newLabel: string) => handleEdgeLabelChange(edgeId, newLabel),
              onFlipDirection: () => handleFlipEdgeDirection(edgeId),
              onContextMenu: handleEdgeContextMenu,
            },
          };
        })
      );

      // Reset restoring flag after a tick
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);
    };
  }, [handleNodeDataChange, handleNoteContentChange, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu, setNodes, setEdges]);

  // Clear editing edge ID
  const clearEditingEdge = useCallback(() => {
    setEditingEdgeId(null);
  }, []);

  // Update edge callbacks when handlers change
  useEffect(() => {
    setEdges((eds: Edge[]) =>
      eds.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          onLabelChange: (newLabel: string) => handleEdgeLabelChange(edge.id, newLabel),
          onFlipDirection: () => handleFlipEdgeDirection(edge.id),
          onContextMenu: handleEdgeContextMenu,
          triggerEdit: edge.id === editingEdgeId,
          onEditComplete: clearEditingEdge,
        },
      }))
    );
  }, [handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu, editingEdgeId, clearEditingEdge, setEdges]);

  // Sync edge visibility when depthGroups first becomes non-empty (initial mount)
  // This fixes edges showing before their connected nodes are visible
  const hasInitialSyncRef = useRef(false);
  useEffect(() => {
    // Only run once after depthGroups is computed for the first time
    if (hasInitialSyncRef.current || depthGroups.length === 0 || isLoadingDefault) {
      return;
    }
    hasInitialSyncRef.current = true;

    // Sync edges to current visibleDepth
    const visibleIds = getVisibleNodeIds(depthGroups, visibleDepth);
    const visibleSet = new Set(visibleIds);

    setEdges(
      currentEdges.map((conn) =>
        createEdge(
          conn,
          visibleSet.has(conn.source) && visibleSet.has(conn.target),
          handleEdgeLabelChange,
          handleFlipEdgeDirection,
          handleEdgeContextMenu
        )
      )
    );
  }, [depthGroups, visibleDepth, isLoadingDefault, currentEdges, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Track removed node IDs to clean up connected edges
      const removedNodeIds = new Set<string>();
      let shouldSaveHistory = false;
      let hasDragEnd = false;
      let hasResizeEnd = false;

      // Track dimension changes for note nodes
      const dimensionChanges: { id: string; width: number; height: number }[] = [];

      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          nodePositions.current[change.id] = change.position;
          // Check if drag ended (dragging becomes false)
          if (change.dragging === false) {
            hasDragEnd = true;
          }
        }
        if (change.type === 'dimensions' && change.dimensions) {
          dimensionChanges.push({
            id: change.id,
            width: change.dimensions.width,
            height: change.dimensions.height,
          });
          // Check if resize ended (resizing becomes false)
          if (change.resizing === false) {
            hasResizeEnd = true;
          }
        }
        if (change.type === 'remove') {
          removedNodeIds.add(change.id);
          // Clean up position tracking for removed nodes
          delete nodePositions.current[change.id];
          shouldSaveHistory = true;
        }
      });

      // Update currentNotes with new dimensions
      if (dimensionChanges.length > 0) {
        setCurrentNotes(prev => prev.map(note => {
          const dimChange = dimensionChanges.find(dc => dc.id === note.id);
          if (dimChange) {
            return { ...note, width: dimChange.width, height: dimChange.height };
          }
          return note;
        }));
      }

      // Remove edges connected to deleted nodes
      if (removedNodeIds.size > 0) {
        // Also remove from currentSteps and currentEdges
        setCurrentSteps(prev => prev.filter(step => !removedNodeIds.has(step.id)));
        setCurrentNotes(prev => prev.filter(note => !removedNodeIds.has(note.id)));
        setCurrentEdges(prev =>
          prev.filter(edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target))
        );
        setEdges((eds) =>
          eds.filter((edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target))
        );
      }

      setNodes((nds) => applyNodeChanges(changes, nds));

      // Save to history after node removal, drag end, or resize end
      if ((shouldSaveHistory || hasDragEnd || hasResizeEnd) && !isRestoringRef.current) {
        setTimeout(() => saveToHistory(), 0);
      }
    },
    [setNodes, setEdges, saveToHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Check if any edges are being removed
      const hasRemoval = changes.some(change => change.type === 'remove');

      if (hasRemoval) {
        // Update currentEdges when edges are removed
        setCurrentEdges(prev => {
          const removedIds = new Set(
            changes
              .filter(change => change.type === 'remove')
              .map(change => change.id)
          );
          return prev.filter(edge => !removedIds.has(`e${edge.source}-${edge.target}`));
        });
      }

      setEdges((eds) => applyEdgeChanges(changes, eds));

      // Save to history after edge removal
      if (hasRemoval && !isRestoringRef.current) {
        setTimeout(() => saveToHistory(), 0);
      }
    },
    [setEdges, saveToHistory]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edgeId = `e${connection.source}-${connection.target}`;

      // Add to currentEdges
      const newEdgeConnection: EdgeConnection = {
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
      };
      setCurrentEdges(prev => [...prev, newEdgeConnection]);

      setEdges((eds: Edge[]) => addEdge({
        ...connection,
        id: edgeId,
        type: 'editable',
        animated: true,
        style: { stroke: '#8b949e', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' },
        data: {
          label: '',
          onLabelChange: (newLabel: string) => handleEdgeLabelChange(edgeId, newLabel),
          onFlipDirection: () => handleFlipEdgeDirection(edgeId),
          onContextMenu: handleEdgeContextMenu,
        },
      }, eds));

      // Save to history after adding edge
      if (!isRestoringRef.current) {
        setTimeout(() => saveToHistory(), 0);
      }
    },
    [setEdges, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu, saveToHistory]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Update ReactFlow edges
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

      // Update persisted currentEdges - match by old source/target
      setCurrentEdges(prevEdges => prevEdges.map(edge => {
        if (edge.source === oldEdge.source && edge.target === oldEdge.target) {
          return {
            ...edge,
            source: newConnection.source || edge.source,
            target: newConnection.target || edge.target,
            sourceHandle: newConnection.sourceHandle || edge.sourceHandle,
            targetHandle: newConnection.targetHandle || edge.targetHandle,
          };
        }
        return edge;
      }));

      // Save to history
      if (!isRestoringRef.current) {
        setTimeout(() => saveToHistory(), 0);
      }
    },
    [setEdges, saveToHistory]
  );

  // Connection validation: prevent invalid edge connections
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Find source and target nodes
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      const sourceType = sourceNode.data?.nodeType as NodeType | undefined;
      const targetType = targetNode.data?.nodeType as NodeType | undefined;

      // Rule 1: Complete nodes cannot have outgoing connections (they're terminal)
      if (sourceType === 'complete') {
        return false;
      }

      // Rule 2: Human-entry nodes cannot have incoming connections (they're entry points)
      if (targetType === 'human-entry') {
        return false;
      }

      // Rule 3: Prevent self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Rule 4: Prevent duplicate edges (same source and target)
      const isDuplicate = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target
      );
      if (isDuplicate) {
        return false;
      }

      return true;
    },
    [nodes, edges]
  );

  // Check edge visibility based on visible node IDs
  const getEdgeVisibilityByNodeIds = (conn: EdgeConnection, visibleNodeIds: Set<string>) => {
    return visibleNodeIds.has(conn.source) && visibleNodeIds.has(conn.target);
  };

  const handleNext = useCallback(() => {
    if (visibleDepth < depthGroups.length) {
      const newDepth = visibleDepth + 1;
      setVisibleDepth(newDepth);

      const visibleIds = getVisibleNodeIds(depthGroups, newDepth);
      const visibleSet = new Set(visibleIds);

      setNodes(getNodesWithVisibility(visibleSet));
      setEdges(
        currentEdges.map((conn) =>
          createEdge(conn, getEdgeVisibilityByNodeIds(conn, visibleSet), handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
        )
      );

      // Get the newly visible nodes at this depth level and fit them in view
      const newlyVisibleIds = getNodesAtDepth(depthGroups, newDepth);
      if (newlyVisibleIds.length > 0) {
        // Use setTimeout to let nodes render before fitting view
        setTimeout(() => {
          if (newlyVisibleIds.length === 1) {
            // Single node: center on it
            const node = getNode(newlyVisibleIds[0]);
            if (node) {
              setCenter(
                node.position.x + (node.measured?.width || 150) / 2,
                node.position.y + (node.measured?.height || 50) / 2,
                { duration: 300, zoom: getZoom() }
              );
            }
          } else {
            // Multiple nodes: fit all of them in view
            fitView({
              nodes: newlyVisibleIds.map(id => ({ id })),
              duration: 300,
              padding: 0.2,
            });
          }
        }, 50);
      }
    }
  }, [visibleDepth, depthGroups, setNodes, setEdges, currentEdges, getNodesWithVisibility, handleEdgeLabelChange, handleFlipEdgeDirection, setCenter, getNode, getZoom, fitView]);

  const handlePrev = useCallback(() => {
    if (visibleDepth > 1) {
      const newDepth = visibleDepth - 1;
      setVisibleDepth(newDepth);

      const visibleIds = getVisibleNodeIds(depthGroups, newDepth);
      const visibleSet = new Set(visibleIds);

      setNodes(getNodesWithVisibility(visibleSet));
      setEdges(
        currentEdges.map((conn) =>
          createEdge(conn, getEdgeVisibilityByNodeIds(conn, visibleSet), handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
        )
      );

      // Focus on the nodes at the current depth level
      const currentLevelIds = getNodesAtDepth(depthGroups, newDepth);
      if (currentLevelIds.length > 0) {
        setTimeout(() => {
          if (currentLevelIds.length === 1) {
            const node = getNode(currentLevelIds[0]);
            if (node) {
              setCenter(
                node.position.x + (node.measured?.width || 150) / 2,
                node.position.y + (node.measured?.height || 50) / 2,
                { duration: 300, zoom: getZoom() }
              );
            }
          } else {
            fitView({
              nodes: currentLevelIds.map(id => ({ id })),
              duration: 300,
              padding: 0.2,
            });
          }
        }, 50);
      }
    }
  }, [visibleDepth, depthGroups, setNodes, setEdges, currentEdges, getNodesWithVisibility, handleEdgeLabelChange, handleFlipEdgeDirection, setCenter, getNode, getZoom, fitView]);

  const handleReset = useCallback(() => {
    // Only reset step view, keep current workflow data
    setVisibleDepth(1);
    const visibleIds = getVisibleNodeIds(depthGroups, 1);
    const visibleSet = new Set(visibleIds);
    setNodes(getNodesWithVisibility(visibleSet));
    setEdges(
      currentEdges.map((conn) =>
        createEdge(conn, getEdgeVisibilityByNodeIds(conn, visibleSet), handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
      )
    );

    // Center on the first depth level nodes
    const firstLevelIds = getNodesAtDepth(depthGroups, 1);
    if (firstLevelIds.length > 0) {
      setTimeout(() => {
        if (firstLevelIds.length === 1) {
          const node = getNode(firstLevelIds[0]);
          if (node) {
            setCenter(
              node.position.x + (node.measured?.width || 150) / 2,
              node.position.y + (node.measured?.height || 50) / 2,
              { duration: 300, zoom: getZoom() }
            );
          }
        } else {
          fitView({
            nodes: firstLevelIds.map(id => ({ id })),
            duration: 300,
            padding: 0.2,
          });
        }
      }, 50);
    }
  }, [depthGroups, setNodes, setEdges, getNodesWithVisibility, currentEdges, handleEdgeLabelChange, handleFlipEdgeDirection, getNode, setCenter, getZoom, fitView]);

  // Create a fresh empty workflow
  const handleNewWorkflow = useCallback(() => {
    setVisibleDepth(0);
    nodePositions.current = {};
    setCurrentSteps([]);
    setCurrentNotes([]);
    setCurrentEdges([]);
    setCurrentWorkflowName(undefined);
    setCurrentWorkflowDescription(undefined);
    setLoadedWorkflowId(undefined);
    setNodes([]);
    setEdges([]);
    // Mark as "saved" (clean state) since it's a fresh empty workflow
    setLastSavedState(JSON.stringify({
      steps: [],
      notes: [],
      edges: [],
      positions: {},
    }));
  }, [setNodes, setEdges]);

  const handleShowAll = useCallback(() => {
    const totalDepth = depthGroups.length;
    setVisibleDepth(totalDepth);
    const visibleIds = getVisibleNodeIds(depthGroups, totalDepth);
    const visibleSet = new Set(visibleIds);
    setNodes(getNodesWithVisibility(visibleSet));
    setEdges(
      currentEdges.map((conn) =>
        createEdge(conn, getEdgeVisibilityByNodeIds(conn, visibleSet), handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
      )
    );
  }, [depthGroups, setNodes, setEdges, getNodesWithVisibility, currentEdges, handleEdgeLabelChange, handleFlipEdgeDirection]);

  // Auto-layout nodes using dagre algorithm
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, layoutDirection);

    // Update nodePositions ref with new positions
    layoutedNodes.forEach(node => {
      nodePositions.current[node.id] = node.position;
    });

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Save to history after layout
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [nodes, edges, setNodes, setEdges, saveToHistory, layoutDirection]);

  // Toggle layout direction and re-apply layout
  const handleToggleLayoutDirection = useCallback(() => {
    const newDirection = layoutDirection === 'TB' ? 'LR' : 'TB';
    setLayoutDirection(newDirection);

    // Apply layout with the new direction
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, newDirection);

    // Update nodePositions ref with new positions
    layoutedNodes.forEach(node => {
      nodePositions.current[node.id] = node.position;
    });

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Update currentEdges with new handles so they persist when saved
    const sourceHandle = newDirection === 'TB' ? 'bottom' : 'right';
    const targetHandle = newDirection === 'TB' ? 'top' : 'left';
    setCurrentEdges(prevEdges => prevEdges.map(edge => ({
      ...edge,
      sourceHandle,
      targetHandle,
    })));

    // Save to history after layout
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [layoutDirection, nodes, edges, setNodes, setEdges, saveToHistory]);

  // Save current workflow data for the sidebar
  const handleSaveWorkflow = useCallback(() => {
    return {
      name: currentWorkflowName || 'Untitled',
      description: currentWorkflowDescription,
      steps: currentSteps,
      positions: { ...nodePositions.current },
      edges: currentEdges,
      notes: currentNotes,
    };
  }, [currentWorkflowName, currentWorkflowDescription, currentSteps, currentEdges, currentNotes]);

  // Load a saved workflow
  const handleLoadWorkflow = useCallback((workflow: SavedWorkflow) => {
    // Update state with loaded data
    setCurrentSteps(workflow.steps);
    setCurrentNotes(workflow.notes);
    setCurrentEdges(workflow.edges);
    setCurrentWorkflowName(workflow.name);
    setCurrentWorkflowDescription(workflow.description);
    setLoadedWorkflowId(workflow.id);

    // Update positions
    nodePositions.current = { ...workflow.positions };

    // Compute depth groups for the loaded workflow and show all
    const groups = computeDepthGroups(workflow.steps, workflow.edges);
    const totalDepth = groups.length;
    setVisibleDepth(totalDepth);

    // Show all nodes (all are visible when loading)
    const stepNodes = workflow.steps.map((step) =>
      createNode(
        step,
        true,
        workflow.positions[step.id],
        (newTitle, newDescription, newSkillPath, newSkillMetadata) => handleNodeDataChange(step.id, newTitle, newDescription, newSkillPath, newSkillMetadata),
        handleNodeContextMenu
      )
    );
    const noteNodes = workflow.notes.map(note =>
      createNoteNode(
        note,
        true,
        workflow.positions[note.id],
        (newContent) => handleNoteContentChange(note.id, newContent)
      )
    );
    setNodes([...stepNodes, ...noteNodes]);
    setEdges(
      workflow.edges.map((conn) =>
        createEdge(conn, true, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
      )
    );

    // Mark as saved state for change tracking
    setLastSavedState(JSON.stringify({
      steps: workflow.steps,
      notes: workflow.notes,
      edges: workflow.edges,
      positions: workflow.positions,
    }));
  }, [setNodes, setEdges, handleNodeDataChange, handleNodeContextMenu, handleNoteContentChange, handleEdgeLabelChange, handleFlipEdgeDirection]);

  // Merge a template into the existing canvas
  const handleMergeTemplate = useCallback((template: {
    steps: Step[];
    edges: EdgeConnection[];
    notes: Note[];
    positions: Record<string, { x: number; y: number }>;
  }) => {
    // Calculate offset: find the rightmost and bottommost positions of existing nodes
    let maxX = 0;
    let maxY = 0;

    // Check existing node positions
    Object.values(nodePositions.current).forEach(pos => {
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y > maxY) maxY = pos.y;
    });

    // Add offset (place new nodes to the right of existing ones)
    const offsetX = maxX > 0 ? maxX + 300 : 0;
    const offsetY = 0; // Keep same Y level, just offset X

    // Create ID mapping: old ID -> new ID
    const idMap: Record<string, string> = {};

    // Generate new IDs for all steps
    template.steps.forEach(step => {
      idMap[step.id] = `node-${generateId()}`;
    });

    // Generate new IDs for all notes
    template.notes.forEach(note => {
      idMap[note.id] = `note-${generateId()}`;
    });

    // Create new steps with updated IDs
    const newSteps: Step[] = template.steps.map(step => ({
      ...step,
      id: idMap[step.id],
    }));

    // Create new notes with updated IDs and offset positions
    const newNotes: Note[] = template.notes.map(note => ({
      ...note,
      id: idMap[note.id],
      position: {
        x: note.position.x + offsetX,
        y: note.position.y + offsetY,
      },
    }));

    // Create new edges with updated source/target IDs
    const newEdges: EdgeConnection[] = template.edges.map(edge => ({
      ...edge,
      source: idMap[edge.source],
      target: idMap[edge.target],
    }));

    // Create new positions with updated IDs and offsets
    const newPositions: Record<string, { x: number; y: number }> = {};
    Object.entries(template.positions).forEach(([oldId, pos]) => {
      const newId = idMap[oldId];
      if (newId) {
        newPositions[newId] = {
          x: pos.x + offsetX,
          y: pos.y + offsetY,
        };
      }
    });

    // Merge into current state
    setCurrentSteps(prev => [...prev, ...newSteps]);
    setCurrentNotes(prev => [...prev, ...newNotes]);
    setCurrentEdges(prev => [...prev, ...newEdges]);

    // Update nodePositions ref
    Object.assign(nodePositions.current, newPositions);

    // After merging, we need to recalculate depth groups
    // The effect will handle this, but we set visibleDepth to show all
    setVisibleDepth(prev => prev + newSteps.length);

    // Create React Flow nodes for the new steps
    const newFlowNodes = newSteps.map(step =>
      createNode(
        step,
        true,
        newPositions[step.id],
        (newTitle, newDescription, newSkillPath, newSkillMetadata) => handleNodeDataChange(step.id, newTitle, newDescription, newSkillPath, newSkillMetadata),
        handleNodeContextMenu
      )
    );

    // Create React Flow nodes for the new notes
    const newNoteNodes = newNotes.map(note =>
      createNoteNode(
        note,
        true,
        newPositions[note.id],
        (newContent) => handleNoteContentChange(note.id, newContent)
      )
    );

    // Create React Flow edges
    const newFlowEdges = newEdges.map(conn =>
      createEdge(conn, true, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
    );

    // Add to existing nodes and edges
    setNodes(prev => [...prev, ...newFlowNodes, ...newNoteNodes]);
    setEdges(prev => [...prev, ...newFlowEdges]);

    // Save to history
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [setNodes, setEdges, handleNodeDataChange, handleNodeContextMenu, handleNoteContentChange, handleEdgeLabelChange, saveToHistory]);

  // Load default workflow on mount (if one is set)
  useEffect(() => {
    async function loadDefaultWorkflow() {
      const defaultId = localStorage.getItem(STORAGE_KEYS.DEFAULT_WORKFLOW);
      if (!defaultId) {
        setIsLoadingDefault(false);
        return;
      }

      // Remove quotes from JSON string
      const cleanId = defaultId.replace(/^"|"$/g, '');

      // Helper to apply workflow data to state
      const applyWorkflow = (workflow: SavedWorkflow) => {
        setCurrentSteps(workflow.steps);
        setCurrentNotes(workflow.notes);
        setCurrentEdges(workflow.edges);
        setCurrentWorkflowName(workflow.name);
        setCurrentWorkflowDescription(workflow.description);
        setLoadedWorkflowId(workflow.id);
        nodePositions.current = { ...workflow.positions };
        // Compute depth groups and show all
        const groups = computeDepthGroups(workflow.steps, workflow.edges);
        const totalDepth = groups.length;
        setVisibleDepth(totalDepth);
        setNodes(getNodes(totalDepth, workflow.steps, workflow.notes));
        setEdges(
          workflow.edges.map((conn) =>
            createEdge(conn, true, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
          )
        );
        setLastSavedState(JSON.stringify({
          steps: workflow.steps,
          notes: workflow.notes,
          edges: workflow.edges,
          positions: workflow.positions,
        }));
      };

      // Try to load from API first
      try {
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const workflowFiles: { name: string; content: SavedWorkflow }[] = await response.json();
          // Find the default workflow by ID within the content
          const defaultFile = workflowFiles.find(w => w.content?.id === cleanId);
          if (defaultFile?.content) {
            applyWorkflow(defaultFile.content);
            setIsLoadingDefault(false);
            return;
          }
        }
      } catch (err) {
        console.warn('API fetch failed, falling back to localStorage:', err);
      }

      // Fallback to localStorage
      const workflowsJson = localStorage.getItem(STORAGE_KEYS.WORKFLOWS);
      if (workflowsJson) {
        try {
          const workflows: SavedWorkflow[] = JSON.parse(workflowsJson);
          const defaultWorkflow = workflows.find(w => w.id === cleanId);
          if (defaultWorkflow) {
            applyWorkflow(defaultWorkflow);
          }
        } catch (e) {
          console.error('Failed to load default workflow from localStorage:', e);
        }
      }
      setIsLoadingDefault(false);
    }

    loadDefaultWorkflow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Drag and drop hook for creating nodes from sidebar
  const { onDragOver, onDrop } = useDragAndDrop({
    screenToFlowPosition,
    setNodes,
    setEdges,
    setCurrentSteps,
    setCurrentNotes,
    setCurrentEdges,
    setVisibleDepth,
    visibleDepth,
    depthGroups,
    nodePositions,
    handleNodeDataChange,
    handleNoteContentChange,
    handleNodeContextMenu,
    handleEdgeLabelChange,
    handleFlipEdgeDirection,
    handleEdgeContextMenu,
    saveToHistory,
    isRestoringRef,
  });

  // Handle selection changes
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    // Only track custom nodes (not notes or groups themselves for now)
    const customNodeIds = selectedNodes
      .filter(node => node.type === 'custom')
      .map(node => node.id);
    setSelectedNodeIds(customNodeIds);
  }, []);

  // Group selected nodes into a new group
  const handleGroupSelected = useCallback(() => {
    if (selectedNodeIds.length < 2) return;

    // Get the selected nodes
    const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    // Calculate bounding box of selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedNodes.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      const width = nodeWidth;
      const height = nodeHeight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // Add padding around the group
    const padding = 40;
    const headerHeight = 50;
    minX -= padding;
    minY -= padding + headerHeight;
    maxX += padding;
    maxY += padding;

    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;

    // Generate group ID
    const groupId = `group-${generateId()}`;

    // Create group step
    const groupStep: Step = {
      id: groupId,
      label: 'Grouped Nodes',
      description: `${selectedNodeIds.length} nodes`,
      nodeType: 'group',
    };

    // Store group position
    nodePositions.current[groupId] = { x: minX, y: minY };

    // Update parent tracking
    const newParentGroups = { ...nodeParentGroups };
    selectedNodeIds.forEach(nodeId => {
      newParentGroups[nodeId] = groupId;
    });
    setNodeParentGroups(newParentGroups);

    // Update collapsed state
    setCollapsedGroups(prev => ({ ...prev, [groupId]: false }));

    // Add group to steps
    setCurrentSteps(prev => [...prev, groupStep]);

    // Create group node
    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: { x: minX, y: minY },
      data: {
        title: 'Grouped Nodes',
        description: `${selectedNodeIds.length} nodes`,
        collapsed: false,
        childCount: selectedNodeIds.length,
        width: groupWidth,
        height: groupHeight,
        onToggleCollapse: () => handleToggleGroupCollapse(groupId),
        onContextMenu: handleNodeContextMenu,
        nodeId: groupId,
      },
      style: {
        width: groupWidth,
        height: groupHeight,
        zIndex: -1,
      },
    };

    // Update child nodes: set parentId and convert positions to relative
    const updatedNodes = nodes.map(node => {
      if (selectedNodeIds.includes(node.id)) {
        const relativeX = node.position.x - minX;
        const relativeY = node.position.y - minY;
        return {
          ...node,
          parentId: groupId,
          extent: 'parent' as const,
          position: { x: relativeX, y: relativeY },
        };
      }
      return node;
    });

    // Add group node BEFORE its children (ReactFlow requirement)
    // Filter out selected nodes, add group, then add selected nodes
    const nonSelectedNodes = updatedNodes.filter(n => !selectedNodeIds.includes(n.id));
    const childNodes = updatedNodes.filter(n => selectedNodeIds.includes(n.id));

    setNodes([...nonSelectedNodes, groupNode, ...childNodes]);

    // Update visible depth (groups add a new step)
    setVisibleDepth(prev => prev + 1);

    // Clear selection
    setSelectedNodeIds([]);

    // Save to history
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [selectedNodeIds, nodes, setNodes, handleNodeContextMenu, nodeParentGroups, saveToHistory]);

  // Toggle group collapse
  const handleToggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const newCollapsed = !prev[groupId];

      // Update nodes visibility based on collapse state
      setNodes(nds => nds.map(node => {
        // Update the group node itself
        if (node.id === groupId) {
          return {
            ...node,
            data: {
              ...node.data,
              collapsed: newCollapsed,
            },
          };
        }
        // Hide/show child nodes
        if (node.parentId === groupId) {
          return {
            ...node,
            hidden: newCollapsed,
          };
        }
        return node;
      }));

      // Hide/show edges connected to children
      setEdges(eds => eds.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const isChildEdge = sourceNode?.parentId === groupId || targetNode?.parentId === groupId;
        if (isChildEdge) {
          return {
            ...edge,
            hidden: newCollapsed,
          };
        }
        return edge;
      }));

      return { ...prev, [groupId]: newCollapsed };
    });
  }, [nodes, setNodes, setEdges]);

  // Ungroup: remove group and restore children to top level
  const handleUngroupNodes = useCallback((groupId: string) => {
    const groupNode = nodes.find(n => n.id === groupId);
    if (!groupNode) return;

    const groupPos = groupNode.position;

    // Update child nodes: remove parentId and convert positions to absolute
    const updatedNodes = nodes
      .filter(n => n.id !== groupId) // Remove group node
      .map(node => {
        if (node.parentId === groupId) {
          const absoluteX = node.position.x + groupPos.x;
          const absoluteY = node.position.y + groupPos.y;
          const { parentId, extent, hidden, ...rest } = node;
          return {
            ...rest,
            position: { x: absoluteX, y: absoluteY },
          };
        }
        return node;
      });

    setNodes(updatedNodes);

    // Remove from steps
    setCurrentSteps(prev => prev.filter(s => s.id !== groupId));

    // Remove from parent tracking
    setNodeParentGroups(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(childId => {
        if (next[childId] === groupId) {
          delete next[childId];
        }
      });
      return next;
    });

    // Remove from collapsed state
    setCollapsedGroups(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });

    // Clean up position
    delete nodePositions.current[groupId];

    // Show any hidden edges
    setEdges(eds => eds.map(edge => ({
      ...edge,
      hidden: false,
    })));

    // Save to history
    if (!isRestoringRef.current) {
      setTimeout(() => saveToHistory(), 0);
    }
  }, [nodes, setNodes, setEdges, saveToHistory]);

  return (
    <div className="app-container">
      {isLoadingDefault && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading workflow...</span>
        </div>
      )}
      <div className="header" onClick={() => !isEditingHeader && setIsEditingHeader(true)}>
        {isEditingHeader ? (
          <div className="header-edit">
            <input
              type="text"
              className="header-title-input"
              value={currentWorkflowName || ''}
              onChange={(e) => setCurrentWorkflowName(e.target.value)}
              placeholder="Workflow name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  setIsEditingHeader(false);
                }
              }}
            />
            <input
              type="text"
              className="header-description-input"
              value={currentWorkflowDescription || ''}
              onChange={(e) => setCurrentWorkflowDescription(e.target.value)}
              placeholder="Description (optional)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  setIsEditingHeader(false);
                }
              }}
              onBlur={() => setIsEditingHeader(false)}
            />
          </div>
        ) : (
          <>
            <h1>{currentWorkflowName || 'Untitled Workflow'}</h1>
            {currentWorkflowDescription && <p>{currentWorkflowDescription}</p>}
            {!currentWorkflowName && !currentWorkflowDescription && (
              <p className="header-hint">Click to edit title & description</p>
            )}
          </>
        )}
      </div>
      <div className="main-content">
        <Sidebar
          onLoadWorkflow={handleLoadWorkflow}
          onMergeTemplate={handleMergeTemplate}
          onSaveWorkflow={handleSaveWorkflow}
          onNewWorkflow={handleNewWorkflow}
          currentWorkflowName={currentWorkflowName}
          loadedWorkflowId={loadedWorkflowId}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        <div className="flow-container" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          isValidConnection={isValidConnection}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onContextMenu={handleCanvasContextMenu}
          onSelectionChange={onSelectionChange}
          onPaneClick={closeContextMenu}
          selectionMode={SelectionMode.Partial}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={true}
          nodesConnectable={true}
          edgesReconnectable={true}
          elementsSelectable={true}
          deleteKeyCode={['Backspace', 'Delete']}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          selectNodesOnDrag={false}
          minZoom={0.2}
          maxZoom={2}
        >
          {showBackground && <Background variant={backgroundVariant} gap={20} size={1} color="#30363d" />}
          <Controls showInteractive={false}>
            <ControlButton
              onClick={handleToggleLayoutDirection}
              title={`Toggle layout (${layoutDirection === 'TB' ? 'Vertical' : 'Horizontal'})`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {layoutDirection === 'TB' ? (
                  <path d="M12 3v18M3 12h18" />
                ) : (
                  <path d="M3 12h18M12 3v18" />
                )}
              </svg>
            </ControlButton>
            <ControlButton
              onClick={() => setShowBackground(prev => !prev)}
              title={`${showBackground ? 'Hide' : 'Show'} grid background`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity={showBackground ? 1 : 0.3} />
              </svg>
            </ControlButton>
            <ControlButton
              onClick={() => setShowHelpModal(true)}
              title="Keyboard shortcuts (?)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 9a3 3 0 1 1 4 2.83V14M12 17h.01" />
              </svg>
            </ControlButton>
          </Controls>
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as CustomNodeData | undefined;
              const nodeType = data?.nodeType;
              if (nodeType && nodeColors[nodeType]) {
                return nodeColors[nodeType].border;
              }
              return '#8b949e';
            }}
            maskColor="rgba(13, 17, 23, 0.8)"
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px',
            }}
            zoomable
            pannable
          />
        </ReactFlow>
        </div>
      </div>
      <div className="controls">
        <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
        <button onClick={handleAutoLayout} title="Auto-arrange nodes hierarchically">
          Auto Layout
        </button>
        <button
          onClick={handleToggleLayoutDirection}
          className="layout-direction-btn"
          title={`Switch to ${layoutDirection === 'TB' ? 'horizontal (left-to-right)' : 'vertical (top-to-bottom)'} layout`}
        >
          {layoutDirection === 'TB' ? '\u2195 Vertical' : '\u2194 Horizontal'}
        </button>
        <button
          onClick={handleGroupSelected}
          disabled={selectedNodeIds.length < 2}
          title="Group selected nodes (select 2+ nodes)"
          className={selectedNodeIds.length >= 2 ? 'group-btn-active' : ''}
        >
          Group Selected ({selectedNodeIds.length})
        </button>
        <span className="controls-divider">|</span>
        <button onClick={handlePrev} disabled={visibleDepth <= 1}>
          Previous
        </button>
        <span className="step-counter">
          Step {visibleDepth} of {depthGroups.length}
        </span>
        <button onClick={handleNext} disabled={visibleDepth >= depthGroups.length}>
          Next
        </button>
        <button onClick={handleShowAll} className="reset-btn">
          Show All
        </button>
        <button onClick={handleReset} className="reset-btn">
          Reset
        </button>
        <span className="controls-divider">|</span>
        <div className="background-selector">
          <label htmlFor="bg-pattern">Pattern:</label>
          <select
            id="bg-pattern"
            value={backgroundVariant}
            onChange={(e) => setBackgroundVariant(e.target.value as BackgroundVariant)}
            title="Change background pattern"
          >
            <option value={BackgroundVariant.Dots}>Dots</option>
            <option value={BackgroundVariant.Lines}>Lines</option>
            <option value={BackgroundVariant.Cross}>Cross</option>
          </select>
        </div>
        <button
          onClick={() => setShowHelpModal(true)}
          className="help-btn"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
      </div>
      <div className="instructions">
        Green = Human entry points | Purple = Skills | Yellow = Agents | Blue = MCP | Gray = Bash | Orange = Decisions
      </div>
      {contextMenu.visible && contextMenu.menuType === 'node' && contextMenu.nodeId && (() => {
        const menuNode = nodes.find(n => n.id === contextMenu.nodeId);
        const isGroupNode = menuNode?.type === 'group';
        const menuNodeType = isGroupNode
          ? 'group' as NodeType
          : ((menuNode?.data as unknown) as CustomNodeData | undefined)?.nodeType || 'skill';
        const menuNodeSkillPath = ((menuNode?.data as unknown) as CustomNodeData | undefined)?.skillPath;
        const menuNodePromptPath = ((menuNode?.data as unknown) as CustomNodeData | undefined)?.promptPath;
        const hasEditablePath = menuNodeSkillPath || menuNodePromptPath;
        return (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            nodeType={menuNodeType}
            skillPath={menuNodeSkillPath}
            promptPath={menuNodePromptPath}
            tabzConnected={tabzConnected}
            onClose={closeContextMenu}
            onEdit={handleContextMenuEdit}
            onDelete={handleContextMenuDelete}
            onDuplicate={handleContextMenuDuplicate}
            onChangeType={handleContextMenuChangeType}
            onUngroup={isGroupNode ? () => handleUngroupNodes(contextMenu.nodeId!) : undefined}
            onOpenInTFE={hasEditablePath ? handleOpenInTFE : undefined}
          />
        );
      })()}
      {contextMenu.visible && contextMenu.menuType === 'canvas' && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowPosition={canvasClickPosition}
          onClose={closeContextMenu}
          onAddNode={handleAddNodeFromContextMenu}
          onAddNote={handleAddNoteFromContextMenu}
        />
      )}
      {contextMenu.visible && contextMenu.menuType === 'edge' && contextMenu.edgeId && (
        <EdgeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          edgeId={contextMenu.edgeId}
          onClose={closeContextMenu}
          onFlipDirection={() => handleFlipEdgeDirection(contextMenu.edgeId!)}
          onDelete={() => handleDeleteEdge(contextMenu.edgeId!)}
          onEditLabel={() => handleEditEdgeLabel(contextMenu.edgeId!)}
        />
      )}
      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}
