'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  History,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GitCommit,
  List,
  Network,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChangedFilesList, type GitFile } from './ChangedFilesList'
import { CommitInput } from './CommitInput'
import { CommitDetail } from './CommitDetail'
import { GitGraph } from './GitGraph'

interface GitStatus {
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  status: 'clean' | 'dirty' | 'untracked'
  files: GitFile[]
  stashCount: number
}

interface CommitEntry {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string
}

interface GitTabProps {
  workingDir: string
  onFileSelect: (filePath: string) => void
  onCommitSelect: (sha: string) => void
  onCommitFileSelect?: (commitSha: string, filePath: string) => void
  onShowGraph: () => void
  className?: string
  treeFontSize?: number
  treeFontFamily?: string
}

type CommitViewMode = 'list' | 'graph'

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
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  if (diffWeeks < 4) return `${diffWeeks}w`
  if (diffMonths < 12) return `${diffMonths}mo`
  return `${diffYears}y`
}

export function GitTab({
  workingDir,
  onFileSelect,
  onCommitSelect,
  onCommitFileSelect,
  onShowGraph,
  className,
  treeFontSize,
  treeFontFamily,
}: GitTabProps) {
  // Build font style for the git tab container
  const treeFontStyle = useMemo(() => {
    const style: React.CSSProperties = {}
    if (treeFontSize) style.fontSize = `${treeFontSize}px`
    if (treeFontFamily && treeFontFamily !== 'system') {
      style.fontFamily = `"${treeFontFamily}", ui-monospace, monospace`
    }
    return style
  }, [treeFontSize, treeFontFamily])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [commitsOpen, setCommitsOpen] = useState(true)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [selectedCommitInfo, setSelectedCommitInfo] = useState<CommitEntry | null>(null)
  const [showCommitDetail, setShowCommitDetail] = useState(false)

  // Persist view mode in localStorage
  const [commitViewMode, setCommitViewMode] = useState<CommitViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('git-tab-view-mode')
      if (saved === 'list' || saved === 'graph') return saved
    }
    return 'list'
  })

  useEffect(() => {
    localStorage.setItem('git-tab-view-mode', commitViewMode)
  }, [commitViewMode])

  // Fetch git status (changed files)
  const {
    data: gitStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['git-tab-status', workingDir],
    queryFn: async () => {
      const res = await fetch(`/api/git?path=${encodeURIComponent(workingDir)}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get git status')
      }
      return res.json() as Promise<GitStatus>
    },
    enabled: !!workingDir,
    refetchInterval: 15000,
    staleTime: 5000,
  })

  // Fetch recent commits
  const {
    data: logData,
    isLoading: logLoading,
    error: logError,
    refetch: refetchLog,
  } = useQuery({
    queryKey: ['git-tab-log', workingDir],
    queryFn: async () => {
      const res = await fetch(
        `/api/git/log?path=${encodeURIComponent(workingDir)}&limit=20`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get git log')
      }
      return res.json() as Promise<{
        commits: CommitEntry[]
        totalCommits: number
      }>
    },
    enabled: !!workingDir,
    staleTime: 15000,
  })

  const handleFileSelect = useCallback(
    (filePath: string) => {
      setSelectedFile(filePath)
      // Resolve to absolute path for the file viewer
      const absolutePath = filePath.startsWith('/')
        ? filePath
        : `${workingDir}/${filePath}`
      onFileSelect(absolutePath)
    },
    [workingDir, onFileSelect]
  )

  const handleCommitClick = useCallback(
    (commit: CommitEntry) => {
      setSelectedCommit(commit.sha)
      setSelectedCommitInfo(commit)
      setShowCommitDetail(true)
      onCommitSelect(commit.sha)
    },
    [onCommitSelect]
  )

  const handleGraphCommitSelect = useCallback(
    (sha: string) => {
      // Find commit info from logData if available
      const commitInfo = logData?.commits.find(c => c.sha === sha)
      setSelectedCommit(sha)
      if (commitInfo) {
        setSelectedCommitInfo(commitInfo)
      } else {
        // Create minimal commit info from SHA (the detail component will fetch the rest)
        setSelectedCommitInfo({
          sha,
          shortSha: sha.substring(0, 7),
          message: '',
          author: '',
          date: '',
        })
      }
      setShowCommitDetail(true)
      onCommitSelect(sha)
    },
    [logData, onCommitSelect]
  )

  const handleCommitDetailBack = useCallback(() => {
    setShowCommitDetail(false)
    setSelectedCommit(null)
    setSelectedCommitInfo(null)
  }, [])

  const handleCommitFileSelect = useCallback(
    (commitSha: string, filePath: string) => {
      if (onCommitFileSelect) {
        onCommitFileSelect(commitSha, filePath)
      }
    },
    [onCommitFileSelect]
  )

  const handleRefresh = useCallback(() => {
    refetchStatus()
    refetchLog()
  }, [refetchStatus, refetchLog])

  // Loading state
  if (statusLoading && !gitStatus) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)} style={treeFontStyle}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[0.85em]">Loading...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (statusError && !gitStatus) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full gap-2 px-4', className)} style={treeFontStyle}>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-[0.85em] text-center text-muted-foreground">
          {(statusError as Error).message}
        </p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 text-[0.85em] text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  const changedCount = gitStatus?.files.length ?? 0
  const stagedCount = gitStatus?.files.filter(f => f.staged).length ?? 0

  // If showing commit detail, render that instead of the normal view
  if (showCommitDetail && selectedCommitInfo) {
    return (
      <div className={cn('flex flex-col h-full', className)} style={treeFontStyle}>
        {/* Branch header (always visible) */}
        {gitStatus && (
          <div className="px-3 py-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <GitBranch className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-[0.85em] font-mono font-medium truncate">
                  {gitStatus.branch}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                className="p-0.5 hover:bg-muted rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
        <CommitDetail
          commit={selectedCommitInfo}
          repoPath={workingDir}
          onBack={handleCommitDetailBack}
          onFileSelect={handleCommitFileSelect}
          className="flex-1 overflow-hidden"
        />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)} style={treeFontStyle}>
      {/* Branch header */}
      {gitStatus && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <GitBranch className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-[0.85em] font-mono font-medium truncate">
                {gitStatus.branch}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {gitStatus.ahead > 0 && (
                <span className="text-emerald-500 flex items-center gap-0.5 text-[0.75em]">
                  <ArrowUp className="h-2.5 w-2.5" />
                  {gitStatus.ahead}
                </span>
              )}
              {gitStatus.behind > 0 && (
                <span className="text-amber-500 flex items-center gap-0.5 text-[0.75em]">
                  <ArrowDown className="h-2.5 w-2.5" />
                  {gitStatus.behind}
                </span>
              )}
              {gitStatus.status === 'clean' && gitStatus.ahead === 0 && gitStatus.behind === 0 && (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              )}
              <button
                onClick={handleRefresh}
                className="p-0.5 hover:bg-muted rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Changed files section */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[0.75em] font-medium uppercase tracking-wider text-muted-foreground">
              Changed Files
            </span>
            {changedCount > 0 && (
              <Badge variant="secondary" className="text-[0.75em] px-1.5 py-0 h-4">
                {changedCount}
              </Badge>
            )}
          </div>
          <ChangedFilesList
            files={gitStatus?.files ?? []}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            repoPath={workingDir}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Commit input - shown when there are staged files */}
        {stagedCount > 0 && gitStatus && (
          <>
            <div className="border-t border-border/50 mx-2" />
            <CommitInput
              repoPath={workingDir}
              branch={gitStatus.branch}
              stagedCount={stagedCount}
              onRefresh={handleRefresh}
            />
          </>
        )}

        {/* Divider */}
        <div className="border-t border-border/50 mx-2" />

        {/* Recent commits section */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-1.5 w-full px-1 mb-1">
            <button
              onClick={() => setCommitsOpen(!commitsOpen)}
              className="flex items-center gap-1.5 flex-1 min-w-0"
            >
              {commitsOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-[0.75em] font-medium uppercase tracking-wider text-muted-foreground">
                Recent Commits
              </span>
            </button>

            {/* View mode toggle */}
            <div className="flex items-center rounded border border-border/50 overflow-hidden flex-shrink-0">
              <button
                onClick={() => setCommitViewMode('list')}
                className={cn(
                  'p-0.5 transition-colors',
                  commitViewMode === 'list'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="List view"
              >
                <List className="h-3 w-3" />
              </button>
              <button
                onClick={() => setCommitViewMode('graph')}
                className={cn(
                  'p-0.5 transition-colors',
                  commitViewMode === 'graph'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Graph view"
              >
                <Network className="h-3 w-3" />
              </button>
            </div>

            {logData?.totalCommits != null && (
              <Badge variant="secondary" className="text-[0.75em] px-1.5 py-0 h-4 flex-shrink-0">
                {logData.totalCommits}
              </Badge>
            )}
          </div>

          {commitsOpen && commitViewMode === 'list' && (
            <div className="space-y-0.5">
              {logLoading && !logData && (
                <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[0.85em]">Loading commits...</span>
                </div>
              )}

              {logError && !logData && (
                <p className="text-[0.85em] text-destructive px-2 py-2">
                  {(logError as Error).message}
                </p>
              )}

              {logData?.commits.map((commit) => (
                <button
                  key={commit.sha}
                  onClick={() => handleCommitClick(commit)}
                  className={cn(
                    'flex items-start gap-1.5 w-full px-2 py-1.5 rounded text-left transition-colors',
                    selectedCommit === commit.sha
                      ? 'bg-primary/20'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <GitCommit className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[0.7em] px-1 py-0 h-3.5 font-mono flex-shrink-0"
                      >
                        {commit.shortSha}
                      </Badge>
                      <span className="text-[0.75em] text-muted-foreground flex-shrink-0">
                        {timeAgo(commit.date)}
                      </span>
                    </div>
                    <p className="text-[0.85em] truncate mt-0.5 text-foreground">
                      {commit.message}
                    </p>
                  </div>
                </button>
              ))}

              {logData && logData.commits.length > 0 && (
                <button
                  onClick={onShowGraph}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-[0.85em] text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                >
                  <History className="h-3 w-3" />
                  View full graph
                </button>
              )}
            </div>
          )}

          {commitsOpen && commitViewMode === 'graph' && (
            <div className="h-[400px] rounded overflow-hidden border border-border/30">
              <GitGraph
                repoPath={workingDir}
                onSelectCommit={handleGraphCommitSelect}
                selectedSha={selectedCommit ?? undefined}
                className="h-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
