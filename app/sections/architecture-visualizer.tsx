"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Network, RefreshCw, Loader2, AlertCircle, X,
  GitBranch, Clock, FolderGit2, Bug, Activity,
  Maximize2, Minimize2, Code, ExternalLink, Tag,
} from "lucide-react"

// Dynamic import — react-force-graph-3d uses WebGL/canvas, no SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false })

// SpriteText — lazily loaded client-side for persistent node labels
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _spriteTextClass: (new (text?: string) => any) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _spriteTextPromise: Promise<(new (text?: string) => any)> | null =
  typeof window !== "undefined"
    ? import("three-spritetext").then((mod) => {
        _spriteTextClass = mod.default
        return mod.default
      })
    : null

// ---------------------------------------------------------------------------
// Types (mirror the API response)
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string
  name: string
  path: string
  techStack: string[]
  commitVelocity: number
  linesOfCode: number
  openIssues: number
  beadsPrefix?: string
  gitStatus: "clean" | "dirty" | "untracked"
  lastModified: string
}

interface GraphEdge {
  source: string
  target: string
  type: "dependency" | "beads-related"
}

interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodeColor(node: GraphNode): string {
  if (!node.beadsPrefix) return "#64748B" // slate — no beads data
  if (node.openIssues === 0) return "#10B981" // emerald
  if (node.openIssues <= 3) return "#F59E0B" // amber
  return "#EF4444" // red
}

type SizeMode = "commits" | "loc" | "issues"

function getNodeSize(node: GraphNode, mode: SizeMode = "commits"): number {
  switch (mode) {
    case "commits":
      return Math.max(4, 4 + node.commitVelocity * 0.8)
    case "loc":
      return Math.max(4, 4 + Math.log10(node.linesOfCode + 1) * 3)
    case "issues":
      return Math.max(4, 4 + node.openIssues * 2)
  }
}

function getGitStatusLabel(status: GraphNode["gitStatus"]): string {
  switch (status) {
    case "clean": return "Clean"
    case "dirty": return "Modified"
    case "untracked": return "Untracked"
  }
}

