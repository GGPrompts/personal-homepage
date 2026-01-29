'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlowEffect } from '@/components/ui/glow-effect'
import { Play, Loader2, Bot, Code, Gem, Plane } from 'lucide-react'
import { toast } from 'sonner'
import { useTabzBridge } from '@/hooks/useTabzBridge'
import type { AgentCard as AgentCardType } from '@/lib/agents/types'

export interface AgentCardProps {
  /** Agent data to display */
  agent: AgentCardType
  /** Whether this agent is currently selected/active */
  isSelected?: boolean
  /** Click handler for card selection */
  onClick?: (agent: AgentCardType) => void
  /** Optional className for custom styling */
  className?: string
  /** Display variant: 'card' for grid layout, 'compact' for list layout */
  variant?: 'card' | 'compact'
  /** Show spawn button for TabzChrome integration */
  showSpawn?: boolean
  /** Callback when spawn is requested */
  onSpawn?: (agent: AgentCardType) => void
}

/**
 * Backend display configuration
 */
const BACKEND_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  claude: { icon: Bot, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30', label: 'Claude' },
  codex: { icon: Code, color: 'text-green-400 bg-green-500/15 border-green-500/30', label: 'Codex' },
  gemini: { icon: Gem, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30', label: 'Gemini' },
  copilot: { icon: Plane, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30', label: 'Copilot' },
}

/**
 * Check if a string is an emoji (simple heuristic)
 */
function isEmoji(str: string): boolean {
  const emojiRegex = /^[\p{Emoji}\u200d]+$/u
  return emojiRegex.test(str) && str.length <= 8
}

/**
 * Check if a string is a URL
 */
function isUrl(str: string): boolean {
  if (str.startsWith('/')) return true
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * Generate initials from agent name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * AgentCard - Visual component for displaying AI agent cards
 *
 * Displays an AI agent's avatar, name, backend, and section badges.
 * Supports both grid (card) and list (compact) layouts.
 */
export function AgentCard({
  agent,
  isSelected = false,
  onClick,
  className,
  variant = 'card',
  showSpawn = false,
  onSpawn,
}: AgentCardProps) {
  const [isSpawning, setIsSpawning] = React.useState(false)
  const { isConnected, spawnTerminal } = useTabzBridge()

  const handleClick = () => {
    if (onClick) {
      onClick(agent)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  /**
   * Spawn agent terminal via TabzChrome
   */
  const handleSpawn = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isConnected) {
      toast.error('TabzChrome not connected', {
        description: 'Connect TabzChrome to spawn agent terminals',
      })
      return
    }

    setIsSpawning(true)

    try {
      // Build command from backend and flags
      const backend = agent.backend || 'claude'
      let command = backend
      if (agent.pluginPath) {
        command += ` --plugin-dir "${agent.pluginPath}"`
      }
      if (agent.flags?.length) {
        command += ' ' + agent.flags.join(' ')
      }

      spawnTerminal(command, {
        name: `Agent: ${agent.name}`,
      })

      toast.success(`Spawning ${agent.name}`, {
        description: agent.pluginPath
          ? `With plugins from ${agent.pluginPath}`
          : 'Default configuration',
      })

      onSpawn?.(agent)
    } catch (error) {
      toast.error('Failed to spawn agent', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSpawning(false)
    }
  }

  // Determine avatar type and content
  const avatarIsEmoji = isEmoji(agent.avatar)
  const avatarIsUrl = isUrl(agent.avatar)

  // Check if agent has spawn configuration
  const hasSpawnConfig = agent.pluginPath || (agent.flags?.length ?? 0) > 0

  if (variant === 'compact') {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select agent ${agent.name}`}
        aria-pressed={isSelected}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex items-center gap-3 rounded-lg p-3',
          'glass-dark cursor-pointer',
          'transition-all duration-200',
          'hover:bg-white/10',
          'w-full overflow-hidden',
          isSelected && 'ring-2 ring-cyan-400/50 bg-white/10',
          !agent.enabled && 'opacity-50',
          className
        )}
        data-tabz-item={`agent-${agent.id}`}
        data-tabz-action="select"
      >
        {isSelected && (
          <GlowEffect
            colors={['#22d3ee', '#06b6d4', '#0891b2']}
            mode="breathe"
            blur="soft"
            scale={1.05}
            className="rounded-lg opacity-30"
          />
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            {avatarIsUrl && <AvatarImage src={agent.avatar} alt={agent.name} />}
            <AvatarFallback className={cn(
              'text-lg',
              avatarIsEmoji ? 'bg-transparent' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
            )}>
              {avatarIsEmoji ? agent.avatar : getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name, description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{agent.name}</span>
            {agent.backend && BACKEND_CONFIG[agent.backend] && (() => {
              const config = BACKEND_CONFIG[agent.backend!]
              const Icon = config.icon
              return (
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0 rounded text-[9px] border', config.color)}>
                  <Icon className="h-2.5 w-2.5" />
                  {config.label}
                </span>
              )
            })()}
            {!agent.enabled && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/60 truncate">{agent.description}</p>
        </div>

        {/* Section badges (compact - show count) */}
        {agent.sections && agent.sections.length > 0 && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {agent.sections.length} {agent.sections.length === 1 ? 'section' : 'sections'}
          </Badge>
        )}

        {/* Spawn button (compact) */}
        {showSpawn && agent.enabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSpawn}
            disabled={isSpawning || !isConnected}
            className={cn(
              'shrink-0 h-8 w-8 p-0',
              hasSpawnConfig && 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            )}
            title={isConnected ? `Spawn ${agent.name}` : 'TabzChrome not connected'}
            data-tabz-action="spawn-agent"
          >
            {isSpawning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select agent ${agent.name}`}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative rounded-xl p-4',
        'glass-dark cursor-pointer',
        'transition-all duration-300',
        'hover:scale-[1.02] hover:-translate-y-1',
        'hover:bg-white/10',
        isSelected && 'ring-2 ring-cyan-400/50 bg-white/10',
        !agent.enabled && 'opacity-50',
        className
      )}
      data-tabz-item={`agent-${agent.id}`}
      data-tabz-action="select"
    >
      {isSelected && (
        <GlowEffect
          colors={['#22d3ee', '#06b6d4', '#0891b2']}
          mode="breathe"
          blur="medium"
          scale={1.1}
          className="rounded-xl opacity-40"
        />
      )}

      {/* Header with avatar and status */}
      <div className="relative flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 ring-2 ring-white/10">
            {avatarIsUrl && <AvatarImage src={agent.avatar} alt={agent.name} />}
            <AvatarFallback className={cn(
              'text-xl',
              avatarIsEmoji ? 'bg-transparent' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
            )}>
              {avatarIsEmoji ? agent.avatar : getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white truncate">{agent.name}</h3>
            {agent.backend && BACKEND_CONFIG[agent.backend] && (() => {
              const config = BACKEND_CONFIG[agent.backend!]
              const Icon = config.icon
              return (
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border', config.color)}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                </span>
              )
            })()}
            {!agent.enabled && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Disabled
              </Badge>
            )}
          </div>
          {/* Show mode indicator */}
          {agent.mode && (
            <span className="text-xs text-white/60 capitalize">{agent.mode} mode</span>
          )}
        </div>

        {/* Active indicator dot */}
        {isSelected && (
          <div className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-white/70 line-clamp-2 mb-3">{agent.description}</p>

      {/* Section badges */}
      {agent.sections && agent.sections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {agent.sections.slice(0, 2).map((section) => (
            <Badge
              key={section}
              variant="outline"
              className="text-[10px] capitalize"
            >
              {section.replace(/-/g, ' ')}
            </Badge>
          ))}
          {agent.sections.length > 2 && (
            <Badge variant="outline" className="text-[10px]">
              +{agent.sections.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Spawn button (card) */}
      {showSpawn && agent.enabled && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSpawn}
            disabled={isSpawning || !isConnected}
            className={cn(
              'w-full gap-2',
              hasSpawnConfig
                ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                : 'border-white/20'
            )}
            data-tabz-action="spawn-agent"
          >
            {isSpawning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Spawning...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Spawn Agent</span>
              </>
            )}
          </Button>
          {hasSpawnConfig && (
            <p className="text-[10px] text-white/40 mt-1.5 text-center">
              {agent.pluginPath && `Plugin: ${agent.pluginPath.split('/').pop()}`}
              {agent.pluginPath && (agent.flags?.length ?? 0) > 0 && ' • '}
              {(agent.flags?.length ?? 0) > 0 && `${agent.flags!.length} flags`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default AgentCard
