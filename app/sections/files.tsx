'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Plug,
  HardDrive,
  Github,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Bot,
  Star,
  FolderTree,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilesProvider, useFilesContext } from '@/app/contexts/FilesContext'
import { FileTree } from '@/app/components/files/FileTree'
import { FileViewer } from '@/app/components/files/FileViewer'
import { PluginList } from '@/app/components/files/PluginList'
import { FilteredFileList } from '@/app/components/files/FilteredFileList'
import { GitHubFileTree } from '@/app/components/files/GitHubFileTree'
import { GitHubFileViewer } from '@/app/components/files/GitHubFileViewer'
import { GitTab } from '@/components/git/GitTab'
import { GitGraph } from '@/components/git/GitGraph'
import { useWorkingDirectory } from '@/hooks/useWorkingDirectory'
import { useAuth } from '@/components/AuthProvider'
import { cn } from '@/lib/utils'
import type { FileFilter } from '@/lib/claudeFileTypes'

interface FilesSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
  initialPath?: string | null
  onInitialPathConsumed?: () => void
}

type FileSource = 'local' | 'github' | 'git'

function FilesSectionContent({ activeSubItem, onSubItemHandled, initialPath, onInitialPathConsumed }: FilesSectionProps) {
  const { workingDir } = useWorkingDirectory()
  const { user, getGitHubToken } = useAuth()
  const {
    navigateTreeTo,
    activeFilter,
    setActiveFilter,
    filteredFiles,
    filteredFilesLoading,
    loadFilteredFiles,
    openFile,
    openDiffFile,
    viewerSettings,
    setFontSize,
    setFontFamily,
    setMaxDepth,
    setTreeFontSize,
    setTreeFontFamily,
  } = useFilesContext()
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [showPlugins, setShowPlugins] = useState<boolean>(false)
  const [fileSource, setFileSource] = useState<FileSource>(() => {
    // Check if coming from Projects page with GitHub context
    if (typeof window !== 'undefined') {
      const initialSource = localStorage.getItem('files-initial-source')
      if (initialSource === 'github') {
        localStorage.removeItem('files-initial-source')
        return 'github'
      }
    }
    return 'local'
  })

  // Handle initial path navigation from external sources
  useEffect(() => {
    if (initialPath) {
      navigateTreeTo(initialPath)
      onInitialPathConsumed?.()
    }
  }, [initialPath, navigateTreeTo, onInitialPathConsumed])

  // GitHub state
  const [token, setToken] = useState<string | null>(null)
  const [repo, setRepo] = useState<string | null>(null)
  const [selectedGitHubFile, setSelectedGitHubFile] = useState<{
    path: string
    sha: string
    name: string
  } | null>(null)

  // Git tab state
  const [gitViewMode, setGitViewMode] = useState<'file' | 'graph'>('file')
  const [selectedGitCommit, setSelectedGitCommit] = useState<string | null>(null)

  // Handle Git file selection (from changed files list) — fetch diff and open in DiffViewer
  const handleGitFileSelect = useCallback(async (filePath: string) => {
    setGitViewMode('file')

    // filePath arrives as an absolute path (resolved in GitTab.handleFileSelect)
    // We need the relative path for the git diff API
    const relativePath = filePath.startsWith(workingDir + '/')
      ? filePath.slice(workingDir.length + 1)
      : filePath

    try {
      const res = await fetch(
        `/api/git/diff?${new URLSearchParams({
          path: workingDir,
          file: relativePath,
        })}`
      )
      if (!res.ok) {
        // Fallback: open as normal file if diff fails (e.g. untracked file)
        openFile(filePath)
        return
      }
      const data = await res.json()
      if (data.diff) {
        openDiffFile(filePath, data.diff)
      } else {
        // No diff content (new untracked file, etc.) — open normally
        openFile(filePath)
      }
    } catch {
      // Network error — fall back to normal file open
      openFile(filePath)
    }
  }, [workingDir, openFile, openDiffFile])

  // Handle Git commit selection (from commit log)
  const handleGitCommitSelect = useCallback((sha: string) => {
    setSelectedGitCommit(sha)
  }, [])

  // Handle commit file selection (from CommitDetail) — fetch commit-specific diff
  const handleCommitFileSelect = useCallback(async (commitSha: string, filePath: string) => {
    setGitViewMode('file')

    try {
      const res = await fetch(
        `/api/git/diff?${new URLSearchParams({
          path: workingDir,
          commit: commitSha,
          file: filePath,
        })}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to get diff' }))
        console.error('Commit diff error:', err.error)
        return
      }
      const data = await res.json()
      if (data.diff) {
        // Use a commit-prefixed path so it doesn't collide with working tree diffs
        const displayPath = `${filePath} (${commitSha.substring(0, 7)})`
        openDiffFile(displayPath, data.diff)
      }
    } catch (err) {
      console.error('Failed to fetch commit diff:', err)
    }
  }, [workingDir, openDiffFile])

  // Handle show graph view
  const handleShowGraph = useCallback(() => {
    setGitViewMode('graph')
  }, [])

  // Load token on mount
  React.useEffect(() => {
    const loadToken = async () => {
      const authToken = await getGitHubToken()
      setToken(authToken)
    }
    loadToken()

    const savedRepo = localStorage.getItem('github-notes-repo')
    setRepo(savedRepo)
  }, [user, getGitHubToken])

  // Handle GitHub file selection
  const handleGitHubFileSelect = useCallback((path: string, sha: string, name: string) => {
    setSelectedGitHubFile({ path, sha, name })
  }, [])

  // Handle file deleted from GitHub
  const handleGitHubFileDeleted = useCallback(() => {
    setSelectedGitHubFile(null)
  }, [])

  // Load filtered files when filter changes
  useEffect(() => {
    if (activeFilter !== 'all' && workingDir) {
      loadFilteredFiles(activeFilter, workingDir)
    }
  }, [activeFilter, workingDir, loadFilteredFiles])

  // Handle filter change
  const handleFilterChange = useCallback((filter: FileFilter) => {
    setActiveFilter(filter)
    if (filter !== 'all' && workingDir) {
      loadFilteredFiles(filter, workingDir)
    }
  }, [setActiveFilter, workingDir, loadFilteredFiles])

  // Handle file selection from filtered list
  const handleFilteredFileSelect = useCallback((path: string) => {
    openFile(path)
  }, [openFile])

  // Handle refresh of filtered files
  const handleRefreshFiltered = useCallback(() => {
    if (activeFilter !== 'all' && workingDir) {
      loadFilteredFiles(activeFilter, workingDir)
    }
  }, [activeFilter, workingDir, loadFilteredFiles])

  // Filter button configs
  const filterButtons: { filter: FileFilter; icon: React.ReactNode; label: string; color: string }[] = [
    { filter: 'all', icon: <FolderTree className="h-3 w-3" />, label: 'All', color: '' },
    { filter: 'prompts', icon: <FileText className="h-3 w-3" />, label: 'Prompts', color: 'text-pink-400' },
    { filter: 'claude', icon: <Bot className="h-3 w-3" />, label: 'Claude', color: 'text-orange-400' },
    { filter: 'favorites', icon: <Star className="h-3 w-3" />, label: 'Favorites', color: 'text-yellow-400' },
  ]

  return (
    <div className="min-h-full lg:h-full flex flex-col lg:flex-row gap-4 p-6" data-tabz-section="files">
      {/* Left sidebar - File Tree with source toggle */}
      <div className="lg:w-80 flex-shrink-0 lg:h-full">
        <div className="glass-dark rounded-lg border border-border h-full flex flex-col overflow-hidden">
          {/* Source Toggle */}
          <div className="px-3 pt-3 pb-2 border-b border-border/50">
            <Tabs
              value={fileSource}
              onValueChange={(v) => setFileSource(v as FileSource)}
              className="w-full"
            >
              <TabsList className="w-full bg-muted/50 h-8">
                <TabsTrigger
                  value="local"
                  className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-primary/20"
                  data-tabz-action="source-local"
                >
                  <HardDrive className="h-3 w-3" />
                  Local
                </TabsTrigger>
                <TabsTrigger
                  value="github"
                  className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-primary/20"
                  data-tabz-action="source-github"
                >
                  <Github className="h-3 w-3" />
                  GitHub
                </TabsTrigger>
                <TabsTrigger
                  value="git"
                  className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-primary/20"
                  data-tabz-action="source-git"
                >
                  <GitBranch className="h-3 w-3" />
                  Git
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filter buttons (only for local files) */}
          {fileSource === 'local' && (
            <div className="px-3 py-2 border-b border-border/50 flex gap-1 flex-wrap">
              {filterButtons.map(({ filter, icon, label, color }) => (
                <button
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                    activeFilter === filter
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-muted text-muted-foreground',
                    activeFilter === filter && color
                  )}
                  data-tabz-action={`filter-${filter}`}
                  title={`Show ${label.toLowerCase()} files`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* File Tree based on source and filter */}
          <div className="flex-1 overflow-hidden">
            {fileSource === 'local' ? (
              activeFilter === 'all' ? (
                <FileTree
                  basePath={workingDir || '~'}
                  maxDepth={viewerSettings.maxDepth}
                  showHidden={false}
                  className="h-full"
                  treeFontSize={viewerSettings.treeFontSize}
                  treeFontFamily={viewerSettings.treeFontFamily}
                />
              ) : (
                <FilteredFileList
                  filter={activeFilter}
                  filteredFiles={filteredFiles}
                  loading={filteredFilesLoading}
                  onFileSelect={handleFilteredFileSelect}
                  onRefresh={handleRefreshFiltered}
                />
              )
            ) : fileSource === 'git' ? (
              workingDir ? (
                <GitTab
                  workingDir={workingDir}
                  onFileSelect={handleGitFileSelect}
                  onCommitSelect={handleGitCommitSelect}
                  onCommitFileSelect={handleCommitFileSelect}
                  onShowGraph={handleShowGraph}
                  className="h-full"
                  treeFontSize={viewerSettings.treeFontSize}
                  treeFontFamily={viewerSettings.treeFontFamily}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs px-4 text-center">
                  Set a working directory to view git status
                </div>
              )
            ) : (
              <GitHubFileTree
                className="h-full"
                onFileSelect={handleGitHubFileSelect}
                treeFontSize={viewerSettings.treeFontSize}
                treeFontFamily={viewerSettings.treeFontFamily}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content area - File viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="glass-dark rounded-lg border border-border h-full flex flex-col overflow-hidden">
          {/* Header with settings and plugins toggle */}
          <div className="px-4 py-2 border-b border-border/50 bg-background/30 flex-shrink-0 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {fileSource === 'local' ? 'File Viewer' : fileSource === 'git' ? 'Git Viewer' : 'GitHub Viewer'}
            </span>
            <div className="flex items-center gap-2">
              {/* Settings Dropdown */}
              {(fileSource === 'local' || fileSource === 'git') && (
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors text-sm"
                    title="Font settings"
                    data-tabz-action="toggle-settings"
                  >
                    <SettingsIcon size={16} />
                    <span className="text-muted-foreground">{viewerSettings.fontSize}px</span>
                  </button>

                  {showSettingsDropdown && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl z-50 p-4 space-y-3">
                      {/* Viewer section header */}
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Viewer</p>

                      {/* Viewer Font Size */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Font Size</label>
                          <span className="text-sm text-muted-foreground">{viewerSettings.fontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="24"
                          step="1"
                          value={viewerSettings.fontSize}
                          onChange={(e) => setFontSize(parseInt(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>

                      {/* Viewer Font Family */}
                      <div>
                        <label className="text-sm font-medium block mb-2">Font</label>
                        <select
                          value={viewerSettings.fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm [&>option]:bg-background [&>option]:text-foreground"
                          style={{ fontFamily: viewerSettings.fontFamily }}
                        >
                          <option value="JetBrains Mono">JetBrains Mono</option>
                          <option value="Fira Code">Fira Code</option>
                          <option value="Cascadia Code">Cascadia Code</option>
                          <option value="monospace">System Monospace</option>
                        </select>
                      </div>

                      {/* Sidebar section header */}
                      <div className="pt-3 border-t border-border">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Sidebar</p>

                        {/* Tree Font Size */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Font Size</label>
                            <span className="text-sm text-muted-foreground">{viewerSettings.treeFontSize}px</span>
                          </div>
                          <input
                            type="range"
                            min="11"
                            max="18"
                            step="1"
                            value={viewerSettings.treeFontSize}
                            onChange={(e) => setTreeFontSize(parseInt(e.target.value))}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Tree Font Family */}
                        <div className="mb-3">
                          <label className="text-sm font-medium block mb-2">Font</label>
                          <select
                            value={viewerSettings.treeFontFamily}
                            onChange={(e) => setTreeFontFamily(e.target.value)}
                            className="w-full px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm [&>option]:bg-background [&>option]:text-foreground"
                            style={{ fontFamily: viewerSettings.treeFontFamily === 'system' ? 'system-ui, sans-serif' : viewerSettings.treeFontFamily }}
                          >
                            <option value="system">System</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                            <option value="Fira Code">Fira Code</option>
                            <option value="Cascadia Code">Cascadia Code</option>
                            <option value="monospace">Monospace</option>
                          </select>
                        </div>

                        {/* File Tree Depth */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Tree Depth</label>
                            <span className="text-sm text-muted-foreground">{viewerSettings.maxDepth} levels</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={viewerSettings.maxDepth}
                            onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                            className="w-full accent-primary"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Lower values load faster
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Plugins toggle */}
              {fileSource === 'local' && (
                <button
                  onClick={() => setShowPlugins(!showPlugins)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                    showPlugins
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-white/10 text-muted-foreground'
                  )}
                  data-tabz-action="toggle-plugins"
                  title={showPlugins ? 'Hide plugins panel' : 'Show plugins panel'}
                >
                  {showPlugins ? (
                    <PanelRightClose className="h-3.5 w-3.5" />
                  ) : (
                    <PanelRightOpen className="h-3.5 w-3.5" />
                  )}
                  <Plug className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* File content */}
          <div className="flex-1 overflow-hidden p-2">
            {fileSource === 'local' ? (
              <FileViewer />
            ) : fileSource === 'git' ? (
              gitViewMode === 'graph' && workingDir ? (
                <GitGraph
                  repoPath={workingDir}
                  onSelectCommit={handleGitCommitSelect}
                  selectedSha={selectedGitCommit ?? undefined}
                  className="h-full rounded-lg"
                />
              ) : (
                <FileViewer />
              )
            ) : token && repo ? (
              <GitHubFileViewer
                token={token}
                repo={repo}
                selectedFile={selectedGitHubFile}
                onFileDeleted={handleGitHubFileDeleted}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <Github className="h-12 w-12 opacity-50" />
                  <span className="text-sm">
                    {!token ? 'Sign in to GitHub to browse files' : 'Select a repository in the sidebar'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar - Plugins panel (only for local files) */}
      {fileSource === 'local' && showPlugins && (
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:h-full">
          <div className="glass-dark rounded-lg border border-border h-full overflow-hidden">
            <PluginList />
          </div>
        </div>
      )}
    </div>
  )
}

export default function FilesSection(props: FilesSectionProps) {
  return (
    <FilesProvider>
      <FilesSectionContent {...props} />
    </FilesProvider>
  )
}
