'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutGrid,
  List,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Bot,
  Code,
  Gem,
  Plane,
  Layout,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AgentCard } from './AgentCard'
import type { AgentCard as AgentCardType } from '@/lib/agents/types'

export interface AgentGalleryProps {
  agents: AgentCardType[]
  selectedAgentId?: string | null
  onSelectAgent: (agent: AgentCardType) => void
  onEditAgent?: (agent: AgentCardType) => void
  onNewAgent?: () => void
  onDeleteAgent?: (agent: AgentCardType) => void
  sectionFilter?: string | null
  className?: string
  isLoading?: boolean
  editable?: boolean
}

type ViewMode = 'grid' | 'list'

type CategoryKey = 'claude' | 'codex' | 'copilot' | 'gemini' | 'page-assistant'

interface CategoryConfig {
  label: string
  icon: React.ElementType
  color: string
  description: string
}

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  claude: {
    label: 'Claude',
    icon: Bot,
    color: 'text-orange-400',
    description: 'Anthropic Claude agents',
  },
  codex: {
    label: 'Codex',
    icon: Code,
    color: 'text-green-400',
    description: 'OpenAI Codex agents',
  },
  copilot: {
    label: 'Copilot',
    icon: Plane,
    color: 'text-purple-400',
    description: 'GitHub Copilot agents',
  },
  gemini: {
    label: 'Gemini',
    icon: Gem,
    color: 'text-blue-400',
    description: 'Google Gemini agents',
  },
  'page-assistant': {
    label: 'Page Assistants',
    icon: Layout,
    color: 'text-cyan-400',
    description: 'Homepage section-specific agents',
  },
}

// Order for displaying categories
const CATEGORY_ORDER: CategoryKey[] = ['claude', 'codex', 'copilot', 'gemini', 'page-assistant']

/**
 * Derive category from agent properties
 */
function deriveCategory(agent: AgentCardType): CategoryKey {
  // Vanilla agents go to their backend category
  if (agent.id.startsWith('__vanilla_')) {
    const backend = agent.id.replace('__vanilla_', '').replace('__', '')
    if (['claude', 'codex', 'copilot', 'gemini'].includes(backend)) {
      return backend as CategoryKey
    }
  }
  // Explicit page-assistant category takes precedence
  if (agent.category === 'page-assistant') {
    return agent.category
  }
  // Agents with sections are page assistants
  if (agent.sections && agent.sections.length > 0) {
    return 'page-assistant'
  }
  // Default to backend category
  if (agent.backend && ['claude', 'codex', 'copilot', 'gemini'].includes(agent.backend)) {
    return agent.backend as CategoryKey
  }
  // Fallback to claude
  return 'claude'
}

export function AgentGallery({
  agents,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onNewAgent,
  onDeleteAgent,
  sectionFilter,
  className,
  isLoading = false,
  editable = false,
}: AgentGalleryProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid')
  const [expandedCategories, setExpandedCategories] = React.useState<Set<CategoryKey>>(
    new Set(['claude', 'page-assistant']) // Default expanded
  )

  // Group agents by category
  // Note: agents prop now includes vanilla agents from useAgents hook
  const agentsByCategory = React.useMemo(() => {
    const grouped: Record<CategoryKey, AgentCardType[]> = {
      claude: [],
      codex: [],
      copilot: [],
      gemini: [],
      'page-assistant': [],
    }

    // Filter and group agents
    const searchLower = searchQuery.toLowerCase()

    for (const agent of agents) {
      if (!agent.enabled) continue

      // Apply search filter
      if (searchQuery) {
        const matchesSearch =
          agent.name.toLowerCase().includes(searchLower) ||
          agent.description.toLowerCase().includes(searchLower) ||
          agent.backend?.toLowerCase().includes(searchLower) ||
          ('vanilla'.includes(searchLower) && agent.id.startsWith('__vanilla_'))
        if (!matchesSearch) continue
      }

      // Apply section filter - skip vanilla agents when filtering by section
      const isVanilla = agent.id.startsWith('__vanilla_')
      if (sectionFilter) {
        if (isVanilla) continue // Don't show vanilla agents when filtering by section
        if (!agent.sections?.includes(sectionFilter)) continue
      }

      const category = deriveCategory(agent)
      grouped[category].push(agent)
    }

    return grouped
  }, [agents, searchQuery, sectionFilter])

  // Count total visible agents
  const totalAgents = React.useMemo(() => {
    return Object.values(agentsByCategory).reduce((sum, arr) => sum + arr.length, 0)
  }, [agentsByCategory])

  // Toggle category expansion
  const toggleCategory = (category: CategoryKey) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
        />
        <p className="mt-4 text-sm text-muted-foreground">Loading agents...</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full w-full overflow-hidden', className)} data-tabz-region="agent-gallery">
      {/* Header */}
      <div className="space-y-3 pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg terminal-glow">AI Agents</h3>
            <Badge variant="secondary" className="text-xs">
              {totalAgents}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {editable && onNewAgent && (
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onNewAgent}
                data-tabz-action="new-agent"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Agent</span>
              </Button>
            )}
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 glass"
            data-tabz-input="agent-search"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 mt-4 min-w-0 overflow-y-auto overflow-x-hidden space-y-2">
        {totalAgents === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No agents match your search' : 'No agents available'}
            </p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          CATEGORY_ORDER.map((categoryKey) => {
            const categoryAgents = agentsByCategory[categoryKey]
            if (categoryAgents.length === 0) return null

            const config = CATEGORY_CONFIG[categoryKey]
            const Icon = config.icon
            const isExpanded = expandedCategories.has(categoryKey)

            return (
              <Collapsible
                key={categoryKey}
                open={isExpanded}
                onOpenChange={() => toggleCategory(categoryKey)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-10 px-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {categoryAgents.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-2 pb-4">
                  <motion.div
                    className={cn(
                      'w-full',
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                        : 'flex flex-col gap-2'
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {categoryAgents.map((agent, index) => {
                        const isVanilla = agent.id.startsWith('__vanilla_')

                        return (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.03 }}
                            className="w-full relative group"
                          >
                            <AgentCard
                              agent={agent}
                              isSelected={selectedAgentId === agent.id}
                              onClick={onSelectAgent}
                              variant={viewMode === 'grid' ? 'card' : 'compact'}
                            />

                            {/* Edit/Delete buttons */}
                            {editable && !isVanilla && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                {onEditAgent && (
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onEditAgent(agent)
                                    }}
                                    title="Edit agent"
                                    data-tabz-action="edit-agent"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {onDeleteAgent && (
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDeleteAgent(agent)
                                    }}
                                    title="Delete agent"
                                    data-tabz-action="delete-agent"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AgentGallery
