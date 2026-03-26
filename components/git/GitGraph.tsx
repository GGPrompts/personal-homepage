'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import {
  ROW_HEIGHT,
  RAIL_WIDTH,
  type GraphNode,
  type GraphConnection,
  type Ref,
} from '@/lib/git/graph-layout'
import { GitGraphCanvas } from './GitGraphCanvas'
import { GitGraphRow } from './GitGraphRow'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

interface GitGraphProps {
  repoPath: string
  onSelectCommit: (sha: string) => void
  selectedSha?: string
  className?: string
}

interface ApiCommit {
  sha: string
  shortSha: string
  message: string
  author: string
  email: string
  date: string
  parents: string[]
  refs: Ref[]
  lane: number
}

export function GitGraph({
  repoPath,
  onSelectCommit,
  selectedSha,
  className,
}: GitGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [connections, setConnections] = useState<GraphConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchCommits = useCallback(
    async (currentSkip: number, append: boolean) => {
      try {
        const url = `/api/git/log?path=${encodeURIComponent(repoPath)}&limit=${PAGE_SIZE}&skip=${currentSkip}`
        const response = await fetch(url)

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(data.error || `Failed to fetch: ${response.status}`)
        }

        const data = await response.json()
        const apiCommits: ApiCommit[] = data.commits ?? []
        const apiConnections: GraphConnection[] = data.connections ?? []
        const apiHasMore: boolean = data.hasMore ?? false

        if (append) {
          setNodes((prev) => {
            const existingShas = new Set(prev.map((n) => n.sha))
            const newNodes: GraphNode[] = apiCommits
              .filter((c) => !existingShas.has(c.sha))
              .map((c, i) => ({
                ...c,
                lane: c.lane,
                row: prev.length + i,
              }))
            return [...prev, ...newNodes]
          })
          setConnections((prev) => {
            // The API returns connections for the full set when appending,
            // but since we re-fetch with skip, we need to offset row indices.
            // Actually the API computes layout for only the returned page,
            // so we offset the connections to match our accumulated rows.
            const offset = currentSkip
            const adjusted = apiConnections.map((c) => ({
              ...c,
              from: c.from + offset,
              to: c.to + offset,
            }))
            return [...prev, ...adjusted]
          })
        } else {
          const graphNodes: GraphNode[] = apiCommits.map((c, i) => ({
            ...c,
            lane: c.lane,
            row: i,
          }))
          setNodes(graphNodes)
          setConnections(apiConnections)
        }

        setHasMore(apiHasMore)
        setSkip(currentSkip + apiCommits.length)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch git graph')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [repoPath]
  )

  // Initial fetch
  useEffect(() => {
    setNodes([])
    setConnections([])
    setLoading(true)
    setError(null)
    setHasMore(true)
    setSkip(0)
    fetchCommits(0, false)
  }, [fetchCommits])

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setLoadingMore(true)
      fetchCommits(skip, true)
    }
  }, [loadingMore, hasMore, skip, fetchCommits])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Calculate dimensions
  const laneCount = nodes.reduce((max, n) => Math.max(max, n.lane), 0) + 1
  const canvasWidth = (laneCount + 1) * RAIL_WIDTH
  const canvasHeight = nodes.length * ROW_HEIGHT

  // Loading state
  if (loading && nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading git history...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error && nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm mb-3 text-destructive">{error}</p>
          <button
            onClick={() => {
              setLoading(true)
              setError(null)
              setSkip(0)
              fetchCommits(0, false)
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded mx-auto bg-muted hover:bg-muted/80 text-foreground border border-border"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <p className="text-muted-foreground">No commits found</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('glass-dark h-full overflow-auto', className)}
    >
      {/* Graph container */}
      <div className="relative" style={{ minHeight: canvasHeight }}>
        {/* SVG lane renderer */}
        <GitGraphCanvas
          nodes={nodes}
          connections={connections}
          width={canvasWidth}
          height={canvasHeight}
          selectedSha={selectedSha}
        />

        {/* Commit rows */}
        <div className="relative" style={{ marginLeft: canvasWidth }}>
          {nodes.map((node) => (
            <GitGraphRow
              key={node.sha}
              node={node}
              isSelected={selectedSha === node.sha}
              sha={node.sha}
              onSelectCommit={onSelectCommit}
            />
          ))}
        </div>
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}

      {/* End of history */}
      {!hasMore && nodes.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          End of history ({nodes.length} commits)
        </div>
      )}
    </div>
  )
}
