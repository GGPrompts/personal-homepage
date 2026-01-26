'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Plug,
  HardDrive,
  Github,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs' // Tabs still used for local/github toggle
import { FilesProvider, useFilesContext } from '@/app/contexts/FilesContext'
import { FileTree } from '@/app/components/files/FileTree'
import { FileViewer } from '@/app/components/files/FileViewer'
import { PluginList } from '@/app/components/files/PluginList'
import { GitHubFileTree } from '@/app/components/files/GitHubFileTree'
import { GitHubFileViewer } from '@/app/components/files/GitHubFileViewer'
import { useWorkingDirectory } from '@/hooks/useWorkingDirectory'
import { useAuth } from '@/components/AuthProvider'
import { cn } from '@/lib/utils'

interface FilesSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
  initialPath?: string | null
  onInitialPathConsumed?: () => void
}

type FileSource = 'local' | 'github'

function FilesSectionContent({ activeSubItem, onSubItemHandled, initialPath, onInitialPathConsumed }: FilesSectionProps) {
  const { workingDir } = useWorkingDirectory()
  const { user, getGitHubToken } = useAuth()
  const { navigateTreeTo } = useFilesContext()

  const [showPlugins, setShowPlugins] = useState<boolean>(true)
  const [fileSource, setFileSource] = useState<FileSource>('local')

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
              </TabsList>
            </Tabs>
          </div>

          {/* File Tree based on source */}
          <div className="flex-1 overflow-hidden">
            {fileSource === 'local' ? (
              <FileTree
                basePath={workingDir || '~'}
                maxDepth={5}
                showHidden={false}
                className="h-full"
              />
            ) : (
              <GitHubFileTree
                className="h-full"
                onFileSelect={handleGitHubFileSelect}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content area - File viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="glass-dark rounded-lg border border-border h-full flex flex-col overflow-hidden">
          {/* Header with plugins toggle */}
          <div className="px-4 py-2 border-b border-border/50 bg-background/30 flex-shrink-0 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {fileSource === 'local' ? 'File Viewer' : 'GitHub Viewer'}
            </span>
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

          {/* File content */}
          <div className="flex-1 overflow-hidden p-2">
            {fileSource === 'local' ? (
              <FileViewer />
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
