'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Terminal,
  Bot,
  Command,
  Webhook,
  Server,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PluginCard, Plugin } from './PluginCard'
import { useWorkingDirectory } from '@/hooks/useWorkingDirectory'

interface PluginsApiResponse {
  success: boolean
  data?: {
    marketplaces: Record<string, Plugin[]>
    totalPlugins: number
    enabledCount: number
    disabledCount: number
    componentCounts: Record<string, number>
    scopeCounts: Record<string, number>
  }
  error?: string
}

interface PluginsSidebarProps {
  className?: string
}

/**
 * Component type summary icons
 */
const COMPONENT_ICONS: Record<string, { icon: typeof Terminal; color: string }> = {
  skill: { icon: Terminal, color: 'text-cyan-400' },
  agent: { icon: Bot, color: 'text-purple-400' },
  command: { icon: Command, color: 'text-amber-400' },
  hook: { icon: Webhook, color: 'text-emerald-400' },
  mcp: { icon: Server, color: 'text-rose-400' },
}

/**
 * PluginsSidebar displays installed plugins with component counts
 * Collapsible sidebar for the Kanban board
 */
export function PluginsSidebar({ className }: PluginsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { workingDir } = useWorkingDirectory()

  const { data, isLoading, error, refetch } = useQuery<PluginsApiResponse>({
    queryKey: ['plugins', workingDir],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (workingDir) {
        params.set('workingDir', workingDir)
      }
      const url = `/api/plugins${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch plugins')
      return res.json()
    },
    staleTime: 60000, // 1 minute
  })

  // Flatten plugins and filter by search
  const allPlugins = Object.values(data?.data?.marketplaces || {}).flat()
  const filteredPlugins = searchQuery
    ? allPlugins.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.marketplace.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPlugins

  // Group filtered plugins by marketplace
  const groupedPlugins = filteredPlugins.reduce((acc, plugin) => {
    if (!acc[plugin.marketplace]) acc[plugin.marketplace] = []
    acc[plugin.marketplace].push(plugin)
    return acc
  }, {} as Record<string, Plugin[]>)

  if (isCollapsed) {
    const pluginCount = data?.data?.totalPlugins || 0
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        className={cn(
          'flex-shrink-0 w-16 glass-dark border-l border-zinc-700/50',
          'flex flex-col items-center py-4 gap-3 cursor-pointer',
          'hover:bg-zinc-800/50 hover:border-teal-500/30 transition-all duration-200',
          'group',
          className
        )}
        title="Click to expand plugins sidebar"
      >
        {/* Expand button */}
        <button
          className="p-2 rounded-md hover:bg-zinc-700 transition-colors group-hover:bg-zinc-700/50"
          aria-label="Expand plugins sidebar"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-400 group-hover:text-teal-400 transition-colors" />
        </button>

        <div className="h-px w-8 bg-zinc-700 group-hover:bg-zinc-600 transition-colors" />

        {/* Plugin icon with count badge */}
        <div className="relative">
          <Package className="h-5 w-5 text-teal-400 group-hover:text-teal-300 transition-colors" />
          {pluginCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-teal-500/90 text-[10px] font-bold text-white px-1">
              {pluginCount}
            </span>
          )}
        </div>

        {/* Vertical label */}
        <span className="text-sm text-zinc-300 font-medium tracking-wide rotate-[-90deg] whitespace-nowrap origin-center translate-y-6 group-hover:text-zinc-100 transition-colors">
          Plugins
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 glass-dark border-l border-zinc-700/50',
        'flex flex-col h-full',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-medium text-foreground">Plugins</span>
          {data?.data?.totalPlugins !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {data.data.totalPlugins}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
            title="Refresh plugins"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 text-zinc-400', isLoading && 'animate-spin')}
            />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Component Summary */}
      {data?.data?.componentCounts && (
        <div className="px-4 py-2.5 border-b border-zinc-700/50 flex flex-wrap gap-3 bg-zinc-800/30">
          {Object.entries(data.data.componentCounts).map(([type, count]) => {
            if (count === 0) return null
            const meta = COMPONENT_ICONS[type]
            if (!meta) return null
            const Icon = meta.icon
            return (
              <div
                key={type}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                title={`${count} ${type}${count !== 1 ? 's' : ''}`}
              >
                <Icon className={cn('h-3.5 w-3.5', meta.color)} />
                <span className="text-zinc-300 font-medium">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-zinc-800/50 border-zinc-700"
          />
        </div>
      </div>

      {/* Plugins List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 text-zinc-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 py-4 px-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to load plugins</span>
          </div>
        )}

        {!isLoading && !error && filteredPlugins.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {searchQuery ? 'No plugins match your search' : 'No plugins installed'}
          </div>
        )}

        <AnimatePresence mode="wait">
          {Object.entries(groupedPlugins).map(([marketplace, plugins]) => (
            <motion.div
              key={marketplace}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              {/* Marketplace Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                  {marketplace}
                </span>
                <div className="flex-1 h-px bg-zinc-600/50" />
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-600 text-zinc-400">
                  {plugins.length}
                </Badge>
              </div>

              {/* Plugin Cards */}
              <div className="space-y-2">
                {plugins.map((plugin) => (
                  <PluginCard key={plugin.id} plugin={plugin} />
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
