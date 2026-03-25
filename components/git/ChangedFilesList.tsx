'use client'

import React from 'react'
import {
  FileText,
  Plus,
  Trash2,
  File,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
  className?: string
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
}: {
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  if (count === 0) return null

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>{title}</span>
        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-auto">
          {count}
        </Badge>
      </button>
      {isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

function FileRow({
  file,
  isSelected,
  onClick,
}: {
  file: GitFile
  isSelected: boolean
  onClick: () => void
}) {
  const fileName = file.path.split('/').pop() || file.path
  const dirPath = file.path.includes('/')
    ? file.path.substring(0, file.path.lastIndexOf('/'))
    : ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 rounded text-left transition-colors group',
        isSelected
          ? 'bg-primary/20 text-primary'
          : 'hover:bg-muted/50 text-foreground'
      )}
      title={file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path}
    >
      {statusIcons[file.status]}
      <span className="flex-1 min-w-0 truncate text-xs font-mono">
        {dirPath && (
          <span className="text-muted-foreground">{dirPath}/</span>
        )}
        {fileName}
      </span>
      <Badge
        variant="outline"
        className={cn(
          'text-[9px] px-1 py-0 h-3.5 flex-shrink-0',
          statusColors[file.status]
        )}
      >
        {statusLabels[file.status]}
      </Badge>
    </button>
  )
}

export function ChangedFilesList({
  files,
  onFileSelect,
  selectedFile,
  className,
}: ChangedFilesListProps) {
  const stagedFiles = files.filter((f) => f.staged)
  const changedFiles = files.filter((f) => !f.staged && f.status !== 'untracked')
  const untrackedFiles = files.filter((f) => f.status === 'untracked')

  if (files.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6 text-muted-foreground', className)}>
        <File className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-xs">Working tree clean</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <CollapsibleSection title="Staged" count={stagedFiles.length}>
        {stagedFiles.map((file) => (
          <FileRow
            key={`staged-${file.path}`}
            file={file}
            isSelected={selectedFile === file.path}
            onClick={() => onFileSelect(file.path)}
          />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Changes" count={changedFiles.length}>
        {changedFiles.map((file) => (
          <FileRow
            key={`changed-${file.path}`}
            file={file}
            isSelected={selectedFile === file.path}
            onClick={() => onFileSelect(file.path)}
          />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Untracked" count={untrackedFiles.length}>
        {untrackedFiles.map((file) => (
          <FileRow
            key={`untracked-${file.path}`}
            file={file}
            isSelected={selectedFile === file.path}
            onClick={() => onFileSelect(file.path)}
          />
        ))}
      </CollapsibleSection>
    </div>
  )
}
