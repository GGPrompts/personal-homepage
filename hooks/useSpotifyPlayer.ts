"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getValidAccessToken,
  play,
  pause,
  skipToNext,
  skipToPrevious,
  seek,
  setVolume,
  setShuffle as setSpotifyShuffle,
  setRepeat as setSpotifyRepeat,
  transferPlayback,
  getDevices,
  type SpotifyDevice,
  type SpotifyTrack,
} from "@/lib/spotify"

// Extend Window interface for Spotify SDK
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayerInstance
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume?: number
}

interface SpotifyPlayerReadyEvent {
  device_id: string
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener(event: "ready" | "not_ready", callback: (state: SpotifyPlayerReadyEvent) => void): boolean
  addListener(event: "player_state_changed", callback: (state: SpotifyWebPlaybackState | null) => void): boolean
  addListener(event: "initialization_error" | "authentication_error" | "account_error" | "playback_error", callback: (state: SpotifyInitError) => void): boolean
  removeListener: (event: string, callback?: () => void) => boolean
  getCurrentState: () => Promise<SpotifyWebPlaybackState | null>
  setName: (name: string) => Promise<void>
  getVolume: () => Promise<number>
  setVolume: (volume: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (position_ms: number) => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
}

interface SpotifyWebPlaybackState {
  context: {
    uri: string | null
    metadata: Record<string, unknown> | null
  }
  disallows: {
    pausing?: boolean
    peeking_next?: boolean
    peeking_prev?: boolean
    resuming?: boolean
    seeking?: boolean
    skipping_next?: boolean
    skipping_prev?: boolean
  }
  paused: boolean
  position: number
  repeat_mode: 0 | 1 | 2 // 0 = off, 1 = context, 2 = track
  shuffle: boolean
  track_window: {
    current_track: WebPlaybackTrack
    previous_tracks: WebPlaybackTrack[]
    next_tracks: WebPlaybackTrack[]
  }
  duration: number
}

interface WebPlaybackTrack {
  uri: string
  id: string | null
  type: "track" | "episode" | "ad"
  media_type: "audio" | "video"
  name: string
  is_playable: boolean
  album: {
    uri: string
    name: string
    images: Array<{ url: string; height: number; width: number }>
  }
  artists: Array<{ uri: string; name: string }>
  duration_ms: number
}

interface SpotifyInitError {
  message: string
}

export interface SpotifyPlayerState {
  // Player readiness
  isReady: boolean
  deviceId: string | null
  isActive: boolean

  // Playback state
  isPlaying: boolean
  position: number
  duration: number
  volume: number
  shuffle: boolean
  repeatMode: "off" | "context" | "track"

  // Current track
  currentTrack: {
    id: string
    name: string
    uri: string
    duration: number
    artists: Array<{ name: string; uri: string }>
    album: {
      name: string
      uri: string
      images: Array<{ url: string; height: number; width: number }>
    }
  } | null

  // Queue
  previousTracks: WebPlaybackTrack[]
  nextTracks: WebPlaybackTrack[]
}

export interface UseSpotifyPlayerReturn extends SpotifyPlayerState {
  // SDK status
  sdkLoaded: boolean
  error: string | null

  // Player controls
  togglePlay: () => Promise<void>
  playTrack: (uri: string) => Promise<void>
  playTracks: (uris: string[], offset?: number) => Promise<void>
  playContext: (uri: string, offset?: number) => Promise<void>
  skipNext: () => Promise<void>
  skipPrevious: () => Promise<void>
  seekTo: (positionMs: number) => Promise<void>
  setPlayerVolume: (percent: number) => Promise<void>
  toggleShuffle: () => Promise<void>
  cycleRepeat: () => Promise<void>

