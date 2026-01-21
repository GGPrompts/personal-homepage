"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { useSpotifyAuth, type UseSpotifyAuthReturn } from "@/hooks/useSpotifyAuth"
import { useSpotifyPlayer, type UseSpotifyPlayerReturn } from "@/hooks/useSpotifyPlayer"
import { getPlaybackState, getTopTracks, type SpotifyTrack, type SpotifyPlaybackState } from "@/lib/spotify"

// Time range options for top tracks
export type TimeRange = "short_term" | "medium_term" | "long_term"

export interface MusicPlayerContextType {
  // Auth state from useSpotifyAuth
  auth: UseSpotifyAuthReturn
  // Player state from useSpotifyPlayer
  player: UseSpotifyPlayerReturn
  // UI state for the drawer
  isDrawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  isDrawerExpanded: boolean
  setDrawerExpanded: (expanded: boolean) => void
  // Remote playback state (for when playing on other devices)
  remotePlayback: SpotifyPlaybackState | null
  isRemoteMode: boolean
  // Centralized device selection state
  activeDeviceId: string | null
  switchToDevice: (deviceId: string) => Promise<void>
  // Top tracks
  topTracks: SpotifyTrack[]
  topTracksTimeRange: TimeRange
  setTopTracksTimeRange: (range: TimeRange) => void
  isLoadingTopTracks: boolean
  refreshTopTracks: () => Promise<void>
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null)

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext)
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider")
  }
  return context
}

// Hook to safely access music player context (returns null outside provider)
export function useMusicPlayerSafe() {
  return useContext(MusicPlayerContext)
}

interface MusicPlayerProviderProps {
  children: React.ReactNode
}

export function MusicPlayerProvider({ children }: MusicPlayerProviderProps) {
  // Core auth and player hooks
  const auth = useSpotifyAuth()
  const player = useSpotifyPlayer(auth.isAuthenticated, auth.isPremium)

  // Drawer UI state
  const [isDrawerOpen, setDrawerOpen] = useState(true)
  const [isDrawerExpanded, setDrawerExpanded] = useState(false)

  // Remote playback state (for playing on other devices)
  const [remotePlayback, setRemotePlayback] = useState<SpotifyPlaybackState | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Top tracks state
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([])
  const [topTracksTimeRange, setTopTracksTimeRange] = useState<TimeRange>("medium_term")
  const [isLoadingTopTracks, setIsLoadingTopTracks] = useState(false)

  // Centralized device selection state
  // This tracks the device the user explicitly selected, providing a single source of truth
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)

  // Initialize activeDeviceId from player's deviceId when SDK is ready
  useEffect(() => {
    if (player.deviceId && !activeDeviceId) {
      setActiveDeviceId(player.deviceId)
    }
  }, [player.deviceId, activeDeviceId])

  // Update activeDeviceId when remote playback indicates a different active device
  useEffect(() => {
    if (remotePlayback?.device?.id && remotePlayback.device.id !== activeDeviceId) {
      // Only update if we detect playback on a different device
      // This keeps state in sync when user switches devices from other apps
      setActiveDeviceId(remotePlayback.device.id)
    }
  }, [remotePlayback?.device?.id, activeDeviceId])

  // Centralized device switching function
  const switchToDevice = useCallback(async (deviceId: string) => {
    // Optimistically update the UI immediately
    setActiveDeviceId(deviceId)
    try {
      // Delegate to player's switchDevice which handles Spotify API
      await player.switchDevice(deviceId)
    } catch (err) {
      // Revert on failure - get the actual active device from devices list
      console.error("Failed to switch device:", err)
      const actualActive = player.devices.find(d => d.is_active)
      setActiveDeviceId(actualActive?.id ?? player.deviceId)
    }
  }, [player])

  // Determine if we're in remote mode (playing on another device, not our SDK player)
  const isRemoteMode = auth.isAuthenticated &&
    auth.isPremium &&
    !player.isActive &&
    (remotePlayback?.is_playing ?? false)

  // Poll for remote playback state
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.isPremium) {
      setRemotePlayback(null)
      return
    }

    const pollPlaybackState = async () => {
      try {
        const state = await getPlaybackState()
        setRemotePlayback(state)
      } catch (err) {
        // Silently fail - user might not have any playback
        console.debug("Failed to get playback state:", err)
      }
    }

    // Initial fetch
    pollPlaybackState()

    // Poll every 3 seconds when our SDK player is not active
    // This catches playback from phones, desktop app, etc.
    if (!player.isActive) {
      pollIntervalRef.current = setInterval(pollPlaybackState, 3000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [auth.isAuthenticated, auth.isPremium, player.isActive])

  // Fetch top tracks
  const refreshTopTracks = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.isPremium) return

    setIsLoadingTopTracks(true)
    try {
      const result = await getTopTracks(topTracksTimeRange, 50)
      setTopTracks(result.items)
    } catch (err) {
      console.error("Failed to fetch top tracks:", err)
    } finally {
      setIsLoadingTopTracks(false)
    }
  }, [auth.isAuthenticated, auth.isPremium, topTracksTimeRange])

  // Refetch top tracks when time range changes
  useEffect(() => {
    if (auth.isAuthenticated && auth.isPremium) {
      refreshTopTracks()
    }
  }, [auth.isAuthenticated, auth.isPremium, topTracksTimeRange, refreshTopTracks])

  const value: MusicPlayerContextType = {
    auth,
    player,
    isDrawerOpen,
    setDrawerOpen,
    isDrawerExpanded,
    setDrawerExpanded,
    remotePlayback,
    isRemoteMode,
    activeDeviceId,
    switchToDevice,
    topTracks,
    topTracksTimeRange,
    setTopTracksTimeRange,
    isLoadingTopTracks,
    refreshTopTracks,
  }

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  )
}
