'use client'

import {
  getRailColor,
  ROW_HEIGHT,
  RAIL_WIDTH,
  NODE_RADIUS,
  type GraphNode,
  type GraphConnection,
} from '@/lib/git/graph-layout'

interface GitGraphCanvasProps {
  nodes: GraphNode[]
  connections: GraphConnection[]
  width: number
  height: number
  selectedSha?: string
}

export function GitGraphCanvas({
  nodes,
  connections,
  width,
  height,
  selectedSha,
}: GitGraphCanvasProps) {
  return (
    <svg
      width={width}
      height={height}
      className="absolute top-0 left-0"
      style={{ pointerEvents: 'none' }}
    >
      {/* Connection paths */}
      {connections.map((conn, i) => {
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
            key={i}
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
      {nodes.map((node) => {
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
