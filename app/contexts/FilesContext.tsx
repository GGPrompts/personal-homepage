'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { getFileTypeAndLanguage, FileType } from '@/lib/fileTypeUtils'
import { FileFilter } from '@/lib/claudeFileTypes'

// Types
interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modified?: string
  children?: FileNode[]
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
  modified?: string
}

interface FilteredTree {
  name: string
  icon: string
  basePath: string
  tree: TreeNode
}

interface FilteredFilesResponse {
  trees: FilteredTree[]
  groups?: { name: string; icon: string; files: { name: string; path: string; type: string | null }[] }[]
}

interface ComponentFile {
  name: string
  path: string
}

interface Plugin {
  id: string
  name: string
  marketplace: string
  enabled: boolean
  scope: string
  version: string
  installPath: string
  installedAt: string
  isLocal: boolean
  components: string[]
  componentFiles: {
    skills?: ComponentFile[]
    agents?: ComponentFile[]
    commands?: ComponentFile[]
    hooks?: ComponentFile[]
    mcp?: ComponentFile[]
  }
}

interface PluginsData {
  marketplaces: Record<string, Plugin[]>
  totalPlugins: number
  enabledCount: number
  disabledCount: number
  componentCounts: Record<string, number>
  scopeCounts: Record<string, number>
}

interface OutdatedPlugin {
  pluginId: string
  name: string
  marketplace: string
  scope: string
  projectPath?: string
  installedSha: string
  currentSha: string
  lastUpdated: string
}

interface PluginHealthData {
  outdated: OutdatedPlugin[]
  current: number
  unknown: number
  cache: {
    totalSize: number
    totalVersions: number
    byMarketplace: Record<string, { size: number; versions: number; plugins: Record<string, number> }>
  }
}

interface OpenFile {
  id: string
  path: string
  name: string
  content: string | null
  fileType: FileType
  mediaDataUri?: string
  loading: boolean
  error?: string
  pinned: boolean
  lineCount?: number
  modified?: string
}

interface FilesContextType {
  // File tree state
  fileTree: FileNode | null
  setFileTree: (tree: FileNode | null) => void
  fileTreePath: string | null
  setFileTreePath: (path: string | null) => void

  // Tree navigation (for external navigation requests)
  pendingTreeNavigation: string | null
  navigateTreeTo: (path: string) => void
  clearPendingNavigation: () => void

  // Open files state
  openFiles: OpenFile[]
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>
  activeFileId: string | null
  setActiveFileId: (id: string | null) => void

  // Filter state
  activeFilter: FileFilter
  setActiveFilter: (filter: FileFilter) => void
  filteredFiles: FilteredFilesResponse | null
  filteredFilesLoading: boolean
  filterShowHidden: boolean
  setFilterShowHidden: (show: boolean) => void
  loadFilteredFiles: (filter: FileFilter, workingDir: string, showHidden?: boolean) => Promise<void>

  // Favorites
  favorites: Set<string>
  toggleFavorite: (path: string) => void
  isFavorite: (path: string) => boolean

  // Plugins
  pluginsData: PluginsData | null
  pluginsLoading: boolean
  loadPlugins: () => Promise<void>
  togglePlugin: (pluginId: string, enabled: boolean) => Promise<boolean>

  // Plugin health
  pluginHealth: PluginHealthData | null
  pluginHealthLoading: boolean
  loadPluginHealth: () => Promise<void>
  updatePlugin: (pluginId: string) => Promise<boolean>
  updateAllPlugins: () => Promise<{ success: number; failed: number; skipped: number } | null>
  pruneCache: (keepLatest?: number) => Promise<{ removed: number; freedMB: string } | null>

  // Actions
  openFile: (path: string, pin?: boolean) => Promise<void>
  closeFile: (id: string) => void
  pinFile: (id: string) => void
}

const FilesContext = createContext<FilesContextType | null>(null)