  // Device management
  devices: SpotifyDevice[]
  refreshDevices: () => Promise<void>
  switchDevice: (deviceId: string) => Promise<void>
}

const PLAYER_NAME = "Personal Homepage"
const SDK_URL = "https://sdk.scdn.co/spotify-player.js"

/**
 * Hook for Spotify Web Playback SDK
 *
 * Requires:
 * - User to be authenticated with Spotify (use useSpotifyAuth)
 * - User to have Spotify Premium
 *
 * Provides:
 * - Real-time playback state updates
 * - Playback controls
 * - Device management
 */
export function useSpotifyPlayer(isAuthenticated: boolean, isPremium: boolean): UseSpotifyPlayerReturn {
  // SDK state
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Player instance ref
  const playerRef = useRef<SpotifyPlayerInstance | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(50)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<"off" | "context" | "track">("off")

  // Track state
  const [currentTrack, setCurrentTrack] = useState<SpotifyPlayerState["currentTrack"]>(null)
  const [previousTracks, setPreviousTracks] = useState<WebPlaybackTrack[]>([])
  const [nextTracks, setNextTracks] = useState<WebPlaybackTrack[]>([])

  // Devices
  const [devices, setDevices] = useState<SpotifyDevice[]>([])

  // Position update interval
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load Spotify SDK script
  useEffect(() => {
    if (!isAuthenticated || !isPremium) return
    if (typeof window === "undefined") return
    if (window.Spotify) {
      setSdkLoaded(true)
      return
    }

    // Check if script is already loading
    const existingScript = document.querySelector(`script[src="${SDK_URL}"]`)
    if (existingScript) return

    // Define callback before loading script
    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkLoaded(true)
    }

    // Load SDK script
    const script = document.createElement("script")
    script.src = SDK_URL
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup is handled by disconnect
    }
  }, [isAuthenticated, isPremium])

  // Initialize player when SDK is loaded
  useEffect(() => {
    if (!sdkLoaded || !isAuthenticated || !isPremium) return
    if (playerRef.current) return

    const initPlayer = async () => {
      try {
        const player = new window.Spotify.Player({
          name: PLAYER_NAME,
          getOAuthToken: async (callback) => {
            const token = await getValidAccessToken()
            if (token) callback(token)
          },
          volume: 0.5,
        })

        // Ready event
        player.addListener("ready", ({ device_id }) => {
          console.log("Spotify player ready, device ID:", device_id)
          setDeviceId(device_id)
          setIsReady(true)
          setError(null)
        })

        // Not ready event
        player.addListener("not_ready", ({ device_id }) => {
          console.log("Spotify player not ready, device ID:", device_id)
          setIsReady(false)
        })

        // Playback state changed
        player.addListener("player_state_changed", (state) => {
          if (!state) {
            setIsActive(false)
            return
          }

          const webPlaybackState = state as SpotifyWebPlaybackState
          setIsActive(true)
          setIsPlaying(!webPlaybackState.paused)
          setPosition(webPlaybackState.position)
          setDuration(webPlaybackState.duration || webPlaybackState.track_window?.current_track?.duration_ms || 0)
          setShuffle(webPlaybackState.shuffle)

          // Map repeat mode
          const repeatMap: Record<number, "off" | "context" | "track"> = {
            0: "off",
            1: "context",
            2: "track",
          }
          setRepeatMode(repeatMap[webPlaybackState.repeat_mode] || "off")

          // Current track
          const track = webPlaybackState.track_window?.current_track
          if (track) {
            setCurrentTrack({
              id: track.id || "",
              name: track.name,
              uri: track.uri,
              duration: track.duration_ms,
              artists: track.artists,
              album: track.album,
            })
          } else {
            setCurrentTrack(null)
          }

          // Queue
          setPreviousTracks(webPlaybackState.track_window?.previous_tracks || [])
          setNextTracks(webPlaybackState.track_window?.next_tracks || [])
        })

        // Initialization error
        player.addListener("initialization_error", (error) => {
          console.error("Spotify initialization error:", error.message)
          setError(`Initialization failed: ${error.message}`)
        })

        // Authentication error
        player.addListener("authentication_error", (error) => {
          console.error("Spotify authentication error:", error.message)
          setError(`Authentication failed: ${error.message}`)
        })

        // Account error
        player.addListener("account_error", (error) => {
          console.error("Spotify account error:", error.message)
          setError(`Account error: ${error.message}. Premium required.`)
        })

        // Playback error
        player.addListener("playback_error", (error) => {
          console.error("Spotify playback error:", error.message)
          setError(`Playback error: ${error.message}`)
        })

        // Connect
        const connected = await player.connect()
        if (connected) {
          console.log("Spotify player connected")
          playerRef.current = player
        } else {
          setError("Failed to connect to Spotify")
        }
      } catch (err) {
        console.error("Failed to initialize Spotify player:", err)
        setError(err instanceof Error ? err.message : "Failed to initialize player")
      }
    }

    initPlayer()

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
      }
    }
  }, [sdkLoaded, isAuthenticated, isPremium])

  // Position update interval
  useEffect(() => {
    if (isPlaying && isActive) {
      positionIntervalRef.current = setInterval(() => {
        setPosition((prev) => Math.min(prev + 1000, duration))
      }, 1000)
    } else {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
        positionIntervalRef.current = null
      }
    }

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }
  }, [isPlaying, isActive, duration])

  // Player controls
  const togglePlay = useCallback(async () => {
    if (!playerRef.current) return
    await playerRef.current.togglePlay()
  }, [])

  const playTrack = useCallback(async (uri: string) => {
    if (!deviceId) return
    await play({ deviceId, uris: [uri] })
  }, [deviceId])

  const playTracks = useCallback(async (uris: string[], offset = 0) => {
    if (!deviceId) return
    await play({
      deviceId,
      uris,
      positionMs: 0,
    })
    // If offset > 0, skip to that track
    for (let i = 0; i < offset; i++) {
      await skipToNext(deviceId)
    }
  }, [deviceId])

  const playContext = useCallback(async (uri: string, offset = 0) => {
    if (!deviceId) return
    await play({
      deviceId,
      contextUri: uri,
      positionMs: 0,
    })
  }, [deviceId])

  const handleSkipNext = useCallback(async () => {
    if (!playerRef.current) return
    await playerRef.current.nextTrack()
  }, [])

  const handleSkipPrevious = useCallback(async () => {
    if (!playerRef.current) return
    await playerRef.current.previousTrack()
  }, [])

  const seekTo = useCallback(async (positionMs: number) => {
    if (!playerRef.current) return
    await playerRef.current.seek(positionMs)
    setPosition(positionMs)
  }, [])

  const setPlayerVolume = useCallback(async (percent: number) => {
    if (!playerRef.current) return
    await playerRef.current.setVolume(percent / 100)
    setVolumeState(percent)
  }, [])

  const toggleShuffleState = useCallback(async () => {
    if (!deviceId) return
    await setSpotifyShuffle(!shuffle, deviceId)
  }, [deviceId, shuffle])

  const cycleRepeat = useCallback(async () => {
    if (!deviceId) return
    const nextState = repeatMode === "off" ? "context" : repeatMode === "context" ? "track" : "off"
    await setSpotifyRepeat(nextState, deviceId)
  }, [deviceId, repeatMode])

  const refreshDevices = useCallback(async () => {
    try {
      const deviceList = await getDevices()
      setDevices(deviceList)
    } catch (err) {
      console.error("Failed to fetch devices:", err)
    }
  }, [])

  const switchDevice = useCallback(async (targetDeviceId: string) => {
    try {
      await transferPlayback(targetDeviceId, true)
      await refreshDevices()
    } catch (err) {
      console.error("Failed to switch device:", err)
    }
  }, [refreshDevices])

  // Initial device fetch
  useEffect(() => {
    if (isAuthenticated && isPremium) {
      refreshDevices()
    }
  }, [isAuthenticated, isPremium, refreshDevices])

  return {
    // SDK status
    sdkLoaded,
    error,

    // Player readiness
    isReady,
    deviceId,
    isActive,

    // Playback state
    isPlaying,
    position,
    duration,
    volume,
    shuffle,
    repeatMode,

    // Current track
    currentTrack,
    previousTracks,
    nextTracks,

    // Controls
    togglePlay,
    playTrack,
    playTracks,
    playContext,
    skipNext: handleSkipNext,
    skipPrevious: handleSkipPrevious,
    seekTo,
    setPlayerVolume,
    toggleShuffle: toggleShuffleState,
    cycleRepeat,

    // Devices
    devices,
    refreshDevices,
    switchDevice,
  }
}
