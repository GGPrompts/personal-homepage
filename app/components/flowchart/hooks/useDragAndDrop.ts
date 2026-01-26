import { useCallback, DragEvent } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeType, Step, Note, SkillMetadata, EdgeConnection } from '../types';
import { defaultNodeLabels } from '../constants';
import { createNode, createNoteNode, createEdge } from '../utils';
import { generateId } from './useLocalStorage';
import type { MouseEvent as ReactMouseEvent } from 'react';

export interface UseDragAndDropOptions {
  /** ReactFlow's screenToFlowPosition function */
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  /** Setter for React Flow nodes */
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** Setter for React Flow edges */
  setEdges?: React.Dispatch<React.SetStateAction<Edge[]>>;
  /** Setter for current steps state */
  setCurrentSteps: React.Dispatch<React.SetStateAction<Step[]>>;
  /** Setter for current notes state */
  setCurrentNotes?: React.Dispatch<React.SetStateAction<Note[]>>;
  /** Setter for current edges state */
  setCurrentEdges?: React.Dispatch<React.SetStateAction<EdgeConnection[]>>;
  /** Setter for visible depth state */
  setVisibleDepth: React.Dispatch<React.SetStateAction<number>>;
  /** Current visible depth level (for note's appearsWithStep) */
  visibleDepth?: number;
  /** Current depth groups (for computing depth) */
  depthGroups?: string[][];
  /** Ref to node positions */
  nodePositions: React.MutableRefObject<{ [key: string]: { x: number; y: number } }>;
  /** Handler for node data changes (passed to createNode) */
  handleNodeDataChange: (nodeId: string, newTitle: string, newDescription: string, newSkillPath?: string, newSkillMetadata?: SkillMetadata) => void;
  /** Handler for note content changes */
  handleNoteContentChange?: (noteId: string, newContent: string) => void;
  /** Handler for node context menu (passed to createNode) */
  handleNodeContextMenu: (event: ReactMouseEvent, nodeId: string) => void;
  /** Handler for edge label changes (for template drops) */
  handleEdgeLabelChange?: (edgeId: string, newLabel: string) => void;
  /** Handler for edge direction flip (for template drops) */
  handleFlipEdgeDirection?: (edgeId: string) => void;
  /** Handler for edge context menu (for template drops) */
  handleEdgeContextMenu?: (event: ReactMouseEvent, edgeId: string) => void;
  /** Function to save to history */
  saveToHistory: () => void;
  /** Flag indicating if history restoration is in progress */
  isRestoringRef: React.MutableRefObject<boolean>;
}

