'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Grid3x3,
  List,
  Star,
  Zap,
  Bot,
  Terminal,
  FileCode,
  Plug,
  RefreshCw,
  X,
  Filter as FilterIcon,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Sparkles,
  Settings,
  ExternalLink,
} from 'lucide-react'
import { useFilesContext, Plugin } from '@/app/contexts/FilesContext'
import { useWorkingDirectory } from '@/hooks/useWorkingDirectory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Component type configuration matching PluginList.tsx
const componentConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  skill: { icon: Zap, color: 'text-teal-400', bgColor: 'bg-teal-500/20', label: 'Skill' },
  agent: { icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Agent' },
  command: { icon: FileCode, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: 'Command' },
  hook: { icon: Terminal, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Hook' },
  mcp: { icon: Plug, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: 'MCP' },
}

// Get capability count for a component type
function getComponentCount(plugin: Plugin, type: string): number {
  const files = plugin.componentFiles
  switch (type) {
    case 'skill': return files?.skills?.length || 0
    case 'agent': return files?.agents?.length || 0
    case 'command': return files?.commands?.length || 0
    case 'hook': return files?.hooks?.length || 0
    case 'mcp': return files?.mcp?.length || 0
    default: return 0
  }
}

// Get total capabilities count
function getTotalCapabilities(plugin: Plugin): number {
  return (
    (plugin.componentFiles?.skills?.length || 0) +
    (plugin.componentFiles?.agents?.length || 0) +
    (plugin.componentFiles?.commands?.length || 0) +
    (plugin.componentFiles?.hooks?.length || 0) +
    (plugin.componentFiles?.mcp?.length || 0)
  )
}

// Get primary icon for plugin based on its main component type
function getPrimaryIcon(plugin: Plugin): React.ElementType {
  if (plugin.components?.length) {
    const config = componentConfig[plugin.components[0]]
    if (config) return config.icon
  }
  return Plug
}

// Get primary color for plugin
function getPrimaryColor(plugin: Plugin): { color: string; bgColor: string } {
  if (plugin.components?.length) {
    const config = componentConfig[plugin.components[0]]
    if (config) return { color: config.color, bgColor: config.bgColor }
  }
  return { color: 'text-gray-400', bgColor: 'bg-gray-500/20' }
}

// Filter and sort types
type StatusFilter = 'all' | 'enabled' | 'disabled'
type ComponentFilter = 'all' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp'
type ScopeFilter = 'all' | 'user' | 'project' | 'local'
type SortOption = 'name' | 'marketplace' | 'capabilities'
type ViewMode = 'grid' | 'list'

interface AgentGalleryProps {
  className?: string
  onOpenFile?: (path: string) => void
}

export function AgentGallery({ className, onOpenFile }: AgentGalleryProps) {
  const {
    pluginsData,
    pluginsLoading,
    loadPlugins,
    togglePlugin,
    openFile,
  } = useFilesContext()
  const { workingDir } = useWorkingDirectory()

  const [togglingPlugins, setTogglingPlugins] = useState<Set<string>>(new Set())
  const [showRestartHint, setShowRestartHint] = useState(false)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [componentFilter, setComponentFilter] = useState<ComponentFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Load plugins on mount and when workingDir changes
  useEffect(() => {
    loadPlugins(workingDir)
  }, [loadPlugins, workingDir])

  // Handle toggle
  const handleToggle = async (pluginId: string, enabled: boolean) => {
    setTogglingPlugins(prev => new Set(prev).add(pluginId))
    const success = await togglePlugin(pluginId, enabled)
    setTogglingPlugins(prev => {
      const newSet = new Set(prev)
      newSet.delete(pluginId)
      return newSet
    })
    if (success) {
      setShowRestartHint(true)
    }
  }

  // Handle open file
  const handleOpenFile = (path: string) => {
    if (onOpenFile) {
      onOpenFile(path)
    } else {
      openFile(path, true)
    }
  }

  // Get all plugins flattened
  const allPlugins = useMemo(() => {
    if (!pluginsData?.marketplaces) return []
    return Object.values(pluginsData.marketplaces).flat()
  }, [pluginsData])

  // Featured plugins (enabled ones with most capabilities)
  const featuredPlugins = useMemo(() => {
    return allPlugins
      .filter(p => p.enabled)
      .sort((a, b) => getTotalCapabilities(b) - getTotalCapabilities(a))
      .slice(0, 8)
  }, [allPlugins])

  // Filtered and sorted plugins
  const filteredPlugins = useMemo(() => {
    let filtered = allPlugins.filter(plugin => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.marketplace.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'enabled' && plugin.enabled) ||
        (statusFilter === 'disabled' && !plugin.enabled)

      // Component filter
      const matchesComponent = componentFilter === 'all' ||
        plugin.components?.includes(componentFilter)

      // Scope filter
      const matchesScope = scopeFilter === 'all' || plugin.scope === scopeFilter

      return matchesSearch && matchesStatus && matchesComponent && matchesScope
    })

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'marketplace':
          comparison = a.marketplace.localeCompare(b.marketplace)
          break
        case 'capabilities':
          comparison = getTotalCapabilities(a) - getTotalCapabilities(b)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [allPlugins, searchQuery, statusFilter, componentFilter, scopeFilter, sortBy, sortDirection])

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(option)
      setSortDirection('asc')
    }
  }

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' ||
    componentFilter !== 'all' || scopeFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setComponentFilter('all')
    setScopeFilter('all')
  }

  if (pluginsLoading) {
    return (
      <Card className={cn('glass-dark', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading plugins...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!pluginsData || pluginsData.totalPlugins === 0) {
    return (
      <Card className={cn('glass-dark', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Plug className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">No plugins installed</p>
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-white/10 px-1.5 py-0.5 rounded">/plugin add &lt;url&gt;</code> to add a marketplace
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header with Stats */}
        <Card className="glass-dark border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl terminal-glow font-mono bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Agent Gallery
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {pluginsData.enabledCount} enabled of {pluginsData.totalPlugins} plugins
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPlugins(workingDir)}
                  className="border-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Featured Plugins */}
        {featuredPlugins.length > 0 && (
          <Card className="glass-dark border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-yellow-400" />
                Featured Plugins
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pb-4">
              {/* Left fade */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
              {/* Right fade */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-3">
                  {featuredPlugins.map((plugin, index) => {
                    const PrimaryIcon = getPrimaryIcon(plugin)
                    const { color, bgColor } = getPrimaryColor(plugin)
                    const totalCaps = getTotalCapabilities(plugin)

                    return (
                      <motion.div
                        key={plugin.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex-shrink-0 w-48"
                      >
                        <Card
                          className="glass border-white/10 hover:border-primary/30 transition-all cursor-pointer h-full group"
                          onClick={() => {
                            if (plugin.installPath) {
                              handleOpenFile(`${plugin.installPath}/plugin.json`)
                            }
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex flex-col items-center text-center">
                              {/* Avatar */}
                              <div className="relative mb-2">
                                <Avatar className={cn('h-12 w-12 border-2', bgColor.replace('bg-', 'border-').replace('/20', '/40'))}>
                                  <AvatarFallback className={cn(bgColor, color)}>
                                    <PrimaryIcon className="h-6 w-6" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-card" />
                              </div>

                              {/* Name */}
                              <h3 className="font-semibold text-sm truncate w-full group-hover:text-primary transition-colors">
                                {plugin.name}
                              </h3>
                              <p className="text-[10px] text-muted-foreground mb-2">@{plugin.marketplace}</p>

                              {/* Badges */}
                              <div className="flex gap-1 mb-2">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                  {totalCaps} {totalCaps === 1 ? 'item' : 'items'}
                                </Badge>
                              </div>

                              {/* Component types */}
                              <div className="flex gap-1">
                                {plugin.components?.slice(0, 3).map(comp => {
                                  const config = componentConfig[comp]
                                  if (!config) return null
                                  const Icon = config.icon
                                  return (
                                    <Tooltip key={comp}>
                                      <TooltipTrigger>
                                        <div className={cn('p-1 rounded', config.bgColor)}>
                                          <Icon className={cn('h-3 w-3', config.color)} />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{config.label}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
                <ScrollBar orientation="horizontal" className="h-2" />
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="glass-dark border-white/10">
          <CardContent className="p-3">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search plugins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-transparent border-white/10 h-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full lg:w-[140px] bg-transparent border-white/10 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="all">All ({pluginsData.totalPlugins})</SelectItem>
                  <SelectItem value="enabled">Enabled ({pluginsData.enabledCount})</SelectItem>
                  <SelectItem value="disabled">Disabled ({pluginsData.disabledCount})</SelectItem>
                </SelectContent>
              </Select>

              {/* Component Filter */}
              <Select value={componentFilter} onValueChange={(v) => setComponentFilter(v as ComponentFilter)}>
                <SelectTrigger className="w-full lg:w-[140px] bg-transparent border-white/10 h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(componentConfig).map(([key, config]) => {
                    const count = pluginsData.componentCounts?.[key] || 0
                    if (count === 0) return null
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <config.icon className={cn('h-3 w-3', config.color)} />
                          {config.label} ({count})
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              {/* More Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-white/10 h-9">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    More
                    {hasActiveFilters && (
                      <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">!</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-dark border-white/10 w-48">
                  <DropdownMenuLabel className="text-xs">Scope</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={scopeFilter === 'user'}
                    onCheckedChange={() => setScopeFilter(scopeFilter === 'user' ? 'all' : 'user')}
                  >
                    User ({pluginsData.scopeCounts?.user || 0})
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={scopeFilter === 'project'}
                    onCheckedChange={() => setScopeFilter(scopeFilter === 'project' ? 'all' : 'project')}
                  >
                    Project ({pluginsData.scopeCounts?.project || 0})
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={scopeFilter === 'local'}
                    onCheckedChange={() => setScopeFilter(scopeFilter === 'local' ? 'all' : 'local')}
                  >
                    Local ({pluginsData.scopeCounts?.local || 0})
                  </DropdownMenuCheckboxItem>
                  {hasActiveFilters && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Mode Toggle */}
              <div className="flex gap-1 glass rounded-lg p-1 border border-white/10">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restart hint */}
        {showRestartHint && (
          <Card className="bg-amber-500/10 border border-amber-500/30">
            <CardContent className="py-2 px-4 flex items-center justify-between">
              <span className="text-sm text-amber-400">
                Run <code className="bg-black/20 px-1.5 py-0.5 rounded">/restart</code> to apply changes
              </span>
              <button
                onClick={() => setShowRestartHint(false)}
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredPlugins.length}</span> of{' '}
            <span className="font-semibold text-foreground">{allPlugins.length}</span> plugins
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort: {sortBy}
                {sortDirection === 'desc' ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronUp className="h-4 w-4 ml-1" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-dark border-white/10">
              <DropdownMenuItem onClick={() => toggleSort('name')}>
                Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('marketplace')}>
                Marketplace {sortBy === 'marketplace' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('capabilities')}>
                Capabilities {sortBy === 'capabilities' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Plugins Grid/List */}
        <AnimatePresence mode="wait">
          {filteredPlugins.length === 0 ? (
            <Card className="glass-dark border-white/10">
              <CardContent className="py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No plugins match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
            >
              {filteredPlugins.map((plugin, index) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  index={index}
                  onToggle={(enabled) => handleToggle(plugin.id, enabled)}
                  onOpenFile={handleOpenFile}
                  isToggling={togglingPlugins.has(plugin.id)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {filteredPlugins.map((plugin, index) => (
                <PluginListItem
                  key={plugin.id}
                  plugin={plugin}
                  index={index}
                  onToggle={(enabled) => handleToggle(plugin.id, enabled)}
                  onOpenFile={handleOpenFile}
                  isToggling={togglingPlugins.has(plugin.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}

// Plugin Card Component (Grid View)
function PluginCard({
  plugin,
  index,
  onToggle,
  onOpenFile,
  isToggling,
}: {
  plugin: Plugin
  index: number
  onToggle: (enabled: boolean) => void
  onOpenFile: (path: string) => void
  isToggling: boolean
}) {
  const PrimaryIcon = getPrimaryIcon(plugin)
  const { color, bgColor } = getPrimaryColor(plugin)
  const totalCaps = getTotalCapabilities(plugin)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className={cn(
          'glass-dark border-white/10 hover:border-primary/30 transition-all cursor-pointer h-full group',
          !plugin.enabled && 'opacity-60'
        )}
        onClick={() => {
          if (plugin.installPath) {
            onOpenFile(`${plugin.installPath}/plugin.json`)
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex flex-col">
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              {/* Avatar */}
              <Avatar className={cn('h-10 w-10 border', bgColor.replace('bg-', 'border-').replace('/20', '/30'))}>
                <AvatarFallback className={cn(bgColor, color)}>
                  <PrimaryIcon className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              {/* Toggle */}
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={onToggle}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>

            {/* Name & Description */}
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {plugin.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate mb-3">
              @{plugin.marketplace}
            </p>

            {/* Component badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              {plugin.components?.map(comp => {
                const config = componentConfig[comp]
                if (!config) return null
                const Icon = config.icon
                const count = getComponentCount(plugin, comp)
                return (
                  <Badge
                    key={comp}
                    variant="outline"
                    className={cn(
                      'text-[10px] gap-1 px-1.5 py-0 h-5',
                      config.color,
                      config.bgColor,
                      'border-transparent'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {count > 1 ? count : config.label}
                  </Badge>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 uppercase border-transparent',
                  plugin.scope === 'local' ? 'bg-purple-500/20 text-purple-400' :
                  plugin.scope === 'project' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                )}
              >
                {plugin.scope}
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (plugin.installPath) {
                    onOpenFile(plugin.installPath)
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Plugin List Item Component (List View)
function PluginListItem({
  plugin,
  index,
  onToggle,
  onOpenFile,
  isToggling,
}: {
  plugin: Plugin
  index: number
  onToggle: (enabled: boolean) => void
  onOpenFile: (path: string) => void
  isToggling: boolean
}) {
  const PrimaryIcon = getPrimaryIcon(plugin)
  const { color, bgColor } = getPrimaryColor(plugin)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card
        className={cn(
          'glass-dark border-white/10 hover:border-primary/30 transition-all cursor-pointer',
          !plugin.enabled && 'opacity-60'
        )}
        onClick={() => {
          if (plugin.installPath) {
            onOpenFile(`${plugin.installPath}/plugin.json`)
          }
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className={cn('h-12 w-12 border flex-shrink-0', bgColor.replace('bg-', 'border-').replace('/20', '/30'))}>
              <AvatarFallback className={cn(bgColor, color)}>
                <PrimaryIcon className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{plugin.name}</h3>
                <span className="text-xs text-muted-foreground truncate">@{plugin.marketplace}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 uppercase border-transparent flex-shrink-0',
                    plugin.scope === 'local' ? 'bg-purple-500/20 text-purple-400' :
                    plugin.scope === 'project' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  )}
                >
                  {plugin.scope}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {plugin.components?.map(comp => {
                  const config = componentConfig[comp]
                  if (!config) return null
                  const Icon = config.icon
                  const count = getComponentCount(plugin, comp)
                  return (
                    <Badge
                      key={comp}
                      variant="outline"
                      className={cn(
                        'text-[10px] gap-1 px-1.5 py-0 h-5',
                        config.color,
                        config.bgColor,
                        'border-transparent'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}{count > 1 ? ` (${count})` : ''}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (plugin.installPath) {
                    onOpenFile(plugin.installPath)
                  }
                }}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={onToggle}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
