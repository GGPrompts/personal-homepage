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
  RefreshCw,
  Loader2,
  ExternalLink,
  Github,
  User,
  AlertCircle,
  GitBranch,
} from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useFilesContext } from '@/app/contexts/FilesContext'
import { useAuth } from '@/components/AuthProvider'
import { AuthModal } from '@/components/AuthModal'
import { RepoSelector } from '@/components/RepoSelector'
import { getClaudeFileType, claudeFileColors } from '@/lib/claudeFileTypes'
import { FileTreeContextMenu } from './FileTreeContextMenu'
import {
  getContents,
  getDefaultBranch,
  type GitHubFile,
} from '@/lib/github'
import { cn } from '@/lib/utils'

interface GitHubFileTreeNode extends GitHubFile {
  children?: GitHubFileTreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
}

interface GitHubFileTreeProps {
  className?: string
  onFileSelect?: (path: string, sha: string, name: string) => void
}

export function GitHubFileTree({ className, onFileSelect }: GitHubFileTreeProps) {
  const { user, getGitHubToken } = useAuth()
  const { openFile } = useFilesContext()

  // GitHub config
  const [token, setToken] = useState<string | null>(null)
  const [repo, setRepo] = useState<string | null>(null)
  const [defaultBranch, setDefaultBranch] = useState<string>('main')
  const [showAuthModal, setShowAuthModal] = useState(false)

  // UI state
  const [rootFiles, setRootFiles] = useState<GitHubFileTreeNode[] | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']))
  const [directoryContents, setDirectoryContents] = useState<Map<string, GitHubFileTreeNode[]>>(new Map())
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  // Load token from auth, repo from localStorage
  useEffect(() => {
    const loadToken = async () => {
      const authToken = await getGitHubToken()
      setToken(authToken)
    }
    loadToken()

    const savedRepo = localStorage.getItem('github-notes-repo')
    setRepo(savedRepo)
  }, [user, getGitHubToken])

  // Fetch default branch when repo changes
  useEffect(() => {
    if (!token || !repo) return

    const fetchBranch = async () => {
      try {
        const branch = await getDefaultBranch(token, repo)
        setDefaultBranch(branch)
      } catch {
        setDefaultBranch('main')
      }
    }
    fetchBranch()
  }, [token, repo])

  // Handle repo change
  const handleRepoChange = useCallback((newRepo: string) => {
    setRepo(newRepo)
    localStorage.setItem('github-notes-repo', newRepo)
    // Clear state when switching repos
    setRootFiles(null)
    setDirectoryContents(new Map())
    setExpandedPaths(new Set(['']))
    setSelectedPath(null)
    hasFetchedRef.current = false
  }, [])

  // Fetch root directory
  useEffect(() => {
    if (!token || !repo) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    let cancelled = false

    const fetchRoot = async () => {
      setLoading(true)
      setError(null)

      try {
        const contents = await getContents(token, repo, '')
        if (cancelled) return

        const nodes: GitHubFileTreeNode[] = contents.map(file => ({
          ...file,
          isExpanded: false,
          isLoading: false,
        }))
        setRootFiles(nodes)
      } catch (err) {
        if (cancelled) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
        setError(errorMessage)
        hasFetchedRef.current = false
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRoot()

    return () => {
      cancelled = true
      hasFetchedRef.current = false
    }
  }, [token, repo])

  // Fetch directory children
  const fetchDirectoryChildren = useCallback(async (dirPath: string) => {
    if (!token || !repo) return

    setLoadingPaths(prev => new Set(prev).add(dirPath))

    try {
      const contents = await getContents(token, repo, dirPath)
      const nodes: GitHubFileTreeNode[] = contents.map(file => ({
        ...file,
        isExpanded: false,
        isLoading: false,
      }))
      setDirectoryContents(prev => new Map(prev).set(dirPath, nodes))
    } catch (err) {
      console.error('Failed to load directory:', err)
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev)
        next.delete(dirPath)
        return next
      })
    }
  }, [token, repo])

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string, hasChildren: boolean) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        if (!hasChildren) {
          fetchDirectoryChildren(path)
        }
      }
      return next
    })
  }, [fetchDirectoryChildren])

  // Check if file is markdown
  const isMarkdownFile = useCallback((name: string): boolean => {
    return name.toLowerCase().endsWith('.md')
  }, [])

  // Get file icon with Claude coloring
  const getFileIcon = useCallback((fileName: string, filePath: string) => {
    const claudeType = getClaudeFileType(fileName, filePath)
    if (claudeType) {
      const colorClass = claudeFileColors[claudeType]?.tailwind || ''
      return <FileText className={cn('h-4 w-4 flex-shrink-0', colorClass)} />
    }

    const ext = fileName.split('.').pop()?.toLowerCase()
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'vue', 'rs', 'go']
    const docExts = ['md', 'txt', 'doc', 'docx', 'pdf', 'rtf']
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp']
    const jsonExts = ['json', 'jsonc', 'json5']

    if (codeExts.includes(ext || '')) return <FileCode className="h-4 w-4 flex-shrink-0 text-green-400" />
    if (docExts.includes(ext || '')) return <FileText className="h-4 w-4 flex-shrink-0 text-blue-400" />
    if (imageExts.includes(ext || '')) return <Image className="h-4 w-4 flex-shrink-0 text-yellow-400" />
    if (jsonExts.includes(ext || '')) return <FileJson className="h-4 w-4 flex-shrink-0 text-orange-400" />

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

  // Handle file/folder click
  const handleNodeClick = useCallback((node: GitHubFileTreeNode) => {
    setSelectedPath(node.path)

    if (node.type === 'dir') {
      const hasChildren = directoryContents.has(node.path) && directoryContents.get(node.path)!.length > 0
      toggleFolder(node.path, hasChildren)
    } else if (isMarkdownFile(node.name)) {
      // For markdown files, emit selection for the GitHub viewer
      onFileSelect?.(node.path, node.sha, node.name)
    } else if (repo) {
      // For non-markdown files, open on GitHub
      window.open(`https://github.com/${repo}/blob/${defaultBranch}/${node.path}`, '_blank')
    }
  }, [toggleFolder, directoryContents, isMarkdownFile, onFileSelect, repo, defaultBranch])

  // Render a single tree node
  const renderNode = useCallback((node: GitHubFileTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path)
    const isSelected = selectedPath === node.path
    const isDirectory = node.type === 'dir'
    const isLoading = loadingPaths.has(node.path)
    const children = directoryContents.get(node.path)
    const hasChildren = children && children.length > 0
    const textColor = getTextColor(node.name, node.path)
    const isMarkdown = isMarkdownFile(node.name)

    if (isDirectory) {
      return (
        <Collapsible key={node.path} open={isExpanded}>
          <FileTreeContextMenu
            path={node.path}
            name={node.name}
            isDirectory={true}
            source="github"
            repo={repo || undefined}
            branch={defaultBranch}
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
          </FileTreeContextMenu>
          <CollapsibleContent>
            {children?.map(child => renderNode(child, depth + 1))}
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
        source="github"
        repo={repo || undefined}
        branch={defaultBranch}
      >
        <button
          className={cn(
            'group flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
            'hover:bg-primary/10',
            isSelected && 'bg-primary/20 text-primary'
          )}
          style={{ paddingLeft: `${depth * 12 + 8 + 16}px` }}
          onClick={() => handleNodeClick(node)}
          title={node.path}
        >
          {getFileIcon(node.name, node.path)}
          <span className={cn('truncate flex-1', textColor, !isMarkdown && 'text-muted-foreground')}>
            {node.name}
          </span>
          {!isMarkdown && (
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
          )}
        </button>
      </FileTreeContextMenu>
    )
  }, [expandedPaths, selectedPath, loadingPaths, directoryContents, getFileIcon, getFolderIcon, getTextColor, handleNodeClick, isMarkdownFile, repo, defaultBranch])

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    hasFetchedRef.current = false
    setRootFiles(null)
    setDirectoryContents(new Map())
    setExpandedPaths(new Set(['']))
    setLoading(true)
    setError(null)

    try {
      if (!token || !repo) return
      const contents = await getContents(token, repo, '')
      const nodes: GitHubFileTreeNode[] = contents.map(file => ({
        ...file,
        isExpanded: false,
        isLoading: false,
      }))
      setRootFiles(nodes)
      hasFetchedRef.current = true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [token, repo])

  // No config message
  if (!user) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <h3 className="text-sm font-semibold terminal-glow flex items-center gap-1.5">
            <Github className="h-4 w-4" />
            GitHub
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <User className="h-8 w-8 text-primary mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">Sign in to browse GitHub</p>
            <p className="text-xs text-muted-foreground mb-4">
              Access your repositories
            </p>
            <Button
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="bg-[#24292e] hover:bg-[#24292e]/90 text-white"
            >
              <Github className="h-4 w-4 mr-2" />
              Sign in
            </Button>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    )
  }

  if (!repo) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <h3 className="text-sm font-semibold terminal-glow flex items-center gap-1.5">
            <Github className="h-4 w-4" />
            GitHub
          </h3>
        </div>
        <div className="flex-1 flex flex-col p-4">
          <div className="text-center mb-4">
            <AlertCircle className="h-8 w-8 text-primary mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">Select a repository</p>
            <p className="text-xs text-muted-foreground mb-4">
              Choose a repo to browse files
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              Repository
            </label>
            <RepoSelector
              value=""
              onValueChange={handleRepoChange}
              token={token || ''}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h3 className="text-sm font-semibold terminal-glow flex items-center gap-1.5">
          <Github className="h-4 w-4" />
          GitHub
        </h3>
        <button
          onClick={handleRefresh}
          className="rounded p-1 hover:bg-muted transition-colors"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Repo selector */}
      <div className="px-3 py-2 border-b border-border/50">
        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          Repository
        </label>
        <RepoSelector
          value={repo}
          onValueChange={handleRepoChange}
          token={token || ''}
        />
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading && !rootFiles && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="px-3 py-4 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && rootFiles && rootFiles.map(node => renderNode(node))}

          {!loading && !error && !rootFiles && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No files found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Repo link */}
      <div className="px-3 py-2 border-t border-border/50">
        <a
          href={`https://github.com/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <Github className="h-3 w-3" />
          <span className="truncate flex-1">{repo}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

export default GitHubFileTree
