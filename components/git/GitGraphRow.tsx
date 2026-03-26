'use client'

import React, { memo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import type { GraphNode, Ref } from '@/lib/git/graph-layout'

interface GitGraphRowProps {
  node: GraphNode
  isSelected: boolean
  sha: string
  onSelectCommit: (sha: string) => void
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${diffYears}y ago`
}

function classifyRefs(refs: Ref[]): {
  branches: Ref[]
  tags: Ref[]
  isHead: boolean
} {
  const branches: Ref[] = []
  const tags: Ref[] = []
  let isHead = false

  for (const ref of refs) {
    if (ref.type === 'head') {
      isHead = true
      if (ref.name !== 'HEAD') {
        branches.push(ref)
      }
    } else if (ref.type === 'tag') {
      tags.push(ref)
    } else {
      branches.push(ref)
    }
  }

  return { branches, tags, isHead }
}

export const GitGraphRow = memo(function GitGraphRow({ node, isSelected, sha, onSelectCommit }: GitGraphRowProps) {
  const { branches, tags, isHead } = classifyRefs(node.refs ?? [])
  const relativeTime = timeAgo(node.date)

  const handleClick = useCallback(() => {
    onSelectCommit(sha)
  }, [sha, onSelectCommit])

  return (
    <div
      className={`flex items-center gap-2 px-3 cursor-pointer transition-colors h-[40px] ${
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
      }`}
      onClick={handleClick}
    >
      {/* Short SHA */}
      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-5 shrink-0">
        {node.shortSha}
      </Badge>

      {/* Ref badges */}
      {isHead && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
          HEAD
        </Badge>
      )}
      {branches.map((ref) => (
        <Badge
          key={ref.name}
          variant="default"
          className="text-[10px] px-1.5 py-0 h-5 shrink-0 max-w-[120px] truncate"
        >
          {ref.name}
        </Badge>
      ))}
      {tags.map((ref) => (
        <Badge
          key={ref.name}
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-5 shrink-0 max-w-[120px] truncate"
        >
          {ref.name}
        </Badge>
      ))}

      {/* Commit message */}
      <span className="flex-1 text-sm truncate text-foreground" title={node.message}>
        {node.message}
      </span>

      {/* Author name */}
      <span className="text-xs text-muted-foreground shrink-0 max-w-[100px] truncate hidden sm:inline">
        {node.author}
      </span>

      {/* Relative date */}
      <span
        className="text-xs text-muted-foreground shrink-0 w-16 text-right"
        title={new Date(node.date).toLocaleString()}
      >
        {relativeTime}
      </span>
    </div>
  )
})
