'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Graph from 'graphology'
import { cn } from '@/lib/utils'
import type { BeadsIssue } from '../lib/beads/types'
import { getPriorityColor, getStatusColor, CHART_COLORS } from './chartUtils'

export interface DependencyNetworkGraphProps {
  issues: BeadsIssue[]
  className?: string
  onNodeClick?: (issue: BeadsIssue) => void
}

interface NodePosition {
  x: number
  y: number
  issue: BeadsIssue
  size: number
}

interface Edge {
  source: string
  target: string
  sourcePos: NodePosition
  targetPos: NodePosition
}

/**
 * Force-directed layout simulation
 */
function useForceLayout(
  nodes: Map<string, NodePosition>,
  edges: Edge[],
  width: number,
  height: number
) {
  const [positions, setPositions] = useState<Map<string, NodePosition>>(nodes)
  const animationRef = useRef<number | undefined>(undefined)
  const iterationsRef = useRef(0)

  useEffect(() => {
    if (nodes.size === 0) return

    // Initialize with circular layout
    const nodeList = Array.from(nodes.values())
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35

    const initialPositions = new Map<string, NodePosition>()
    nodeList.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodeList.length
      initialPositions.set(node.issue.id, {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })

    // Create velocities map
    const velocities = new Map<string, { vx: number; vy: number }>()
    initialPositions.forEach((_, id) => {
      velocities.set(id, { vx: 0, vy: 0 })
    })

    const simulate = () => {
      if (iterationsRef.current > 100) {
        return
      }

      const newPositions = new Map(initialPositions)
      const damping = 0.9
      const springLength = 120
      const springStrength = 0.05
      const repulsion = 5000

      // Apply forces
      initialPositions.forEach((nodeA, idA) => {
        let fx = 0
        let fy = 0

        // Repulsion from all other nodes
        initialPositions.forEach((nodeB, idB) => {
          if (idA === idB) return

          const dx = nodeA.x - nodeB.x
          const dy = nodeA.y - nodeB.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1

          const force = repulsion / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        })

        // Spring forces from edges
        edges.forEach(edge => {
          let other: NodePosition | undefined
          if (edge.source === idA) {
            other = initialPositions.get(edge.target)
          } else if (edge.target === idA) {
            other = initialPositions.get(edge.source)
          }

          if (other) {
            const dx = other.x - nodeA.x
            const dy = other.y - nodeA.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const displacement = dist - springLength

            fx += (dx / dist) * displacement * springStrength
            fy += (dy / dist) * displacement * springStrength
          }
        })

        // Center gravity
        fx += (centerX - nodeA.x) * 0.01
        fy += (centerY - nodeA.y) * 0.01

        // Update velocity and position
        const vel = velocities.get(idA)!
        vel.vx = (vel.vx + fx) * damping
        vel.vy = (vel.vy + fy) * damping

        const newNode = { ...nodeA }
        newNode.x = Math.max(30, Math.min(width - 30, nodeA.x + vel.vx))
        newNode.y = Math.max(30, Math.min(height - 30, nodeA.y + vel.vy))

        newPositions.set(idA, newNode)
        initialPositions.set(idA, newNode)
      })

      setPositions(new Map(newPositions))
      iterationsRef.current++

      if (iterationsRef.current < 100) {
        animationRef.current = requestAnimationFrame(simulate)
      }
    }

    iterationsRef.current = 0
    setPositions(initialPositions)
    animationRef.current = requestAnimationFrame(simulate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes, edges, width, height])

  return positions
}

export function DependencyNetworkGraph({
  issues,
  className,
  onNodeClick,
}: DependencyNetworkGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Build graph structure
  const { nodes, edges } = useMemo(() => {
    const g = new Graph()
    const nodeMap = new Map<string, NodePosition>()
    const edgeList: Edge[] = []

    // Add nodes
    issues.forEach(issue => {
      g.addNode(issue.id, { issue })

      // Calculate size based on blocking importance
      const blocksCount = issue.blocks?.length ?? 0
      const baseSize = 8
      const size = baseSize + Math.min(blocksCount * 3, 12)

      nodeMap.set(issue.id, {
        x: 0,
        y: 0,
        issue,
        size,
      })
    })

    // Add edges (dependencies)
    issues.forEach(issue => {
      issue.blockedBy?.forEach(blockerId => {
        if (g.hasNode(blockerId)) {
          try {
            g.addEdge(blockerId, issue.id)
          } catch {
            // Edge already exists
          }
        }
      })
    })

    // Build edge list for rendering
    g.forEachEdge((_, __, source, target) => {
      const sourceNode = nodeMap.get(source)
      const targetNode = nodeMap.get(target)
      if (sourceNode && targetNode) {
        edgeList.push({
          source,
          target,
          sourcePos: sourceNode,
          targetPos: targetNode,
        })
      }
    })

    return { nodes: nodeMap, edges: edgeList, graph: g }
  }, [issues])

  // Observe container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Apply force-directed layout
  const positions = useForceLayout(nodes, edges, dimensions.width, dimensions.height)

  const handleNodeClick = useCallback(
    (issue: BeadsIssue) => {
      onNodeClick?.(issue)
    },
    [onNodeClick]
  )

  if (issues.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-zinc-500', className)}>
        No issues to visualize
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full min-h-[400px]', className)}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
      >
        <defs>
          {/* Arrow marker for edges */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={CHART_COLORS.muted}
              opacity={0.6}
            />
          </marker>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g className="edges">
          {edges.map(edge => {
            const sourcePos = positions.get(edge.source)
            const targetPos = positions.get(edge.target)
            if (!sourcePos || !targetPos) return null

            const isHighlighted =
              hoveredNode === edge.source || hoveredNode === edge.target

            // Calculate edge path with offset for arrow
            const dx = targetPos.x - sourcePos.x
            const dy = targetPos.y - sourcePos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const offsetX = (dx / dist) * (targetPos.size + 5)
            const offsetY = (dy / dist) * (targetPos.size + 5)

            return (
              <motion.line
                key={`${edge.source}-${edge.target}`}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x - offsetX}
                y2={targetPos.y - offsetY}
                stroke={isHighlighted ? CHART_COLORS.primary : CHART_COLORS.muted}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 0.8 : 0.4}
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            )
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {Array.from(positions.values()).map(node => {
            const isHovered = hoveredNode === node.issue.id
            const isConnected =
              hoveredNode &&
              edges.some(
                e =>
                  (e.source === hoveredNode && e.target === node.issue.id) ||
                  (e.target === hoveredNode && e.source === node.issue.id)
              )

            const color = getStatusColor(node.issue.status)
            const dimmed = hoveredNode && !isHovered && !isConnected

            return (
              <motion.g
                key={node.issue.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: dimmed ? 0.3 : 1,
                  x: node.x,
                  y: node.y,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                onMouseEnter={() => setHoveredNode(node.issue.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.issue)}
                className="cursor-pointer"
                style={{ filter: isHovered ? 'url(#glow)' : undefined }}
              >
                {/* Node circle */}
                <circle
                  r={isHovered ? node.size * 1.3 : node.size}
                  fill={color}
                  fillOpacity={0.8}
                  stroke={isHovered ? '#fff' : color}
                  strokeWidth={isHovered ? 2 : 1}
                />

                {/* Priority indicator (inner dot) */}
                <circle
                  r={3}
                  fill={getPriorityColor(node.issue.priority)}
                  fillOpacity={0.9}
                />
              </motion.g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && positions.has(hoveredNode) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute pointer-events-none z-10',
            'glass-dark px-3 py-2 rounded-lg',
            'border border-zinc-700/50 shadow-xl'
          )}
          style={{
            left: (positions.get(hoveredNode)?.x ?? 0) + 15,
            top: (positions.get(hoveredNode)?.y ?? 0) - 10,
            maxWidth: 200,
          }}
        >
          <p className="text-xs font-medium text-zinc-100 truncate">
            {positions.get(hoveredNode)?.issue.title}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {positions.get(hoveredNode)?.issue.id}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: getStatusColor(positions.get(hoveredNode)!.issue.status) + '20',
                color: getStatusColor(positions.get(hoveredNode)!.issue.status),
              }}
            >
              {positions.get(hoveredNode)?.issue.status}
            </span>
            {(positions.get(hoveredNode)?.issue.blockedBy?.length ?? 0) > 0 && (
              <span className="text-[10px] text-red-400">
                Blocked by {positions.get(hoveredNode)?.issue.blockedBy?.length}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.open }} />
          <span>Open</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.inProgress }} />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.done }} />
          <span>Done</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <svg width="20" height="8">
            <line x1="0" y1="4" x2="15" y2="4" stroke={CHART_COLORS.muted} strokeWidth="1" />
            <polygon points="15 1, 20 4, 15 7" fill={CHART_COLORS.muted} />
          </svg>
          <span>Blocks</span>
        </div>
      </div>
    </div>
  )
}
