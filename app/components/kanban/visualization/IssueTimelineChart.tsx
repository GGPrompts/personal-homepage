'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Line,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { BeadsIssue } from '../lib/beads/types'
import { CHART_COLORS, tooltipStyle, generateTimelineData } from './chartUtils'

// Custom tooltip component for timeline charts
function TimelineTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (active && payload && payload.length) {
    return (
      <div
        className="glass-dark px-3 py-2 rounded-lg border border-zinc-700/50 shadow-xl"
        style={tooltipStyle}
      >
        <p className="text-xs font-medium text-zinc-100 mb-1">{String(label)}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-[11px]" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export interface IssueTimelineChartProps {
  issues: BeadsIssue[]
  className?: string
  showCumulative?: boolean
  variant?: 'area' | 'composed'
}

/**
 * Generate sample timeline data when no real dates available
 */
function generateSampleData(issues: BeadsIssue[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const completed = issues.filter(i => i.status === 'done' || i.status === 'closed').length
  const remaining = issues.length - completed

  // Distribute across days with some variance
  return days.map((day, i) => {
    const factor = Math.sin((i / 6) * Math.PI) * 0.5 + 0.5
    return {
      date: day,
      created: Math.round((remaining * factor) / 2) + 1,
      completed: Math.round((completed * factor) / 3),
      cumulative: Math.round(remaining * (1 - i / 10)),
    }
  })
}

export function IssueTimelineChart({
  issues,
  className,
  showCumulative = true,
  variant = 'composed',
}: IssueTimelineChartProps) {
  const data = useMemo(() => {
    const timelineData = generateTimelineData(issues)

    // If no dates available, generate sample data
    if (timelineData.length === 0) {
      return generateSampleData(issues)
    }

    // Format dates for display
    return timelineData.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }))
  }, [issues])

  if (issues.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-zinc-500', className)}>
        No issues to visualize
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('w-full h-full min-h-[300px]', className)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(63, 63, 70, 0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgb(113, 113, 122)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(63, 63, 70, 0.5)' }}
            />
            <YAxis
              stroke="rgb(113, 113, 122)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip content={TimelineTooltip} />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="circle"
              iconSize={8}
            />

            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              fill="url(#createdGradient)"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#completedGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        ) : (
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(63, 63, 70, 0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgb(113, 113, 122)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(63, 63, 70, 0.5)' }}
            />
            <YAxis
              yAxisId="left"
              stroke="rgb(113, 113, 122)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            {showCumulative && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="rgb(113, 113, 122)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={30}
              />
            )}
            <Tooltip content={TimelineTooltip} />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="circle"
              iconSize={8}
            />

            <Bar
              yAxisId="left"
              dataKey="created"
              name="Created"
              fill={CHART_COLORS.secondary}
              fillOpacity={0.7}
              radius={[2, 2, 0, 0]}
              animationDuration={800}
            />
            <Bar
              yAxisId="left"
              dataKey="completed"
              name="Completed"
              fill={CHART_COLORS.primary}
              fillOpacity={0.7}
              radius={[2, 2, 0, 0]}
              animationDuration={800}
            />
            {showCumulative && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Open Issues"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.accent, strokeWidth: 0, r: 3 }}
                animationDuration={1000}
              />
            )}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  )
}
