"use client"

import React, { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Folder,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Grid3x3,
  List,
  Image as ImageIcon,
  Music,
  Video,
  File,
  Play,
  Settings,
  Loader2,
  AlertCircle,
  Home,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useMediaBrowser,
  useMediaDirectories,
  getMediaUrl,
  formatFileSize,
  type MediaFile,
} from "@/hooks/useMediaLibrary"
import {
  getVideoThumbnailUrl,
  useVideosMetadata,
} from "@/hooks/useVideoMetadata"

interface LocalMediaBrowserProps {
  mediaType: "image" | "audio" | "video"
  onFileSelect?: (file: MediaFile) => void
  onPlayFile?: (file: MediaFile, allFiles: MediaFile[]) => void
  selectedFile?: MediaFile | null
  className?: string
}

const mediaTypeConfig = {
  image: {
    icon: ImageIcon,
    label: "Photos",
    directoryKey: "photos" as const,
  },
  audio: {
    icon: Music,
    label: "Music",
    directoryKey: "music" as const,
  },
  video: {
    icon: Video,
    label: "Videos",
    directoryKey: "videos" as const,
  },
}

function FileIcon({ type }: { type: MediaFile["type"] }) {
  switch (type) {
    case "directory":
      return <Folder className="h-4 w-4 text-amber-400" />
    case "image":
      return <ImageIcon className="h-4 w-4 text-blue-400" />
    case "audio":
      return <Music className="h-4 w-4 text-green-400" />
    case "video":
      return <Video className="h-4 w-4 text-purple-400" />
    default:
      return <File className="h-4 w-4 text-muted-foreground" />
  }
}

