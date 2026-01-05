"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  Music,
  Video,
  X,
  Check,
  FileAudio,
  FileVideo,
  Loader2,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type DownloadOptions,
  type QualityPreset,
  AUDIO_PRESETS,
  VIDEO_PRESETS,
} from "@/hooks/useVideoDownload"

interface VideoInfo {
  videoId: string
  title: string
  thumbnail: string
  channelTitle?: string
  duration?: string
}

interface VideoDownloadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: VideoInfo | null
  onDownload: (options: DownloadOptions) => Promise<void>
}

export function VideoDownloadModal({
  open,
  onOpenChange,
  video,
  onDownload,
}: VideoDownloadModalProps) {
  const [downloadType, setDownloadType] = useState<"audio" | "video">("audio")
  const [selectedPreset, setSelectedPreset] = useState<string>("audio-best-mp3")
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!video) return

    const preset = [...AUDIO_PRESETS, ...VIDEO_PRESETS].find(p => p.id === selectedPreset)
    if (!preset) return

    setIsDownloading(true)
    try {
      const url = `https://www.youtube.com/watch?v=${video.videoId}`
      await onDownload({
        url,
        type: preset.type,
        audioFormat: preset.audioFormat,
        videoFormat: preset.videoFormat,
        videoQuality: preset.videoQuality,
      })
      onOpenChange(false)
    } finally {
      setIsDownloading(false)
    }
  }

  // Update selected preset when switching tabs
  const handleTypeChange = (type: string) => {
    setDownloadType(type as "audio" | "video")
    if (type === "audio") {
      setSelectedPreset("audio-best-mp3")
    } else {
      setSelectedPreset("video-1080p")
    }
  }

  const currentPresets = downloadType === "audio" ? AUDIO_PRESETS : VIDEO_PRESETS

  if (!video) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Video
          </DialogTitle>
          <DialogDescription>
            Choose format and quality for your download
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-24 h-14 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{video.title}</p>
              {video.channelTitle && (
                <p className="text-xs text-muted-foreground mt-1">{video.channelTitle}</p>
              )}
              {video.duration && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {video.duration}
                </Badge>
              )}
            </div>
          </div>

          {/* Download Type Tabs */}
          <Tabs value={downloadType} onValueChange={handleTypeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="audio" className="gap-2">
                <Music className="h-4 w-4" />
                Audio Only
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audio" className="mt-4">
              <div className="space-y-2">
                {AUDIO_PRESETS.map(preset => (
                  <PresetOption
                    key={preset.id}
                    preset={preset}
                    selected={selectedPreset === preset.id}
                    onSelect={() => setSelectedPreset(preset.id)}
                    icon={<FileAudio className="h-4 w-4" />}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="video" className="mt-4">
              <div className="space-y-2">
                {VIDEO_PRESETS.map(preset => (
                  <PresetOption
                    key={preset.id}
                    preset={preset}
                    selected={selectedPreset === preset.id}
                    onSelect={() => setSelectedPreset(preset.id)}
                    icon={<FileVideo className="h-4 w-4" />}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Download Info */}
          <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 space-y-1">
            <p className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Downloads to {downloadType === "audio" ? "~/Music" : "~/Videos"}/yt-downloads
            </p>
            <p>Using yt-dlp for reliable downloads</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Preset option component
function PresetOption({
  preset,
  selected,
  onSelect,
  icon,
}: {
  preset: QualityPreset
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <div className={`${selected ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>
          {preset.label}
        </p>
        <p className="text-xs text-muted-foreground">{preset.description}</p>
      </div>
      {selected && (
        <Check className="h-4 w-4 text-primary" />
      )}
    </button>
  )
}

// Download Progress Indicator component
export function DownloadProgressIndicator({
  downloads,
  onCancel,
}: {
  downloads: Array<{
    id: string
    status: string
    progress: number
    filename?: string
    speed?: string
    eta?: string
    error?: string
  }>
  onCancel: (id: string) => void
}) {
  if (downloads.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      <AnimatePresence>
        {downloads.map(download => (
          <motion.div
            key={download.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-dark rounded-lg p-3 shadow-lg border border-border/50"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {download.filename || "Downloading..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {download.status === "error"
                    ? download.error
                    : download.status === "complete"
                    ? "Download complete"
                    : download.status === "processing"
                    ? "Processing..."
                    : download.speed
                    ? `${download.speed} - ETA: ${download.eta || "calculating..."}`
                    : "Starting..."}
                </p>
              </div>
              {download.status !== "complete" && download.status !== "error" && (
                <button
                  onClick={() => onCancel(download.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {download.status === "complete" && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  download.status === "error"
                    ? "bg-destructive"
                    : download.status === "complete"
                    ? "bg-green-500"
                    : "bg-primary"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${download.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
