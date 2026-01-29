'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, LayoutGrid, List, Users, Filter, Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AgentCard } from './AgentCard'
import type { AgentCard as AgentCardType, CreateAgentInput } from '@/lib/agents/types'

export interface AgentGalleryProps {
  /** List of agents to display */
  agents: AgentCardType[]
  /** Currently selected agent ID */
  selectedAgentId?: string | null
  /** Callback when an agent is selected */
  onSelectAgent: (agent: AgentCardType) => void
  /** Callback when edit is requested for an agent */
  onEditAgent?: (agent: AgentCardType) => void
  /** Callback when creating a new agent */
  onNewAgent?: () => void
  /** Callback when deleting an agent */
  onDeleteAgent?: (agent: AgentCardType) => void
  /** Optional section filter to show only agents for specific sections */
  sectionFilter?: string | null
  /** Optional className for custom styling */
  className?: string
  /** Whether the gallery is loading */
  isLoading?: boolean
  /** Enable edit mode with edit/delete buttons */
  editable?: boolean
}

type ViewMode = 'grid' | 'list'

/**
 * AgentGallery - Grid/list view for browsing and selecting AI agents
 *
 * Features:
 * - Search filtering by name and description
 * - Toggle between grid and list layouts
 * - Section-based filtering
 * - Selection state with visual feedback
 */
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
  const [activeSection, setActiveSection] = React.useState<string | null>(sectionFilter || null)

  // Get unique sections from all agents
  const availableSections = React.useMemo(() => {
    const sections = new Set<string>()
    agents.forEach((agent) => {
      agent.sections?.forEach((section) => sections.add(section))
    })
    return Array.from(sections).sort()
  }, [agents])

  // Virtual "vanilla Claude" agent for starting without a custom agent
  const vanillaClaudeAgent: AgentCardType = React.useMemo(() => ({
    id: '__vanilla__',
    name: 'Claude',
    description: 'Start a conversation with Claude without any custom agent configuration',
    avatar: '🤖',
    system_prompt: '',
    personality: ['helpful'],
    sections: [],
    enabled: true,
    mcp_tools: [],
    selectors: [],
    config: {
      model: 'sonnet',
      temperature: 0.7,
      max_tokens: 8192,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }), [])

  // Filter agents based on search and section
  const filteredAgents = React.useMemo(() => {
    const filtered = agents.filter((agent) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower) ||
        agent.personality.some((trait) => trait.toLowerCase().includes(searchLower))

      // Section filter
      const matchesSection =
        !activeSection ||
        agent.sections?.includes(activeSection)

      // Only show enabled agents by default
      return matchesSearch && matchesSection && agent.enabled
    })

    // Add vanilla Claude at the start if it matches the search
    const vanillaMatchesSearch = !searchQuery ||
      'claude'.includes(searchQuery.toLowerCase()) ||
      'vanilla'.includes(searchQuery.toLowerCase()) ||
      vanillaClaudeAgent.description.toLowerCase().includes(searchQuery.toLowerCase())

    // Only show vanilla option when no section filter is active
    if (vanillaMatchesSearch && !activeSection) {
      return [vanillaClaudeAgent, ...filtered]
    }

    return filtered
  }, [agents, searchQuery, activeSection, vanillaClaudeAgent])

  // Handle section filter change
  const handleSectionFilter = (section: string | null) => {
    setActiveSection(section === activeSection ? null : section)
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
      {/* Header with search and controls */}
      <div className="space-y-3 pb-4 border-b border-border/40">
        {/* Title and view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg terminal-glow">AI Agents</h3>
            <Badge variant="secondary" className="text-xs">
              {filteredAgents.length}
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

        {/* Search input */}
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

        {/* Section filter chips */}
        {availableSections.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
            <Button
              variant={activeSection === null ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => handleSectionFilter(null)}
            >
              All
            </Button>
            {availableSections.map((section) => (
              <Button
                key={section}
                variant={activeSection === section ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-xs px-2 capitalize"
                onClick={() => handleSectionFilter(section)}
              >
                {section.replace(/-/g, ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Agents list/grid */}
      <div className="flex-1 mt-4 min-w-0 overflow-y-auto overflow-x-hidden">
        {filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || activeSection
                ? 'No agents match your filters'
                : 'No agents available'}
            </p>
            {(searchQuery || activeSection) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearchQuery('')
                  setActiveSection(null)
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            className={cn(
              'w-full',
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                : 'flex flex-col gap-2'
            )}
          >
            <AnimatePresence mode="popLayout">
              {filteredAgents.map((agent, index) => {
                const isCustomAgent = agent.id !== '__vanilla__'

                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full relative group"
                  >
                    <AgentCard
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onClick={onSelectAgent}
                      variant={viewMode === 'grid' ? 'card' : 'compact'}
                    />

                    {/* Edit/Delete buttons - appear on hover when editable */}
                    {editable && isCustomAgent && (
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
        )}
      </div>
    </div>
  )
}

export default AgentGallery