export function LocalMediaBrowser({
  mediaType,
  onFileSelect,
  onPlayFile,
  selectedFile,
  className = "",
}: LocalMediaBrowserProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const config = mediaTypeConfig[mediaType]
  const { directories, loaded: dirsLoaded } = useMediaDirectories()

  const initialPath = directories[config.directoryKey]

  const {
    currentPath,
    setCurrentPath,
    navigateUp,
    files,
    total,
    isLoading,
    error,
    refresh,
    recursive,
    setRecursive,
  } = useMediaBrowser(initialPath, mediaType)

  const mediaFiles = files.filter((f) => f.type === mediaType)
  const directories_ = files.filter((f) => f.type === "directory")

  // Fetch metadata for video files
  const videoPaths = useMemo(
    () => (mediaType === "video" ? mediaFiles.map((f) => f.path) : []),
    [mediaType, mediaFiles]
  )
  const { data: videoMetadata } = useVideosMetadata(videoPaths)

  const handleFileClick = useCallback(
    (file: MediaFile) => {
      if (file.type === "directory") {
        setCurrentPath(file.path)
      } else {
        if (onPlayFile) {
          onPlayFile(file, mediaFiles)
        } else if (onFileSelect) {
          onFileSelect(file)
        }
      }
    },
    [setCurrentPath, onFileSelect, onPlayFile, mediaFiles]
  )

  const goHome = useCallback(() => {
    setCurrentPath(directories[config.directoryKey])
  }, [setCurrentPath, directories, config.directoryKey])

  if (!dirsLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!directories[config.directoryKey]) {
    return (
      <Card className="glass border-amber-500/30 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-foreground mb-2">
              {config.label} Directory Not Configured
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure your {config.label.toLowerCase()} directory in Settings to browse local files.
            </p>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Go to Settings
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goHome}
            className="h-8 w-8"
            title="Go to root"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateUp}
            className="h-8 w-8"
            disabled={currentPath === directories[config.directoryKey]}
            title="Go up"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0 max-w-md">
            <div className="text-sm font-mono text-muted-foreground truncate px-2">
              {currentPath}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecursive(!recursive)}
            className={`gap-2 ${recursive ? "border-primary text-primary" : ""}`}
            title={recursive ? "Scanning subdirectories" : "Current directory only"}
          >
            {recursive ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Recursive</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={isLoading}
            className="h-8 w-8"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {directories_.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Folder className="h-3 w-3" />
            {directories_.length} folders
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <config.icon className="h-3 w-3" />
          {mediaFiles.length} {config.label.toLowerCase()}
        </Badge>
        {total > files.length && (
          <span className="text-xs">({total} total in directory)</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card className="glass border-red-500/30 p-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <Card className="glass border-border p-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No {config.label.toLowerCase()} found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {recursive
              ? "Try a different directory"
              : "Enable recursive scanning to search subdirectories"}
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {/* Directories first */}
          {directories_.map((dir, idx) => (
            <motion.div
              key={dir.path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
            >
              <Card
                className="glass border-border p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                onClick={() => handleFileClick(dir)}
              >
                <div className="aspect-square flex items-center justify-center bg-amber-500/10 rounded-lg mb-2">
                  <Folder className="h-10 w-10 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-sm text-foreground truncate">{dir.name}</p>
              </Card>
            </motion.div>
          ))}

          {/* Media files */}
          {mediaFiles.map((file, idx) => (
            <motion.div
              key={file.path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: (directories_.length + idx) * 0.02 }}
            >
              <Card
                className={`glass border-border p-2 cursor-pointer hover:border-primary/50 transition-colors group ${
                  selectedFile?.path === file.path ? "border-primary bg-primary/10" : ""
                }`}
                onClick={() => handleFileClick(file)}
              >
                <div className="aspect-video relative overflow-hidden rounded-lg mb-2 bg-muted/20">
                  {mediaType === "image" ? (
                    <img
                      src={getMediaUrl(file.path)}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : mediaType === "video" ? (
                    <img
                      src={getVideoThumbnailUrl(file.path)}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken thumbnail and show fallback icon
                        const target = e.currentTarget
                        target.style.display = "none"
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = "flex"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <config.icon className={`h-10 w-10 ${
                        mediaType === "audio" ? "text-green-400" : "text-purple-400"
                      }`} />
                    </div>
                  )}
                  {/* Video fallback icon (hidden by default) */}
                  {mediaType === "video" && (
                    <div className="w-full h-full items-center justify-center absolute inset-0 hidden" style={{ display: "none" }}>
                      <Video className="h-10 w-10 text-purple-400" />
                    </div>
                  )}
                  {(mediaType === "audio" || mediaType === "video") && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <Play className="h-8 w-8 text-white" fill="currentColor" />
                    </div>
                  )}
                  {/* Video duration badge */}
                  {mediaType === "video" && videoMetadata?.[file.path] && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                      {videoMetadata[file.path]?.durationFormatted}
                    </div>
                  )}
                </div>
                <p className="text-xs text-foreground truncate">{file.name}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  {mediaType === "video" && videoMetadata?.[file.path] && (
                    <span>{videoMetadata[file.path]?.width}×{videoMetadata[file.path]?.height}</span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-1">
            {/* Directories first */}
            {directories_.map((dir, idx) => (
              <motion.div
                key={dir.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
              >
                <div
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer group"
                  onClick={() => handleFileClick(dir)}
                >
                  <Folder className="h-5 w-5 text-amber-400" />
                  <span className="flex-1 text-sm text-foreground truncate">{dir.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}

            {/* Media files */}
            {mediaFiles.map((file, idx) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: (directories_.length + idx) * 0.02 }}
              >
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer group ${
                    selectedFile?.path === file.path ? "bg-primary/10" : ""
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  {mediaType === "image" ? (
                    <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={getMediaUrl(file.path)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : mediaType === "video" ? (
                    <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0 relative bg-muted/20">
                      <img
                        src={getVideoThumbnailUrl(file.path)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.display = "none"
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Video className="h-5 w-5 text-purple-400 opacity-50" />
                      </div>
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                      mediaType === "audio" ? "bg-green-500/10" : "bg-purple-500/10"
                    }`}>
                      <config.icon className={`h-5 w-5 ${
                        mediaType === "audio" ? "text-green-400" : "text-purple-400"
                      }`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {mediaType === "video" && videoMetadata?.[file.path] && (
                        <>
                          <span>•</span>
                          <span>{videoMetadata[file.path]?.durationFormatted}</span>
                          <span>•</span>
                          <span>{videoMetadata[file.path]?.width}×{videoMetadata[file.path]?.height}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {(mediaType === "audio" || mediaType === "video") && (
                    <Play className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
