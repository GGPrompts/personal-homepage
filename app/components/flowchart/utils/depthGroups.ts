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

  // Find entry nodes: nodes with no incoming edges
  // Prefer human-entry type nodes, then fall back to any node with no incoming edges
  const humanEntryNodes: string[] = [];
  const otherEntryNodes: string[] = [];

  steps.forEach(step => {
    const hasNoIncoming = (incomingCount.get(step.id) || 0) === 0;
    if (hasNoIncoming) {
      if (step.nodeType === 'human-entry') {
        humanEntryNodes.push(step.id);
      } else {
        otherEntryNodes.push(step.id);
      }
    }
  });

  // Pick the PRIMARY entry node (prefer human-entry, use first one found)
  // Only traverse from this single entry to avoid mixing disconnected subgraphs
  let primaryEntry: string | null = null;
  if (humanEntryNodes.length > 0) {
    primaryEntry = humanEntryNodes[0];
  } else if (otherEntryNodes.length > 0) {
    primaryEntry = otherEntryNodes[0];
  } else if (steps.length > 0) {
    primaryEntry = steps[0].id;
  }

  if (!primaryEntry) {
    return [];
  }

  // BFS to compute depth for each node, starting ONLY from primary entry
  // This ensures we only include nodes in the main workflow, not disconnected subgraphs
  const depth = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [];

  queue.push({ id: primaryEntry, level: 0 });
  visited.add(primaryEntry);
  depth.set(primaryEntry, 0);

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    // Get neighbors (nodes this one points to)
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

  // Only include nodes reachable from primary entry (ignore disconnected subgraphs)
  // Disconnected nodes are NOT added to depth groups - they stay visible but don't participate in stepping

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
