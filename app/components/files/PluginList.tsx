'use client'

import React, { useEffect, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Plug,
  Search,
  Zap,
  Bot,
  Terminal,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Download,
  RefreshCw,
  X,
} from 'lucide-react'
import { useFilesContext, Plugin, OutdatedPlugin } from '@/app/contexts/FilesContext'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// Component type icons and colors
const componentConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  skill: { icon: Zap, color: 'text-teal-400', bgColor: 'bg-teal-500/20', label: 'Skill' },
  agent: { icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Agent' },
  command: { icon: FileCode, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: 'Cmd' },
  hook: { icon: Terminal, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Hook' },
  mcp: { icon: Plug, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: 'MCP' },
}

// Get file count for a component type
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

// Get the first file path for a component type
function getFirstFilePath(plugin: Plugin, type: string): string | null {
  const files = plugin.componentFiles
  switch (type) {
    case 'skill': return files?.skills?.[0]?.path || null
    case 'agent': return files?.agents?.[0]?.path || null
    case 'command': return files?.commands?.[0]?.path || null
    case 'hook': return files?.hooks?.[0]?.path || null
    case 'mcp': return files?.mcp?.[0]?.path || null
    default: return null
  }
}

// Plugin row component
function PluginRow({
  plugin,
  onToggle,
  onOpenFile,
  isToggling
}: {
  plugin: Plugin
  onToggle: (enabled: boolean) => void
  onOpenFile: (path: string) => void
  isToggling: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  // Find the first available file to open
  const handleClick = () => {
    if (!plugin.componentFiles) return
    // Try each component type in order
    for (const type of ['skill', 'agent', 'command', 'hook', 'mcp']) {
      const path = getFirstFilePath(plugin, type)
      if (path) {
        onOpenFile(path)
        return
      }
    }
    // Fallback to plugin.json
    if (plugin.installPath) {
      onOpenFile(`${plugin.installPath}/plugin.json`)
    }
  }

  // Check if plugin has multiple files that can be expanded
  const totalFiles = (plugin.componentFiles?.skills?.length || 0) +
                     (plugin.componentFiles?.agents?.length || 0) +
                     (plugin.componentFiles?.commands?.length || 0) +
                     (plugin.componentFiles?.hooks?.length || 0) +
                     (plugin.componentFiles?.mcp?.length || 0)
  const hasMultipleFiles = totalFiles > 1

  return (
    <div>
      <div className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-md group transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand button for multi-file plugins */}
          {hasMultipleFiles ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-4 h-4 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <Plug className={cn('w-4 h-4 flex-shrink-0', plugin.enabled ? 'text-green-400' : 'text-muted-foreground')} />
          )}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={handleClick}
            title={`View ${plugin.name} files`}
          >
            <div className="text-sm font-medium truncate hover:text-primary transition-colors">{plugin.name}</div>
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {/* Component type badges with counts */}
              {plugin.components?.map(comp => {
                const config = componentConfig[comp]
                if (!config) return null
                const Icon = config.icon
                const count = getComponentCount(plugin, comp)
                return (
                  <Badge
                    key={comp}
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      const path = getFirstFilePath(plugin, comp)
                      if (path) onOpenFile(path)
                    }}
                    className={cn(
                      'text-[10px] gap-0.5 px-1 py-0 h-4 cursor-pointer hover:opacity-80',
                      config.color,
                      config.bgColor,
                      'border-transparent'
                    )}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {config.label}{count > 1 ? ` (${count})` : ''}
                  </Badge>
                )
              })}
              {/* Scope badge - only show if no components */}
              {(!plugin.components || plugin.components.length === 0) && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-4 uppercase border-transparent',
                    plugin.scope === 'local' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  )}
                >
                  {plugin.scope}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={plugin.enabled}
            onCheckedChange={onToggle}
            disabled={isToggling}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      {/* Expanded file list */}
      {expanded && hasMultipleFiles && (
        <div className="ml-8 mb-2 space-y-0.5">
          {/* Skills */}
          {plugin.componentFiles?.skills?.map(file => (
            <button
              key={file.path}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors"
            >
              <Zap className="w-3 h-3 text-teal-400" />
              {file.name}
            </button>
          ))}
          {/* Agents */}
          {plugin.componentFiles?.agents?.map(file => (
            <button
              key={file.path}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors"
            >
              <Bot className="w-3 h-3 text-purple-400" />
              {file.name}
            </button>
          ))}
          {/* Commands */}
          {plugin.componentFiles?.commands?.map(file => (
            <button
              key={file.path}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors"
            >
              <FileCode className="w-3 h-3 text-sky-400" />
              {file.name}
            </button>
          ))}
          {/* Hooks */}
          {plugin.componentFiles?.hooks?.map(file => (
            <button
              key={file.path}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors"
            >
              <Terminal className="w-3 h-3 text-green-400" />
              {file.name}
            </button>
          ))}
          {/* MCP */}
          {plugin.componentFiles?.mcp?.map(file => (
            <button
              key={file.path}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors"
            >
              <Plug className="w-3 h-3 text-cyan-400" />
              {file.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Marketplace section component
function MarketplaceSection({
  name,
  plugins,
  onToggle,
  onOpenFile,
  togglingPlugins,
  startCollapsed = false
}: {
  name: string
  plugins: Plugin[]
  onToggle: (pluginId: string, enabled: boolean) => void
  onOpenFile: (path: string) => void
  togglingPlugins: Set<string>
  startCollapsed?: boolean
}) {
  const [isOpen, setIsOpen] = useState(!startCollapsed)
  const enabledCount = plugins.filter(p => p.enabled).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
      <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1.5 w-full hover:bg-white/5 rounded-md bg-white/[0.02] transition-colors">
        <span className="text-muted-foreground">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="text-sm font-medium flex-1 text-left">{name}</span>
        <span className="text-xs text-muted-foreground">
          {enabledCount}/{plugins.length}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1 ml-2">
        {plugins.map(plugin => (
          <PluginRow
            key={plugin.id}
            plugin={plugin}
            onToggle={(enabled) => onToggle(plugin.id, enabled)}
            onOpenFile={onOpenFile}
            isToggling={togglingPlugins.has(plugin.id)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// Filter types
type PluginFilter = 'all' | 'enabled' | 'disabled'
type ComponentFilter = 'all' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp'
type ScopeFilter = 'all' | 'user' | 'project' | 'local'

export function PluginList() {
  const {
    pluginsData, pluginsLoading, loadPlugins, togglePlugin, openFile,
    pluginHealth, pluginHealthLoading, loadPluginHealth, updatePlugin, updateAllPlugins, pruneCache
  } = useFilesContext()
  const [togglingPlugins, setTogglingPlugins] = useState<Set<string>>(new Set())
  const [updatingPlugins, setUpdatingPlugins] = useState<Set<string>>(new Set())
  const [updatingAll, setUpdatingAll] = useState(false)
  const [updateAllResult, setUpdateAllResult] = useState<{ success: number; failed: number; skipped: number } | null>(null)
  const [filter, setFilter] = useState<PluginFilter>('all')
  const [componentFilter, setComponentFilter] = useState<ComponentFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showRestartHint, setShowRestartHint] = useState(false)
  const [showHealth, setShowHealth] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [pruneResult, setPruneResult] = useState<{ removed: number; freedMB: string } | null>(null)

  // Load plugins and health check on mount
  useEffect(() => {
    loadPlugins()
    loadPluginHealth()
  }, [loadPlugins, loadPluginHealth])

  // Check if a plugin is outdated
  const isPluginOutdated = (pluginId: string): OutdatedPlugin | undefined => {
    return pluginHealth?.outdated?.find(p => p.pluginId === pluginId)
  }

  // Count updatable plugins (user-scoped OR project-scoped with projectPath)
  const updatableCount = pluginHealth?.outdated?.filter(p =>
    p.scope === 'user' || p.projectPath
  ).length ?? 0

  // Check if a plugin can be updated
  const canUpdatePlugin = (p: OutdatedPlugin): boolean => {
    return p.scope === 'user' || !!p.projectPath
  }

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

  const handleUpdate = async (pluginId: string) => {
    setUpdatingPlugins(prev => new Set(prev).add(pluginId))
    const success = await updatePlugin(pluginId)
    setUpdatingPlugins(prev => {
      const newSet = new Set(prev)
      newSet.delete(pluginId)
      return newSet
    })
    if (success) {
      setShowRestartHint(true)
    }
  }

  const handlePruneCache = async () => {
    setPruning(true)
    setPruneResult(null)
    const result = await pruneCache(1) // Keep only latest version
    setPruning(false)
    if (result) {
      setPruneResult(result)
    }
  }

  const handleUpdateAll = async () => {
    setUpdatingAll(true)
    setUpdateAllResult(null)
    const result = await updateAllPlugins()
    setUpdatingAll(false)
    if (result) {
      setUpdateAllResult(result)
      if (result.success > 0) {
        setShowRestartHint(true)
      }
    }
  }

  // Filter plugins
  const filteredMarketplaces = pluginsData?.marketplaces
    ? Object.entries(pluginsData.marketplaces).reduce((acc, [name, plugins]) => {
        let filtered = plugins

        // Apply enabled/disabled filter
        if (filter === 'enabled') {
          filtered = filtered.filter(p => p.enabled)
        } else if (filter === 'disabled') {
          filtered = filtered.filter(p => !p.enabled)
        }

        // Apply component type filter
        if (componentFilter !== 'all') {
          filtered = filtered.filter(p => p.components?.includes(componentFilter))
        }

        // Apply scope filter
        if (scopeFilter !== 'all') {
          filtered = filtered.filter(p => p.scope === scopeFilter)
        }

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query)
          )
        }

        if (filtered.length > 0) {
          acc[name] = filtered
        }
        return acc
      }, {} as Record<string, Plugin[]>)
    : {}

  if (pluginsLoading) {
    return (
      <Card className="glass-dark h-full flex flex-col">
        <CardHeader className="pb-2 border-b border-border/30">
          <CardTitle className="text-sm font-semibold">Plugins</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!pluginsData || pluginsData.totalPlugins === 0) {
    return (
      <Card className="glass-dark h-full flex flex-col">
        <CardHeader className="pb-2 border-b border-border/30">
          <CardTitle className="text-sm font-semibold">Plugins</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Plug className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No plugins installed</p>
            <p className="text-xs mt-1">Use <code className="bg-white/10 px-1 rounded">/plugin add &lt;url&gt;</code> to add a marketplace</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-dark h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Plugins</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {pluginsData.enabledCount}/{pluginsData.totalPlugins} enabled
            </span>
            {/* Health check button */}
            <button
              onClick={() => setShowHealth(!showHealth)}
              className={cn(
                'p-1 rounded transition-colors',
                showHealth ? 'bg-primary/20 text-primary' :
                (pluginHealth?.outdated?.length ?? 0) > 0 ? 'text-amber-400 hover:bg-amber-500/20' :
                pluginHealth ? 'text-green-400 hover:bg-green-500/20' : 'hover:bg-white/10'
              )}
              title={pluginHealthLoading ? 'Checking...' :
                pluginHealth?.outdated?.length ? `${pluginHealth.outdated.length} outdated` :
                pluginHealth ? 'All plugins current' : 'Health check'}
            >
              {pluginHealthLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (pluginHealth?.outdated?.length ?? 0) > 0 ? (
                <AlertTriangle className="w-3 h-3" />
              ) : pluginHealth ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <CheckCircle className="w-3 h-3 opacity-50" />
              )}
            </button>
            <button
              onClick={() => loadPlugins()}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30">
          {(['all', 'enabled', 'disabled'] as PluginFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                filter === f
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-white/10 text-muted-foreground'
              )}
            >
              {f === 'all' && `All (${pluginsData.totalPlugins})`}
              {f === 'enabled' && `Enabled (${pluginsData.enabledCount})`}
              {f === 'disabled' && `Disabled (${pluginsData.disabledCount})`}
            </button>
          ))}
        </div>

        {/* Component type filters */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 overflow-x-auto">
          <button
            onClick={() => setComponentFilter('all')}
            className={cn(
              'px-2 py-0.5 text-xs rounded transition-colors whitespace-nowrap',
              componentFilter === 'all'
                ? 'bg-primary/20 text-primary'
                : 'hover:bg-white/10 text-muted-foreground'
            )}
          >
            All Types
          </button>
          {(['skill', 'agent', 'command', 'hook', 'mcp'] as ComponentFilter[]).map(comp => {
            const config = componentConfig[comp]
            const Icon = config.icon
            const count = pluginsData.componentCounts?.[comp] || 0
            if (count === 0) return null
            return (
              <button
                key={comp}
                onClick={() => setComponentFilter(comp)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors whitespace-nowrap',
                  componentFilter === comp
                    ? cn(config.bgColor, config.color)
                    : 'hover:bg-white/10 text-muted-foreground'
                )}
              >
                <Icon className="w-3 h-3" />
                {config.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Scope filters */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30">
          <span className="text-xs text-muted-foreground mr-1">Scope:</span>
          <button
            onClick={() => setScopeFilter('all')}
            className={cn(
              'px-2 py-0.5 text-xs rounded transition-colors',
              scopeFilter === 'all'
                ? 'bg-primary/20 text-primary'
                : 'hover:bg-white/10 text-muted-foreground'
            )}
          >
            All
          </button>
          {([
            { scope: 'user' as const, label: 'User', color: 'bg-blue-500/20 text-blue-400' },
            { scope: 'project' as const, label: 'Project', color: 'bg-green-500/20 text-green-400' },
            { scope: 'local' as const, label: 'Local', color: 'bg-purple-500/20 text-purple-400' },
          ]).map(({ scope, label, color }) => {
            const count = pluginsData.scopeCounts?.[scope] || 0
            if (count === 0) return null
            return (
              <button
                key={scope}
                onClick={() => setScopeFilter(scopeFilter === scope ? 'all' : scope)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded transition-colors',
                  scopeFilter === scope ? color : 'hover:bg-white/10 text-muted-foreground'
                )}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-sm bg-transparent border-0 focus-visible:ring-0 px-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Restart hint */}
        {showRestartHint && (
          <div className="mx-3 mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400 flex items-center justify-between">
            <span>Run <code className="bg-black/20 px-1 rounded">/restart</code> to apply changes</span>
            <button
              onClick={() => setShowRestartHint(false)}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Health panel */}
        {showHealth && (
          <div className="mx-3 mt-2 p-3 bg-white/[0.02] border border-border/30 rounded text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Plugin Health</span>
              <button
                onClick={() => loadPluginHealth()}
                disabled={pluginHealthLoading}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-50 transition-colors"
                title="Refresh health check"
              >
                <RefreshCw className={cn('w-3 h-3', pluginHealthLoading && 'animate-spin')} />
              </button>
            </div>

            {pluginHealthLoading && !pluginHealth ? (
              <div className="text-muted-foreground">Checking...</div>
            ) : pluginHealth ? (
              <div className="space-y-3">
                {/* Status summary */}
                <div className="flex items-center gap-3">
                  <span className={cn('flex items-center gap-1', pluginHealth.outdated.length > 0 ? 'text-amber-400' : 'text-green-400')}>
                    {pluginHealth.outdated.length > 0 ? (
                      <><AlertTriangle className="w-3 h-3" /> {pluginHealth.outdated.length} outdated</>
                    ) : (
                      <><CheckCircle className="w-3 h-3" /> All current</>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {pluginHealth.current} current
                  </span>
                </div>

                {/* Outdated plugins list */}
                {pluginHealth.outdated.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Outdated:</span>
                      <button
                        onClick={handleUpdateAll}
                        disabled={updatingAll || updatableCount === 0}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded disabled:opacity-50 text-xs transition-colors"
                        title={updatableCount < pluginHealth.outdated.length
                          ? `Update ${updatableCount} plugins (${pluginHealth.outdated.length - updatableCount} cannot be updated remotely)`
                          : "Update all outdated plugins"}
                      >
                        {updatingAll ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        Update All ({updatableCount})
                      </button>
                    </div>
                    {updateAllResult && (
                      <div className={cn('text-xs', updateAllResult.failed > 0 ? 'text-amber-400' : 'text-green-400')}>
                        Updated {updateAllResult.success}
                        {updateAllResult.failed > 0 ? `, ${updateAllResult.failed} failed` : ''}
                        {updateAllResult.skipped > 0 ? ` (${updateAllResult.skipped} project-scoped skipped)` : ''}
                      </div>
                    )}
                    {pluginHealth.outdated.slice(0, 8).map(p => (
                      <div key={p.pluginId} className="flex items-center justify-between py-1 px-2 bg-amber-500/10 rounded">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate">{p.name}</span>
                            <span className="text-muted-foreground text-[10px]">@{p.marketplace}</span>
                            {/* Scope badge */}
                            {p.scope !== 'user' && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] px-1 py-0 h-3 uppercase border-transparent',
                                  p.scope === 'project' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                )}
                              >
                                {p.scope}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {p.installedSha.slice(0, 7)} → {p.currentSha.slice(0, 7)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUpdate(p.pluginId)}
                          disabled={updatingPlugins.has(p.pluginId) || updatingAll || !canUpdatePlugin(p)}
                          className={cn(
                            'p-1 rounded transition-colors',
                            !canUpdatePlugin(p)
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-amber-500/30 disabled:opacity-50'
                          )}
                          title={!canUpdatePlugin(p)
                            ? `Cannot update ${p.scope}-scoped plugin (no project path)`
                            : p.projectPath
                              ? `Update from ${p.projectPath}`
                              : 'Update plugin'}
                        >
                          {updatingPlugins.has(p.pluginId) ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ))}
                    {pluginHealth.outdated.length > 8 && (
                      <div className="text-muted-foreground text-center">
                        +{pluginHealth.outdated.length - 8} more
                      </div>
                    )}
                    {/* Explanation for non-updatable plugins */}
                    {pluginHealth.outdated.some(p => !canUpdatePlugin(p)) && (
                      <div className="text-[10px] text-muted-foreground mt-1 italic">
                        Some plugins cannot be updated (no project path recorded)
                      </div>
                    )}
                  </div>
                )}

                {/* Cache stats */}
                {pluginHealth.cache && (
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Cache: {pluginHealth.cache.totalVersions} versions ({(pluginHealth.cache.totalSize / 1024).toFixed(1)} MB)
                      </span>
                      <button
                        onClick={handlePruneCache}
                        disabled={pruning}
                        className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded disabled:opacity-50 transition-colors"
                        title="Remove old cached versions"
                      >
                        {pruning ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Prune
                      </button>
                    </div>
                    {pruneResult && (
                      <div className="mt-1 text-green-400">
                        Removed {pruneResult.removed} versions, freed {pruneResult.freedMB} MB
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Failed to load health data</div>
            )}
          </div>
        )}

        {/* Plugin list */}
        <ScrollArea className="flex-1 p-2">
          {Object.keys(filteredMarketplaces).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
              No plugins match filter
            </div>
          ) : (
            Object.entries(filteredMarketplaces).map(([name, plugins]) => (
              <MarketplaceSection
                key={name}
                name={name}
                plugins={plugins}
                onToggle={handleToggle}
                onOpenFile={(path) => openFile(path, true)}
                togglingPlugins={togglingPlugins}
              />
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
