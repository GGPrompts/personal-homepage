'use client'

import { useMemo } from 'react'
import {
  getRailColor,
  ROW_HEIGHT,
  RAIL_WIDTH,
  NODE_RADIUS,
  type GraphNode,
  type GraphConnection,
} from '@/lib/git/graph-layout'

/** Buffer rows above/below visible range to render in SVG */
const VISIBLE_BUFFER = 5

interface GitGraphCanvasProps {
  nodes: GraphNode[]
  connections: GraphConnection[]
  width: number
  height: number
  selectedSha?: string
  visibleRange?: { start: number; end: number }
}

export function GitGraphCanvas({
  nodes,
  connections,
  width,
  height,
  selectedSha,
  visibleRange,
}: GitGraphCanvasProps) {
  // Filter to visible range with buffer
  const { visibleNodes, visibleConnections } = useMemo(() => {
    if (!visibleRange) {
      return { visibleNodes: nodes, visibleConnections: connections }
    }

    const start = Math.max(0, visibleRange.start - VISIBLE_BUFFER)
    const end = Math.min(nodes.length - 1, visibleRange.end + VISIBLE_BUFFER)

    const filteredNodes = nodes.filter((n) => n.row >= start && n.row <= end)

    const filteredConnections = connections.filter(
      (c) =>
        // Include connection if either endpoint is in range
        (c.from >= start && c.from <= end) ||
        (c.to >= start && c.to <= end) ||
        // Also include connections that span across the visible range
        (c.from < start && c.to > end)
    )

    return { visibleNodes: filteredNodes, visibleConnections: filteredConnections }
  }, [nodes, connections, visibleRange])

  return (
    <svg
      width={width}
      height={height}
      className="absolute top-0 left-0"
      style={{ pointerEvents: 'none' }}
    >
      {/* Connection paths */}
      {visibleConnections.map((conn, i) => {
        const fromX = (conn.fromLane + 0.5) * RAIL_WIDTH
        const fromY = conn.from * ROW_HEIGHT + ROW_HEIGHT / 2
        const toX = (conn.toLane + 0.5) * RAIL_WIDTH
        const toY = conn.to * ROW_HEIGHT + ROW_HEIGHT / 2

        const color = getRailColor(conn.fromLane)
        let d: string

        if (conn.type === 'straight') {
          // Vertical line
          d = `M ${fromX} ${fromY + NODE_RADIUS} L ${toX} ${toY - NODE_RADIUS}`
        } else {
          // Bezier curve for merge-left / merge-right
          if (conn.from + 1 === conn.to) {
            // Adjacent rows: simple curve
            const midY = (fromY + toY) / 2
            d = `M ${fromX} ${fromY + NODE_RADIUS} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY - NODE_RADIUS}`
          } else {
            // Non-adjacent: vertical line then curve into target
            const curveStartY = toY - ROW_HEIGHT
            d = [
              `M ${fromX} ${fromY + NODE_RADIUS}`,
              `L ${fromX} ${curveStartY}`,
              `C ${fromX} ${curveStartY + ROW_HEIGHT * 0.5}, ${toX} ${curveStartY + ROW_HEIGHT * 0.5}, ${toX} ${toY - NODE_RADIUS}`,
            ].join(' ')
          }
        }

        return (
          <path
            key={`${conn.from}-${conn.to}-${conn.fromLane}-${conn.toLane}`}
            d={d}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}

      {/* Commit node circles */}
      {visibleNodes.map((node) => {
        const cx = (node.lane + 0.5) * RAIL_WIDTH
        const cy = node.row * ROW_HEIGHT + ROW_HEIGHT / 2
        const color = getRailColor(node.lane)
        const isMerge = (node.parents?.length ?? 0) > 1
        const isHead = node.refs?.some((r) => r.type === 'head') ?? false
        const isSelected = node.sha === selectedSha

        return (
          <g key={node.sha}>
            {/* Glow ring for HEAD */}
            {isHead && (
              <circle
                cx={cx}
                cy={cy}
                r={NODE_RADIUS + 3}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                opacity={0.6}
              />
            )}
            {/* Selection ring */}
            {isSelected && (
              <circle
                cx={cx}
                cy={cy}
                r={NODE_RADIUS + 2}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
              />
            )}
            {/* Node circle */}
            <circle
              cx={cx}
              cy={cy}
              r={NODE_RADIUS}
              fill={isMerge ? 'hsl(var(--background))' : color}
              stroke={color}
              strokeWidth={2}
            />
          </g>
        )
      })}
    </svg>
  )
}
