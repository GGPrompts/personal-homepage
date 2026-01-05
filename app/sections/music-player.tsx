"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  ListMusic,
  Library,
  Home,
  Search,
  Plus,
  MoreHorizontal,
  Clock,
  Music,
  Disc3,
  Mic2,
  Radio,
  ChevronLeft,
  ChevronRight,
  X,
  GripVertical,
  ExternalLink,
  User,
  PlayCircle,
  Maximize2,
  Minimize2,
  Link,
  FileAudio,
  Upload,
  Loader2,
  HardDrive,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LocalMediaBrowser } from "@/components/LocalMediaBrowser"
import { getMediaUrl, type MediaFile } from "@/hooks/useMediaLibrary"
import { SpotifyPlayer } from "@/components/SpotifyPlayer"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useRadioSearch,
  usePopularStations,
  useRadioFavorites,
  useRecordStationClick,
  POPULAR_GENRES,
  POPULAR_COUNTRIES,
  type RadioStation,
} from "@/hooks/useRadioStations"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RadioStation as PyradioStation } from "@/lib/radio-utils"

// TypeScript Interfaces
interface Artist {
  id: string
  name: string
  image: string
  followers: number
  monthlyListeners: number
}

interface Album {
  id: string
  title: string
  artist: Artist
  cover: string
  releaseDate: string
  type: "album" | "single" | "ep"
}

interface Track {
  id: string
  title: string
  artist: Artist
  album: Album
  duration: number
  isLiked: boolean
  isExplicit: boolean
  plays: number
  url?: string // Audio source URL (remote or blob URL for local files)
}

interface Playlist {
  id: string
  name: string
  description?: string
  cover: string
  owner: string
  tracks: Track[]
  isPublic: boolean
  followers: number
}

interface NowPlaying {
  track: Track
  isPlaying: boolean
  progress: number
  volume: number
  repeat: "off" | "all" | "one"
  shuffle: boolean
  isMuted: boolean
}

// Mock Data
const mockArtists: Artist[] = [
  { id: "artist-1", name: "The Midnight", image: "/api/placeholder/200/200", followers: 1250000, monthlyListeners: 3200000 },
  { id: "artist-2", name: "FM-84", image: "/api/placeholder/200/200", followers: 890000, monthlyListeners: 2100000 },
  { id: "artist-3", name: "Gunship", image: "/api/placeholder/200/200", followers: 720000, monthlyListeners: 1800000 },
  { id: "artist-4", name: "Timecop1983", image: "/api/placeholder/200/200", followers: 450000, monthlyListeners: 980000 },
  { id: "artist-5", name: "NINA", image: "/api/placeholder/200/200", followers: 380000, monthlyListeners: 760000 },
]

const mockAlbums: Album[] = [
  { id: "album-1", title: "Endless Summer", artist: mockArtists[0], cover: "/api/placeholder/300/300", releaseDate: "2016-07-08", type: "album" },
  { id: "album-2", title: "Nocturnal", artist: mockArtists[0], cover: "/api/placeholder/300/300", releaseDate: "2017-09-15", type: "album" },
  { id: "album-3", title: "Atlas", artist: mockArtists[1], cover: "/api/placeholder/300/300", releaseDate: "2016-06-24", type: "album" },
  { id: "album-4", title: "Dark All Day", artist: mockArtists[2], cover: "/api/placeholder/300/300", releaseDate: "2018-10-05", type: "album" },
  { id: "album-5", title: "Night Drive", artist: mockArtists[3], cover: "/api/placeholder/300/300", releaseDate: "2017-03-10", type: "album" },
]

const mockTracks: Track[] = [
  { id: "track-1", title: "Sunset", artist: mockArtists[0], album: mockAlbums[0], duration: 245, isLiked: true, isExplicit: false, plays: 45200000 },
  { id: "track-2", title: "Days of Thunder", artist: mockArtists[0], album: mockAlbums[0], duration: 312, isLiked: true, isExplicit: false, plays: 38100000 },
  { id: "track-3", title: "Gloria", artist: mockArtists[0], album: mockAlbums[1], duration: 287, isLiked: false, isExplicit: false, plays: 52300000 },
  { id: "track-4", title: "Los Angeles", artist: mockArtists[0], album: mockAlbums[1], duration: 265, isLiked: true, isExplicit: false, plays: 41800000 },
  { id: "track-5", title: "Running in the Night", artist: mockArtists[1], album: mockAlbums[2], duration: 298, isLiked: true, isExplicit: false, plays: 89400000 },
  { id: "track-6", title: "Arcade Summer", artist: mockArtists[1], album: mockAlbums[2], duration: 234, isLiked: false, isExplicit: false, plays: 28700000 },
  { id: "track-7", title: "Tech Noir", artist: mockArtists[2], album: mockAlbums[3], duration: 356, isLiked: true, isExplicit: true, plays: 67200000 },
  { id: "track-8", title: "Dark All Day", artist: mockArtists[2], album: mockAlbums[3], duration: 324, isLiked: false, isExplicit: false, plays: 31500000 },
  { id: "track-9", title: "On the Run", artist: mockArtists[3], album: mockAlbums[4], duration: 276, isLiked: true, isExplicit: false, plays: 19800000 },
  { id: "track-10", title: "Neon Lights", artist: mockArtists[3], album: mockAlbums[4], duration: 245, isLiked: false, isExplicit: false, plays: 15600000 },
]

const mockPlaylists: Playlist[] = [
  { id: "playlist-1", name: "Synthwave Essentials", description: "The best of synthwave and retrowave", cover: "/api/placeholder/300/300", owner: "You", tracks: mockTracks.slice(0, 6), isPublic: true, followers: 125000 },
  { id: "playlist-2", name: "Night Drive", description: "Perfect for late night drives", cover: "/api/placeholder/300/300", owner: "You", tracks: mockTracks.slice(2, 8), isPublic: true, followers: 89000 },
  { id: "playlist-3", name: "Chill Retrowave", description: "Relaxing synthwave vibes", cover: "/api/placeholder/300/300", owner: "You", tracks: mockTracks.slice(4, 10), isPublic: false, followers: 0 },
  { id: "playlist-4", name: "Workout Synth", description: "High energy synthwave", cover: "/api/placeholder/300/300", owner: "You", tracks: mockTracks.slice(0, 5), isPublic: true, followers: 45000 },
]

const genres = [
  { name: "Synthwave", color: "hsl(var(--primary))" },
  { name: "Retrowave", color: "hsl(var(--secondary))" },
  { name: "Darksynth", color: "hsl(280 70% 50%)" },
  { name: "Outrun", color: "hsl(340 70% 50%)" },
  { name: "Chillwave", color: "hsl(200 70% 50%)" },
  { name: "Vaporwave", color: "hsl(300 70% 50%)" },
]

