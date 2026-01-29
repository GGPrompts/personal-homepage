'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlowEffect } from '@/components/ui/glow-effect'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ImagePlus, RefreshCw, Copy, Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAvatarGeneration } from '@/hooks/useAvatarGeneration'
import { useTabzBridge } from '@/hooks/useTabzBridge'
import type { AgentCard as AgentCardType, AgentPersonalityTrait } from '@/lib/agents/types'

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
  /** Callback when avatar is updated */
  onAvatarChange?: (agentId: string, newAvatar: string) => void
  /** Enable avatar editing mode */
  editable?: boolean
  /** Show spawn button for TabzChrome integration */
  showSpawn?: boolean
  /** Callback when spawn is requested */
  onSpawn?: (agent: AgentCardType) => void
}

/**
 * Personality trait display configuration
 */
const PERSONALITY_COLORS: Record<AgentPersonalityTrait, string> = {
  helpful: 'bg-green-500/20 text-green-400 border-green-500/30',
  concise: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  detailed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  technical: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  friendly: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  formal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  creative: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  analytical: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
}

/**
 * Check if a string is an emoji (simple heuristic)
 */
function isEmoji(str: string): boolean {
  // Check for common emoji patterns
  const emojiRegex = /^[\p{Emoji}\u200d]+$/u
  return emojiRegex.test(str) && str.length <= 8
}

/**
 * Check if a string is a URL
 */
function isUrl(str: string): boolean {
  // Check for absolute paths (served by Next.js from public/)
  if (str.startsWith('/')) return true
  // Check for full URLs
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
 * AvatarRegeneratePopover - Popover for regenerating agent avatar
 */
function AvatarRegeneratePopover({
  agent,
  onAvatarChange,
  children,
}: {
  agent: AgentCardType
  onAvatarChange?: (agentId: string, newAvatar: string) => void
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const { generatePrompt } = useAvatarGeneration()
  const [prompt, setPrompt] = React.useState<string | null>(null)

  const handleGeneratePrompt = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newPrompt = generatePrompt(agent.name, agent.personality, agent.description)
    setPrompt(newPrompt)
    setIsOpen(true)
  }

  const copyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (prompt) {
      navigator.clipboard.writeText(prompt)
      toast.success('Prompt copied to clipboard')
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleGeneratePrompt}
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
          title="Generate new avatar"
        >
          <RefreshCw className="h-3 w-3 text-primary-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onClick={(e) => e.stopPropagation()}
        align="start"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Generate Avatar</span>
          </div>
          {prompt && (
            <>
              <div className="p-2 rounded bg-muted text-xs leading-relaxed">
                {prompt}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyPrompt}
                  className="flex-1 gap-1.5"
                >
                  <Copy className="h-3 w-3" />
                  Copy Prompt
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ask Claude to generate this avatar with DALL-E, or paste the prompt directly into ChatGPT.
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * AgentCard - Visual component for displaying AI agent cards
 *
 * Displays an AI agent's avatar, name, personality traits, and section badges.
 * Supports both grid (card) and list (compact) layouts.
 */
export function AgentCard({
  agent,
  isSelected = false,
  onClick,
  className,
  variant = 'card',
  onAvatarChange,
  editable = false,
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
   * Builds claude command with --plugin-dir if configured
   */
  const handleSpawn = async (e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger card selection

    if (!isConnected) {
      toast.error('TabzChrome not connected', {
        description: 'Connect TabzChrome to spawn agent terminals',
      })
      return
    }

    setIsSpawning(true)

    try {
      // Build the claude command with optional --plugin-dir
      let command = 'claude'
      if (agent.pluginPath) {
        command += ` --plugin-dir "${agent.pluginPath}"`
      }

      // Spawn via TabzBridge
      spawnTerminal(command, {
        name: `Agent: ${agent.name}`,
      })

      toast.success(`Spawning ${agent.name}`, {
        description: agent.pluginPath
          ? `With plugins from ${agent.pluginPath}`
          : 'Default configuration',
      })

      // Call optional callback
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

  // Get first personality trait for tagline
  const primaryTrait = agent.personality[0]

  // Check if agent has spawn configuration
  const hasSpawnConfig = agent.pluginPath || agent.spawnCommand?.length

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
        {/* Glow effect for selected state */}
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
        <div className="relative group shrink-0">
          <Avatar className="h-10 w-10">
            {avatarIsUrl && <AvatarImage src={agent.avatar} alt={agent.name} />}
            <AvatarFallback className={cn(
              'text-lg',
              avatarIsEmoji ? 'bg-transparent' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
            )}>
              {avatarIsEmoji ? agent.avatar : getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
          {editable && (
            <AvatarRegeneratePopover agent={agent} onAvatarChange={onAvatarChange}>
              <span />
            </AvatarRegeneratePopover>
          )}
        </div>

        {/* Name, description and traits */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{agent.name}</span>
            {!agent.enabled && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/60 truncate">{agent.description}</p>
          {/* Personality traits in compact mode */}
          {agent.personality.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {agent.personality.slice(0, 3).map((trait) => (
                <span
                  key={trait}
                  className={cn(
                    'text-[9px] px-1.5 py-0 rounded-full border capitalize',
                    PERSONALITY_COLORS[trait]
                  )}
                >
                  {trait}
                </span>
              ))}
            </div>
          )}
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
      {/* Glow effect for selected state */}
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
        <div className="relative group shrink-0">
          <Avatar className="h-12 w-12 ring-2 ring-white/10">
            {avatarIsUrl && <AvatarImage src={agent.avatar} alt={agent.name} />}
            <AvatarFallback className={cn(
              'text-xl',
              avatarIsEmoji ? 'bg-transparent' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
            )}>
              {avatarIsEmoji ? agent.avatar : getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
          {editable && (
            <AvatarRegeneratePopover agent={agent} onAvatarChange={onAvatarChange}>
              <span />
            </AvatarRegeneratePopover>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{agent.name}</h3>
            {!agent.enabled && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Disabled
              </Badge>
            )}
          </div>
          {primaryTrait && (
            <span className="text-xs text-white/60 capitalize">{primaryTrait}</span>
          )}
        </div>

        {/* Active indicator dot */}
        {isSelected && (
          <div className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-white/70 line-clamp-2 mb-3">{agent.description}</p>

      {/* Personality traits */}
      {agent.personality.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {agent.personality.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border capitalize',
                PERSONALITY_COLORS[trait]
              )}
            >
              {trait}
            </span>
          ))}
          {agent.personality.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50">
              +{agent.personality.length - 3}
            </span>
          )}
        </div>
      )}

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

      {/* MCP tools indicator */}
      {agent.mcp_tools.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] text-white/50">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{agent.mcp_tools.length} tools available</span>
          </div>
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
              {agent.pluginPath && agent.spawnCommand?.length && ' • '}
              {agent.spawnCommand?.length && `${agent.spawnCommand.length} flags`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default AgentCard