export function FilesProvider({ children }: { children: ReactNode }) {
  // File tree cache - persist path to localStorage for reload persistence
  const [fileTree, setFileTree] = useState<FileNode | null>(null)
  const [fileTreePath, setFileTreePathState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('files-tree-path')
    // Don't restore stale home directory paths
    if (stored === '~' || stored?.includes('/home/') && stored.split('/').length <= 3) {
      localStorage.removeItem('files-tree-path')
      return null
    }
    return stored
  })

  // Wrapper to also save to localStorage - memoized to prevent infinite loops
  const setFileTreePath = useCallback((path: string | null) => {
    setFileTreePathState(path)
    if (typeof window !== 'undefined') {
      if (path) {
        localStorage.setItem('files-tree-path', path)
      } else {
        localStorage.removeItem('files-tree-path')
      }
    }
  }, [])

  // Pending navigation - for external requests to navigate the tree
  const [pendingTreeNavigation, setPendingTreeNavigation] = useState<string | null>(null)

  const navigateTreeTo = useCallback((path: string) => {
    setPendingTreeNavigation(path)
  }, [])

  const clearPendingNavigation = useCallback(() => {
    setPendingTreeNavigation(null)
  }, [])

  // Open files state
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  // Filter state - persist to localStorage
  const [activeFilter, setActiveFilterState] = useState<FileFilter>(() => {
    if (typeof window === 'undefined') return 'all'
    return (localStorage.getItem('files-filter') as FileFilter) || 'all'
  })
  const [filteredFiles, setFilteredFiles] = useState<FilteredFilesResponse | null>(null)
  const [filteredFilesLoading, setFilteredFilesLoading] = useState(false)
  const [filterShowHidden, setFilterShowHidden] = useState(false)

  // Plugins state
  const [pluginsData, setPluginsData] = useState<PluginsData | null>(null)
  const [pluginsLoading, setPluginsLoading] = useState(false)

  // Plugin health state
  const [pluginHealth, setPluginHealth] = useState<PluginHealthData | null>(null)
  const [pluginHealthLoading, setPluginHealthLoading] = useState(false)

  // Favorites state - persist to localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    const stored = localStorage.getItem('file-favorites')
    if (stored) {
      try {
        return new Set(JSON.parse(stored))
      } catch {
        return new Set()
      }
    }
    return new Set()
  })

  const toggleFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(path)) {
        newFavorites.delete(path)
      } else {
        newFavorites.add(path)
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('file-favorites', JSON.stringify(Array.from(newFavorites)))
      }
      return newFavorites
    })
  }, [])

  const isFavorite = useCallback((path: string) => {
    return favorites.has(path)
  }, [favorites])

  const setActiveFilter = (filter: FileFilter) => {
    setActiveFilterState(filter)
    if (typeof window !== 'undefined') {
      localStorage.setItem('files-filter', filter)
    }
  }

  const loadFilteredFiles = useCallback(async (filter: FileFilter, workingDir: string, showHidden: boolean = false) => {
    if (filter === 'all') {
      setFilteredFiles(null)
      return
    }

    // Handle favorites filter - fetch folder contents for favorited folders
    if (filter === 'favorites') {
      const favArray = Array.from(favorites)
      if (favArray.length === 0) {
        setFilteredFiles({ trees: [], groups: [] })
        return
      }

      setFilteredFilesLoading(true)
      try {
        const favoriteTrees: FilteredTree[] = []
        const favoriteFiles: { name: string; path: string; type: string | null }[] = []

        await Promise.all(favArray.map(async (path) => {
          try {
            const response = await fetch(
              `/api/files/tree?${new URLSearchParams({
                path,
                depth: '3',
                showHidden: showHidden.toString(),
              })}`
            )

            if (response.ok) {
              const data = await response.json()
              if (data && data.type === 'directory') {
                favoriteTrees.push({
                  name: data.name,
                  icon: '📁',
                  basePath: data.path,
                  tree: data as TreeNode
                })
              } else {
                favoriteFiles.push({
                  name: path.split('/').pop() || path,
                  path,
                  type: null
                })
              }
            } else {
              favoriteFiles.push({
                name: path.split('/').pop() || path,
                path,
                type: null
              })
            }
          } catch {
            favoriteFiles.push({
              name: path.split('/').pop() || path,
              path,
              type: null
            })
          }
        }))

        setFilteredFiles({
          trees: favoriteTrees,
          groups: favoriteFiles.length > 0 ? [{
            name: 'Favorite Files',
            icon: '⭐',
            files: favoriteFiles
          }] : []
        })
      } catch (err) {
        console.error('Failed to load favorites:', err)
        setFilteredFiles({
          trees: [],
          groups: [{
            name: 'Favorites',
            icon: '⭐',
            files: Array.from(favorites).map(path => ({
              name: path.split('/').pop() || path,
              path,
              type: null
            }))
          }]
        })
      } finally {
        setFilteredFilesLoading(false)
      }
      return
    }

    setFilteredFilesLoading(true)
    try {
      const response = await fetch(
        `/api/files/list?${new URLSearchParams({
          filter,
          workingDir,
          showHidden: showHidden.toString(),
        })}`
      )
      if (!response.ok) {
        throw new Error('Failed to load filtered files')
      }
      const data = await response.json()
      setFilteredFiles(data)
    } catch (err) {
      console.error('Failed to load filtered files:', err)
      setFilteredFiles(null)
    } finally {
      setFilteredFilesLoading(false)
    }
  }, [favorites])

  // Load plugins data from backend
  const loadPlugins = useCallback(async () => {
    setPluginsLoading(true)
    try {
      const response = await fetch('/api/plugins')
      if (!response.ok) {
        throw new Error('Failed to load plugins')
      }
      const data = await response.json()
      if (data.success) {
        setPluginsData(data.data)
      }
    } catch (err) {
      console.error('Failed to load plugins:', err)
      setPluginsData(null)
    } finally {
      setPluginsLoading(false)
    }
  }, [])

  // Toggle plugin enabled status
  const togglePlugin = useCallback(async (pluginId: string, enabled: boolean): Promise<boolean> => {
    try {
      const response = await fetch('/api/plugins/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, enabled })
      })
      if (!response.ok) {
        throw new Error('Failed to toggle plugin')
      }
      const data = await response.json()
      if (data.success) {
        setPluginsData(prev => {
          if (!prev) return prev
          const newMarketplaces = { ...prev.marketplaces }
          for (const [marketplace, plugins] of Object.entries(newMarketplaces)) {
            newMarketplaces[marketplace] = plugins.map(p =>
              p.id === pluginId ? { ...p, enabled } : p
            )
          }
          return {
            ...prev,
            marketplaces: newMarketplaces,
            enabledCount: enabled ? prev.enabledCount + 1 : prev.enabledCount - 1,
            disabledCount: enabled ? prev.disabledCount - 1 : prev.disabledCount + 1
          }
        })
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to toggle plugin:', err)
      return false
    }
  }, [])

  // Load plugin health data
  const loadPluginHealth = useCallback(async () => {
    setPluginHealthLoading(true)
    try {
      const response = await fetch('/api/plugins/health')
      if (!response.ok) {
        throw new Error('Failed to load plugin health')
      }
      const data = await response.json()
      if (data.success) {
        setPluginHealth(data.data)
      }
    } catch (err) {
      console.error('Failed to load plugin health:', err)
      setPluginHealth(null)
    } finally {
      setPluginHealthLoading(false)
    }
  }, [])

  // Update a plugin to latest version
  const updatePlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/plugins/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId })
      })
      if (!response.ok) {
        throw new Error('Failed to update plugin')
      }
      const data = await response.json()
      if (data.success) {
        await loadPluginHealth()
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to update plugin:', err)
      return false
    }
  }, [loadPluginHealth])

  // Update all outdated plugins
  const updateAllPlugins = useCallback(async (): Promise<{ success: number; failed: number; skipped: number } | null> => {
    try {
      const response = await fetch('/api/plugins/update-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'user' })
      })
      if (!response.ok) {
        throw new Error('Failed to update plugins')
      }
      const data = await response.json()
      if (data.success) {
        await loadPluginHealth()
        const success = data.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failed = data.results?.filter((r: { success: boolean }) => !r.success).length || 0
        const skipped = data.skipped?.length || 0
        return { success, failed, skipped }
      }
      return null
    } catch (err) {
      console.error('Failed to update all plugins:', err)
      return null
    }
  }, [loadPluginHealth])

  // Prune old cache versions
  const pruneCache = useCallback(async (keepLatest: number = 1): Promise<{ removed: number; freedMB: string } | null> => {
    try {
      const response = await fetch('/api/plugins/cache/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepLatest })
      })
      if (!response.ok) {
        throw new Error('Failed to prune cache')
      }
      const data = await response.json()
      if (data.success) {
        await loadPluginHealth()
        return { removed: data.removed, freedMB: data.freedMB }
      }
      return null
    } catch (err) {
      console.error('Failed to prune cache:', err)
      return null
    }
  }, [loadPluginHealth])

  const openFile = useCallback(async (path: string, pin: boolean = false) => {
    // Check if already open
    const existing = openFiles.find(f => f.path === path)
    if (existing) {
      setActiveFileId(existing.id)
      // If explicitly pinning, pin it
      if (pin && !existing.pinned) {
        setOpenFiles(prev => prev.map(f => f.id === existing.id ? { ...f, pinned: true } : f))
      }
      return
    }

    const id = `file-${Date.now()}`
    const name = path.split('/').pop() || path
    const { type: fileType } = getFileTypeAndLanguage(path)

    // Find existing unpinned preview to replace
    const existingPreview = openFiles.find(f => !f.pinned)

    // Add file in loading state (unpinned by default, unless explicitly pinning)
    const newFile: OpenFile = { id, path, name, content: null, fileType, loading: true, pinned: pin }

    if (existingPreview && !pin) {
      // Replace the existing preview
      setOpenFiles(prev => prev.map(f => f.id === existingPreview.id ? newFile : f))
    } else {
      // Add new file
      setOpenFiles(prev => [...prev, newFile])
    }
    setActiveFileId(id)

    try {
      if (fileType === 'image') {
        const res = await fetch(`/api/files/image?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        if (data.dataUri) {
          setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, mediaDataUri: data.dataUri, loading: false } : f))
        } else {
          throw new Error('No image data')
        }
      } else if (fileType === 'video') {
        const res = await fetch(`/api/files/video?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        if (data.error) {
          throw new Error(data.error)
        }
        if (data.dataUri) {
          setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, mediaDataUri: data.dataUri, loading: false } : f))
        } else {
          throw new Error('No video data')
        }
      } else {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        const lineCount = data.content ? data.content.split('\n').length : 0
        setOpenFiles(prev => prev.map(f => f.id === id ? {
          ...f,
          content: data.content,
          loading: false,
          lineCount,
          modified: data.modified
        } : f))
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, error: errorMessage, loading: false } : f))
    }
  }, [openFiles])

  const pinFile = useCallback((id: string) => {
    setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, pinned: true } : f))
  }, [])

  const closeFile = useCallback((id: string) => {
    setOpenFiles(prev => {
      const remaining = prev.filter(f => f.id !== id)
      // Update active file if we closed the active one
      if (activeFileId === id) {
        setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
      }
      return remaining
    })
  }, [activeFileId])

  // Check for file path from URL hash (for terminal hyperlinks or "Open Reference")
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleHashPath = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/files?')) {
        const queryString = hash.split('?')[1]
        if (queryString) {
          const params = new URLSearchParams(queryString)
          const filePath = params.get('path')
          const isDir = params.get('dir') === 'true'
          if (filePath) {
            // Clear the query part but keep #/files for navigation
            window.history.replaceState({}, '', window.location.pathname + '#/files')

            // Reset filter to 'all' so file tree shows
            setActiveFilter('all')

            if (isDir) {
              navigateTreeTo(filePath)
            } else {
              const parentDir = filePath.split('/').slice(0, -1).join('/') || '/'
              navigateTreeTo(parentDir)
              openFile(filePath, true)
            }
          }
        }
      }
    }

    // Check on mount
    handleHashPath()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashPath)
    return () => window.removeEventListener('hashchange', handleHashPath)
  }, [navigateTreeTo, openFile])

  return (
    <FilesContext.Provider value={{
      fileTree,
      setFileTree,
      fileTreePath,
      setFileTreePath,
      pendingTreeNavigation,
      navigateTreeTo,
      clearPendingNavigation,
      openFiles,
      setOpenFiles,
      activeFileId,
      setActiveFileId,
      activeFilter,
      setActiveFilter,
      filteredFiles,
      filteredFilesLoading,
      filterShowHidden,
      setFilterShowHidden,
      loadFilteredFiles,
      favorites,
      toggleFavorite,
      isFavorite,
      pluginsData,
      pluginsLoading,
      loadPlugins,
      togglePlugin,
      pluginHealth,
      pluginHealthLoading,
      loadPluginHealth,
      updatePlugin,
      updateAllPlugins,
      pruneCache,
      openFile,
      closeFile,
      pinFile,
    }}>
      {children}
    </FilesContext.Provider>
  )
}

export function useFilesContext() {
  const context = useContext(FilesContext)
  if (!context) {
    throw new Error('useFilesContext must be used within a FilesProvider')
  }
  return context
}

// Re-export types for consumers
export type {
  FileNode,
  TreeNode,
  FilteredTree,
  FilteredFilesResponse,
  Plugin,
  PluginsData,
  OutdatedPlugin,
  PluginHealthData,
  OpenFile,
  FilesContextType,
}
