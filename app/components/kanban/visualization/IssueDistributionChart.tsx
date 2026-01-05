'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { BeadsIssue } from '../lib/beads/types'
import {
  CHART_COLORS,
  CHART_PALETTE,
  tooltipStyle,
  groupByStatus,
  groupByPriority,
  groupByType,
} from './chartUtils'

// Custom tooltip component for distribution charts
function DistributionTooltip({ active, payload, total }: TooltipProps<ValueType, NameType> & { total: number }) {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload as { name: string; count: number; color: string } | undefined
    if (!item) return null
    const percentage = ((item.count / total) * 100).toFixed(1)
    return (
      <div
        className="glass-dark px-3 py-2 rounded-lg border border-zinc-700/50 shadow-xl"
        style={tooltipStyle}
      >
        <p className="text-xs font-medium text-zinc-100">{item.name}</p>
        <p className="text-sm font-semibold" style={{ color: item.color }}>
          {item.count} issues ({percentage}%)
        </p>
      </div>
    )
  }
  return null
}

export interface IssueDistributionChartProps {
  issues: BeadsIssue[]
  className?: string
  defaultGroupBy?: 'status' | 'priority' | 'type'
  showPieChart?: boolean
}

type GroupByOption = 'status' | 'priority' | 'type'

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'status', label: 'By Status' },
  { value: 'priority', label: 'By Priority' },
  { value: 'type', label: 'By Type' },
]

export function IssueDistributionChart({
  issues,
  className,
  defaultGroupBy = 'status',
  showPieChart = false,
}: IssueDistributionChartProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>(defaultGroupBy)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const data = useMemo(() => {
    let grouped: Record<string, number>
    let colorFn: (name: string, index: number) => string

    switch (groupBy) {
      case 'status':
        grouped = groupByStatus(issues)
        colorFn = (name, _i) => {
          const statusMap: Record<string, string> = {
            'Open': CHART_COLORS.open,
            'Ready': CHART_COLORS.ready,
            'In Progress': CHART_COLORS.inProgress,
            'Blocked': CHART_COLORS.blocked,
            'Done': CHART_COLORS.done,
            'Closed': CHART_COLORS.closed,
          }
          return statusMap[name] || CHART_COLORS.muted
        }
        break
      case 'priority':
        grouped = groupByPriority(issues)
        colorFn = (name, _i) => {
          const priorityMap: Record<string, string> = {
            'Critical': CHART_COLORS.critical,
            'High': CHART_COLORS.high,
            'Medium': CHART_COLORS.medium,
            'Low': CHART_COLORS.low,
          }
          return priorityMap[name] || CHART_COLORS.muted
        }
        break
      case 'type':
        grouped = groupByType(issues)
        colorFn = (_name, i) => CHART_PALETTE[i % CHART_PALETTE.length]
        break
    }

    return Object.entries(grouped).map(([name, count], index) => ({
      name,
      count,
      color: colorFn(name, index),
    }))
  }, [issues, groupBy])

  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data])

  // Wrapper component to bind total to tooltip
  const TooltipWithTotal = (props: TooltipProps<ValueType, NameType>) => (
    <DistributionTooltip {...props} total={total} />
  )

  if (issues.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-zinc-500', className)}>
        No issues to visualize
      </div>
    )
  }

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent) return null
    if (percent < 0.05) return null // Don't show labels for tiny slices

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('w-full h-full min-h-[300px] flex flex-col', className)}
    >
      {/* Group By Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {GROUP_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setGroupBy(option.value)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-all',
                groupBy === option.value
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500">
          Total: {total} issues
        </span>
      </div>

      {/* Charts */}
      <div className="flex-1 flex gap-4">
        {/* Bar Chart */}
        <div className={cn('flex-1', showPieChart && 'w-1/2')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(63, 63, 70, 0.3)"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="rgb(113, 113, 122)"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(63, 63, 70, 0.5)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="rgb(113, 113, 122)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={TooltipWithTotal} cursor={{ fill: 'rgba(63, 63, 70, 0.2)' }} />

              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                animationDuration={800}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={activeIndex === null || activeIndex === index ? 0.8 : 0.4}
                    stroke={activeIndex === index ? entry.color : 'transparent'}
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Optional Pie Chart */}
        {showPieChart && (
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  labelLine={false}
                  label={renderCustomLabel}
                  animationDuration={800}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      fillOpacity={activeIndex === null || activeIndex === index ? 0.9 : 0.4}
                      stroke={activeIndex === index ? '#fff' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={TooltipWithTotal} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: '10px', paddingLeft: 10 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}
