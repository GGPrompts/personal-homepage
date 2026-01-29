"use client"

import * as React from "react"
import {
  ThumbsUp,
  ThumbsDown,
  Trophy,
  Star,
  Check,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { generateId } from "@/lib/prompts-playground"

// Vote types
export type VoteType = "up" | "down" | "winner" | null

export interface Vote {
  panelId: string
  modelId?: string
  voteType: VoteType
  timestamp: number
}

export interface VoteSession {
  id: string
  prompt: string
  votes: Vote[]
  createdAt: number
}

// Storage key
const VOTES_STORAGE_KEY = "prompts-playground-votes"

// Load votes from localStorage
export function loadVoteSessions(): VoteSession[] {
  if (typeof window === "undefined") return []
  try {
    const saved = localStorage.getItem(VOTES_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }
  return []
}

// Save votes to localStorage
export function saveVoteSessions(sessions: VoteSession[]): void {
  if (typeof window === "undefined") return
  // Keep only last 50 sessions to prevent bloat
  const trimmed = sessions.slice(-50)
  localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(trimmed))
}

// Hook to manage voting for a session
export function useVoting(currentPrompt: string) {
  const [sessions, setSessions] = React.useState<VoteSession[]>(loadVoteSessions)
  const [currentSession, setCurrentSession] = React.useState<VoteSession | null>(null)

  // Find or create session for current prompt
  React.useEffect(() => {
    if (!currentPrompt.trim()) {
      setCurrentSession(null)
      return
    }

    // Look for existing session with same prompt
    const existing = sessions.find((s) => s.prompt === currentPrompt.trim())
    if (existing) {
      setCurrentSession(existing)
    } else {
      // Create new session
      const newSession: VoteSession = {
        id: generateId(),
        prompt: currentPrompt.trim(),
        votes: [],
        createdAt: Date.now(),
      }
      setCurrentSession(newSession)
    }
  }, [currentPrompt, sessions])

  // Get vote for a specific panel
  const getVote = React.useCallback(
    (panelId: string): VoteType => {
      if (!currentSession) return null
      const vote = currentSession.votes.find((v) => v.panelId === panelId)
      return vote?.voteType ?? null
    },
    [currentSession]
  )

  // Set vote for a panel
  const setVote = React.useCallback(
    (panelId: string, modelId: string | undefined, voteType: VoteType) => {
      if (!currentSession) return

      const updatedVotes = currentSession.votes.filter(
        (v) => v.panelId !== panelId
      )

      if (voteType !== null) {
        updatedVotes.push({
          panelId,
          modelId,
          voteType,
          timestamp: Date.now(),
        })
      }

      const updatedSession = {
        ...currentSession,
        votes: updatedVotes,
      }

      setCurrentSession(updatedSession)

      // Update sessions list
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== updatedSession.id)
        const updated = [...filtered, updatedSession]
        saveVoteSessions(updated)
        return updated
      })
    },
    [currentSession]
  )

  // Pick winner (sets one as winner, clears others)
  const pickWinner = React.useCallback(
    (panelId: string, modelId: string | undefined) => {
      if (!currentSession) return

      // Remove winner from all, then set for this panel
      const updatedVotes = currentSession.votes
        .filter((v) => v.voteType !== "winner")
        .filter((v) => v.panelId !== panelId)

      updatedVotes.push({
        panelId,
        modelId,
        voteType: "winner",
        timestamp: Date.now(),
      })

      const updatedSession = {
        ...currentSession,
        votes: updatedVotes,
      }

      setCurrentSession(updatedSession)

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== updatedSession.id)
        const updated = [...filtered, updatedSession]
        saveVoteSessions(updated)
        return updated
      })
    },
    [currentSession]
  )

  // Get winner panel ID
  const getWinner = React.useCallback((): string | null => {
    if (!currentSession) return null
    const winnerVote = currentSession.votes.find((v) => v.voteType === "winner")
    return winnerVote?.panelId ?? null
  }, [currentSession])

  // Get vote tally
  const getTally = React.useCallback(
    (panelId: string): { up: number; down: number; isWinner: boolean } => {
      // For now, just return current vote as tally (could aggregate across sessions later)
      const vote = getVote(panelId)
      return {
        up: vote === "up" ? 1 : 0,
        down: vote === "down" ? 1 : 0,
        isWinner: vote === "winner",
      }
    },
    [getVote]
  )

  // Clear votes for current session
  const clearVotes = React.useCallback(() => {
    if (!currentSession) return

    const updatedSession = {
      ...currentSession,
      votes: [],
    }

    setCurrentSession(updatedSession)

    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== updatedSession.id)
      const updated = [...filtered, updatedSession]
      saveVoteSessions(updated)
      return updated
    })
  }, [currentSession])

  return {
    currentSession,
    getVote,
    setVote,
    pickWinner,
    getWinner,
    getTally,
    clearVotes,
    sessions,
  }
}

