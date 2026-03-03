import type { Step, EdgeConnection } from '../types';

/**
 * Computes depth groups for nodes using BFS from entry nodes.
 * Nodes at the same depth will appear together when stepping through the flowchart.
 *
 * @param steps - Array of workflow steps
 * @param edges - Array of edge connections between nodes
 * @returns Array of node ID arrays grouped by depth: [['entry'], ['process'], ['taskA','taskB'], ...]
 */
export function computeDepthGroups(
  steps: Step[],
  edges: EdgeConnection[]
): string[][] {
  if (steps.length === 0) {
    return [];
  }

  // Build adjacency list (outgoing edges) and incoming edge count
  const adjacencyList = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  // Initialize all nodes
  steps.forEach(step => {
    adjacencyList.set(step.id, []);
    incomingCount.set(step.id, 0);
  });

  // Build the graph
  edges.forEach(edge => {
    // Only count edges between existing steps
    if (adjacencyList.has(edge.source) && adjacencyList.has(edge.target)) {
      adjacencyList.get(edge.source)!.push(edge.target);
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    }
  });

  // Find all entry nodes: nodes with no incoming edges
  // These are starting points of the workflow (there may be parallel branches)
  const entryNodes: string[] = [];

  steps.forEach(step => {
    if ((incomingCount.get(step.id) || 0) === 0) {
      entryNodes.push(step.id);
    }
  });

  // Fall back to first step if no entry nodes found (cycle)
  if (entryNodes.length === 0 && steps.length > 0) {
    entryNodes.push(steps[0].id);
  }

  if (entryNodes.length === 0) {
    return [];
  }

  // BFS from ALL entry nodes to compute depth
  // Parallel branches (e.g., "APIs" and "Swarms" both feeding into a merge point)
  // start at the same depth and converge naturally
  const depth = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [];

  for (const entryId of entryNodes) {
    queue.push({ id: entryId, level: 0 });
    visited.add(entryId);
    depth.set(entryId, 0);
  }

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    const neighbors = adjacencyList.get(id) || [];

    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighborDepth = level + 1;
        depth.set(neighborId, neighborDepth);
        queue.push({ id: neighborId, level: neighborDepth });
      }
    });
  }

  // Group only REACHABLE nodes by depth
  const depthGroupsMap = new Map<number, string[]>();
  steps.forEach(step => {
    // Skip nodes not reachable from primary entry
    if (!depth.has(step.id)) {
      return;
    }
    const nodeDepth = depth.get(step.id)!;
    if (!depthGroupsMap.has(nodeDepth)) {
      depthGroupsMap.set(nodeDepth, []);
    }
    depthGroupsMap.get(nodeDepth)!.push(step.id);
  });

  // Convert map to sorted array of groups
  const sortedDepths = Array.from(depthGroupsMap.keys()).sort((a, b) => a - b);
  const result: string[][] = sortedDepths.map(d => depthGroupsMap.get(d)!);

  return result;
}

/**
 * Gets all node IDs up to and including a specific depth level.
 * @param depthGroups - Result from computeDepthGroups
 * @param depthLevel - The depth level (1-indexed, so level 1 shows group 0)
 * @returns Array of node IDs visible at this depth level
 */
export function getVisibleNodeIds(
  depthGroups: string[][],
  depthLevel: number
): string[] {
  const result: string[] = [];
  for (let i = 0; i < depthLevel && i < depthGroups.length; i++) {
    result.push(...depthGroups[i]);
  }
  return result;
}

/**
 * Gets the node IDs in a specific depth group.
 * @param depthGroups - Result from computeDepthGroups
 * @param depthLevel - The depth level (1-indexed)
 * @returns Array of node IDs at this depth level, or empty array if out of bounds
 */
export function getNodesAtDepth(
  depthGroups: string[][],
  depthLevel: number
): string[] {
  const index = depthLevel - 1;
  if (index < 0 || index >= depthGroups.length) {
    return [];
  }
  return depthGroups[index];
}
