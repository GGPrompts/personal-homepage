'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  GitCommit,
  Loader2,
  Sparkles,
  ArrowUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CommitInputProps {
  repoPath: string
  branch: string
  stagedCount: number
  onRefresh: () => void
  className?: string
}

export function CommitInput({
  repoPath,
  branch,
  stagedCount,
  onRefresh,
  className,
}: CommitInputProps) {
  const [message, setMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canCommit = stagedCount > 0 && message.trim().length > 0 && !isCommitting && !isPushing

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = 20
    const minHeight = lineHeight * 2
    const maxHeight = lineHeight * 6
    const scrollHeight = Math.max(textarea.scrollHeight, minHeight)
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
  }, [message])

  const handleCommit = useCallback(async () => {
    if (!canCommit) return
    setIsCommitting(true)
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', message: message.trim(), path: repoPath }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Commit failed')
        return
      }
      const shortMsg = message.trim().split('\n')[0].substring(0, 50)
      toast.success(`Committed to ${branch}: ${shortMsg}${message.trim().split('\n')[0].length > 50 ? '...' : ''}`)
      setMessage('')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Commit failed')
    } finally {
      setIsCommitting(false)
    }
  }, [canCommit, message, repoPath, branch, onRefresh])

  const handleCommitAndPush = useCallback(async () => {
    if (!canCommit) return
    setIsPushing(true)
    try {
      // Commit first
      const commitRes = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', message: message.trim(), path: repoPath }),
      })
      const commitData = await commitRes.json()
      if (!commitRes.ok) {
        toast.error(commitData.error || 'Commit failed')
        return
      }

      // Then push
      const pushRes = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push', path: repoPath }),
      })
      const pushData = await pushRes.json()
      if (!pushRes.ok) {
        toast.error(pushData.error || 'Push failed')
        onRefresh()
        return
      }

      const shortMsg = message.trim().split('\n')[0].substring(0, 50)
      toast.success(`Committed & pushed to ${branch}: ${shortMsg}${message.trim().split('\n')[0].length > 50 ? '...' : ''}`)
      setMessage('')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Commit & push failed')
    } finally {
      setIsPushing(false)
    }
  }, [canCommit, message, repoPath, branch, onRefresh])

  const handleGenerateMessage = useCallback(async () => {
    if (stagedCount === 0) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/git/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to generate message')
        return
      }
      setMessage(data.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate message')
    } finally {
      setIsGenerating(false)
    }
  }, [repoPath, stagedCount])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + Enter to commit
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          handleCommitAndPush()
        } else {
          handleCommit()
        }
      }
    },
    [handleCommit, handleCommitAndPush]
  )

  const isLoading = isCommitting || isPushing

  return (
    <div className={cn('px-2 py-2', className)}>
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Commit
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {branch}
        </span>
      </div>

      {/* Textarea with AI generate button */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Commit message..."
          disabled={isLoading || isGenerating}
          rows={2}
          className={cn(
            'w-full resize-none rounded border border-border/50 bg-muted/30 px-2.5 py-1.5 pr-8',
            'text-xs font-mono placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        />

        {/* AI generate button */}
        {stagedCount > 0 && (
          <button
            onClick={handleGenerateMessage}
            disabled={isGenerating || isLoading}
            className={cn(
              'absolute right-1.5 top-1.5 p-0.5 rounded transition-colors',
              'text-muted-foreground hover:text-primary hover:bg-primary/10',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Generate commit message with AI"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Character count */}
        {message.length > 0 && (
          <span className="absolute right-1.5 bottom-1.5 text-[9px] text-muted-foreground/50 font-mono">
            {message.length}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors',
            canCommit
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isCommitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <GitCommit className="h-3 w-3" />
          )}
          Commit
        </button>

        <button
          onClick={handleCommitAndPush}
          disabled={!canCommit}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors',
            canCommit
              ? 'bg-muted hover:bg-muted/80 text-foreground'
              : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
          )}
        >
          {isPushing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )}
          Commit & Push
        </button>

        {stagedCount === 0 && (
          <span className="text-[10px] text-muted-foreground ml-1">
            No staged files
          </span>
        )}
      </div>
    </div>
  )
}