// Compact voting controls for panel header
interface VotingControlsProps {
  panelId: string
  modelId?: string
  vote: VoteType
  isWinner: boolean
  onVote: (voteType: VoteType) => void
  onPickWinner: () => void
  disabled?: boolean
  compact?: boolean
}

export function VotingControls({
  panelId,
  vote,
  isWinner,
  onVote,
  onPickWinner,
  disabled = false,
  compact = true,
}: VotingControlsProps) {
  const handleToggleVote = (type: "up" | "down") => {
    if (disabled) return
    onVote(vote === type ? null : type)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {/* Thumbs Up */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                vote === "up" && "text-emerald-400 bg-emerald-500/20"
              )}
              onClick={() => handleToggleVote("up")}
              disabled={disabled}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {vote === "up" ? "Remove upvote" : "Upvote"}
          </TooltipContent>
        </Tooltip>

        {/* Thumbs Down */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                vote === "down" && "text-red-400 bg-red-500/20"
              )}
              onClick={() => handleToggleVote("down")}
              disabled={disabled}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {vote === "down" ? "Remove downvote" : "Downvote"}
          </TooltipContent>
        </Tooltip>

        {/* Pick Winner */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                isWinner && "text-amber-400 bg-amber-500/20"
              )}
              onClick={onPickWinner}
              disabled={disabled}
            >
              <Trophy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isWinner ? "Winner!" : "Pick as winner"}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  // Full voting controls (not compact)
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={vote === "up" ? "default" : "outline"}
        size="sm"
        className={cn(
          "gap-1.5",
          vote === "up" && "bg-emerald-500/80 hover:bg-emerald-500"
        )}
        onClick={() => handleToggleVote("up")}
        disabled={disabled}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        Good
      </Button>

      <Button
        variant={vote === "down" ? "default" : "outline"}
        size="sm"
        className={cn(
          "gap-1.5",
          vote === "down" && "bg-red-500/80 hover:bg-red-500"
        )}
        onClick={() => handleToggleVote("down")}
        disabled={disabled}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        Bad
      </Button>

      <Button
        variant={isWinner ? "default" : "outline"}
        size="sm"
        className={cn(
          "gap-1.5",
          isWinner && "bg-amber-500/80 hover:bg-amber-500"
        )}
        onClick={onPickWinner}
        disabled={disabled}
      >
        <Trophy className="h-3.5 w-3.5" />
        Winner
      </Button>
    </div>
  )
}

// Winner badge overlay
interface WinnerBadgeProps {
  className?: string
}

export function WinnerBadge({ className }: WinnerBadgeProps) {
  return (
    <div
      className={cn(
        "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full",
        "bg-amber-500/90 text-amber-950 text-xs font-bold shadow-lg",
        "animate-in zoom-in-50 duration-200",
        className
      )}
    >
      <Trophy className="h-3 w-3" />
      Winner
    </div>
  )
}

// Vote summary component
interface VoteSummaryProps {
  sessions: VoteSession[]
  className?: string
}

export function VoteSummary({ sessions, className }: VoteSummaryProps) {
  // Aggregate model wins
  const modelWins = React.useMemo(() => {
    const wins: Record<string, number> = {}
    sessions.forEach((session) => {
      const winner = session.votes.find((v) => v.voteType === "winner")
      if (winner?.modelId) {
        wins[winner.modelId] = (wins[winner.modelId] || 0) + 1
      }
    })
    return Object.entries(wins)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [sessions])

  if (modelWins.length === 0) {
    return null
  }

  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      <span className="font-medium">Top winners: </span>
      {modelWins.map(([modelId, count], i) => (
        <span key={modelId}>
          {i > 0 && ", "}
          {modelId} ({count})
        </span>
      ))}
    </div>
  )
}
