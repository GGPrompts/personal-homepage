/**
 * Git Graph Layout Algorithm
 *
 * Ported from markdown-themes/src/lib/graphLayout.ts
 *
 * Calculates visual layout for git commit graph visualization.
 * Assigns each commit to a "rail" (column/lane) and generates
 * connection data for drawing SVG lines between commits.
 */

/** Layout constants */
export const ROW_HEIGHT = 40
export const RAIL_WIDTH = 20
export const NODE_RADIUS = 6

/** 8-color palette, cycled by rail index */
export const RAIL_COLORS = [
  "#6bcaf7", // cyan
  "#f76b6b", // red
  "#6bf78e", // green
  "#f7a86b", // orange
  "#b76bf7", // purple
  "#f76bb7", // pink
  "#b7f76b", // olive
  "#c4a8ff", // lavender
]

/** Get the color for a given rail index */
export function getRailColor(rail: number): string {
  return RAIL_COLORS[rail % RAIL_COLORS.length]
}

/** Parsed ref from git log %D */
export interface Ref {
  name: string
  type: "branch" | "tag" | "remote" | "head"
}

/** Input commit from the git log parser */
export interface Commit {
  sha: string
  shortSha: string
  message: string
  author: string
  email: string
  date: string
  parents: string[]
  refs: Ref[]
}

/** Commit with layout positioning data */
export interface GraphNode extends Commit {
  lane: number // Column index (0, 1, 2, ...)
  row: number // Row index (matches commit order)
}

/** Connection between two commits in the graph */
export interface GraphConnection {
  from: number // Row index of child commit
  to: number // Row index of parent commit
  fromLane: number
  toLane: number
  type: "straight" | "merge-left" | "merge-right"
}

/** Complete graph layout result */
export interface GraphLayout {
  nodes: GraphNode[]
  connections: GraphConnection[]
  laneCount: number // Max lanes needed
}

/**
 * Calculate the visual layout for a git commit graph.
 *
 * Algorithm:
 * 1. Process commits in order (already topologically sorted from git log)
 * 2. Track "active rails" - columns occupied by branch lines waiting for parents
 * 3. For each commit:
 *    - If it's an expected parent in rail X, place it in rail X
 *    - If multiple rails expect this commit (merge), use the leftmost rail
 *    - If new (no active rail waiting), assign first free rail
 * 4. Generate connection data for drawing lines between commits
 *
 * @param commits Array of commits in topological order (newest first)
 * @returns Graph layout with positioned nodes and connections
 */
export function computeGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { nodes: [], connections: [], laneCount: 0 }
  }

  const nodes: GraphNode[] = []
  const connections: GraphConnection[] = []

  // Maps commit sha to the rail(s) expecting it as a parent
  // A commit can be expected by multiple rails (in case of merge)
  const expectedParents: Map<string, number[]> = new Map()

  // Track which rails are currently active (occupied by a branch line)
  // Value is the sha of the commit that will use this rail next
  const activeRails: Map<number, string | null> = new Map()

  // Track row index and rail of each commit for connection drawing
  const commitRowMap: Map<string, number> = new Map()
  const commitLaneMap: Map<string, number> = new Map()

  let maxLane = 0

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row]
    let lane: number

    // Check if any rails are expecting this commit
    const expectingRails = expectedParents.get(commit.sha) || []

    if (expectingRails.length > 0) {
      // Use the leftmost expecting rail (this handles merge visualization)
      lane = Math.min(...expectingRails)

      // Free up any other rails that were also expecting this commit
      for (const r of expectingRails) {
        if (r !== lane) {
          activeRails.delete(r)
        }
      }

      // Remove from expected parents
      expectedParents.delete(commit.sha)
    } else {
      // Find first free rail (not currently active)
      lane = 0
      while (activeRails.has(lane)) {
        lane++
      }
    }

    // Track max lane for layout width
    maxLane = Math.max(maxLane, lane)

    // Record this commit's position
    commitRowMap.set(commit.sha, row)
    commitLaneMap.set(commit.sha, lane)

    // Create the graph node
    nodes.push({
      ...commit,
      parents: commit.parents ?? [],
      refs: commit.refs ?? [],
      lane,
      row,
    })

    // Handle parents
    const parents = commit.parents ?? []
    if (parents.length === 0) {
      // Root commit - this rail becomes inactive
      activeRails.delete(lane)
    } else {
      // First parent continues on the same rail
      const firstParent = parents[0]
      activeRails.set(lane, firstParent)

      // Register this rail as expecting the first parent
      const existing = expectedParents.get(firstParent) || []
      existing.push(lane)
      expectedParents.set(firstParent, existing)

      // Additional parents get new rails (merge scenario)
      for (let i = 1; i < parents.length; i++) {
        const parentSha = parents[i]

        // Find first free rail for this branch
        let newRail = 0
        while (activeRails.has(newRail)) {
          newRail++
        }

        activeRails.set(newRail, parentSha)
        maxLane = Math.max(maxLane, newRail)

        // Register this new rail as expecting the parent
        const existingParent = expectedParents.get(parentSha) || []
        existingParent.push(newRail)
        expectedParents.set(parentSha, existingParent)
      }
    }
  }

  // Generate connections
  for (const node of nodes) {
    for (const parentSha of node.parents ?? []) {
      const parentRow = commitRowMap.get(parentSha)
      const parentLane = commitLaneMap.get(parentSha)

      if (parentRow !== undefined && parentLane !== undefined) {
        // Determine connection type based on lane positions
        let type: GraphConnection["type"]
        if (node.lane === parentLane) {
          type = "straight"
        } else if (node.lane > parentLane) {
          type = "merge-left"
        } else {
          type = "merge-right"
        }

        connections.push({
          from: node.row,
          to: parentRow,
          fromLane: node.lane,
          toLane: parentLane,
          type,
        })
      }
    }
  }

  return {
    nodes,
    connections,
    laneCount: maxLane + 1,
  }
}
