"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ChevronUp,
  ChevronDown,
  Monitor,
  Smartphone,
  Speaker,
  Music,
  Loader2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMusicPlayerSafe } from "./MusicPlayerProvider"
import { checkSavedTracks, saveTracks, removeTracks } from "@/lib/spotify"

// Device icon helper
function getDeviceIcon(type: string) {
  switch (type.toLowerCase()) {
    case "computer":
      return Monitor
    case "smartphone":
      return Smartphone
    case "speaker":
      return Speaker
    default:
      return Speaker
  }
}

// Format time helper
function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function PersistentMusicDrawer() {
  const context = useMusicPlayerSafe()

  // Track liked state - must be called before any early returns (Rules of Hooks)
  const [isLiked, setIsLiked] = React.useState(false)

  // Get track ID for useEffect dependency (safe to access before null checks)
  const trackId = context?.player?.currentTrack?.id || context?.remotePlayback?.item?.id

  // Check liked state when track changes
  React.useEffect(() => {
    if (trackId) {
      checkSavedTracks([trackId])
        .then(([liked]) => setIsLiked(liked))
        .catch(() => {})
    }
  }, [trackId])

  // Don't render if context is not available
  if (!context) return null

  // Extract values after null check - TypeScript now knows these are defined
  const { auth, player, isDrawerOpen, setDrawerOpen, isDrawerExpanded, setDrawerExpanded, remotePlayback, isRemoteMode } = context

  // Don't render if not authenticated or not premium
  if (!auth.isAuthenticated || !auth.isPremium) return null

  // Get track info from either SDK player or remote playback
  const currentTrack = player.currentTrack || (remotePlayback?.item ? {
    id: remotePlayback.item.id,
    name: remotePlayback.item.name,
    uri: remotePlayback.item.uri,
    duration: remotePlayback.item.duration_ms,
    artists: remotePlayback.item.artists.map(a => ({ name: a.name, uri: a.uri })),
    album: {
      name: remotePlayback.item.album.name,
      uri: remotePlayback.item.album.uri,
      images: remotePlayback.item.album.images,
    },
  } : null)

  const isPlaying = player.isActive ? player.isPlaying : (remotePlayback?.is_playing ?? false)
  const position = player.isActive ? player.position : (remotePlayback?.progress_ms ?? 0)
  const duration = player.isActive ? player.duration : (currentTrack?.duration ?? 0)
  const volume = player.isActive ? player.volume : (remotePlayback?.device?.volume_percent ?? 50)
  const shuffleState = player.isActive ? player.shuffle : (remotePlayback?.shuffle_state ?? false)
  const repeatModeState = player.isActive ? player.repeatMode : (remotePlayback?.repeat_state ?? "off")

  const toggleLike = async () => {
    if (!currentTrack?.id) return
    try {
      if (isLiked) {
        await removeTracks([currentTrack.id])
        setIsLiked(false)
      } else {
        await saveTracks([currentTrack.id])
        setIsLiked(true)
      }
    } catch (err) {
      console.error("Failed to toggle like:", err)
    }
  }

  // Volume icon
  const getVolumeIcon = () => {
    if (volume === 0) return VolumeX
    if (volume < 50) return Volume1
    return Volume2
  }
  const VolumeIcon = getVolumeIcon()

  // Don't render if no track and not playing
  if (!currentTrack && !isPlaying) return null

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50"
          data-tabz-region="music-drawer"
        >
          {/* Collapsed Mini Player */}
          {!isDrawerExpanded && (
            <div className="glass border-t border-border/30 backdrop-blur-xl bg-background/90">
              <div className="max-w-screen-2xl mx-auto px-4 py-2">
                <div className="flex items-center gap-4">
                  {/* Track info - left section */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xs">
                    {currentTrack?.album.images?.[0] ? (
                      <motion.div
                        animate={{ rotate: isPlaying ? 360 : 0 }}
                        transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                        className="flex-shrink-0"
                      >
                        <Image
                          src={currentTrack.album.images[0].url}
                          alt={currentTrack.album.name}
                          width={48}
                          height={48}
                          className="rounded-lg shadow-lg"
                        />
                      </motion.div>
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{currentTrack?.name || "Not Playing"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {currentTrack?.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={toggleLike}>
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-[#1DB954] text-[#1DB954]" : ""}`} />
                    </Button>
                  </div>

                  {/* Controls - center section */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={player.toggleShuffle}
                        className={`h-8 w-8 ${shuffleState ? "text-[#1DB954]" : "text-muted-foreground"}`}
                        disabled={isRemoteMode}
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={player.skipPrevious} disabled={isRemoteMode}>
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={player.togglePlay}
                        className="h-9 w-9 rounded-full bg-white text-black hover:scale-105 transition-transform"
                        disabled={isRemoteMode && !player.isReady}
                        data-tabz-action="toggle-play"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={player.skipNext} disabled={isRemoteMode}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={player.cycleRepeat}
                        className={`h-8 w-8 ${repeatModeState !== "off" ? "text-[#1DB954]" : "text-muted-foreground"}`}
                        disabled={isRemoteMode}
                      >
                        {repeatModeState === "track" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
                      </Button>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 w-full max-w-md">
                      <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                        {formatTime(position)}
                      </span>
                      <Slider
                        value={[position]}
                        max={duration || 100}
                        step={1000}
                        onValueChange={([value]) => player.seekTo(value)}
                        className="flex-1"
                        disabled={isRemoteMode}
                      />
                      <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Right section - volume, device, expand */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Remote mode indicator */}
                    {isRemoteMode && (
                      <Badge variant="secondary" className="text-[10px] bg-[#1DB954]/20 text-[#1DB954]">
                        <Smartphone className="h-3 w-3 mr-1" />
                        Remote
                      </Badge>
                    )}

                    {/* Volume */}
                    <div className="hidden sm:flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => player.setPlayerVolume(volume === 0 ? 50 : 0)}
                        disabled={isRemoteMode}
                      >
                        <VolumeIcon className="h-4 w-4" />
                      </Button>
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={([value]) => player.setPlayerVolume(value)}
                        className="w-20"
                        disabled={isRemoteMode}
                      />
                    </div>

                    {/* Device selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Monitor className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium">Devices</span>
                          <Button variant="ghost" size="sm" onClick={() => player.refreshDevices()} className="h-6 w-6 p-0">
                            <Loader2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <DropdownMenuSeparator />
                        {player.devices.length === 0 ? (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No devices found
                          </div>
                        ) : (
                          player.devices.map((device) => {
                            const Icon = getDeviceIcon(device.type)
                            const isActive = device.is_active || device.id === player.deviceId
                            return (
                              <DropdownMenuItem
                                key={device.id}
                                onClick={() => player.switchDevice(device.id)}
                                className={isActive ? "bg-primary/10" : ""}
                              >
                                <Icon className={`h-4 w-4 mr-2 ${isActive ? "text-primary" : ""}`} />
                                <span className={isActive ? "text-primary font-medium" : ""}>{device.name}</span>
                                {isActive && <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>}
                              </DropdownMenuItem>
                            )
                          })
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Expand/collapse */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDrawerExpanded(!isDrawerExpanded)}
                    >
                      {isDrawerExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>

                    {/* Close */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setDrawerOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Player */}
          {isDrawerExpanded && (
            <motion.div
              initial={{ height: "auto" }}
              animate={{ height: "auto" }}
              className="glass border-t border-border/30 backdrop-blur-xl bg-background/95"
            >
              <div className="max-w-screen-lg mx-auto px-4 py-6">
                {/* Header with collapse button */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Now Playing</h3>
                  <div className="flex items-center gap-2">
                    {isRemoteMode && (
                      <Badge variant="secondary" className="bg-[#1DB954]/20 text-[#1DB954]">
                        <Smartphone className="h-3 w-3 mr-1" />
                        Playing on {remotePlayback?.device?.name}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDrawerExpanded(false)}>
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Album art */}
                  <div className="flex-shrink-0">
                    {currentTrack?.album.images?.[0] ? (
                      <motion.div
                        animate={{ rotate: isPlaying ? 360 : 0 }}
                        transition={{ duration: 8, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                      >
                        <Image
                          src={currentTrack.album.images[0].url}
                          alt={currentTrack.album.name}
                          width={200}
                          height={200}
                          className="rounded-xl shadow-2xl"
                        />
                      </motion.div>
                    ) : (
                      <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
                        <Music className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Track info and controls */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-1">{currentTrack?.name || "Not Playing"}</h2>
                    <p className="text-lg text-muted-foreground mb-4">
                      {currentTrack?.artists.map((a) => a.name).join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">{currentTrack?.album.name}</p>

                    {/* Progress */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm text-muted-foreground tabular-nums w-12 text-right">
                        {formatTime(position)}
                      </span>
                      <Slider
                        value={[position]}
                        max={duration || 100}
                        step={1000}
                        onValueChange={([value]) => player.seekTo(value)}
                        className="flex-1"
                        disabled={isRemoteMode}
                      />
                      <span className="text-sm text-muted-foreground tabular-nums w-12">
                        {formatTime(duration)}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={player.toggleShuffle}
                        className={shuffleState ? "text-[#1DB954]" : "text-muted-foreground"}
                        disabled={isRemoteMode}
                      >
                        <Shuffle className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={player.skipPrevious} disabled={isRemoteMode}>
                        <SkipBack className="h-6 w-6" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={player.togglePlay}
                        className="h-14 w-14 rounded-full bg-white text-black hover:scale-105 transition-transform"
                        disabled={isRemoteMode && !player.isReady}
                      >
                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={player.skipNext} disabled={isRemoteMode}>
                        <SkipForward className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={player.cycleRepeat}
                        className={repeatModeState !== "off" ? "text-[#1DB954]" : "text-muted-foreground"}
                        disabled={isRemoteMode}
                      >
                        {repeatModeState === "track" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={toggleLike}>
                        <Heart className={`h-5 w-5 ${isLiked ? "fill-[#1DB954] text-[#1DB954]" : ""}`} />
                      </Button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => player.setPlayerVolume(volume === 0 ? 50 : 0)}
                        disabled={isRemoteMode}
                      >
                        <VolumeIcon className="h-5 w-5" />
                      </Button>
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={([value]) => player.setPlayerVolume(value)}
                        className="w-32"
                        disabled={isRemoteMode}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
