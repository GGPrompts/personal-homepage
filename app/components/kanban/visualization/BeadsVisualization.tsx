'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Network,
  Calendar,
  Activity,
  BarChart3,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BeadsIssue } from '../lib/beads/types'
import { Button } from '@/components/ui/button'
import { DependencyNetworkGraph } from './DependencyNetworkGraph'
import { IssueTimelineChart } from './IssueTimelineChart'
import { SprintHealthRadar } from './SprintHealthRadar'
import { IssueDistributionChart } from './IssueDistributionChart'

export interface BeadsVisualizationProps {
  issues: BeadsIssue[]
  className?: string
  defaultTab?: VisualizationType
  onIssueClick?: (issue: BeadsIssue) => void
  onClose?: () => void
}

type VisualizationType = 'network' | 'timeline' | 'health' | 'distribution'

interface TabConfig {
  id: VisualizationType
  label: string
  icon: React.ReactNode
  description: string
}

const TABS: TabConfig[] = [
  {
    id: 'network',
    label: 'Dependencies',
    icon: <Network className="w-4 h-4" />,
    description: 'Issue dependency graph',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Creation & completion chronology',
  },
  {
    id: 'health',
    label: 'Health',
    icon: <Activity className="w-4 h-4" />,
    description: 'Sprint health metrics',
  },
  {
    id: 'distribution',
    label: 'Distribution',
    icon: <BarChart3 className="w-4 h-4" />,
    description: 'Issues by status/priority',
  },
]

export function BeadsVisualization({
  issues,
  className,
  defaultTab = 'network',
  onIssueClick,
  onClose,
}: BeadsVisualizationProps) {
  const [activeTab, setActiveTab] = useState<VisualizationType>(defaultTab)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleNodeClick = useCallback(
    (issue: BeadsIssue) => {
      onIssueClick?.(issue)
    },
    [onIssueClick]
  )

  const renderVisualization = () => {
    switch (activeTab) {
      case 'network':
        return (
          <DependencyNetworkGraph
            issues={issues}
            onNodeClick={handleNodeClick}
          />
        )
      case 'timeline':
        return <IssueTimelineChart issues={issues} />
      case 'health':
        return <SprintHealthRadar issues={issues} />
      case 'distribution':
        return <IssueDistributionChart issues={issues} showPieChart />
    }
  }

  const currentTab = TABS.find(t => t.id === activeTab)

  return (
    <motion.div
      layout
      className={cn(
        'glass-dark rounded-lg border border-zinc-800/50',
        'flex flex-col overflow-hidden',
        isExpanded ? 'fixed inset-4 z-50' : 'h-full',
        className
      )}
    >
      {/* Backdrop for expanded mode */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-zinc-100">
            Beads Visualization
          </h3>
          <span className="text-xs text-zinc-500">
            {issues.length} issues
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800/30 bg-zinc-900/30">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Description */}
      {currentTab && (
        <div className="px-4 py-2 border-b border-zinc-800/20">
          <p className="text-[11px] text-zinc-500">{currentTab.description}</p>
        </div>
      )}

      {/* Visualization Content */}
      <div className="flex-1 p-4 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderVisualization()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
