'use client'

import { motion } from 'framer-motion'
import {
  Package,
  Terminal,
  Bot,
  Command,
  Webhook,
  Server,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ComponentFile {
  name: string
  path: string
}

interface ComponentFiles {
  skills?: ComponentFile[]
  agents?: ComponentFile[]
  commands?: ComponentFile[]
  hooks?: ComponentFile[]
  mcp?: ComponentFile[]
}

export interface Plugin {
  id: string
  name: string
  marketplace: string
  enabled: boolean
  scope: string
  version: string
  installPath: string
  installedAt?: string
  lastUpdated?: string
  gitCommitSha: string | null
  isLocal: boolean
  components: string[]
  componentFiles: ComponentFiles
}

interface PluginCardProps {
  plugin: Plugin
  compact?: boolean
}

/**
 * Component type icons and colors
 */
const COMPONENT_META: Record<string, { icon: typeof Terminal; color: string; bgColor: string }> = {
  skill: { icon: Terminal, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  agent: { icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  command: { icon: Command, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  hook: { icon: Webhook, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  mcp: { icon: Server, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
}

/**
 * PluginCard displays a plugin with its component counts
 * Following glass-dark aesthetic from the design system
 */
export function PluginCard({ plugin, compact = false }: PluginCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Count components from componentFiles for accurate numbers
  const componentCounts = {
    skill: plugin.componentFiles.skills?.length || 0,
    agent: plugin.componentFiles.agents?.length || 0,
    command: plugin.componentFiles.commands?.length || 0,
    hook: plugin.componentFiles.hooks?.length || 0,
    mcp: plugin.componentFiles.mcp?.length || 0,
  }

  const totalComponents = Object.values(componentCounts).reduce((a, b) => a + b, 0)
  const hasExpandableDetails = totalComponents > 0 && !compact

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'glass-dark p-3 transition-all rounded-lg',
        'border border-zinc-700/50',
        plugin.enabled ? 'opacity-100' : 'opacity-60',
        hasExpandableDetails && 'cursor-pointer hover:border-zinc-600'
      )}
      onClick={() => hasExpandableDetails && setIsExpanded(!isExpanded)}
    >
      {/* Header Row: Icon + Name + Status */}
      <div className="flex items-start gap-3">
        {/* Plugin Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
            plugin.isLocal ? 'bg-amber-500/20' : 'bg-teal-500/20'
          )}
        >
          <Package
            className={cn(
              'h-4 w-4',
              plugin.isLocal ? 'text-amber-400' : 'text-teal-400'
            )}
          />
        </div>

        {/* Name & Marketplace */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">
              {plugin.name}
            </h3>
            {hasExpandableDetails && (
              isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-mono">
              @{plugin.marketplace}
            </span>
            <span className="text-[10px] text-zinc-600">·</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              v{plugin.version}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {plugin.enabled ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="h-3 w-3 text-emerald-400" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-500/20 flex items-center justify-center">
              <X className="h-3 w-3 text-zinc-400" />
            </div>
          )}
        </div>
      </div>

      {/* Component Badges */}
      {totalComponents > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {Object.entries(componentCounts).map(([type, count]) => {
            if (count === 0) return null
            const meta = COMPONENT_META[type]
            const Icon = meta.icon
            return (
              <Badge
                key={type}
                variant="outline"
                className={cn(
                  'text-[10px] gap-1 border-zinc-600/50',
                  meta.color
                )}
              >
                <Icon className="h-3 w-3" />
                {count}
              </Badge>
            )
          })}
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && hasExpandableDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 pt-3 border-t border-zinc-700/50 space-y-2"
        >
          {/* Skills List */}
          {plugin.componentFiles.skills && plugin.componentFiles.skills.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Terminal className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wide">
                  Skills
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {plugin.componentFiles.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono"
                  >
                    /{skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Agents List */}
          {plugin.componentFiles.agents && plugin.componentFiles.agents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Bot className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wide">
                  Agents
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {plugin.componentFiles.agents.map((agent) => (
                  <span
                    key={agent.name}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono"
                  >
                    {agent.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Commands List */}
          {plugin.componentFiles.commands && plugin.componentFiles.commands.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Command className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">
                  Commands
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {plugin.componentFiles.commands.map((cmd) => (
                  <span
                    key={cmd.name}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono"
                  >
                    /{cmd.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scope & Install Info */}
          <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
            <span className="font-mono">{plugin.scope}</span>
            {plugin.isLocal && (
              <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">
                local
              </Badge>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