export interface UseDragAndDropResult {
  /** Handler for drag over events - allows drop */
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  /** Handler for drop events - creates new node */
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

/**
 * Hook for handling drag-and-drop from the sidebar to create new nodes.
 * Uses functional updates (setNodes callback form) to avoid infinite loops
 * as per the CLAUDE.md patterns.
 */
export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropResult {
  const {
    screenToFlowPosition,
    setNodes,
    setEdges,
    setCurrentSteps,
    setCurrentNotes,
    setCurrentEdges,
    setVisibleDepth,
    visibleDepth = 1,
    depthGroups = [],
    nodePositions,
    handleNodeDataChange,
    handleNoteContentChange,
    handleNodeContextMenu,
    handleEdgeLabelChange,
    handleFlipEdgeDirection,
    handleEdgeContextMenu,
    saveToHistory,
    isRestoringRef,
  } = options;

  // Handle drag over to allow drop
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop to create new node
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Check for prompt data first
      const promptData = event.dataTransfer.getData('application/prompt');
      if (promptData) {
        try {
          const prompt = JSON.parse(promptData) as { name: string; description: string; filePath?: string };

          // Get the position where the node was dropped
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          // Generate a unique ID for the new node
          const newId = `node-${generateId()}`;

          // Create the new step with prompt info
          const newStep: Step = {
            id: newId,
            label: prompt.name,
            description: prompt.description || '',
            nodeType: 'skill', // Prompts become skill nodes
            promptPath: prompt.filePath,
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

          // Update visible depth to show the new node
          setVisibleDepth(prev => prev + 1);

          // Save to history after adding node
          if (!isRestoringRef.current) {
            setTimeout(() => saveToHistory(), 0);
          }
        } catch (err) {
          console.error('Failed to parse prompt data:', err);
        }
        return;
      }

      // Check for template data
      const templateData = event.dataTransfer.getData('application/template');
      if (templateData && setEdges && setCurrentEdges && handleEdgeLabelChange && handleFlipEdgeDirection) {
        try {
          const template = JSON.parse(templateData) as {
            steps: Step[];
            edges: EdgeConnection[];
            notes: Note[];
            positions: Record<string, { x: number; y: number }>;
          };

          // Get the drop position
          const dropPosition = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          // Find the min position in template to calculate offset
          let minX = Infinity;
          let minY = Infinity;
          Object.values(template.positions).forEach(pos => {
            if (pos.x < minX) minX = pos.x;
            if (pos.y < minY) minY = pos.y;
          });

          // Calculate offset to place template at drop position
          const offsetX = dropPosition.x - (minX === Infinity ? 0 : minX);
          const offsetY = dropPosition.y - (minY === Infinity ? 0 : minY);

          // Create ID mapping: old ID -> new ID
          const idMap: Record<string, string> = {};
          template.steps.forEach(step => {
            idMap[step.id] = `node-${generateId()}`;
          });
          template.notes.forEach(note => {
            idMap[note.id] = `note-${generateId()}`;
          });

          // Create new steps with mapped IDs
          const newSteps: Step[] = template.steps.map(step => ({
            ...step,
            id: idMap[step.id],
          }));

          // Create new edges with mapped IDs
          const newEdgeConnections: EdgeConnection[] = template.edges.map(edge => ({
            ...edge,
            source: idMap[edge.source] || edge.source,
            target: idMap[edge.target] || edge.target,
          }));

          // Create new notes with mapped IDs
          const newNotes: Note[] = template.notes.map(note => ({
            ...note,
            id: idMap[note.id],
          }));

          // Store positions with offset
          template.steps.forEach(step => {
            const oldPos = template.positions[step.id] || { x: 0, y: 0 };
            const newId = idMap[step.id];
            nodePositions.current[newId] = {
              x: oldPos.x + offsetX,
              y: oldPos.y + offsetY,
            };
          });
          template.notes.forEach(note => {
            const oldPos = template.positions[note.id] || note.position || { x: 0, y: 0 };
            const newId = idMap[note.id];
            nodePositions.current[newId] = {
              x: oldPos.x + offsetX,
              y: oldPos.y + offsetY,
            };
          });

          // Add to state
          setCurrentSteps(prev => [...prev, ...newSteps]);
          setCurrentEdges(prev => [...prev, ...newEdgeConnections]);
          if (setCurrentNotes) {
            setCurrentNotes(prev => [...prev, ...newNotes]);
          }

          // Create and add nodes
          const newNodes = newSteps.map(step =>
            createNode(
              step,
              true,
              nodePositions.current[step.id],
              (newTitle, newDescription, newSkillPath, newSkillMetadata) =>
                handleNodeDataChange(step.id, newTitle, newDescription, newSkillPath, newSkillMetadata),
              handleNodeContextMenu
            )
          );

          // Create note nodes
          const newNoteNodes = newNotes.map(note =>
            createNoteNode(
              note,
              true,
              nodePositions.current[note.id],
              handleNoteContentChange ? (newContent) => handleNoteContentChange(note.id, newContent) : undefined
            )
          );

          // Create edges
          const newEdges = newEdgeConnections.map(conn =>
            createEdge(conn, true, handleEdgeLabelChange, handleFlipEdgeDirection, handleEdgeContextMenu)
          );

          setNodes(nds => [...nds, ...newNodes, ...newNoteNodes]);
          setEdges(eds => [...eds, ...newEdges]);

          // Update visible depth to show all new nodes
          setVisibleDepth(prev => Math.max(prev, depthGroups.length + newSteps.length));

          // Save to history
          if (!isRestoringRef.current) {
            setTimeout(() => saveToHistory(), 0);
          }
        } catch (err) {
          console.error('Failed to parse template data:', err);
        }
        return;
      }

      const dataType = event.dataTransfer.getData('application/reactflow') as NodeType | 'note';
      if (!dataType) return;

      // Get the position where the node was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle note type separately
      if (dataType === 'note') {
        if (!setCurrentNotes || !handleNoteContentChange) return;

        const newId = `note-${generateId()}`;

        const newNote: Note = {
          id: newId,
          appearsWithStep: visibleDepth,
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

        // Save to history after adding note
        if (!isRestoringRef.current) {
          setTimeout(() => saveToHistory(), 0);
        }
        return;
      }

      // Handle regular node types
      const nodeType = dataType as NodeType;

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

      // Update visible depth to show the new node (depth will be recalculated by effect)
      setVisibleDepth(prev => prev + 1);

      // Save to history after adding node
      if (!isRestoringRef.current) {
        setTimeout(() => saveToHistory(), 0);
      }
    },
    [
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
    ]
  );

  return {
    onDragOver,
    onDrop,
  };
}
