'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  FileText,
  FileCode,
  Folder,
  FolderOpen,
  Zap,
  Bot,
  Terminal,
  Plug,
  FileJson,
  Star,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { FileFilter, ClaudeFileType, claudeFileColors, getClaudeFileType } from '@/lib/claudeFileTypes'
import { useFilesContext, TreeNode, FilteredTree, FilteredFilesResponse } from '@/app/contexts/FilesContext'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

// Get icon for Claude file types
function getClaudeIcon(claudeType: ClaudeFileType) {
  switch (claudeType) {
    case 'claude-config': return Bot
    case 'prompt': return FileText
    case 'skill': return Zap
    case 'agent': return Bot
    case 'hook': return Terminal
    case 'mcp': return Plug
    case 'command': return FileCode
    case 'plugin': return FileJson
    default: return null
  }
}

// Get file icon based on name and path
function getFileIcon(fileName: string, filePath: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()

  // Extension-based icons first
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'vue', 'rs', 'go', 'sh']
  const jsonExts = ['json', 'jsonc', 'json5']
  const yamlExts = ['yaml', 'yml']

  if (ext === 'prompty') return <FileText className="w-4 h-4 text-pink-400" />
  if (ext === 'md') return <FileText className="w-4 h-4 text-blue-400" />
  if (ext === 'txt') return <FileText className="w-4 h-4 text-gray-400" />
  if (yamlExts.includes(ext || '')) return <FileJson className="w-4 h-4 text-amber-400" />
  if (jsonExts.includes(ext || '')) return <FileJson className="w-4 h-4 text-orange-400" />
  if (codeExts.includes(ext || '')) return <FileCode className="w-4 h-4 text-green-400" />

  // Check Claude file types for special files
  const claudeType = getClaudeFileType(fileName, filePath)
  if (claudeType && claudeType !== 'prompt') {
    const ClaudeIcon = getClaudeIcon(claudeType)
    if (ClaudeIcon) {
      const colorClass = claudeFileColors[claudeType]?.tailwind || ''
      return <ClaudeIcon className={`w-4 h-4 ${colorClass}`} />
    }
  }

  return <File className="w-4 h-4" />
}

// Get folder icon
function getFolderIcon(folderName: string, folderPath: string, isExpanded: boolean) {
  const claudeType = getClaudeFileType(folderName, folderPath)
  if (claudeType && ['skill', 'agent', 'hook', 'command', 'mcp', 'claude-config'].includes(claudeType)) {
    const colorClass = claudeFileColors[claudeType]?.tailwind || 'text-yellow-400'
    return isExpanded
      ? <FolderOpen className={`w-4 h-4 ${colorClass}`} />
      : <Folder className={`w-4 h-4 ${colorClass}`} />
  }
  return isExpanded
    ? <FolderOpen className="w-4 h-4 text-yellow-400" />
    : <Folder className="w-4 h-4 text-yellow-400" />
}

// Get text color for files
function getTextColorClass(name: string, path: string, isDirectory: boolean): string {
  if (isDirectory) return ''

  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'prompty') return ''
  if (ext === 'md') return 'text-blue-400'
  if (ext === 'yaml' || ext === 'yml') return 'text-amber-400'
  if (ext === 'json') return 'text-orange-400'

  const claudeType = getClaudeFileType(name, path)
  if (claudeType && claudeType !== 'prompt') {
    return claudeFileColors[claudeType]?.tailwind || ''
  }
  return ''
}

