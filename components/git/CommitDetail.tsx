'use client'

import React, { memo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  File,
  Loader2,
  AlertCircle,
  User,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DiffFileInfo {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  insertions: number
  deletions: number
}

interface DiffResponse {
  diff: string
  files: DiffFileInfo[]
  stats: {
    filesChanged: number
    insertions: number
    deletions: number
  }
}

interface CommitInfo {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string
}

interface CommitDetailProps {
  commit: CommitInfo
  repoPath: string
  onBack: () => void
  onFileSelect: (commitSha: string, filePath: string) => void
  className?: string
}

const statusIcons: Record<DiffFileInfo['status'], React.ReactNode> = {
  modified: <FileText className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />,
  added: <Plus className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />,
  deleted: <Trash2 className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />,
  renamed: <File className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />,
}

const statusColors: Record<DiffFileInfo['status'], string> = {
  modified: 'text-amber-500 border-amber-500/30',
  added: 'text-emerald-500 border-emerald-500/30',
  deleted: 'text-red-500 border-red-500/30',
  renamed: 'text-blue-500 border-blue-500/30',
}

const statusLabels: Record<DiffFileInfo['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
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

export const CommitDetail = memo(function CommitDetail({
  commit,
  repoPath,
  onBack,
  onFileSelect,
  className,
}: CommitDetailProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // Fetch commit diff (file list + stats)
  const {
    data: diffData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['commit-diff', repoPath, commit.sha],
    queryFn: async () => {
      const res = await fetch(
        `/api/git/diff?path=${encodeURIComponent(repoPath)}&commit=${commit.sha}`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get commit diff')
      }
      return res.json() as Promise<DiffResponse>
    },
    staleTime: 60000, // Commit diffs don't change
  })

  const handleFileClick = useCallback(
    (filePath: string) => {
      setSelectedFile(filePath)
      onFileSelect(commit.sha, filePath)
    },
    [commit.sha, onFileSelect]
  )

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-b border-border/50"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to commits
      </button>

      {/* Commit metadata header */}
      <div className="px-3 py-2 border-b border-border/50 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-3.5 font-mono flex-shrink-0"
          >
            {commit.shortSha}
          </Badge>
        </div>
        <p className="text-xs text-foreground leading-relaxed">
          {commit.message}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {commit.author}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(commit.date)}
          </span>
        </div>

        {/* Overall stats */}
        {diffData?.stats && (
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {diffData.stats.filesChanged} file{diffData.stats.filesChanged !== 1 ? 's' : ''}
            </Badge>
            {diffData.stats.insertions > 0 && (
              <span className="text-[10px] text-emerald-500 font-mono">
                +{diffData.stats.insertions}
              </span>
            )}
            {diffData.stats.deletions > 0 && (
              <span className="text-[10px] text-red-500 font-mono">
                -{diffData.stats.deletions}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Changed files list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-4 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Loading changed files...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-4 text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">{(error as Error).message}</span>
          </div>
        )}

        {diffData?.files && (
          <div className="px-2 py-1 space-y-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Changed Files
            </span>
            {diffData.files.map((file) => {
              const fileName = file.path.split('/').pop() || file.path
              const dirPath = file.path.includes('/')
                ? file.path.substring(0, file.path.lastIndexOf('/'))
                : ''

              return (
                <button
                  key={file.path}
                  onClick={() => handleFileClick(file.path)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-left transition-colors',
                    selectedFile === file.path
                      ? 'bg-primary/20'
                      : 'hover:bg-muted/50'
                  )}
                  title={file.path}
                >
                  {statusIcons[file.status]}
                  <span className="flex-1 min-w-0 truncate text-xs font-mono">
                    {dirPath && (
                      <span className="text-muted-foreground">{dirPath}/</span>
                    )}
                    {fileName}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {file.insertions > 0 && (
                      <span className="text-[10px] text-emerald-500 font-mono">
                        +{file.insertions}
                      </span>
                    )}
                    {file.deletions > 0 && (
                      <span className="text-[10px] text-red-500 font-mono">
                        -{file.deletions}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 h-3.5',
                        statusColors[file.status]
                      )}
                    >
                      {statusLabels[file.status]}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