function getGitStatusColor(status: GraphNode["gitStatus"]): string {
  switch (status) {
    case "clean": return "text-green-400"
    case "dirty": return "text-yellow-400"
    case "untracked": return "text-slate-400"
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const diff = now - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function shortenPath(path: string): string {
  return path
    .replace(/^\/home\/[^/]+\/projects\//, "~/p/")
    .replace(/^\/home\/[^/]+\//, "~/")
}

// ---------------------------------------------------------------------------
// Error Boundary for WebGL
// ---------------------------------------------------------------------------

class GraphErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm">Failed to initialize 3D graph. WebGL may not be available.</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function NodeDetailPanel({
  node,
  onClose,
  onNavigateToProject,
}: {
  node: GraphNode
  onClose: () => void
  onNavigateToProject?: (slug: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-border/30 bg-background/90 backdrop-blur-md shadow-xl z-20 overflow-hidden"
      data-tabz-region="node-detail"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: getNodeColor(node) }}
          />
          <h3 className="font-mono font-bold text-sm truncate">{node.name}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onClose}
          data-tabz-action="close-detail"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Tech stack */}
        {node.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {node.techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs font-mono">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        {/* Commit velocity */}
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">7-day commits:</span>
          <span className="font-mono font-medium tabular-nums">
            {node.commitVelocity}
          </span>
        </div>

        {/* Lines of code */}
        <div className="flex items-center gap-2 text-sm">
          <Code className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Lines of code:</span>
          <span className="font-mono font-medium tabular-nums">
            {node.linesOfCode > 0 ? node.linesOfCode.toLocaleString() : "n/a"}
          </span>
        </div>

        {/* Open issues */}
        <div className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Open issues:</span>
          <span className="font-mono font-medium tabular-nums">
            {node.beadsPrefix ? node.openIssues : "n/a"}
          </span>
          {node.beadsPrefix && (
            <Badge variant="outline" className="text-xs font-mono ml-auto">
              {node.beadsPrefix}
            </Badge>
          )}
        </div>

        {/* Git status */}
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Git:</span>
          <span className={`font-medium ${getGitStatusColor(node.gitStatus)}`}>
            {getGitStatusLabel(node.gitStatus)}
          </span>
        </div>

        {/* Last modified */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Modified:</span>
          <span className="text-foreground" suppressHydrationWarning>
            {formatTimeAgo(node.lastModified)}
          </span>
        </div>

        {/* Path */}
        <div className="flex items-center gap-2 text-xs">
          <FolderGit2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="font-mono text-muted-foreground truncate">
            {shortenPath(node.path)}
          </span>
        </div>

        {/* Open project button */}
        {onNavigateToProject && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-1 text-xs"
            onClick={() => onNavigateToProject(node.id)}
            data-tabz-action="open-project"
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Open Project
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main Section
// ---------------------------------------------------------------------------

export default function ArchitectureVisualizerSection({
  activeSubItem,
  onSubItemHandled,
  onNavigateToSection,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
  onNavigateToSection?: (section: string, subItem?: string) => void
}) {
  const [graphData, setGraphData] = React.useState<GraphResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = React.useState<GraphNode | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [showLabels, setShowLabels] = React.useState(false)
  const [sizeMode, setSizeMode] = React.useState<SizeMode>("commits")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [spriteText, setSpriteText] = React.useState<(new (text?: string) => any) | null>(_spriteTextClass)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 500 })

  // Load SpriteText class and store in state so React knows when it's ready
  React.useEffect(() => {
    if (!spriteText && _spriteTextPromise) {
      _spriteTextPromise.then((cls) => setSpriteText(() => cls))
    }
  }, [spriteText])

  // Force graph to rebuild node objects when labels toggle
  React.useEffect(() => {
    if (graphRef.current) {
      graphRef.current.refresh()
    }
  }, [showLabels])

  // Measure container
  React.useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: isFullscreen ? window.innerHeight - 160 : Math.max(400, window.innerHeight - rect.top - 40),
        })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [isFullscreen, isLoading, graphData])

  // Fetch graph data
  const fetchGraph = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const res = await fetch("/api/projects/graph?workingDir=/home/builder/projects")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: GraphResponse = await res.json()
      if (data.error) throw new Error(data.error)
      setGraphData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch graph data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial fetch + auto-refresh (60s)
  React.useEffect(() => {
    fetchGraph()
    const interval = setInterval(() => fetchGraph(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchGraph])

  // Handle activeSubItem
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Compute connected nodes for hover highlighting
  const connectedNodeIds = React.useMemo(() => {
    if (!hoveredNode || !graphData) return new Set<string>()
    const ids = new Set<string>()
    ids.add(hoveredNode.id)
    for (const edge of graphData.edges) {
      const src = typeof edge.source === "object" ? (edge.source as GraphNode).id : edge.source
      const tgt = typeof edge.target === "object" ? (edge.target as GraphNode).id : edge.target
      if (src === hoveredNode.id) ids.add(tgt)
      if (tgt === hoveredNode.id) ids.add(src)
    }
    return ids
  }, [hoveredNode, graphData])

  // Stats
  const stats = React.useMemo(() => {
    if (!graphData) return null
    const { nodes, edges } = graphData
    const totalProjects = nodes.length
    const activeProjects = nodes.filter((n) => n.commitVelocity > 0).length
    const totalOpenIssues = nodes.reduce((sum, n) => sum + n.openIssues, 0)

    // Most connected project (by edge count)
    const edgeCounts = new Map<string, number>()
    for (const edge of edges) {
      const src = typeof edge.source === "object" ? (edge.source as GraphNode).id : edge.source
      const tgt = typeof edge.target === "object" ? (edge.target as GraphNode).id : edge.target
      edgeCounts.set(src, (edgeCounts.get(src) || 0) + 1)
      edgeCounts.set(tgt, (edgeCounts.get(tgt) || 0) + 1)
    }
    let hubName = "-"
    let hubCount = 0
    for (const [name, count] of edgeCounts) {
      if (count > hubCount) {
        hubCount = count
        hubName = name
      }
    }

    return { totalProjects, activeProjects, totalOpenIssues, hubName, hubCount }
  }, [graphData])

  // Prepare force-graph data: nodes with __color and __size, links keyed by source/target
  const forceGraphData = React.useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }
    return {
      nodes: graphData.nodes.map((n) => ({
        ...n,
        __color: getNodeColor(n),
        __size: getNodeSize(n, sizeMode),
      })),
      links: graphData.edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    }
  }, [graphData, sizeMode])

  return (
    <div
      className={`p-6 space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-background overflow-auto" : ""}`}
      data-tabz-section="architecture-visualizer"
    >
      {/* Header */}
      <div className="flex items-center justify-between" data-tabz-region="header">
        <div>
          <h1 className="text-2xl font-bold terminal-glow flex items-center gap-2">
            <Network className="h-6 w-6" />
            Architecture Visualizer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Living map of your project ecosystem
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Size mode selector */}
          <div className="flex rounded-md border border-border/50 overflow-hidden">
            {([["commits", "Commits"], ["loc", "LOC"], ["issues", "Issues"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSizeMode(mode)}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  sizeMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                data-tabz-action={`size-by-${mode}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant={showLabels ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLabels(!showLabels)}
            data-tabz-action="toggle-labels"
          >
            <Tag className="h-4 w-4 mr-1" />
            Labels
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-tabz-action="toggle-fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 mr-1" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-1" />
            )}
            {isFullscreen ? "Exit" : "Expand"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGraph(true)}
            disabled={isRefreshing}
            data-tabz-action="refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          data-tabz-region="stats"
        >
          <div className="rounded-lg border border-border/20 bg-card/40 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{stats.totalProjects}</div>
            <div className="text-xs text-muted-foreground">Projects</div>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-green-400">{stats.activeProjects}</div>
            <div className="text-xs text-muted-foreground">Active (7d)</div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-amber-400">{stats.totalOpenIssues}</div>
            <div className="text-xs text-muted-foreground">Open Issues</div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <div className="text-lg font-bold truncate font-mono">{stats.hubName}</div>
            <div className="text-xs text-muted-foreground">Hub ({stats.hubCount} edges)</div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Scanning project ecosystem...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchGraph()}
            data-tabz-action="retry"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Graph */}
      {!isLoading && !error && graphData && graphData.nodes.length > 0 && (
        <div
          ref={containerRef}
          className="relative rounded-lg border border-border/20 bg-black/40 overflow-hidden"
          data-tabz-region="graph"
        >
          <GraphErrorBoundary>
            <ForceGraph3D
              ref={graphRef}
              graphData={forceGraphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="rgba(0,0,0,0)"
              showNavInfo={false}
              nodeId="id"
              nodeLabel="name"
              nodeVal={(node: Record<string, unknown>) => (node as unknown as GraphNode & { __size: number }).__size}
              nodeColor={(node: Record<string, unknown>) => {
                const n = node as unknown as GraphNode & { __color: string }
                if (hoveredNode && !connectedNodeIds.has(n.id)) {
                  return "#1e293b" // dim non-connected nodes on hover
                }
                return n.__color
              }}
              nodeOpacity={0.9}
              nodeThreeObject={showLabels && spriteText ? (node: Record<string, unknown>) => {
                const n = node as unknown as GraphNode & { __color: string; __size: number }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sprite = new (spriteText as any)(n.name) as any
                sprite.color = n.__color
                sprite.textHeight = 2.5
                sprite.backgroundColor = "rgba(0,0,0,0.6)"
                sprite.padding = 1
                sprite.borderRadius = 2
                return sprite
              } : undefined}
              nodeThreeObjectExtend={showLabels && spriteText ? true : undefined}
              linkSource="source"
              linkTarget="target"
              linkColor={() => "rgba(100, 116, 139, 0.3)"}
              linkWidth={1}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkDirectionalArrowColor={() => "rgba(100, 116, 139, 0.5)"}
              onNodeClick={(node: Record<string, unknown>) => {
                setSelectedNode(node as unknown as GraphNode)
              }}
              onNodeHover={(node: Record<string, unknown> | null) => {
                setHoveredNode(node as unknown as GraphNode | null)
              }}
              onBackgroundClick={() => setSelectedNode(null)}
              enableNodeDrag={true}
              enableNavigationControls={true}
            />
          </GraphErrorBoundary>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 text-xs text-muted-foreground bg-background/70 backdrop-blur-sm rounded-md px-3 py-1.5 border border-border/20">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              0 issues
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
              1-3
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
              4+
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500 inline-block" />
              No beads
            </span>
          </div>

          {/* Node detail panel */}
          <AnimatePresence>
            {selectedNode && (
              <NodeDetailPanel
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onNavigateToProject={onNavigateToSection ? (slug) => {
                  onNavigateToSection("projects", slug)
                } : undefined}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && graphData && graphData.nodes.length === 0 && (
        <div className="rounded-lg border border-border/20 bg-card/40 p-8 text-center" data-tabz-region="empty">
          <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No projects found</h3>
          <p className="text-sm text-muted-foreground">
            No project directories detected in ~/projects/.
          </p>
        </div>
      )}
    </div>
  )
}
