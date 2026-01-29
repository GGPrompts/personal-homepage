'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
  ChevronsUpDown,
  ChevronsDownUp,
  Home,
} from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFilesContext, FileNode } from '@/app/contexts/FilesContext'
import { getClaudeFileType, claudeFileColors } from '@/lib/claudeFileTypes'
import { FileTreeContextMenu } from './FileTreeContextMenu'
import { cn } from '@/lib/utils'

// Git status types
type GitStatus = 'staged' | 'modified' | 'untracked'

interface GitStatusInfo {
  status: GitStatus
  indexStatus: string
  workTreeStatus: string
}

interface GitStatusMap {
  [path: string]: GitStatusInfo
}

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
  const [focusedPath, setFocusedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState(basePath)
  const treeRef = useRef<HTMLDivElement>(null)
  const hasFetchedRef = useRef(false)

  // Git status state
  const [gitStatus, setGitStatus] = useState<GitStatusMap>({})
  const [isGitRepo, setIsGitRepo] = useState(false)

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

  // Fetch git status for the current directory
  const fetchGitStatus = useCallback(async (path?: string) => {
    const targetPath = path || currentPath
    try {
      const response = await fetch(
        `/api/files/git-status?${new URLSearchParams({ path: targetPath })}`
      )
      if (response.ok) {
        const data = await response.json()
        setIsGitRepo(data.isGitRepo)
        setGitStatus(data.files || {})
      }
    } catch (err) {
      // Silently fail - git status is optional enhancement
      console.debug('[FileTree] Git status fetch failed:', err)
    }
  }, [currentPath])

  // Initial load - run once on mount, skip if data already exists in context
  useEffect(() => {
    // If data already exists in context, just expand the root and skip fetch
    if (fileTree && fileTree.children && fileTree.children.length > 0) {
      if (expandedFolders.size === 0 && fileTree.path) {
        setExpandedFolders(new Set([fileTree.path]))
      }
      // Still fetch git status for existing tree
      fetchGitStatus(fileTree.path)
      return
    }

    // Skip if there's a pending navigation - let the navigation effect handle loading
    if (pendingTreeNavigation) return

    // Skip if navigation has already happened (currentPath differs from basePath)
    // This prevents race condition when fetchGitStatus changes due to navigation
    if (currentPath !== basePath) return

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

        // Fetch git status after tree loads
        fetchGitStatus(data.path)
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
  }, [fetchGitStatus])

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

        // Fetch git status for new location
        fetchGitStatus(pendingTreeNavigation)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    navigateToPath()
  }, [pendingTreeNavigation, clearPendingNavigation, maxDepth, showHidden, setFileTree, setFileTreePath, fetchGitStatus])

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

  // Get git status indicator for a file
  const getGitStatusIndicator = useCallback((filePath: string) => {
    const status = gitStatus[filePath]
    if (!status) return null

    // Color-coded dot indicator
    const colors = {
      staged: 'bg-blue-400',     // Blue for staged
      modified: 'bg-yellow-400', // Yellow for modified
      untracked: 'bg-green-400', // Green for untracked
    }

    const titles = {
      staged: 'Staged for commit',
      modified: 'Modified',
      untracked: 'Untracked',
    }

    return (
      <span
        className={cn('w-2 h-2 rounded-full ml-1 flex-shrink-0', colors[status.status])}
        title={titles[status.status]}
      />
    )
  }, [gitStatus])

  // Check if a directory has any modified files (for subtle folder indicator)
  const getFolderGitStatus = useCallback((folderPath: string): GitStatus | null => {
    // Check if any files under this folder have git status
    // Return the "most important" status (staged > modified > untracked)
    for (const [filePath, info] of Object.entries(gitStatus)) {
      if (filePath.startsWith(folderPath + '/')) {
        if (info.status === 'staged') return 'staged'
      }
    }
    for (const [filePath, info] of Object.entries(gitStatus)) {
      if (filePath.startsWith(folderPath + '/')) {
        if (info.status === 'modified') return 'modified'
      }
    }
    for (const [filePath, info] of Object.entries(gitStatus)) {
      if (filePath.startsWith(folderPath + '/')) {
        if (info.status === 'untracked') return 'untracked'
      }
    }
    return null
  }, [gitStatus])

  // Handle drag start for file/folder nodes
  const handleDragStart = useCallback((e: React.DragEvent, node: FileNode) => {
    // Set plain text data (file path)
    e.dataTransfer.setData('text/plain', node.path)
    // Set custom MIME type for TabzChrome integration
    e.dataTransfer.setData('application/x-tabz-file-path', node.path)
    // Include whether it's a directory
    e.dataTransfer.setData('application/x-tabz-file-type', node.type)
    e.dataTransfer.effectAllowed = 'copyMove'
  }, [])

  // Get folder git status indicator
  const getFolderGitStatusIndicator = useCallback((folderPath: string) => {
    const status = getFolderGitStatus(folderPath)
    if (!status) return null

    const colors = {
      staged: 'bg-blue-400/50',     // Softer blue for folders
      modified: 'bg-yellow-400/50', // Softer yellow for folders
      untracked: 'bg-green-400/50', // Softer green for folders
    }

    const titles = {
      staged: 'Contains staged files',
      modified: 'Contains modified files',
      untracked: 'Contains untracked files',
    }

    return (
      <span
        className={cn('w-1.5 h-1.5 rounded-full ml-1 flex-shrink-0', colors[status])}
        title={titles[status]}
      />
    )
  }, [getFolderGitStatus])

  // Flatten visible items for keyboard navigation (respects expanded folders)
  const visibleItems = useMemo(() => {
    const items: FileNode[] = []
    const collectVisible = (node: FileNode) => {
      items.push(node)
      if (node.type === 'directory' && expandedFolders.has(node.path) && node.children) {
        node.children.forEach(collectVisible)
      }
    }
    if (fileTree) {
      collectVisible(fileTree)
    }
    return items
  }, [fileTree, expandedFolders])

  // Collect all directory paths for expand/collapse all
  const allDirectoryPaths = useMemo(() => {
    const paths: string[] = []
    const collectDirs = (node: FileNode) => {
      if (node.type === 'directory') {
        paths.push(node.path)
        node.children?.forEach(collectDirs)
      }
    }
    if (fileTree) {
      collectDirs(fileTree)
    }
    return paths
  }, [fileTree])

  // Expand all directories
  const handleExpandAll = useCallback(() => {
    setExpandedFolders(new Set(allDirectoryPaths))
  }, [allDirectoryPaths])

  // Collapse all except root
  const handleCollapseAll = useCallback(() => {
    if (fileTree) {
      setExpandedFolders(new Set([fileTree.path]))
    } else {
      setExpandedFolders(new Set())
    }
  }, [fileTree])

  // Parse path into breadcrumb segments
  const breadcrumbSegments = useMemo(() => {
    if (!fileTree?.path) return []

    const path = fileTree.path
    // Handle home directory
    if (path === '~') {
      return [{ name: '~', path: '~' }]
    }

    // Split path and build segments
    const parts = path.split('/').filter(Boolean)
    const segments: { name: string; path: string }[] = []

    // Check if it's an absolute path
    const isAbsolute = path.startsWith('/')

    let currentPath = isAbsolute ? '' : ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = isAbsolute ? `${currentPath}/${part}` : (currentPath ? `${currentPath}/${part}` : part)
      segments.push({
        name: i === 0 && part === 'home' ? '~' : part,
        path: currentPath,
      })
    }

    return segments
  }, [fileTree?.path])

  // Navigate to a breadcrumb path
  const handleBreadcrumbClick = useCallback((path: string) => {
    if (path === fileTree?.path) return

    // Use the pending navigation mechanism from context
    setCurrentPath(path)
    hasFetchedRef.current = false

    setLoading(true)
    setError(null)

    const doNavigate = async () => {
      try {
        const params = new URLSearchParams({
          path,
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

        // Fetch git status for new location
        fetchGitStatus(path)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    doNavigate()
  }, [fileTree?.path, maxDepth, showHidden, setFileTree, setFileTreePath, fetchGitStatus])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (visibleItems.length === 0) return

    const currentIndex = focusedPath
      ? visibleItems.findIndex(item => item.path === focusedPath)
      : -1

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const nextIndex = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0
        setFocusedPath(visibleItems[nextIndex].path)
        setSelectedPath(visibleItems[nextIndex].path)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1
        setFocusedPath(visibleItems[prevIndex].path)
        setSelectedPath(visibleItems[prevIndex].path)
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        if (currentIndex >= 0) {
          const currentItem = visibleItems[currentIndex]
          if (currentItem.type === 'directory' && !expandedFolders.has(currentItem.path)) {
            toggleFolder(currentItem.path, !!(currentItem.children && currentItem.children.length > 0))
          }
        }
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        if (currentIndex >= 0) {
          const currentItem = visibleItems[currentIndex]
          if (currentItem.type === 'directory' && expandedFolders.has(currentItem.path)) {
            toggleFolder(currentItem.path, !!(currentItem.children && currentItem.children.length > 0))
          }
        }
        break
      }
      case 'Enter': {
        e.preventDefault()
        if (currentIndex >= 0) {
          const currentItem = visibleItems[currentIndex]
          handleNodeClick(currentItem)
        }
        break
      }
      case 'Home': {
        e.preventDefault()
        if (visibleItems.length > 0) {
          setFocusedPath(visibleItems[0].path)
          setSelectedPath(visibleItems[0].path)
        }
        break
      }
      case 'End': {
        e.preventDefault()
        if (visibleItems.length > 0) {
          const lastItem = visibleItems[visibleItems.length - 1]
          setFocusedPath(lastItem.path)
          setSelectedPath(lastItem.path)
        }
        break
      }
    }
  }, [visibleItems, focusedPath, expandedFolders, toggleFolder, handleNodeClick])

  // Render a single tree node
  const renderNode = useCallback((node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedPath === node.path
    const isFocused = focusedPath === node.path
    const isDirectory = node.type === 'directory'
    const isLoading = loadingFolders.has(node.path)
    const hasChildren = !!(node.children && node.children.length > 0)
    const textColor = getTextColor(node.name, node.path)

    if (isDirectory) {
      return (
        <Collapsible
          key={node.path}
          open={isExpanded}
        >
          <FileTreeContextMenu
            path={node.path}
            name={node.name}
            isDirectory={true}
            source="local"
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors cursor-grab active:cursor-grabbing',
                  'hover:bg-primary/10',
                  isSelected && 'bg-primary/20 text-primary',
                  isFocused && 'ring-2 ring-primary/50 ring-inset'
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => {
                  setFocusedPath(node.path)
                  handleNodeClick(node)
                }}
                title={node.path}
                draggable
                onDragStart={(e) => handleDragStart(e, node)}
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
                {getFolderGitStatusIndicator(node.path)}
              </button>
            </CollapsibleTrigger>
          </FileTreeContextMenu>
          <CollapsibleContent>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    // File node
    return (
      <FileTreeContextMenu
        key={node.path}
        path={node.path}
        name={node.name}
        isDirectory={false}
        source="local"
      >
        <button
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors cursor-grab active:cursor-grabbing',
            'hover:bg-primary/10',
            isSelected && 'bg-primary/20 text-primary',
            isFocused && 'ring-2 ring-primary/50 ring-inset'
          )}
          style={{ paddingLeft: `${depth * 12 + 8 + 16}px` }}
          onClick={() => {
            setFocusedPath(node.path)
            handleNodeClick(node)
          }}
          title={node.path}
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
        >
          {getFileIcon(node.name, node.path)}
          <span className={cn('truncate', textColor)}>
            {node.name}
          </span>
          {getGitStatusIndicator(node.path)}
        </button>
      </FileTreeContextMenu>
    )
  }, [expandedFolders, selectedPath, focusedPath, loadingFolders, toggleFolder, handleNodeClick, getFolderIcon, getFileIcon, getTextColor, getGitStatusIndicator, getFolderGitStatusIndicator, handleDragStart])

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

      // Refresh git status too
      fetchGitStatus(data.path)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentPath, maxDepth, showHidden, setFileTree, setFileTreePath, fetchGitStatus])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h3 className="text-sm font-semibold terminal-glow">Files</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpandAll}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Expand All"
            disabled={loading}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
          <button
            onClick={handleCollapseAll}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Collapse All"
            disabled={loading}
          >
            <ChevronsDownUp className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {breadcrumbSegments.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground border-b border-border/30 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => handleBreadcrumbClick('~')}
            className="hover:text-foreground transition-colors flex-shrink-0"
            title="Home"
          >
            <Home className="h-3.5 w-3.5" />
          </button>
          {breadcrumbSegments.map((segment, index) => {
            const isLast = index === breadcrumbSegments.length - 1
            const isHome = segment.name === '~'
            // Skip the home segment since we already have the home icon
            if (isHome && breadcrumbSegments.length > 1) return null

            return (
              <React.Fragment key={segment.path}>
                {(index > 0 || !isHome) && (
                  <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-50" />
                )}
                <button
                  onClick={() => !isLast && handleBreadcrumbClick(segment.path)}
                  className={cn(
                    'truncate max-w-[120px] transition-colors flex-shrink-0',
                    isLast
                      ? 'text-foreground font-medium cursor-default'
                      : 'hover:text-foreground cursor-pointer'
                  )}
                  title={segment.path}
                  disabled={isLast}
                >
                  {segment.name}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Tree content */}
      <ScrollArea className="flex-1">
        <div
          ref={treeRef}
          className="p-2 outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
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
