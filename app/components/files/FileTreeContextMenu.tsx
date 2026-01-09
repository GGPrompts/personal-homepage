'use client'

import React, { ReactNode } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
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
} from 'lucide-react'
import { useFilesContext } from '@/app/contexts/FilesContext'
import { useTerminalExtension } from '@/hooks/useTerminalExtension'
import { toast } from 'sonner'

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
  const { available: terminalAvailable, pasteToTerminal, sendToChat, updateDefaultWorkDir } = useTerminalExtension()

  const isFavorited = isFavorite(path)

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
      </ContextMenuContent>
    </ContextMenu>
  )
}
