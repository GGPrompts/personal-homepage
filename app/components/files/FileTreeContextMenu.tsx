'use client'

import React, { ReactNode, useState, useCallback } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import {
  Copy,
  AtSign,
  Star,
  StarOff,
  Pin,
  MessageSquare,
  Terminal,
  ExternalLink,
  FolderOpen,
  Play,
  CheckCircle,
  Brain,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useFilesContext } from '@/app/contexts/FilesContext'
import { useTerminalExtension } from '@/hooks/useTerminalExtension'
import { getScriptInfo, type ScriptInfo } from '@/lib/claudeFileTypes'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type FileTreeSource = 'local' | 'github'

interface FileTreeContextMenuProps {
  children: ReactNode
  path: string
  name: string
  isDirectory: boolean
  source: FileTreeSource
  // GitHub-specific props
  repo?: string
  branch?: string
}

export function FileTreeContextMenu({
  children,
  path,
  name,
  isDirectory,
  source,
  repo,
  branch = 'main',
}: FileTreeContextMenuProps) {
  const { toggleFavorite, isFavorite, openFile, pinFile, navigateTreeTo } = useFilesContext()
  const { available: terminalAvailable, pasteToTerminal, sendToChat, updateDefaultWorkDir, spawnWithOptions } = useTerminalExtension()

  const isFavorited = isFavorite(path)

  // Script info for executable files
  const scriptInfo = !isDirectory ? getScriptInfo(name, path) : null

  // State for explain script
  const [isExplaining, setIsExplaining] = useState(false)
  const [explainResult, setExplainResult] = useState<string | null>(null)
  const [explainExpanded, setExplainExpanded] = useState(true)

  // Copy path to clipboard
  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(path)
      toast.success('Path copied to clipboard')
    } catch {
      toast.error('Failed to copy path')
    }
  }

  // Copy @path for Claude references
  const handleCopyAtPath = async () => {
    try {
      const atPath = `@${path}`
      await navigator.clipboard.writeText(atPath)
      toast.success('@Path copied to clipboard')
    } catch {
      toast.error('Failed to copy @path')
    }
  }

  // Toggle favorite
  const handleToggleFavorite = () => {
    toggleFavorite(path)
    toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites')
  }

  // Pin file (open as pinned tab)
  const handlePinFile = async () => {
    if (!isDirectory) {
      await openFile(path, true)
      toast.success('File pinned')
    }
  }

  // Send to chat
  const handleSendToChat = async () => {
    if (terminalAvailable) {
      const atPath = `@${path}`
      const success = await sendToChat(atPath)
      if (success) {
        toast.success('Sent to chat')
      } else {
        toast.error('Failed to send to chat')
      }
    } else {
      toast.error('Terminal not available')
    }
  }

  // Paste to terminal
  const handlePasteToTerminal = async () => {
    if (terminalAvailable) {
      const command = isDirectory ? `cd "${path}"` : `"${path}"`
      const result = await pasteToTerminal(command)
      if (result.success) {
        toast.success('Pasted to terminal')
      } else {
        toast.error(result.error || 'Failed to paste to terminal')
      }
    } else {
      toast.error('Terminal not available')
    }
  }

  // Open in editor (local files only)
  const handleOpenInEditor = async () => {
    if (source === 'local' && terminalAvailable) {
      const result = await pasteToTerminal(`code "${path}"`, { name: 'Open in Editor' })
      if (result.success) {
        toast.success('Opening in editor...')
      } else {
        toast.error(result.error || 'Failed to open in editor')
      }
    }
  }

  // Set as working directory (folders only)
  const handleSetWorkingDir = () => {
    if (isDirectory && source === 'local') {
      updateDefaultWorkDir(path)
      toast.success('Set as default working directory')
    }
  }

  // Open on GitHub (GitHub files only)
  const handleOpenOnGitHub = () => {
    if (source === 'github' && repo) {
      const type = isDirectory ? 'tree' : 'blob'
      window.open(`https://github.com/${repo}/${type}/${branch}/${path}`, '_blank')
    }
  }

  // Navigate to folder in tree
  const handleNavigateToFolder = () => {
    if (isDirectory) {
      navigateTreeTo(path)
    }
  }

  // Run script in new terminal
  const handleRunScript = useCallback(async () => {
    if (!scriptInfo) return

    const dir = path.substring(0, path.lastIndexOf('/'))
    const result = await spawnWithOptions({
      name: `Run: ${name}`,
      command: scriptInfo.runCommand,
      workingDir: dir,
      autoExecute: true,
    })

    if (result.success) {
      toast.success(`Running ${name}...`)
    } else {
      toast.error(result.error || 'Failed to run script')
    }
  }, [scriptInfo, name, path, spawnWithOptions])

  // Check / dry run script
  const handleCheckScript = useCallback(async () => {
    if (!scriptInfo?.syntaxCheckCommand) return

    const dir = path.substring(0, path.lastIndexOf('/'))
    const result = await spawnWithOptions({
      name: `Check: ${name}`,
      command: scriptInfo.syntaxCheckCommand,
      workingDir: dir,
      autoExecute: true,
    })

    if (result.success) {
      toast.success(`Checking ${name}...`)
    } else {
      toast.error(result.error || 'Failed to check script')
    }
  }, [scriptInfo, name, path, spawnWithOptions])

  // Explain script using Claude
  const handleExplainScript = useCallback(async () => {
    if (isExplaining) return

    setIsExplaining(true)
    setExplainResult(null)
    setExplainExpanded(true)

    try {
      const response = await fetch('/api/ai/explain-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })

      const data = await response.json()

      if (data.success) {
        setExplainResult(data.explanation)
        toast.success('Script explained')
      } else {
        setExplainResult(`Error: ${data.error}`)
        toast.error(data.error || 'Failed to explain script')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setExplainResult(`Error: ${errorMessage}`)
      toast.error('Failed to explain script')
    } finally {
      setIsExplaining(false)
    }
  }, [isExplaining, path])

  // Clear explain result
  const handleClearExplainResult = useCallback(() => {
    setExplainResult(null)
  }, [])

  return (
    <ContextMenu>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuContent className="w-56 glass">
        {/* Copy actions */}
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Path
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyAtPath}>
          <AtSign className="mr-2 h-4 w-4" />
          Copy @Path
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Favorites */}
        <ContextMenuItem onClick={handleToggleFavorite}>
          {isFavorited ? (
            <>
              <StarOff className="mr-2 h-4 w-4" />
              Remove from Favorites
            </>
          ) : (
            <>
              <Star className="mr-2 h-4 w-4" />
              Add to Favorites
            </>
          )}
        </ContextMenuItem>

        {/* Pin file (files only) */}
        {!isDirectory && (
          <ContextMenuItem onClick={handlePinFile}>
            <Pin className="mr-2 h-4 w-4" />
            Pin File
          </ContextMenuItem>
        )}

        {/* Navigate to folder (directories in local mode) */}
        {isDirectory && source === 'local' && (
          <ContextMenuItem onClick={handleNavigateToFolder}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Navigate to Folder
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Terminal actions (when available) */}
        {terminalAvailable && (
          <>
            <ContextMenuItem onClick={handleSendToChat}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send to Chat
            </ContextMenuItem>
            <ContextMenuItem onClick={handlePasteToTerminal}>
              <Terminal className="mr-2 h-4 w-4" />
              Paste to Terminal
            </ContextMenuItem>
          </>
        )}

        {/* Local-only actions */}
        {source === 'local' && (
          <>
            {terminalAvailable && !isDirectory && (
              <ContextMenuItem onClick={handleOpenInEditor}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Editor
              </ContextMenuItem>
            )}
            {isDirectory && (
              <ContextMenuItem onClick={handleSetWorkingDir}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Set as Working Dir
              </ContextMenuItem>
            )}
          </>
        )}

        {/* GitHub-only actions */}
        {source === 'github' && repo && (
          <ContextMenuItem onClick={handleOpenOnGitHub}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open on GitHub
          </ContextMenuItem>
        )}

        {/* Script actions (for executable files) */}
        {scriptInfo && source === 'local' && terminalAvailable && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <span className="mr-2">{scriptInfo.icon}</span>
                Script Actions
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56 glass">
                <ContextMenuItem onClick={handleRunScript} className="text-green-400">
                  <Play className="mr-2 h-4 w-4" />
                  Run Script
                </ContextMenuItem>
                {scriptInfo.syntaxCheckCommand && (
                  <ContextMenuItem onClick={handleCheckScript} className="text-yellow-400">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Check / Dry Run
                  </ContextMenuItem>
                )}
                <ContextMenuItem
                  onClick={handleExplainScript}
                  disabled={isExplaining}
                  className={cn('text-purple-400', isExplaining && 'opacity-50')}
                >
                  {isExplaining ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="mr-2 h-4 w-4" />
                  )}
                  {isExplaining ? 'Analyzing...' : 'Explain Script'}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Explain result (shown inline when available) */}
        {explainResult && (
          <>
            <ContextMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => setExplainExpanded(!explainExpanded)}
                  className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300"
                >
                  <Brain className="h-3 w-3" />
                  Explanation
                  {explainExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={handleClearExplainResult}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {explainExpanded && (
                <div className="max-h-48 overflow-auto rounded bg-muted/50 p-2 text-xs">
                  <pre className="whitespace-pre-wrap text-foreground">{explainResult}</pre>
                </div>
              )}
            </div>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