export function MusicPlayerSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  // Player mode: synthwave (local files) or spotify
  const [playerMode, setPlayerMode] = useState<"synthwave" | "spotify">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("music-player-mode")
      return saved === "spotify" ? "spotify" : "synthwave"
    }
    return "synthwave"
  })

  // Save player mode preference
  useEffect(() => {
    localStorage.setItem("music-player-mode", playerMode)
  }, [playerMode])

  // Navigation state
  const [activeView, setActiveView] = useState<"home" | "search" | "library" | "localfiles" | "radio" | "playlist" | "album" | "artist">("home")
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Player state
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>({
    track: mockTracks[0],
    isPlaying: false,
    progress: 35,
    volume: 75,
    repeat: "off",
    shuffle: false,
    isMuted: false,
  })

  // Queue state
  const [queue, setQueue] = useState<Track[]>(mockTracks.slice(1, 6))
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Track[]>([])

  // Mobile state
  const [showMobilePlayer, setShowMobilePlayer] = useState(false)

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Add track modal state
  const [showAddTrackModal, setShowAddTrackModal] = useState(false)
  const [newTrackUrl, setNewTrackUrl] = useState("")
  const [newTrackTitle, setNewTrackTitle] = useState("")
  const [newTrackArtist, setNewTrackArtist] = useState("")
  const [isLoadingTrack, setIsLoadingTrack] = useState(false)

  // User-added tracks (with audio URLs)
  const [userTracks, setUserTracks] = useState<Track[]>([])

  // Audio error state
  const [audioError, setAudioError] = useState<string | null>(null)

  // Radio state (Radio Browser API)
  const [radioSearchQuery, setRadioSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string>("")
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [currentRadioStation, setCurrentRadioStation] = useState<RadioStation | null>(null)
  const [isRadioPlaying, setIsRadioPlaying] = useState(false)

  // Radio hooks
  const {
    data: radioSearchResults,
    isLoading: isRadioSearching,
  } = useRadioSearch(radioSearchQuery, {
    tag: selectedGenre || undefined,
    country: selectedCountry || undefined,
    enabled: activeView === "radio" && (!!radioSearchQuery || !!selectedGenre || !!selectedCountry),
  })
  const { data: popularStations, isLoading: isLoadingPopular } = usePopularStations(20, activeView === "radio" && !radioSearchQuery && !selectedGenre && !selectedCountry)
  const { favorites, toggleFavorite, isFavorite } = useRadioFavorites()
  const recordClick = useRecordStationClick()

  // Pyradio stations state (My Stations)
  const [pyradioStations, setPyradioStations] = useState<PyradioStation[]>([])
  const [pyradioLoading, setPyradioLoading] = useState(false)
  const [pyradioError, setPyradioError] = useState<string | null>(null)

  // Audio event handlers - timeupdate syncs progress bar
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.duration && !isNaN(audio.duration)) {
      const progress = (audio.currentTime / audio.duration) * 100
      setNowPlaying((prev) => ({ ...prev, progress }))
    }
  }, [])

  // Handle audio ended event
  const handleAudioEnded = useCallback(() => {
    if (nowPlaying.repeat === "one") {
      // Repeat single track
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    } else if (queue.length > 0) {
      // Auto advance to next track
      const nextTrack = queue[0]
      setQueue((q) => q.slice(1))
      setNowPlaying((prev) => ({ ...prev, track: nextTrack, progress: 0 }))
    } else if (nowPlaying.repeat === "all") {
      // Repeat all - restart queue (for now just reset progress)
      setNowPlaying((prev) => ({ ...prev, progress: 0 }))
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    } else {
      // Stop playback
      setNowPlaying((prev) => ({ ...prev, isPlaying: false, progress: 0 }))
    }
  }, [nowPlaying.repeat, queue])

  // Handle metadata loaded (get actual duration)
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.duration && !isNaN(audio.duration)) {
      setAudioError(null) // Clear any previous error
      // Update track duration if it's a user-added track
      if (nowPlaying.track.url) {
        setNowPlaying((prev) => ({
          ...prev,
          track: { ...prev.track, duration: Math.floor(audio.duration) },
        }))
      }
    }
  }, [nowPlaying.track.url])

  // Handle audio error
  const handleAudioError = useCallback(() => {
    setAudioError("Failed to load audio")
    setNowPlaying((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  // Effect to load audio when track changes
  useEffect(() => {
    const audio = audioRef.current
    setAudioError(null) // Clear error when loading new track
    if (audio && nowPlaying.track.url) {
      audio.src = nowPlaying.track.url
      audio.load()
      if (nowPlaying.isPlaying) {
        audio.play().catch(console.error)
      }
    }
  }, [nowPlaying.track.id, nowPlaying.track.url])

  // Effect to handle play/pause state changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio && nowPlaying.track.url) {
      if (nowPlaying.isPlaying) {
        audio.play().catch(console.error)
      } else {
        audio.pause()
      }
    }
  }, [nowPlaying.isPlaying, nowPlaying.track.url])

  // Effect to handle volume changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = nowPlaying.isMuted ? 0 : nowPlaying.volume / 100
    }
  }, [nowPlaying.volume, nowPlaying.isMuted])

  // Fallback simulation for tracks without audio URLs (mock tracks)
  useEffect(() => {
    let interval: NodeJS.Timeout
    // Only simulate progress for tracks without actual audio URLs
    if (nowPlaying.isPlaying && !nowPlaying.track.url) {
      interval = setInterval(() => {
        setNowPlaying((prev) => {
          const newProgress = prev.progress + (100 / prev.track.duration)
          if (newProgress >= 100) {
            // Auto advance to next track
            if (queue.length > 0) {
              const nextTrack = queue[0]
              setQueue((q) => q.slice(1))
              return { ...prev, track: nextTrack, progress: 0 }
            }
            return { ...prev, isPlaying: false, progress: 0 }
          }
          return { ...prev, progress: newProgress }
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [nowPlaying.isPlaying, nowPlaying.track.url, queue])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = mockTracks.filter(
        (track) =>
          track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          track.artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          track.album.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  // Fetch pyradio stations when radio view is active
  useEffect(() => {
    if (activeView === "radio" && pyradioStations.length === 0 && !pyradioLoading) {
      setPyradioLoading(true)
      setPyradioError(null)
      fetch("/api/radio/pyradio?resolve=true")
        .then((res) => res.json())
        .then((data) => {
          if (data.stations) {
            setPyradioStations(data.stations)
          }
          if (data.error) {
            setPyradioError(data.error)
          }
        })
        .catch((err) => {
          setPyradioError(err.message || "Failed to load pyradio stations")
        })
        .finally(() => {
          setPyradioLoading(false)
        })
    }
  }, [activeView, pyradioStations.length, pyradioLoading])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Format plays count
  const formatPlays = (plays: number) => {
    if (plays >= 1000000) return `${(plays / 1000000).toFixed(1)}M`
    if (plays >= 1000) return `${(plays / 1000).toFixed(0)}K`
    return plays.toString()
  }

  // Player controls
  const togglePlay = () => setNowPlaying((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
  const toggleShuffle = () => setNowPlaying((prev) => ({ ...prev, shuffle: !prev.shuffle }))
  const toggleRepeat = () => {
    setNowPlaying((prev) => ({
      ...prev,
      repeat: prev.repeat === "off" ? "all" : prev.repeat === "all" ? "one" : "off",
    }))
  }
  const toggleMute = () => setNowPlaying((prev) => ({ ...prev, isMuted: !prev.isMuted }))
  const toggleLike = (trackId: string) => {
    if (nowPlaying.track.id === trackId) {
      setNowPlaying((prev) => ({
        ...prev,
        track: { ...prev.track, isLiked: !prev.track.isLiked },
      }))
    }
  }

  const playTrack = (track: Track) => {
    setNowPlaying((prev) => ({ ...prev, track, isPlaying: true, progress: 0 }))
  }

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track])
  }

  // Play a radio station (Radio Browser API)
  const playRadioStation = useCallback((station: RadioStation) => {
    // Stop any current track playback
    setNowPlaying((prev) => ({ ...prev, isPlaying: false }))

    // Set the radio station
    setCurrentRadioStation(station)
    setIsRadioPlaying(true)

    // Record the click for popularity tracking
    recordClick.mutate(station.stationuuid)

    // Play the station
    const audio = audioRef.current
    if (audio) {
      audio.src = station.url_resolved
      audio.load()
      audio.play().catch((err) => {
        console.error("Failed to play radio station:", err)
        setAudioError("Failed to play radio station")
        setIsRadioPlaying(false)
      })
    }
  }, [recordClick])

  // Stop radio playback
  const stopRadio = useCallback(() => {
    setIsRadioPlaying(false)
    setCurrentRadioStation(null)
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ""
    }
  }, [])

  // Play a pyradio station (My Stations)
  const playPyradioStation = (station: PyradioStation) => {
    const radioArtist = createUserTrackArtist("Radio")
    const radioAlbum = createUserTrackAlbum(station.name, radioArtist)

    const radioTrack: Track = {
      id: station.id,
      title: station.name,
      artist: radioArtist,
      album: radioAlbum,
      duration: 0, // Live stream, no duration
      isLiked: false,
      isExplicit: false,
      plays: 0,
      url: station.url,
    }

    setNowPlaying((prev) => ({ ...prev, track: radioTrack, isPlaying: true, progress: 0 }))
    // Clear queue when playing radio - it's a live stream
    setQueue([])
  }

  const skipNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0]
      setQueue((q) => q.slice(1))
      setNowPlaying((prev) => ({ ...prev, track: nextTrack, progress: 0 }))
    }
  }

  const skipPrevious = () => {
    if (nowPlaying.progress > 10) {
      setNowPlaying((prev) => ({ ...prev, progress: 0 }))
      if (audioRef.current) {
        audioRef.current.currentTime = 0
      }
    }
  }

  // Seek to position (percentage 0-100)
  const seekTo = (percentage: number) => {
    setNowPlaying((prev) => ({ ...prev, progress: percentage }))
    if (audioRef.current && nowPlaying.track.url) {
      const duration = audioRef.current.duration
      if (duration && !isNaN(duration)) {
        audioRef.current.currentTime = (percentage / 100) * duration
      }
    }
  }

  // Create a default artist and album for user-added tracks
  const createUserTrackArtist = (name: string): Artist => ({
    id: `user-artist-${Date.now()}`,
    name: name || "Unknown Artist",
    image: "/api/placeholder/200/200",
    followers: 0,
    monthlyListeners: 0,
  })

  const createUserTrackAlbum = (title: string, artist: Artist): Album => ({
    id: `user-album-${Date.now()}`,
    title: title || "Custom Track",
    artist,
    cover: "/api/placeholder/300/300",
    releaseDate: new Date().toISOString().split("T")[0],
    type: "single",
  })

  // Add track from URL
  const addTrackFromUrl = () => {
    if (!newTrackUrl.trim()) return

    setIsLoadingTrack(true)

    const artist = createUserTrackArtist(newTrackArtist)
    const album = createUserTrackAlbum(newTrackTitle, artist)

    const newTrack: Track = {
      id: `user-track-${Date.now()}`,
      title: newTrackTitle || "Untitled Track",
      artist,
      album,
      duration: 0, // Will be updated when metadata loads
      isLiked: false,
      isExplicit: false,
      plays: 0,
      url: newTrackUrl,
    }

    setUserTracks((prev) => [...prev, newTrack])

    // Play the new track immediately
    setNowPlaying((prev) => ({ ...prev, track: newTrack, isPlaying: true, progress: 0 }))

    // Reset modal state
    setNewTrackUrl("")
    setNewTrackTitle("")
    setNewTrackArtist("")
    setShowAddTrackModal(false)
    setIsLoadingTrack(false)
  }

  // Add track from local file
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create blob URL for the file
    const blobUrl = URL.createObjectURL(file)

    // Extract filename without extension as title
    const fileName = file.name.replace(/\.[^/.]+$/, "")

    const artist = createUserTrackArtist("Local File")
    const album = createUserTrackAlbum(fileName, artist)

    const newTrack: Track = {
      id: `user-track-${Date.now()}`,
      title: fileName,
      artist,
      album,
      duration: 0, // Will be updated when metadata loads
      isLiked: false,
      isExplicit: false,
      plays: 0,
      url: blobUrl,
    }

    setUserTracks((prev) => [...prev, newTrack])

    // Play the new track immediately
    setNowPlaying((prev) => ({ ...prev, track: newTrack, isPlaying: true, progress: 0 }))

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Get volume icon
  const getVolumeIcon = () => {
    if (nowPlaying.isMuted || nowPlaying.volume === 0) return VolumeX
    if (nowPlaying.volume < 50) return Volume1
    return Volume2
  }
  const VolumeIcon = getVolumeIcon()

  // Render sidebar
  const renderSidebar = () => (
    <aside
      className={`hidden md:flex flex-col glass border-r border-border/30 transition-all duration-300 ${
        sidebarCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <motion.div
          animate={{ rotate: nowPlaying.isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: nowPlaying.isPlaying ? Infinity : 0, ease: "linear" }}
        >
          <Disc3 className="h-8 w-8 text-primary" />
        </motion.div>
        {!sidebarCollapsed && (
          <span className="text-xl font-bold text-foreground">SynthWave</span>
        )}
      </div>

      {/* Mode Selector */}
      {!sidebarCollapsed && (
        <div className="px-4 pb-2">
          <Tabs value={playerMode} onValueChange={(v) => setPlayerMode(v as "synthwave" | "spotify")}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="synthwave" className="flex-1 text-xs h-6 gap-1">
                <Disc3 className="h-3 w-3" />
                Local
              </TabsTrigger>
              <TabsTrigger value="spotify" className="flex-1 text-xs h-6 gap-1">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Navigation */}
      <nav className="px-2 py-4 space-y-1">
        <Button
          variant={activeView === "home" ? "secondary" : "ghost"}
          className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""}`}
          onClick={() => setActiveView("home")}
        >
          <Home className="h-5 w-5" />
          {!sidebarCollapsed && "Home"}
        </Button>
        <Button
          variant={activeView === "search" ? "secondary" : "ghost"}
          className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""}`}
          onClick={() => setActiveView("search")}
        >
          <Search className="h-5 w-5" />
          {!sidebarCollapsed && "Search"}
        </Button>
        <Button
          variant={activeView === "library" ? "secondary" : "ghost"}
          className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""}`}
          onClick={() => setActiveView("library")}
        >
          <Library className="h-5 w-5" />
          {!sidebarCollapsed && "Your Library"}
        </Button>
        <Button
          variant={activeView === "localfiles" ? "secondary" : "ghost"}
          className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""}`}
          onClick={() => setActiveView("localfiles")}
        >
          <HardDrive className="h-5 w-5" />
          {!sidebarCollapsed && "Local Files"}
        </Button>
        <Button
          variant={activeView === "radio" ? "secondary" : "ghost"}
          className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""}`}
          onClick={() => setActiveView("radio")}
        >
          <Radio className="h-5 w-5" />
          {!sidebarCollapsed && "Radio"}
        </Button>
      </nav>

      <Separator className="bg-border/30 mx-4" />

      {/* Add Audio */}
      <div className="px-2 py-2">
        <Button
          variant="outline"
          className={`w-full gap-2 ${sidebarCollapsed ? "px-3" : "justify-start"}`}
          onClick={() => setShowAddTrackModal(true)}
          data-tabz-action="open-add-track"
        >
          <FileAudio className="h-5 w-5" />
          {!sidebarCollapsed && "Add Audio"}
        </Button>
      </div>

      <Separator className="bg-border/30 mx-4" />

      {/* Playlists */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Playlists</span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-48 px-2">
            {mockPlaylists.map((playlist) => (
              <Button
                key={playlist.id}
                variant="ghost"
                className="w-full justify-start text-left text-muted-foreground hover:text-foreground mb-1"
                onClick={() => {
                  setSelectedPlaylist(playlist)
                  setActiveView("playlist")
                }}
              >
                <span className="truncate">{playlist.name}</span>
              </Button>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Collapse button */}
      <div className="p-4 border-t border-border/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full"
        >
          {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  )

  // Render home view
  const renderHome = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative glass rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20" />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <motion.div
            animate={{ rotate: nowPlaying.isPlaying ? 360 : 0 }}
            transition={{ duration: 8, repeat: nowPlaying.isPlaying ? Infinity : 0, ease: "linear" }}
            className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary to-secondary p-1"
          >
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <Disc3 className="h-16 w-16 md:h-20 md:w-20 text-primary" />
            </div>
          </motion.div>
          <div className="text-center md:text-left">
            <p className="text-muted-foreground text-sm mb-2">Now Playing</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {nowPlaying.track.title}
            </h2>
            <p className="text-muted-foreground">{nowPlaying.track.artist.name}</p>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
              <Button size="lg" className="gap-2" onClick={togglePlay} data-tabz-action="toggle-play">
                {nowPlaying.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {nowPlaying.isPlaying ? "Pause" : "Play"}
              </Button>
              <Button variant="outline" size="icon" onClick={() => toggleLike(nowPlaying.track.id)}>
                <Heart className={`h-5 w-5 ${nowPlaying.track.isLiked ? "fill-primary text-primary" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Your Audio - User Added Tracks */}
      {userTracks.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-foreground mb-4">Your Audio</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userTracks.map((track, idx) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                <Card
                  className={`glass border-border/30 p-4 cursor-pointer group hover:bg-primary/5 transition-colors ${
                    nowPlaying.track.id === track.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => playTrack(track)}
                >
                  <div className="relative mb-3">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-green-500/30 to-blue-500/30 flex items-center justify-center">
                      <FileAudio className="h-12 w-12 text-green-500/50" />
                    </div>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.1 }}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        playTrack(track)
                      }}
                    >
                      {nowPlaying.track.id === track.id && nowPlaying.isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </motion.button>
                  </div>
                  <h4 className="font-semibold text-foreground truncate">{track.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{track.artist.name}</p>
                  {track.duration > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(track.duration)}</p>
                  )}
                </Card>
              </motion.div>
            ))}
            {/* Add More Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: userTracks.length * 0.1 }}
            >
              <Card
                className="glass border-border/30 border-dashed p-4 cursor-pointer hover:bg-primary/5 transition-colors aspect-square flex flex-col items-center justify-center gap-3"
                onClick={() => setShowAddTrackModal(true)}
              >
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Add Audio</span>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Add Audio Quick Start (when no user tracks) */}
      {userTracks.length === 0 && (
        <section>
          <Card
            className="glass border-border/30 border-dashed p-8 cursor-pointer hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-4"
            onClick={() => setShowAddTrackModal(true)}
            data-tabz-action="quick-add-audio"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <FileAudio className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">Play Your Own Audio</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add audio files from URLs or upload from your device
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Audio
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* Featured Playlists */}
      <section>
        <h3 className="text-xl font-bold text-foreground mb-4">Featured Playlists</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockPlaylists.map((playlist, idx) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card
                className="glass border-border/30 p-4 cursor-pointer group hover:bg-primary/5 transition-colors"
                onClick={() => {
                  setSelectedPlaylist(playlist)
                  setActiveView("playlist")
                }}
              >
                <div className="relative mb-3">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                    <Music className="h-12 w-12 text-primary/50" />
                  </div>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (playlist.tracks.length > 0) playTrack(playlist.tracks[0])
                    }}
                  >
                    <Play className="h-5 w-5" />
                  </motion.button>
                </div>
                <h4 className="font-semibold text-foreground truncate">{playlist.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{playlist.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Browse by Genre */}
      <section>
        <h3 className="text-xl font-bold text-foreground mb-4">Browse by Genre</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {genres.map((genre, idx) => (
            <motion.div
              key={genre.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card
                className="glass border-border/30 p-4 cursor-pointer hover:scale-105 transition-transform"
                style={{ borderLeftColor: genre.color, borderLeftWidth: "3px" }}
              >
                <span className="font-semibold text-foreground">{genre.name}</span>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* New Releases */}
      <section>
        <h3 className="text-xl font-bold text-foreground mb-4">New Releases</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {mockAlbums.map((album, idx) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card
                className="glass border-border/30 p-4 cursor-pointer group hover:bg-primary/5 transition-colors"
                onClick={() => {
                  setSelectedAlbum(album)
                  setActiveView("album")
                }}
              >
                <div className="relative mb-3">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center">
                    <Disc3 className="h-10 w-10 text-secondary/50" />
                  </div>
                  <motion.button
                    initial={{ opacity: 0 }}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-2.5 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      const albumTracks = mockTracks.filter((t) => t.album.id === album.id)
                      if (albumTracks.length > 0) playTrack(albumTracks[0])
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </motion.button>
                </div>
                <h4 className="font-semibold text-foreground truncate text-sm">{album.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{album.artist.name}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {album.type.toUpperCase()}
                </Badge>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Artists */}
      <section>
        <h3 className="text-xl font-bold text-foreground mb-4">Popular Artists</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {mockArtists.map((artist, idx) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card className="glass border-border/30 p-4 cursor-pointer hover:bg-primary/5 transition-colors text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground text-2xl">
                    {artist.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-foreground truncate text-sm">{artist.name}</h4>
                <p className="text-xs text-muted-foreground">{formatPlays(artist.monthlyListeners)} listeners</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )

  // Render search view
  const renderSearch = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search for songs, artists, or albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-lg glass border-border/30"
          data-tabz-input="search"
        />
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {searchResults.length > 0 ? `Results for "${searchQuery}"` : `No results for "${searchQuery}"`}
          </h3>
          {searchResults.length > 0 && (
            <Card className="glass border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Album</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Plays</TableHead>
                    <TableHead className="w-20 text-right">
                      <Clock className="h-4 w-4 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((track, idx) => (
                    <TableRow
                      key={track.id}
                      className="border-border/30 cursor-pointer hover:bg-primary/5"
                      onClick={() => playTrack(track)}
                    >
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                            <Music className="h-4 w-4 text-primary/50" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {track.title}
                              {track.isExplicit && (
                                <Badge variant="outline" className="text-xs px-1">E</Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{track.artist.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {track.album.title}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground">
                        {formatPlays(track.plays)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatTime(track.duration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* Browse All (when no search) */}
      {!searchQuery && (
        <section>
          <h3 className="text-xl font-bold text-foreground mb-4">Browse All</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {genres.map((genre, idx) => (
              <motion.div
                key={genre.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <Card
                  className="glass border-border/30 p-6 cursor-pointer hover:scale-105 transition-transform aspect-square flex items-end"
                  style={{ background: `linear-gradient(135deg, ${genre.color}20, ${genre.color}10)` }}
                >
                  <span className="font-bold text-foreground text-lg">{genre.name}</span>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  // Render library view
  const renderLibrary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Your Library</h2>
        <Button variant="outline" size="icon">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass border-border/30 p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/5 transition-colors">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Liked Songs</h3>
            <p className="text-sm text-muted-foreground">{mockTracks.filter((t) => t.isLiked).length} songs</p>
          </div>
        </Card>
        <Card className="glass border-border/30 p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/5 transition-colors">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
            <Radio className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Your Episodes</h3>
            <p className="text-sm text-muted-foreground">12 episodes</p>
          </div>
        </Card>
      </div>

      {/* Playlists Grid */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4">Playlists</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockPlaylists.map((playlist, idx) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card
                className="glass border-border/30 p-4 cursor-pointer group hover:bg-primary/5 transition-colors"
                onClick={() => {
                  setSelectedPlaylist(playlist)
                  setActiveView("playlist")
                }}
              >
                <div className="relative mb-3">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                    <ListMusic className="h-12 w-12 text-primary/50" />
                  </div>
                  <motion.button
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (playlist.tracks.length > 0) playTrack(playlist.tracks[0])
                    }}
                  >
                    <Play className="h-5 w-5" />
                  </motion.button>
                </div>
                <h4 className="font-semibold text-foreground truncate">{playlist.name}</h4>
                <p className="text-sm text-muted-foreground">{playlist.tracks.length} tracks</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Artists */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4">Artists</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mockArtists.slice(0, 6).map((artist, idx) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className="glass border-border/30 p-4 cursor-pointer hover:bg-primary/5 transition-colors text-center">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground text-xl">
                    {artist.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-foreground truncate text-sm">{artist.name}</h4>
                <p className="text-xs text-muted-foreground">Artist</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )

  // Render local files view
  const renderLocalFiles = () => {
    // Create mock artist and album for local files
    const localArtist: Artist = {
      id: "local-artist",
      name: "Local File",
      image: "",
      followers: 0,
      monthlyListeners: 0,
    }

    const localAlbum: Album = {
      id: "local-album",
      title: "Local Files",
      artist: localArtist,
      cover: "",
      releaseDate: "",
      type: "album",
    }

    const handlePlayLocalFile = (file: MediaFile, allFiles: MediaFile[]) => {
      // Convert local file to Track format and play
      const localTrack: Track = {
        id: `local-${file.path}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        artist: localArtist,
        album: localAlbum,
        duration: 0, // Will be determined when played
        isLiked: false,
        isExplicit: false,
        plays: 0,
      }
      playTrack(localTrack)

      // Build queue from all files
      const localQueue: Track[] = allFiles.map((f) => ({
        id: `local-${f.path}`,
        title: f.name.replace(/\.[^/.]+$/, ""),
        artist: localArtist,
        album: localAlbum,
        duration: 0,
        isLiked: false,
        isExplicit: false,
        plays: 0,
      }))
      setQueue(localQueue)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Local Files</h2>
          <Badge variant="outline" className="text-muted-foreground">
            <HardDrive className="h-4 w-4 mr-2" />
            Browse your music
          </Badge>
        </div>

        <Card className="glass border-border/30 p-6">
          <LocalMediaBrowser
            mediaType="audio"
            onPlayFile={handlePlayLocalFile}
          />
        </Card>
      </div>
    )
  }

  // Render radio view
  const renderRadio = () => {
    const stations: RadioStation[] = radioSearchResults?.stations || popularStations?.stations || []
    const isLoading = isRadioSearching || isLoadingPopular
    const showingFavorites = !radioSearchQuery && !selectedGenre && !selectedCountry && favorites.length > 0

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Internet Radio</h2>
          <Badge variant="outline" className="text-muted-foreground">
            <Radio className="h-4 w-4 mr-2" />
            30K+ stations
          </Badge>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search radio stations..."
              value={radioSearchQuery}
              onChange={(e) => setRadioSearchQuery(e.target.value)}
              className="pl-10 glass border-border/30"
              data-tabz-input="radio-search"
            />
          </div>
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-full md:w-40 glass border-border/30">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Genres</SelectItem>
              {POPULAR_GENRES.map((genre) => (
                <SelectItem key={genre.name} value={genre.name}>
                  {genre.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full md:w-40 glass border-border/30">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Countries</SelectItem>
              {POPULAR_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Now Playing Radio */}
        {currentRadioStation && (
          <Card className="glass border-border/30 border-primary/50 p-4">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ scale: isRadioPlaying ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 1, repeat: isRadioPlaying ? Infinity : 0 }}
                className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center flex-shrink-0"
              >
                {currentRadioStation.favicon ? (
                  <img
                    src={currentRadioStation.favicon}
                    alt={currentRadioStation.name}
                    className="w-12 h-12 rounded object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <Radio className="h-8 w-8 text-primary" />
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary uppercase tracking-wider">Now Playing</p>
                <h3 className="font-semibold text-foreground truncate">{currentRadioStation.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {currentRadioStation.country}
                  {currentRadioStation.tags && ` • ${currentRadioStation.tags.split(",")[0]}`}
                  {currentRadioStation.bitrate > 0 && ` • ${currentRadioStation.bitrate}kbps`}
                </p>
              </div>
              <Button
                size="icon"
                variant={isRadioPlaying ? "default" : "outline"}
                onClick={() => {
                  if (isRadioPlaying) {
                    audioRef.current?.pause()
                    setIsRadioPlaying(false)
                  } else {
                    audioRef.current?.play()
                    setIsRadioPlaying(true)
                  }
                }}
              >
                {isRadioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleFavorite(currentRadioStation)}
              >
                <Heart className={`h-5 w-5 ${isFavorite(currentRadioStation.stationuuid) ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={stopRadio}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Favorites Section */}
        {showingFavorites && (
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Your Favorites
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((station) => (
                <Card
                  key={station.stationuuid}
                  className={`glass border-border/30 p-4 cursor-pointer group hover:bg-primary/5 transition-colors ${
                    currentRadioStation?.stationuuid === station.stationuuid ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => playRadioStation(station)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 relative">
                      {station.favicon ? (
                        <img
                          src={station.favicon}
                          alt={station.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <Radio className="h-6 w-6 text-primary/50" />
                      )}
                      <motion.div
                        initial={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {currentRadioStation?.stationuuid === station.stationuuid && isRadioPlaying ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white" />
                        )}
                      </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{station.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {station.country}
                        {station.bitrate > 0 && ` • ${station.bitrate}kbps`}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(station)
                      }}
                    >
                      <Heart className="h-4 w-4 fill-primary text-primary" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Popular/Search Results Section */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {radioSearchQuery || selectedGenre || selectedCountry ? "Search Results" : "Popular Stations"}
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stations.length === 0 ? (
            <Card className="glass border-border/30 p-8 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {radioSearchQuery || selectedGenre || selectedCountry
                  ? "No stations found. Try a different search."
                  : "Loading popular stations..."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stations.map((station) => (
                <Card
                  key={station.stationuuid}
                  className={`glass border-border/30 p-4 cursor-pointer group hover:bg-primary/5 transition-colors ${
                    currentRadioStation?.stationuuid === station.stationuuid ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => playRadioStation(station)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                      {station.favicon ? (
                        <img
                          src={station.favicon}
                          alt={station.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <Radio className="h-6 w-6 text-primary/50" />
                      )}
                      <motion.div
                        initial={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {currentRadioStation?.stationuuid === station.stationuuid && isRadioPlaying ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white" />
                        )}
                      </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{station.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {station.country}
                        {station.tags && ` • ${station.tags.split(",")[0]}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {station.bitrate > 0 && (
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {station.bitrate}kbps
                          </Badge>
                        )}
                        {station.codec && (
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {station.codec}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(station)
                      }}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite(station.stationuuid) ? "fill-primary text-primary" : ""}`} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Quick Genre Browsing */}
        {!radioSearchQuery && !selectedGenre && !selectedCountry && (
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">Browse by Genre</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_GENRES.map((genre) => (
                <Button
                  key={genre.name}
                  variant="outline"
                  size="sm"
                  className="glass border-border/30"
                  onClick={() => setSelectedGenre(genre.name)}
                >
                  {genre.label}
                </Button>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  // Render playlist view
  const renderPlaylist = () => {
    if (!selectedPlaylist) return null

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 glass rounded-xl p-6">
          <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center shadow-xl">
            <ListMusic className="h-20 w-20 text-primary/50" />
          </div>
          <div className="text-center md:text-left flex-1">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Playlist</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">{selectedPlaylist.name}</h1>
            {selectedPlaylist.description && (
              <p className="text-muted-foreground mt-2">{selectedPlaylist.description}</p>
            )}
            <div className="flex items-center justify-center md:justify-start gap-2 mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedPlaylist.owner}</span>
              <span>•</span>
              <span>{selectedPlaylist.tracks.length} songs</span>
              {selectedPlaylist.followers > 0 && (
                <>
                  <span>•</span>
                  <span>{formatPlays(selectedPlaylist.followers)} followers</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-full px-8 gap-2"
            onClick={() => {
              if (selectedPlaylist.tracks.length > 0) {
                playTrack(selectedPlaylist.tracks[0])
                setQueue(selectedPlaylist.tracks.slice(1))
              }
            }}
          >
            <Play className="h-5 w-5" />
            Play
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Track List */}
        <Card className="glass border-border/30">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Album</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-20 text-right">
                  <Clock className="h-4 w-4 ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedPlaylist.tracks.map((track, idx) => (
                <TableRow
                  key={track.id}
                  className={`border-border/30 cursor-pointer hover:bg-primary/5 ${
                    nowPlaying.track.id === track.id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => playTrack(track)}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {nowPlaying.track.id === track.id && nowPlaying.isPlaying ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-4 h-4 text-primary"
                      >
                        <Volume2 className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      idx + 1
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                        <Music className="h-4 w-4 text-primary/50" />
                      </div>
                      <div>
                        <p className={`font-medium flex items-center gap-2 ${
                          nowPlaying.track.id === track.id ? "text-primary" : "text-foreground"
                        }`}>
                          {track.title}
                          {track.isExplicit && (
                            <Badge variant="outline" className="text-xs px-1">E</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{track.artist.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {track.album.title}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(track.id)
                      }}
                    >
                      <Heart className={`h-4 w-4 ${track.isLiked ? "fill-primary text-primary" : ""}`} />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatTime(track.duration)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  // Render album view
  const renderAlbum = () => {
    if (!selectedAlbum) return null
    const albumTracks = mockTracks.filter((t) => t.album.id === selectedAlbum.id)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 glass rounded-xl p-6">
          <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center shadow-xl">
            <Disc3 className="h-20 w-20 text-secondary/50" />
          </div>
          <div className="text-center md:text-left flex-1">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              {selectedAlbum.type}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">{selectedAlbum.title}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-4 text-sm text-muted-foreground">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-primary/20 text-xs">
                  {selectedAlbum.artist.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground">{selectedAlbum.artist.name}</span>
              <span>•</span>
              <span>{new Date(selectedAlbum.releaseDate).getFullYear()}</span>
              <span>•</span>
              <span>{albumTracks.length} songs</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-full px-8 gap-2"
            onClick={() => {
              if (albumTracks.length > 0) {
                playTrack(albumTracks[0])
                setQueue(albumTracks.slice(1))
              }
            }}
          >
            <Play className="h-5 w-5" />
            Play
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
        </div>

        {/* Track List */}
        <Card className="glass border-border/30">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell text-right">Plays</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-20 text-right">
                  <Clock className="h-4 w-4 ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albumTracks.map((track, idx) => (
                <TableRow
                  key={track.id}
                  className={`border-border/30 cursor-pointer hover:bg-primary/5 ${
                    nowPlaying.track.id === track.id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => playTrack(track)}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {nowPlaying.track.id === track.id && nowPlaying.isPlaying ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-4 h-4 text-primary"
                      >
                        <Volume2 className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      idx + 1
                    )}
                  </TableCell>
                  <TableCell>
                    <p className={`font-medium flex items-center gap-2 ${
                      nowPlaying.track.id === track.id ? "text-primary" : "text-foreground"
                    }`}>
                      {track.title}
                      {track.isExplicit && (
                        <Badge variant="outline" className="text-xs px-1">E</Badge>
                      )}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right text-muted-foreground">
                    {formatPlays(track.plays)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(track.id)
                      }}
                    >
                      <Heart className={`h-4 w-4 ${track.isLiked ? "fill-primary text-primary" : ""}`} />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatTime(track.duration)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  // Render queue panel
  const renderQueue = () => (
    <AnimatePresence>
      {showQueue && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="absolute right-0 top-0 bottom-0 w-80 glass border-l border-border/30 z-40"
          data-tabz-action="queue-panel"
        >
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Queue</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowQueue(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-4">
              {/* Now Playing */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Now Playing</p>
                <div className="glass-dark rounded-lg p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                    <Music className="h-5 w-5 text-primary/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{nowPlaying.track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{nowPlaying.track.artist.name}</p>
                  </div>
                </div>
              </div>

              {/* Up Next */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Up Next ({queue.length})</p>
                <div className="space-y-2">
                  {queue.map((track, idx) => (
                    <motion.div
                      key={`${track.id}-${idx}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-dark rounded-lg p-3 flex items-center gap-3 group cursor-pointer hover:bg-primary/5"
                      onClick={() => playTrack(track)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Music className="h-4 w-4 text-primary/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTime(track.duration)}</span>
                    </motion.div>
                  ))}
                  {queue.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Render now playing bar (desktop)
  const renderNowPlayingBar = () => (
    <div className="h-24 glass border-t border-border/30 hidden md:flex items-center px-4" data-tabz-action="now-playing">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/4 min-w-0">
        <motion.div
          animate={{ rotate: nowPlaying.isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: nowPlaying.isPlaying ? Infinity : 0, ease: "linear" }}
          className="w-14 h-14 rounded bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center flex-shrink-0"
        >
          <Disc3 className="h-7 w-7 text-primary/50" />
        </motion.div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{nowPlaying.track.title}</p>
            {nowPlaying.track.url && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 text-green-500 border-green-500/30">
                Audio
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{nowPlaying.track.artist.name}</p>
          {audioError && (
            <p className="text-xs text-red-500">{audioError}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={() => toggleLike(nowPlaying.track.id)}
        >
          <Heart className={`h-5 w-5 ${nowPlaying.track.isLiked ? "fill-primary text-primary" : ""}`} />
        </Button>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className={nowPlaying.shuffle ? "text-primary" : "text-muted-foreground"}
            onClick={toggleShuffle}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={skipPrevious} data-tabz-action="skip-previous">
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={togglePlay}
            data-tabz-action="toggle-play"
          >
            {nowPlaying.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={skipNext} data-tabz-action="skip-next">
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={nowPlaying.repeat !== "off" ? "text-primary" : "text-muted-foreground"}
            onClick={toggleRepeat}
          >
            {nowPlaying.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime((nowPlaying.progress / 100) * nowPlaying.track.duration)}
          </span>
          <Slider
            value={[nowPlaying.progress]}
            max={100}
            step={0.1}
            onValueChange={([value]) => seekTo(value)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(nowPlaying.track.duration)}
          </span>
        </div>
      </div>

      {/* Volume & Extra Controls */}
      <div className="flex items-center justify-end gap-2 w-1/4">
        <Button variant="ghost" size="icon" onClick={() => setShowLyrics(!showLyrics)}>
          <Mic2 className={`h-5 w-5 ${showLyrics ? "text-primary" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowQueue(!showQueue)}>
          <ListMusic className={`h-5 w-5 ${showQueue ? "text-primary" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleMute}>
          <VolumeIcon className="h-5 w-5" />
        </Button>
        <Slider
          value={[nowPlaying.isMuted ? 0 : nowPlaying.volume]}
          max={100}
          step={1}
          onValueChange={([value]) => setNowPlaying((prev) => ({ ...prev, volume: value, isMuted: false }))}
          className="w-24"
        />
      </div>
    </div>
  )

  // Render mobile mini player
  const renderMobilePlayer = () => (
    <>
      {/* Mini Player Bar */}
      <div
        className="glass border-t border-border/30 p-3 flex items-center gap-3 md:hidden cursor-pointer"
        onClick={() => setShowMobilePlayer(true)}
        data-tabz-action="mobile-player"
      >
        <motion.div
          animate={{ rotate: nowPlaying.isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: nowPlaying.isPlaying ? Infinity : 0, ease: "linear" }}
          className="w-12 h-12 rounded bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center"
        >
          <Disc3 className="h-6 w-6 text-primary/50" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{nowPlaying.track.title}</p>
          <p className="text-xs text-muted-foreground truncate">{nowPlaying.track.artist.name}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          {nowPlaying.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
      </div>

      {/* Full Mobile Player */}
      <AnimatePresence>
        {showMobilePlayer && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 glass z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setShowMobilePlayer(false)}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <span className="text-sm text-muted-foreground">Now Playing</span>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </div>

            {/* Album Art */}
            <div className="flex-1 flex items-center justify-center p-8">
              <motion.div
                animate={{ rotate: nowPlaying.isPlaying ? 360 : 0 }}
                transition={{ duration: 8, repeat: nowPlaying.isPlaying ? Infinity : 0, ease: "linear" }}
                className="w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center shadow-2xl"
              >
                <div className="w-56 h-56 rounded-full bg-background flex items-center justify-center">
                  <Disc3 className="h-24 w-24 text-primary/50" />
                </div>
              </motion.div>
            </div>

            {/* Track Info & Controls */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">{nowPlaying.track.title}</h2>
                <p className="text-muted-foreground">{nowPlaying.track.artist.name}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <Slider
                  value={[nowPlaying.progress]}
                  max={100}
                  step={0.1}
                  onValueChange={([value]) => seekTo(value)}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatTime((nowPlaying.progress / 100) * nowPlaying.track.duration)}</span>
                  <span>{formatTime(nowPlaying.track.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className={nowPlaying.shuffle ? "text-primary" : "text-muted-foreground"}
                  onClick={toggleShuffle}
                >
                  <Shuffle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-12 w-12" onClick={skipPrevious}>
                  <SkipBack className="h-7 w-7" />
                </Button>
                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full"
                  onClick={togglePlay}
                >
                  {nowPlaying.isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-12 w-12" onClick={skipNext}>
                  <SkipForward className="h-7 w-7" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={nowPlaying.repeat !== "off" ? "text-primary" : "text-muted-foreground"}
                  onClick={toggleRepeat}
                >
                  {nowPlaying.repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </Button>
              </div>

              {/* Extra Controls */}
              <div className="flex items-center justify-center gap-8">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleLike(nowPlaying.track.id)}
                >
                  <Heart className={`h-6 w-6 ${nowPlaying.track.isLiked ? "fill-primary text-primary" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon">
                  <ListMusic className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  // Render main content based on active view
  const renderContent = () => {
    switch (activeView) {
      case "home":
        return renderHome()
      case "search":
        return renderSearch()
      case "library":
        return renderLibrary()
      case "localfiles":
        return renderLocalFiles()
      case "radio":
        return renderRadio()
      case "playlist":
        return renderPlaylist()
      case "album":
        return renderAlbum()
      default:
        return renderHome()
    }
  }

  // Spotify mode renders its own component
  if (playerMode === "spotify") {
    return (
      <div className="flex flex-col h-full" data-tabz-section="music-player">
        {/* Mode Selector */}
        <div className="flex items-center justify-between p-4 border-b border-border/30 glass">
          <h1 className="text-xl font-bold font-mono gradient-text-theme">Music Player</h1>
          <Tabs value={playerMode} onValueChange={(v) => setPlayerMode(v as "synthwave" | "spotify")}>
            <TabsList className="h-8">
              <TabsTrigger value="synthwave" className="text-xs h-6 px-3 gap-1">
                <Disc3 className="h-3 w-3" />
                SynthWave
              </TabsTrigger>
              <TabsTrigger value="spotify" className="text-xs h-6 px-3 gap-1">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {/* Spotify Player */}
        <div className="flex-1 overflow-hidden">
          <SpotifyPlayer />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full" data-tabz-section="music-player">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
        preload="metadata"
      />

      {/* Hidden file input for local audio files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
        data-tabz-input="audio-file"
      />

      {/* Add Track Modal */}
      <Dialog open={showAddTrackModal} onOpenChange={setShowAddTrackModal}>
        <DialogContent className="glass border-border/30">
          <DialogHeader>
            <DialogTitle>Add Audio Track</DialogTitle>
            <DialogDescription>
              Add a track from a URL or upload a local audio file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* URL Input Section */}
            <div className="space-y-3">
              <Label htmlFor="track-url" className="text-sm font-medium">
                Audio URL
              </Label>
              <Input
                id="track-url"
                placeholder="https://example.com/audio.mp3"
                value={newTrackUrl}
                onChange={(e) => setNewTrackUrl(e.target.value)}
                className="glass border-border/30"
                data-tabz-input="track-url"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="track-title" className="text-sm font-medium">
                Track Title (optional)
              </Label>
              <Input
                id="track-title"
                placeholder="My Track"
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                className="glass border-border/30"
                data-tabz-input="track-title"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="track-artist" className="text-sm font-medium">
                Artist Name (optional)
              </Label>
              <Input
                id="track-artist"
                placeholder="Artist"
                value={newTrackArtist}
                onChange={(e) => setNewTrackArtist(e.target.value)}
                className="glass border-border/30"
                data-tabz-input="track-artist"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={addTrackFromUrl}
                disabled={!newTrackUrl.trim() || isLoadingTrack}
                className="flex-1 gap-2"
                data-tabz-action="add-track-url"
              >
                {isLoadingTrack ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                Add from URL
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Local File Section */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Or upload a local audio file</p>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddTrackModal(false)
                  openFilePicker()
                }}
                className="gap-2"
                data-tabz-action="upload-file"
              >
                <Upload className="h-4 w-4" />
                Choose Audio File
              </Button>
              <p className="text-xs text-muted-foreground">
                Supports MP3, WAV, OGG, FLAC, and more
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar - Desktop */}
      {renderSidebar()}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden glass border-b border-border/30 p-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">SynthWave</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === "search" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setActiveView("search")}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden glass border-t border-border/30 flex items-center justify-around py-2">
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${activeView === "home" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveView("home")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${activeView === "search" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveView("search")}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs">Search</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${activeView === "library" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveView("library")}
          >
            <Library className="h-5 w-5" />
            <span className="text-xs">Library</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${activeView === "localfiles" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveView("localfiles")}
          >
            <HardDrive className="h-5 w-5" />
            <span className="text-xs">Local</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${activeView === "radio" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveView("radio")}
          >
            <Radio className="h-5 w-5" />
            <span className="text-xs">Radio</span>
          </Button>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-8">
            {/* Back Button for Detail Views */}
            {(activeView === "playlist" || activeView === "album") && (
              <Button
                variant="ghost"
                className="mb-4 gap-2"
                onClick={() => setActiveView("home")}
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </Button>
            )}

            {renderContent()}
          </div>
        </ScrollArea>

        {/* Now Playing Bar - Desktop */}
        {renderNowPlayingBar()}

        {/* Mobile Player */}
        {renderMobilePlayer()}

        {/* Queue Panel */}
        {renderQueue()}
      </main>
    </div>
  )
}
