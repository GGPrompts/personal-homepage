'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import {
  FileText,
  Plus,
  Minus,
  Trash2,
  File,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface GitFile {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked'
  staged: boolean
  oldPath?: string
}

interface ChangedFilesListProps {
  files: GitFile[]
  onFileSelect: (filePath: string) => void
  selectedFile?: string | null
  repoPath: string
  onRefresh: () => void
  className?: string
  treeFontSize?: number
  treeFontFamily?: string
}

const statusIcons: Record<GitFile['status'], React.ReactNode> = {
  modified: <FileText className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />,
  added: <Plus className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />,
  deleted: <Trash2 className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />,
  renamed: <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />,
  copied: <File className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />,
  untracked: <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />,
}

const statusLabels: Record<GitFile['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: '?',
}

const statusColors: Record<GitFile['status'], string> = {
  modified: 'text-amber-500 border-amber-500/30',
  added: 'text-emerald-500 border-emerald-500/30',
  deleted: 'text-red-500 border-red-500/30',
  renamed: 'text-blue-500 border-blue-500/30',
  copied: 'text-blue-500 border-blue-500/30',
  untracked: 'text-muted-foreground border-muted-foreground/30',
}

function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = true,
  actions,
}: {
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
  actions?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  if (count === 0) return null

  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 py-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-[0.85em] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>{title}</span>
          <Badge variant="secondary" className="text-[0.75em] px-1 py-0 h-4">
            {count}
          </Badge>
        </button>
        {actions && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      {isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

const FileRow = memo(function FileRow({
  file,
  isSelected,
  onFileSelect,
  onToggleStage,
  onDiscard,
  isLoading,
}: {
  file: GitFile
  isSelected: boolean
  onFileSelect: (path: string) => void
  onToggleStage: (file: GitFile) => void
  onDiscard?: (file: GitFile) => void
  isLoading: boolean
}) {
  const fileName = file.path.split('/').pop() || file.path
  const dirPath = file.path.includes('/')
    ? file.path.substring(0, file.path.lastIndexOf('/'))
    : ''

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 rounded transition-colors group',
        isSelected
          ? 'bg-primary/20 text-primary'
          : 'hover:bg-muted/50 text-foreground'
      )}
      title={file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path}
    >
      {/* Staging checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleStage(file)
        }}
        disabled={isLoading}
        className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
        title={file.staged ? 'Unstage file' : 'Stage file'}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : file.staged ? (
          <Minus className="h-3 w-3 text-amber-500" />
        ) : (
          <Plus className="h-3 w-3 text-emerald-500" />
        )}
      </button>

      {/* File info (clickable for diff view) */}
      <button
        onClick={() => onFileSelect(file.path)}
        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
      >
        {statusIcons[file.status]}
        <span className="flex-1 min-w-0 truncate text-[0.85em] font-mono">
          {dirPath && (
            <span className="text-muted-foreground">{dirPath}/</span>
          )}
          {fileName}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[0.7em] px-1 py-0 h-3.5 flex-shrink-0',
            statusColors[file.status]
          )}
        >
          {statusLabels[file.status]}
        </Badge>
      </button>

      {/* Discard button (on hover) */}
      {onDiscard && file.status !== 'untracked' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDiscard(file)
          }}
          disabled={isLoading}
          className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition-all disabled:opacity-50"
          title="Discard changes"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
})

