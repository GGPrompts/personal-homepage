'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  FileText,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCode,
  X,
  Pin,
  Loader2,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  getFile,
  saveFile,
  deleteFile,
  cacheFile,
  getCachedFile,
} from '@/lib/github'
import { cn } from '@/lib/utils'

const AUTO_SAVE_DELAY = 2000

interface EditorState {
  path: string
  name: string
  content: string
  originalContent: string
  sha: string
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  loading: boolean
  error?: string
}

interface OpenGitHubFile {
  path: string
  sha: string
  name: string
  pinned: boolean
  state: EditorState | null
}

interface GitHubFileViewerProps {
  token: string
  repo: string
  selectedFile: { path: string; sha: string; name: string } | null
  onFileDeleted?: () => void
  className?: string
}

export function GitHubFileViewer({
  token,
  repo,
  selectedFile,
  onFileDeleted,
  className,
}: GitHubFileViewerProps) {
  const [openFiles, setOpenFiles] = useState<OpenGitHubFile[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Get active editor
  const activeEditor = useMemo(() => {
    const file = openFiles.find(f => f.path === activeFilePath)
    return file?.state || null
  }, [openFiles, activeFilePath])

  // Load file when selected
  React.useEffect(() => {
    if (!selectedFile || !token || !repo) return

    // Check if already open
    const existing = openFiles.find(f => f.path === selectedFile.path)
    if (existing) {
      setActiveFilePath(selectedFile.path)
      return
    }

    // Find existing unpinned preview to replace
    const existingPreview = openFiles.find(f => !f.pinned)

    const loadFile = async () => {
      const newFile: OpenGitHubFile = {
        path: selectedFile.path,
        sha: selectedFile.sha,
        name: selectedFile.name,
        pinned: false,
        state: {
          path: selectedFile.path,
          name: selectedFile.name,
          content: '',
          originalContent: '',
          sha: selectedFile.sha,
          isDirty: false,
          isSaving: false,
          lastSaved: null,
          loading: true,
        },
      }

      if (existingPreview) {
        setOpenFiles(prev => prev.map(f => f.path === existingPreview.path ? newFile : f))
      } else {
        setOpenFiles(prev => [...prev, newFile])
      }
      setActiveFilePath(selectedFile.path)

      try {
        // Try cache first
        const cached = getCachedFile(selectedFile.path)
        if (cached) {
          setOpenFiles(prev => prev.map(f => f.path === selectedFile.path ? {
            ...f,
            state: {
              ...f.state!,
              content: cached.content,
              originalContent: cached.content,
              sha: cached.sha,
              loading: false,
            },
          } : f))
        }

        // Then fetch fresh from GitHub
        const result = await getFile(token, repo, selectedFile.path)

        cacheFile({
          path: selectedFile.path,
          name: selectedFile.name,
          content: result.content,
          sha: result.sha,
          cachedAt: Date.now(),
        })

        setOpenFiles(prev => prev.map(f => f.path === selectedFile.path ? {
          ...f,
          state: {
            ...f.state!,
            content: result.content,
            originalContent: result.content,
            sha: result.sha,
            loading: false,
          },
        } : f))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file'

        // Try cached version
        const cached = getCachedFile(selectedFile.path)
        if (cached) {
          setOpenFiles(prev => prev.map(f => f.path === selectedFile.path ? {
            ...f,
            state: {
              ...f.state!,
              content: cached.content,
              originalContent: cached.content,
              sha: cached.sha,
              loading: false,
            },
          } : f))
        } else {
          setOpenFiles(prev => prev.map(f => f.path === selectedFile.path ? {
            ...f,
            state: {
              ...f.state!,
              loading: false,
              error: errorMessage,
            },
          } : f))
        }
      }
    }

    loadFile()
  }, [selectedFile, token, repo, openFiles])

  // Handle content change with auto-save
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeFilePath) return

    setOpenFiles(prev => prev.map(f => f.path === activeFilePath ? {
      ...f,
      state: f.state ? {
        ...f.state,
        content: newContent,
        isDirty: newContent !== f.state.originalContent,
      } : null,
    } : f))

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new auto-save timer
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(newContent)
    }, AUTO_SAVE_DELAY)
  }, [activeFilePath])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ content, sha }: { content: string; sha: string }) => {
      if (!activeEditor) throw new Error('No active file')
      return saveFile(
        token,
        repo,
        activeEditor.path,
        content,
        sha,
        `Update ${activeEditor.name} from dashboard`
      )
    },
    onSuccess: (result, variables) => {
      if (!activeFilePath) return

      cacheFile({
        path: activeEditor!.path,
        name: activeEditor!.name,
        content: variables.content,
        sha: result.sha,
        cachedAt: Date.now(),
      })

      setOpenFiles(prev => prev.map(f => f.path === activeFilePath ? {
        ...f,
        state: f.state ? {
          ...f.state,
          sha: result.sha,
          originalContent: variables.content,
          isDirty: false,
          isSaving: false,
          lastSaved: new Date(),
        } : null,
      } : f))
    },
    onError: () => {
      if (!activeFilePath) return
      setOpenFiles(prev => prev.map(f => f.path === activeFilePath ? {
        ...f,
        state: f.state ? {
          ...f.state,
          isSaving: false,
        } : null,
      } : f))
    },
  })

  // Handle save
  const handleSave = useCallback((content?: string) => {
    if (!activeEditor) return

    const contentToSave = content ?? activeEditor.content

    setOpenFiles(prev => prev.map(f => f.path === activeFilePath ? {
      ...f,
      state: f.state ? {
        ...f.state,
        isSaving: true,
      } : null,
    } : f))

    saveMutation.mutate({
      content: contentToSave,
      sha: activeEditor.sha,
    })
  }, [activeEditor, activeFilePath, saveMutation])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeEditor) throw new Error('No active file')
      return deleteFile(
        token,
        repo,
        activeEditor.path,
        activeEditor.sha,
        `Delete ${activeEditor.name} from dashboard`
      )
    },
    onSuccess: () => {
      setDeleteDialogOpen(false)
      closeFile(activeFilePath!)
      onFileDeleted?.()
    },
  })

  // Pin file
  const pinFile = useCallback((path: string) => {
    setOpenFiles(prev => prev.map(f => f.path === path ? { ...f, pinned: true } : f))
  }, [])

  // Close file
  const closeFile = useCallback((path: string) => {
    setOpenFiles(prev => {
      const remaining = prev.filter(f => f.path !== path)
      if (activeFilePath === path) {
        setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null)
      }
      return remaining
    })
  }, [activeFilePath])

  // Render markdown preview
  const renderMarkdown = useMemo(() => {
    if (!activeEditor?.content) return ''

    let html = activeEditor.content
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-foreground">$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4 font-mono text-sm"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-cyan-500 pl-4 my-4 text-muted-foreground italic">$1</blockquote>')
      .replace(/^---$/gm, '<hr class="my-6 border-border" />')
      .replace(/^(?!<[hpuolba]|<\/|<li|<hr|<pre|<block)(.*$)/gm, (match, p1) => {
        return p1.trim() ? `<p class="my-2 text-foreground/90">${p1}</p>` : ''
      })

    return html
  }, [activeEditor?.content])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Separate pinned and preview files
  const { pinnedFiles, previewFile } = useMemo(() => {
    const pinned = openFiles.filter(f => f.pinned)
    const preview = openFiles.find(f => !f.pinned)
    return { pinnedFiles: pinned, previewFile: preview }
  }, [openFiles])

  if (openFiles.length === 0) {
    return (
      <div className={cn('h-full flex items-center justify-center text-muted-foreground', className)}>
        <div className="flex flex-col items-center gap-3">
          <FileCode className="h-12 w-12 opacity-50" />
          <span className="text-sm">Select a markdown file to edit</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col glass-dark rounded-lg border border-border overflow-hidden', className)}>
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto">
        {pinnedFiles.map(file => (
          <div
            key={file.path}
            className={cn(
              'group relative flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer',
              'border-r border-border transition-colors',
              file.path === activeFilePath
                ? 'bg-background text-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            onClick={() => setActiveFilePath(file.path)}
            title={file.path}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="max-w-[120px] truncate">{file.name}</span>
            <Pin className="h-3 w-3 text-cyan-500 flex-shrink-0" />
            <button
              className={cn(
                'ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                file.path === activeFilePath && 'opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation()
                closeFile(file.path)
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {previewFile && (
          <div
            className={cn(
              'group relative flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer italic',
              'border-r border-border transition-colors',
              previewFile.path === activeFilePath
                ? 'bg-background text-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            onClick={() => setActiveFilePath(previewFile.path)}
            onDoubleClick={() => pinFile(previewFile.path)}
            title={`${previewFile.path} (preview - double-click to pin)`}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="max-w-[120px] truncate">{previewFile.name}</span>
            <button
              className={cn(
                'ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                previewFile.path === activeFilePath && 'opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation()
                closeFile(previewFile.path)
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex-1 min-w-[50px]" />
      </div>

      {/* Editor Content */}
      {activeEditor ? (
        <>
          {/* Editor Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/20">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium text-sm truncate">{activeEditor.name}</span>
              {activeEditor.isDirty && (
                <Badge variant="outline" className="text-[10px] px-1.5">
                  Unsaved
                </Badge>
              )}
              {activeEditor.isSaving && (
                <Badge variant="outline" className="text-[10px] px-1.5 text-amber-400">
                  <RotateCw className="h-3 w-3 animate-spin mr-1" />
                  Saving...
                </Badge>
              )}
              {activeEditor.lastSaved && !activeEditor.isDirty && !activeEditor.isSaving && (
                <Badge variant="outline" className="text-[10px] px-1.5 text-emerald-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSave()}
                disabled={!activeEditor.isDirty || activeEditor.isSaving}
                className="h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass">
                  <DialogHeader>
                    <DialogTitle>Delete File</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{activeEditor.name}"? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <RotateCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeEditor.loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeEditor.error ? (
              <div className="h-full flex items-center justify-center text-destructive">
                <AlertCircle className="h-6 w-6 mr-2" />
                {activeEditor.error}
              </div>
            ) : showPreview ? (
              <ScrollArea className="h-full">
                <div
                  className="prose prose-invert max-w-none p-6"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown }}
                />
              </ScrollArea>
            ) : (
              <textarea
                value={activeEditor.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full p-4 bg-transparent resize-none focus:outline-none font-mono text-sm"
                placeholder="Start writing..."
                spellCheck={false}
              />
            )}
          </div>

          {/* Editor Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/20 text-xs text-muted-foreground">
            <span>{activeEditor.content.length} characters</span>
            <div className="flex items-center gap-3">
              {activeEditor.lastSaved && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last saved {activeEditor.lastSaved.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <span className="text-[10px]">Auto-save enabled</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">No file selected</span>
        </div>
      )}
    </div>
  )
}

export default GitHubFileViewer