// Mini tree component for rendering a source tree
function MiniTree({
  node,
  depth,
  expandedPaths,
  toggleExpand,
  onFileSelect,
  selectedPath,
  isFavorite,
  toggleFavorite,
}: {
  node: TreeNode
  depth: number
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
  onFileSelect: (path: string) => void
  selectedPath: string | null
  isFavorite: (path: string) => boolean
  toggleFavorite: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const isDirectory = node.type === 'directory'
  const textColorClass = getTextColorClass(node.name, node.path, isDirectory)
  const isNodeFavorite = isFavorite(node.path)

  return (
    <div>
      <div
        className={cn(
          'group flex items-center py-1 px-2 cursor-pointer hover:bg-muted/50 rounded',
          isSelected && 'bg-primary/20 text-primary'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isDirectory) {
            toggleExpand(node.path)
          } else {
            onFileSelect(node.path)
          }
        }}
        title={node.path}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground">
          {isDirectory && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        </span>
        <span className="mr-2">
          {isDirectory
            ? getFolderIcon(node.name, node.path, isExpanded)
            : getFileIcon(node.name, node.path)}
        </span>
        <span className={cn('text-sm truncate flex-1', isDirectory && 'font-medium', textColorClass)}>
          {node.name}
        </span>
        {/* Favorite star */}
        <button
          className={cn(
            'p-0.5 rounded hover:bg-muted/50 transition-opacity',
            isNodeFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(node.path)
          }}
          title={isNodeFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={cn('w-3 h-3', isNodeFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')}
          />
        </button>
      </div>
      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <MiniTree
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Collapsible section for each source
function TreeSection({
  source,
  onFileSelect,
  selectedPath,
  startCollapsed = false,
  isFavorite,
  toggleFavorite,
  expandAllTrigger,
  collapseAllTrigger,
}: {
  source: FilteredTree
  onFileSelect: (path: string) => void
  selectedPath: string | null
  startCollapsed?: boolean
  isFavorite: (path: string) => boolean
  toggleFavorite: (path: string) => void
  expandAllTrigger?: number
  collapseAllTrigger?: number
}) {
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    return startCollapsed ? new Set() : new Set([source.tree.path])
  })

  // Collect all folder paths recursively
  const collectAllFolderPaths = useCallback((node: TreeNode): string[] => {
    const paths: string[] = []
    if (node.type === 'directory') {
      paths.push(node.path)
      if (node.children) {
        node.children.forEach(child => {
          paths.push(...collectAllFolderPaths(child))
        })
      }
    }
    return paths
  }, [])

  // Handle expand all trigger from parent
  React.useEffect(() => {
    if (expandAllTrigger && expandAllTrigger > 0) {
      setIsCollapsed(false)
      const allPaths = collectAllFolderPaths(source.tree)
      setExpandedPaths(new Set(allPaths))
    }
  }, [expandAllTrigger, source.tree, collectAllFolderPaths])

  // Handle collapse all trigger from parent
  React.useEffect(() => {
    if (collapseAllTrigger && collapseAllTrigger > 0) {
      setExpandedPaths(new Set([source.tree.path]))
    }
  }, [collapseAllTrigger, source.tree.path])

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  // Icon mapping
  const getSourceIcon = (icon: string) => {
    switch (icon) {
      case 'globe': return '🌐'
      case 'folder': return '📁'
      case 'zap': return '⚡'
      case 'file': return '📄'
      case 'plug': return '🔌'
      default: return icon || '📂'
    }
  }

  return (
    <div className="mb-2">
      {/* Section header */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/30 rounded-md bg-muted/10"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="text-muted-foreground">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
        <span>{getSourceIcon(source.icon)}</span>
        <span className="text-sm font-medium">{source.name}</span>
      </div>

      {/* Tree content */}
      {!isCollapsed && (
        <div className="mt-1">
          {source.tree.children?.map((child) => (
            <MiniTree
              key={child.path}
              node={child}
              depth={0}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          ))}
          {/* If root has no children but is a file itself */}
          {!source.tree.children && source.tree.type === 'file' && (
            <MiniTree
              node={source.tree}
              depth={0}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface FilteredFileListProps {
  filter: FileFilter
  filteredFiles: FilteredFilesResponse | null
  loading: boolean
  onFileSelect: (path: string) => void
  onRefresh?: () => void
}

export function FilteredFileList({
  filter,
  filteredFiles,
  loading,
  onFileSelect,
  onRefresh,
}: FilteredFileListProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { toggleFavorite, isFavorite } = useFilesContext()

  // Expand/collapse all triggers
  const [expandAllTrigger, setExpandAllTrigger] = useState(0)
  const [collapseAllTrigger, setCollapseAllTrigger] = useState(0)

  const handleExpandAll = useCallback(() => {
    setExpandAllTrigger(prev => prev + 1)
  }, [])

  const handleCollapseAll = useCallback(() => {
    setCollapseAllTrigger(prev => prev + 1)
  }, [])

  // Filter tree nodes based on search query
  const filterTreeNode = useCallback((node: TreeNode, query: string): TreeNode | null => {
    if (!query) return node

    const queryLower = query.toLowerCase()
    const nameMatches = node.name.toLowerCase().includes(queryLower)

    if (node.type === 'file') {
      return nameMatches ? node : null
    }

    // Directory: filter children and include if any match or name matches
    const filteredChildren = node.children
      ?.map(child => filterTreeNode(child, query))
      .filter((child): child is TreeNode => child !== null)

    if (nameMatches || (filteredChildren && filteredChildren.length > 0)) {
      return { ...node, children: filteredChildren }
    }

    return null
  }, [])

  // Apply search filter to all trees
  const filteredTrees = useMemo(() => {
    if (!filteredFiles?.trees || !searchQuery) return filteredFiles?.trees || []

    return filteredFiles.trees
      .map(source => {
        const filteredTree = filterTreeNode(source.tree, searchQuery)
        if (!filteredTree) return null
        return { ...source, tree: filteredTree }
      })
      .filter((source): source is FilteredTree => source !== null)
  }, [filteredFiles?.trees, searchQuery, filterTreeNode])

  const handleFileSelect = (path: string) => {
    setSelectedPath(path)
    onFileSelect(path)
  }

  // Handle legacy groups format for favorites
  const groups = (filteredFiles as FilteredFilesResponse & { groups?: Array<{ name: string; icon: string; files: Array<{ name: string; path: string; type: string | null }> }> })?.groups || []

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <h3 className="font-semibold text-sm capitalize">{filter} Files</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    )
  }

  const trees = filteredFiles?.trees || []

  if (trees.length === 0 && groups.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <h3 className="font-semibold text-sm capitalize">{filter} Files</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 hover:bg-muted rounded" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
          <div>
            <p>No {filter} files found</p>
            <p className="text-xs mt-1">
              {filter === 'prompts' && 'Create .prompty files in ~/.prompts/ or .prompts/'}
              {filter === 'claude' && 'No Claude config files in this project'}
              {filter === 'favorites' && 'Star files to add them to favorites'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <h3 className="font-semibold text-sm capitalize">{filter} Files</h3>
        <div className="flex gap-1">
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 hover:bg-muted rounded" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleExpandAll} className="p-1.5 hover:bg-muted rounded" title="Expand all">
            <ChevronsUpDown className="w-4 h-4" />
          </button>
          <button onClick={handleCollapseAll} className="p-1.5 hover:bg-muted rounded" title="Collapse all">
            <ChevronsDownUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        )}
      </div>

      {/* Tree sections */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredTrees.map((source) => (
            <TreeSection
              key={source.basePath}
              source={source}
              onFileSelect={handleFileSelect}
              selectedPath={selectedPath}
              startCollapsed={filter === 'favorites'}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              expandAllTrigger={expandAllTrigger}
              collapseAllTrigger={collapseAllTrigger}
            />
          ))}

          {/* Legacy groups format for favorites */}
          {groups.length > 0 && groups.map((group) => (
            <div key={group.name} className="mb-4">
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {group.icon && <span>{group.icon}</span>}
                <span>{group.name}</span>
                <span className="text-muted-foreground/50">({group.files?.length || 0})</span>
              </div>
              <div className="mt-1">
                {group.files?.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleFileSelect(file.path)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded',
                      selectedPath === file.path && 'bg-primary/20 text-primary'
                    )}
                    title={file.path}
                  >
                    {getFileIcon(file.name, file.path)}
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default FilteredFileList