export function ChangedFilesList({
  files,
  onFileSelect,
  selectedFile,
  repoPath,
  onRefresh,
  className,
}: ChangedFilesListProps) {
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)

  const stagedFiles = useMemo(() => files.filter((f) => f.staged), [files])
  const changedFiles = useMemo(() => files.filter((f) => !f.staged && f.status !== 'untracked'), [files])
  const untrackedFiles = useMemo(() => files.filter((f) => f.status === 'untracked'), [files])

  const gitAction = useCallback(
    async (action: string, actionFiles?: string[]) => {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: repoPath, action, files: actionFiles }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Git operation failed')
      }
      return res.json()
    },
    [repoPath]
  )

  const handleToggleStage = useCallback(
    async (file: GitFile) => {
      const key = `${file.staged ? 's' : 'u'}-${file.path}`
      setLoadingFiles((prev) => new Set(prev).add(key))
      try {
        const action = file.staged ? 'unstage' : 'stage'
        await gitAction(action, [file.path])
        onRefresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Git operation failed')
      } finally {
        setLoadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [gitAction, onRefresh]
  )

  const handleDiscard = useCallback(
    async (file: GitFile) => {
      const key = `${file.staged ? 's' : 'u'}-${file.path}`
      setLoadingFiles((prev) => new Set(prev).add(key))
      try {
        await gitAction('discard', [file.path])
        toast.success(`Discarded changes to ${file.path.split('/').pop()}`)
        onRefresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Discard failed')
      } finally {
        setLoadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [gitAction, onRefresh]
  )

  const handleStageAll = useCallback(async () => {
    setBulkLoading('stage-all')
    try {
      await gitAction('stage')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Stage all failed')
    } finally {
      setBulkLoading(null)
    }
  }, [gitAction, onRefresh])

  const handleFileSelect = useCallback(
    (path: string) => onFileSelect(path),
    [onFileSelect]
  )

  const handleUnstageAll = useCallback(async () => {
    setBulkLoading('unstage-all')
    try {
      await gitAction('unstage')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unstage all failed')
    } finally {
      setBulkLoading(null)
    }
  }, [gitAction, onRefresh])

  if (files.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6 text-muted-foreground', className)}>
        <File className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-[0.85em]">Working tree clean</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <CollapsibleSection
        title="Staged"
        count={stagedFiles.length}
        actions={
          <button
            onClick={handleUnstageAll}
            disabled={bulkLoading === 'unstage-all'}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.75em] text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors disabled:opacity-50"
            title="Unstage all"
          >
            {bulkLoading === 'unstage-all' ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Minus className="h-2.5 w-2.5" />
            )}
            <span>Unstage All</span>
          </button>
        }
      >
        {stagedFiles.map((file) => {
          const key = `s-${file.path}`
          return (
            <FileRow
              key={`staged-${file.path}`}
              file={file}
              isSelected={selectedFile === file.path}
              onFileSelect={handleFileSelect}
              onToggleStage={handleToggleStage}
              onDiscard={handleDiscard}
              isLoading={loadingFiles.has(key)}
            />
          )
        })}
      </CollapsibleSection>

      <CollapsibleSection
        title="Changes"
        count={changedFiles.length}
        actions={
          <button
            onClick={handleStageAll}
            disabled={bulkLoading === 'stage-all'}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.75em] text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors disabled:opacity-50"
            title="Stage all"
          >
            {bulkLoading === 'stage-all' ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Plus className="h-2.5 w-2.5" />
            )}
            <span>Stage All</span>
          </button>
        }
      >
        {changedFiles.map((file) => {
          const key = `u-${file.path}`
          return (
            <FileRow
              key={`changed-${file.path}`}
              file={file}
              isSelected={selectedFile === file.path}
              onFileSelect={handleFileSelect}
              onToggleStage={handleToggleStage}
              onDiscard={handleDiscard}
              isLoading={loadingFiles.has(key)}
            />
          )
        })}
      </CollapsibleSection>

      <CollapsibleSection
        title="Untracked"
        count={untrackedFiles.length}
        actions={
          <button
            onClick={handleStageAll}
            disabled={bulkLoading === 'stage-all'}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.75em] text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors disabled:opacity-50"
            title="Stage all untracked"
          >
            {bulkLoading === 'stage-all' ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Plus className="h-2.5 w-2.5" />
            )}
            <span>Stage All</span>
          </button>
        }
      >
        {untrackedFiles.map((file) => {
          const key = `u-${file.path}`
          return (
            <FileRow
              key={`untracked-${file.path}`}
              file={file}
              isSelected={selectedFile === file.path}
              onFileSelect={handleFileSelect}
              onToggleStage={handleToggleStage}
              isLoading={loadingFiles.has(key)}
            />
          )
        })}
      </CollapsibleSection>
    </div>
  )
}
