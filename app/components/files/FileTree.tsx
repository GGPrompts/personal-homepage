'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  Image,
  Video,
  Music,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFilesContext, FileNode } from '@/app/contexts/FilesContext'
import { getClaudeFileType, claudeFileColors } from '@/lib/claudeFileTypes'
import { cn } from '@/lib/utils'

interface FileTreeProps {
  basePath?: string
  maxDepth?: number
  showHidden?: boolean
  className?: string
}

export function FileTree({
  basePath = '~',
  maxDepth = 5,
  showHidden = false,
  className,
}: FileTreeProps) {
  const {
    fileTree,
    setFileTree,
    fileTreePath,
    setFileTreePath,
    pendingTreeNavigation,
    clearPendingNavigation,
    openFile,
  } = useFilesContext()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState(basePath)
  const treeRef = useRef<HTMLDivElement>(null)
  const hasFetchedRef = useRef(false)

  // Helper to update nested tree node
  const updateTreeNode = useCallback((tree: FileNode, dirPath: string, newChildren: FileNode[]): FileNode => {
    if (tree.path === dirPath) {
      return { ...tree, children: newChildren }
    }
    if (tree.children) {
      return { ...tree, children: tree.children.map(child => updateTreeNode(child, dirPath, newChildren)) }
    }
    return tree
  }, [])

  // Lazy load directory children on expand
  const fetchDirectoryChildren = useCallback(async (dirPath: string, currentTree: FileNode | null) => {
    if (!currentTree) return

    setLoadingFolders(prev => new Set(prev).add(dirPath))

    try {
      const params = new URLSearchParams({
        path: dirPath,
        depth: '1',
        showHidden: showHidden.toString(),
      })
      const response = await fetch(`/api/files/tree?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load directory')
      }

      const data = await response.json()

      // Update the tree with new children
      if (data?.children) {
        const updatedTree = updateTreeNode(currentTree, dirPath, data.children)
        setFileTree(updatedTree)
      }
    } catch (err) {
      console.error('Failed to load directory:', err)
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev)
        next.delete(dirPath)
        return next
      })
    }
  }, [showHidden, setFileTree, updateTreeNode])

  // Initial load - run once on mount, skip if data already exists in context
  useEffect(() => {
    // If data already exists in context, just expand the root and skip fetch
    if (fileTree && fileTree.children && fileTree.children.length > 0) {
      if (expandedFolders.size === 0 && fileTree.path) {
        setExpandedFolders(new Set([fileTree.path]))
      }
      return
    }

    // Skip if already fetching
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    let cancelled = false

    const doFetch = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          path: basePath,
          depth: maxDepth.toString(),
          showHidden: showHidden.toString(),
        })
        const response = await fetch(`/api/files/tree?${params}`)

        if (cancelled) return

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load file tree')
        }

        const data = await response.json()
        if (cancelled) return

        setFileTree(data)
        setFileTreePath(data.path)
        setExpandedFolders(new Set([data.path]))
      } catch (err: unknown) {
        if (cancelled) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
        setError(errorMessage)
        hasFetchedRef.current = false
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    doFetch()

    return () => {
      cancelled = true
      // Reset on cleanup so Strict Mode double-invoke works
      hasFetchedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle pending navigation from context
  useEffect(() => {
    if (!pendingTreeNavigation) return

    const navigateToPath = async () => {
      setCurrentPath(pendingTreeNavigation)
      clearPendingNavigation()
      hasFetchedRef.current = false // Allow new fetch for navigation

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          path: pendingTreeNavigation,
          depth: maxDepth.toString(),
          showHidden: showHidden.toString(),
        })
        const response = await fetch(`/api/files/tree?${params}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load file tree')
        }

        const data = await response.json()
        setFileTree(data)
        setFileTreePath(data.path)
        setExpandedFolders(new Set([data.path]))
        hasFetchedRef.current = true
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    navigateToPath()
  }, [pendingTreeNavigation, clearPendingNavigation, maxDepth, showHidden, setFileTree, setFileTreePath])

  // Toggle folder expansion with lazy loading
  const toggleFolder = useCallback((path: string, hasChildren: boolean) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        // Lazy load if children are empty
        if (!hasChildren) {
          fetchDirectoryChildren(path, fileTree)
        }
      }
      return next
    })
  }, [fetchDirectoryChildren, fileTree])

  // Handle file/folder click
  const handleNodeClick = useCallback((node: FileNode) => {
    setSelectedPath(node.path)

    if (node.type === 'directory') {
      toggleFolder(node.path, !!(node.children && node.children.length > 0))
    } else {
      openFile(node.path)
    }
  }, [toggleFolder, openFile])

  // Get icon for file based on extension and Claude type
  const getFileIcon = useCallback((fileName: string, filePath: string) => {
    // Check for Claude file types first
    const claudeType = getClaudeFileType(fileName, filePath)
    if (claudeType) {
      const colorClass = claudeFileColors[claudeType]?.tailwind || ''
      return <FileText className={cn('h-4 w-4 flex-shrink-0', colorClass)} />
    }

    // Fall back to extension-based icons
    const ext = fileName.split('.').pop()?.toLowerCase()
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'vue', 'rs', 'go']
    const docExts = ['md', 'txt', 'doc', 'docx', 'pdf', 'rtf']
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp']
    const jsonExts = ['json', 'jsonc', 'json5']
    const videoExts = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'mkv', 'm4v']
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'wma']

    if (codeExts.includes(ext || '')) return <FileCode className="h-4 w-4 flex-shrink-0 text-green-400" />
    if (docExts.includes(ext || '')) return <FileText className="h-4 w-4 flex-shrink-0 text-blue-400" />
    if (imageExts.includes(ext || '')) return <Image className="h-4 w-4 flex-shrink-0 text-yellow-400" />
    if (jsonExts.includes(ext || '')) return <FileJson className="h-4 w-4 flex-shrink-0 text-orange-400" />
    if (videoExts.includes(ext || '')) return <Video className="h-4 w-4 flex-shrink-0 text-purple-400" />
    if (audioExts.includes(ext || '')) return <Music className="h-4 w-4 flex-shrink-0 text-pink-400" />

    return <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
  }, [])

  // Get folder icon with Claude coloring
  const getFolderIcon = useCallback((folderName: string, folderPath: string, isExpanded: boolean) => {
    const claudeType = getClaudeFileType(folderName, folderPath)
    const colorClass = claudeType
      ? claudeFileColors[claudeType]?.tailwind || 'text-yellow-400'
      : 'text-yellow-400'

    return isExpanded
      ? <FolderOpen className={cn('h-4 w-4 flex-shrink-0', colorClass)} />
      : <Folder className={cn('h-4 w-4 flex-shrink-0', colorClass)} />
  }, [])

  // Get text color for file name
  const getTextColor = useCallback((name: string, path: string): string => {
    const claudeType = getClaudeFileType(name, path)
    if (claudeType && claudeType !== 'prompt') {
      return claudeFileColors[claudeType]?.tailwind || ''
    }
    return ''
  }, [])

  // Render a single tree node
  const renderNode = useCallback((node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedPath === node.path
    const isDirectory = node.type === 'directory'
    const isLoading = loadingFolders.has(node.path)
    const hasChildren = !!(node.children && node.children.length > 0)
    const textColor = getTextColor(node.name, node.path)

    if (isDirectory) {
      return (
        <Collapsible
          key={node.path}
          open={isExpanded}
          onOpenChange={() => toggleFolder(node.path, hasChildren)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
                'hover:bg-primary/10',
                isSelected && 'bg-primary/20 text-primary'
              )}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => handleNodeClick(node)}
              title={node.path}
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </span>
              {getFolderIcon(node.name, node.path, isExpanded)}
              <span className={cn('truncate font-medium', textColor)}>
                {node.name}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    // File node
    return (
      <button
        key={node.path}
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
          'hover:bg-primary/10',
          isSelected && 'bg-primary/20 text-primary'
        )}
        style={{ paddingLeft: `${depth * 12 + 8 + 16}px` }}
        onClick={() => handleNodeClick(node)}
        title={node.path}
      >
        {getFileIcon(node.name, node.path)}
        <span className={cn('truncate', textColor)}>
          {node.name}
        </span>
      </button>
    )
  }, [expandedFolders, selectedPath, loadingFolders, toggleFolder, handleNodeClick, getFolderIcon, getFileIcon, getTextColor])

  // Refresh handler for manual refresh button
  const handleRefresh = useCallback(async () => {
    hasFetchedRef.current = false
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        path: currentPath,
        depth: maxDepth.toString(),
        showHidden: showHidden.toString(),
      })
      const response = await fetch(`/api/files/tree?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load file tree')
      }

      const data = await response.json()
      setFileTree(data)
      setFileTreePath(data.path)
      setExpandedFolders(new Set([data.path]))
      hasFetchedRef.current = true
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentPath, maxDepth, showHidden, setFileTree, setFileTreePath])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h3 className="text-sm font-semibold terminal-glow">Files</h3>
        <button
          onClick={handleRefresh}
          className="rounded p-1 hover:bg-muted transition-colors"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1">
        <div ref={treeRef} className="p-2">
          {loading && !fileTree && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="px-3 py-4 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && fileTree && renderNode(fileTree)}

          {!loading && !error && !fileTree && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No files found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
