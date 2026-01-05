'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { BeadsIssue } from '../lib/beads/types'
import { CHART_COLORS, tooltipStyle, calculateSprintHealth } from './chartUtils'

// Custom tooltip component for radar chart
function RadarTooltip({ active, payload, showTarget }: TooltipProps<ValueType, NameType> & { showTarget: boolean }) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as { metric: string; value: number; target: number; description: string } | undefined
    if (!data) return null
    return (
      <div
        className="glass-dark px-3 py-2 rounded-lg border border-zinc-700/50 shadow-xl"
        style={tooltipStyle}
      >
        <p className="text-xs font-medium text-zinc-100">{data.metric}</p>
        <p className="text-[11px] text-zinc-400 mb-1">{data.description}</p>
        <p className="text-sm font-semibold" style={{ color: CHART_COLORS.primary }}>
          {data.value}%
        </p>
        {showTarget && (
          <p className="text-[10px] text-zinc-500">Target: {data.target}%</p>
        )}
      </div>
    )
  }
  return null
}

export interface SprintHealthRadarProps {
  issues: BeadsIssue[]
  className?: string
  showTarget?: boolean
}

const METRIC_LABELS: Record<string, string> = {
  velocity: 'Velocity',
  throughput: 'Throughput',
  blockedRatio: 'Unblocked %',
  readyRatio: 'Ready %',
  priorityBalance: 'Balance',
  dependencyHealth: 'Dep. Health',
}

const METRIC_DESCRIPTIONS: Record<string, string> = {
  velocity: 'Percentage of issues completed',
  throughput: 'Issue completion rate',
  blockedRatio: 'Issues not blocked',
  readyRatio: 'Issues ready for work',
  priorityBalance: 'Even priority distribution',
  dependencyHealth: 'Issues without blockers',
}

export function SprintHealthRadar({
  issues,
  className,
  showTarget = true,
}: SprintHealthRadarProps) {
  const data = useMemo(() => {
    const health = calculateSprintHealth(issues)

    return Object.entries(health).map(([key, value]) => ({
      metric: METRIC_LABELS[key] || key,
      value,
      target: 80, // Target threshold
      fullMark: 100,
      description: METRIC_DESCRIPTIONS[key] || '',
    }))
  }, [issues])

  // Calculate overall health score
  const overallScore = useMemo(() => {
    if (data.length === 0) return 0
    const sum = data.reduce((acc, d) => acc + d.value, 0)
    return Math.round(sum / data.length)
  }, [data])

  // Wrapper component to bind showTarget to tooltip
  const TooltipWithTarget = (props: TooltipProps<ValueType, NameType>) => (
    <RadarTooltip {...props} showTarget={showTarget} />
  )

  if (issues.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-zinc-500', className)}>
        No issues to analyze
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn('w-full h-full min-h-[300px] relative', className)}
    >
      {/* Overall Score Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={cn(
            'px-3 py-1.5 rounded-lg glass-dark',
            'border border-zinc-700/50 shadow-lg'
          )}
        >
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Health Score</p>
          <p
            className="text-xl font-bold"
            style={{
              color:
                overallScore >= 80
                  ? CHART_COLORS.primary
                  : overallScore >= 50
                    ? CHART_COLORS.accent
                    : CHART_COLORS.danger,
            }}
          >
            {overallScore}%
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid
            stroke="rgba(63, 63, 70, 0.5)"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="metric"
            stroke="rgb(161, 161, 170)"
            fontSize={10}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            stroke="rgb(113, 113, 122)"
            fontSize={9}
            tickCount={5}
            axisLine={false}
          />

          {/* Target area (optional) */}
          {showTarget && (
            <Radar
              name="Target"
              dataKey="target"
              stroke={CHART_COLORS.muted}
              fill={CHART_COLORS.muted}
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="3 3"
              animationDuration={0}
            />
          )}

          {/* Actual values */}
          <Radar
            name="Current"
            dataKey="value"
            stroke={CHART_COLORS.primary}
            fill={CHART_COLORS.primary}
            fillOpacity={0.3}
            strokeWidth={2}
            animationDuration={1000}
            dot={{
              fill: CHART_COLORS.primary,
              strokeWidth: 0,
              r: 4,
            }}
          />

          <Tooltip content={TooltipWithTarget} />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            iconType="circle"
            iconSize={8}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
