'use client'

import { motion } from 'framer-motion'
import {
  Bot,
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Puzzle,
  Server,
  Users,
  Terminal,
  Settings,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { AgentProfile, AgentType, AGENT_META } from './types'

interface AgentCardProps {
  profile: AgentProfile
  onToggleEnabled?: (enabled: boolean) => void
  onClick?: () => void
  isSelected?: boolean
}

/**
 * Icon mapping for agent types
 */
const AGENT_ICONS: Record<AgentType, typeof Bot> = {
  'claude-code': Sparkles,
  'gemini-cli': Gem,
  codex: Code2,
  copilot: Github,
  amp: Zap,
  cursor: MousePointer2,
  custom: Bot,
}

/**
 * Custom icon mapping for avatar names
 */
const CUSTOM_ICON_MAP: Record<string, typeof Bot> = {
  Bot,
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Terminal,
  Server,
  Puzzle,
}

/**
 * Renders the appropriate avatar icon for an agent profile
 */
function AvatarIcon({
  profile,
  className,
}: {
  profile: AgentProfile
  className?: string
}) {
  // If avatar is a Lucide icon name, try to use it
  if (profile.avatar && CUSTOM_ICON_MAP[profile.avatar]) {
    const IconComponent = CUSTOM_ICON_MAP[profile.avatar]
    return <IconComponent className={className} />
  }
  // Fall back to agent type default
  const DefaultIcon = AGENT_ICONS[profile.baseType]
  return <DefaultIcon className={className} />
}

/**
 * AgentCard displays an agent profile with capabilities and status
 * Following glass-dark aesthetic from the design system
 */
export function AgentCard({
  profile,
  onToggleEnabled,
  onClick,
  isSelected = false,
}: AgentCardProps) {
  const agentMeta = AGENT_META[profile.baseType]
  const isEnabled = profile.isEnabled !== false

  // Collect capability badges
  const capabilities = profile.capabilities || {}
  const skillCount = capabilities.skills?.length || 0
  const mcpCount = capabilities.mcpServers?.length || 0
  const subagentCount = capabilities.subagents?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'glass-dark p-4 cursor-pointer transition-all',
        'border-l-4',
        isSelected && 'ring-2 ring-primary/50',
        isEnabled ? 'opacity-100' : 'opacity-60',
        'hover:border-glow'
      )}
      style={{
        borderLeftColor: agentMeta.borderColor
          .replace('border-', '')
          .replace('/50', ''),
      }}
    >
      {/* Header Row: Avatar + Name + Toggle */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Avatar */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            agentMeta.bgColor
          )}
        >
          <AvatarIcon profile={profile} className={cn('h-5 w-5', agentMeta.color)} />
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">
            {profile.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {profile.description || agentMeta.label}
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggleEnabled}
            aria-label={`Toggle ${profile.name}`}
          />
        </div>
      </div>

      {/* Base Type Badge */}
      <div className="mb-3">
        <Badge
          className={cn(
            'text-[10px] font-semibold uppercase',
            agentMeta.bgColor,
            agentMeta.color,
            agentMeta.borderColor
          )}
        >
          {agentMeta.shortLabel}
        </Badge>
      </div>

      {/* Capabilities Row */}
      {(skillCount > 0 || mcpCount > 0 || subagentCount > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {skillCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 text-cyan-400 border-cyan-500/30"
            >
              <Terminal className="h-3 w-3" />
              {skillCount} skill{skillCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {mcpCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 text-purple-400 border-purple-500/30"
            >
              <Server className="h-3 w-3" />
              {mcpCount} MCP{mcpCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {subagentCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 text-amber-400 border-amber-500/30"
            >
              <Users className="h-3 w-3" />
              {subagentCount} subagent{subagentCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-border/30 my-3" />

      {/* Footer: CLI Config Summary + Edit Hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {profile.cliConfig?.permissionMode && (
            <span className="font-mono">
              {profile.cliConfig.permissionMode === 'bypassPermissions'
                ? 'dangerously skip all'
                : profile.cliConfig.permissionMode}
            </span>
          )}
          {profile.cliConfig?.workingDir && (
            <span className="truncate max-w-[120px] font-mono">
              {profile.cliConfig.workingDir.split('/').pop()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-3 w-3" />
          <span>Edit</span>
        </div>
      </div>
    </motion.div>
  )
}
