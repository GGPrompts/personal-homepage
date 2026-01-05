"use client"

import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  SkipForward,
  SkipBack,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  MoreHorizontal,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  CheckCircle2,
  Bell,
  ListVideo,
  Repeat,
  Shuffle,
  PictureInPicture2,
  MonitorPlay,
  X,
  Heart,
  Reply,
  Flag,
  ExternalLink,
  Copy,
  Twitter,
  Facebook,
  Send,
  Link,
  Upload,
  Youtube,
  FileVideo,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"

// TypeScript Interfaces
interface Channel {
  id: string
  name: string
  avatar: string
  subscribers: number
  isVerified: boolean
  isSubscribed: boolean
}

interface Chapter {
  title: string
  startTime: number
  thumbnail?: string
}

interface Caption {
  language: string
  label: string
}

interface Quality {
  resolution: string
  label: string
  bitrate: string
}

interface Video {
  id: string
  title: string
  description: string
  thumbnail: string
  duration: number
  views: number
  likes: number
  dislikes: number
  uploadDate: string
  channel: Channel
  quality: Quality[]
  captions: Caption[]
  chapters: Chapter[]
}

interface Comment {
  id: string
  author: { name: string; avatar: string }
  content: string
  likes: number
  date: string
  isLiked: boolean
  replies: Comment[]
}

interface PlaylistItem {
  id: string
  title: string
  thumbnail: string
  duration: number
  channel: string
  views: number
  isPlaying: boolean
}

// Mock Data
const currentVideo: Video = {
  id: "v-001",
  title: "Building a Modern Web Application with Next.js 15 and React Server Components",
  description: `In this comprehensive tutorial, we'll dive deep into building a production-ready web application using Next.js 15's latest features including React Server Components, the App Router, and streaming.

🔗 Links:
- GitHub Repository: https://github.com/example/nextjs-tutorial
- Documentation: https://nextjs.org/docs
- Discord Community: https://discord.gg/nextjs

📑 Chapters:
0:00 - Introduction
2:45 - Project Setup
8:30 - App Router Deep Dive
15:20 - Server Components
24:00 - Data Fetching Patterns
35:15 - Authentication
48:30 - Deployment

#nextjs #react #webdev #programming #tutorial`,
  thumbnail: "/api/placeholder/1280/720",
  duration: 3247,
  views: 284532,
  likes: 12847,
  dislikes: 234,
  uploadDate: "2024-01-15",
  channel: {
    id: "ch-001",
    name: "CodeCraft Academy",
    avatar: "/api/placeholder/48/48",
    subscribers: 892000,
    isVerified: true,
    isSubscribed: false,
  },
  quality: [
    { resolution: "2160p", label: "4K", bitrate: "45 Mbps" },
    { resolution: "1440p", label: "2K", bitrate: "16 Mbps" },
    { resolution: "1080p", label: "Full HD", bitrate: "8 Mbps" },
    { resolution: "720p", label: "HD", bitrate: "5 Mbps" },
    { resolution: "480p", label: "SD", bitrate: "2.5 Mbps" },
    { resolution: "360p", label: "Low", bitrate: "1 Mbps" },
  ],
  captions: [
    { language: "en", label: "English" },
    { language: "es", label: "Spanish" },
    { language: "fr", label: "French" },
    { language: "de", label: "German" },
  ],
  chapters: [
    { title: "Introduction", startTime: 0 },
    { title: "Project Setup", startTime: 165 },
    { title: "App Router Deep Dive", startTime: 510 },
    { title: "Server Components", startTime: 920 },
    { title: "Data Fetching Patterns", startTime: 1440 },
    { title: "Authentication", startTime: 2115 },
    { title: "Deployment", startTime: 2910 },
  ],
}

const comments: Comment[] = [
  {
    id: "c-001",
    author: { name: "DevMaster_Pro", avatar: "/api/placeholder/40/40" },
    content: "This is exactly what I needed! The explanation of Server Components finally clicked. Been struggling with this for weeks.",
    likes: 342,
    date: "2 days ago",
    isLiked: false,
    replies: [
      {
        id: "c-001-r1",
        author: { name: "CodeCraft Academy", avatar: "/api/placeholder/40/40" },
        content: "So glad it helped! Server Components can be tricky at first but once you get it, everything makes sense.",
        likes: 89,
        date: "2 days ago",
        isLiked: false,
        replies: [],
      },
      {
        id: "c-001-r2",
        author: { name: "ReactFan2024", avatar: "/api/placeholder/40/40" },
        content: "Same here! The mental model shift takes time but it's worth it.",
        likes: 23,
        date: "1 day ago",
        isLiked: false,
        replies: [],
      },
    ],
  },
  {
    id: "c-002",
    author: { name: "Sarah_Codes", avatar: "/api/placeholder/40/40" },
    content: "Great tutorial! Would love to see a follow-up on database integration with Prisma or Drizzle.",
    likes: 156,
    date: "1 day ago",
    isLiked: true,
    replies: [],
  },
  {
    id: "c-003",
    author: { name: "TechExplorer", avatar: "/api/placeholder/40/40" },
    content: "The production deployment section at 48:30 is gold. Saved me hours of debugging Vercel issues.",
    likes: 98,
    date: "23 hours ago",
    isLiked: false,
    replies: [],
  },
  {
    id: "c-004",
    author: { name: "NewbieDev", avatar: "/api/placeholder/40/40" },
    content: "Question: At 15:20, why did you choose to use a Server Component there instead of a Client Component?",
    likes: 45,
    date: "18 hours ago",
    isLiked: false,
    replies: [
      {
        id: "c-004-r1",
        author: { name: "CodeCraft Academy", avatar: "/api/placeholder/40/40" },
        content: "Great question! Server Components are the default and better for SEO + initial load. We only use Client Components when we need interactivity.",
        likes: 67,
        date: "15 hours ago",
        isLiked: false,
        replies: [],
      },
    ],
  },
]

const recommendations: PlaylistItem[] = [
  {
    id: "r-001",
    title: "React 19: Everything You Need to Know",
    thumbnail: "/api/placeholder/168/94",
    duration: 1842,
    channel: "CodeCraft Academy",
    views: 156000,
    isPlaying: false,
  },
  {
    id: "r-002",
    title: "TypeScript Advanced Patterns",
    thumbnail: "/api/placeholder/168/94",
    duration: 2456,
    channel: "TypeScript Tips",
    views: 89000,
    isPlaying: false,
  },
  {
    id: "r-003",
    title: "Building a Full-Stack App with T3 Stack",
    thumbnail: "/api/placeholder/168/94",
    duration: 4521,
    channel: "Theo - t3.gg",
    views: 234000,
    isPlaying: false,
  },
  {
    id: "r-004",
    title: "TailwindCSS Tips and Tricks",
    thumbnail: "/api/placeholder/168/94",
    duration: 1234,
    channel: "Tailwind Labs",
    views: 178000,
    isPlaying: false,
  },
  {
    id: "r-005",
    title: "Prisma ORM Complete Guide",
    thumbnail: "/api/placeholder/168/94",
    duration: 3654,
    channel: "Prisma",
    views: 112000,
    isPlaying: false,
  },
  {
    id: "r-006",
    title: "Authentication Best Practices 2024",
    thumbnail: "/api/placeholder/168/94",
    duration: 2187,
    channel: "Security First",
    views: 67000,
    isPlaying: false,
  },
]

const playlist: PlaylistItem[] = [
  {
    id: "p-001",
    title: "Next.js 15 Complete Course - Part 1",
    thumbnail: "/api/placeholder/120/68",
    duration: 2847,
    channel: "CodeCraft Academy",
    views: 345000,
    isPlaying: false,
  },
  {
    id: "p-002",
    title: "Next.js 15 Complete Course - Part 2",
    thumbnail: "/api/placeholder/120/68",
    duration: 3247,
    channel: "CodeCraft Academy",
    views: 284000,
    isPlaying: true,
  },
  {
    id: "p-003",
    title: "Next.js 15 Complete Course - Part 3",
    thumbnail: "/api/placeholder/120/68",
    duration: 2956,
    channel: "CodeCraft Academy",
    views: 198000,
    isPlaying: false,
  },
  {
    id: "p-004",
    title: "Next.js 15 Complete Course - Part 4",
    thumbnail: "/api/placeholder/120/68",
    duration: 3412,
    channel: "CodeCraft Academy",
    views: 156000,
    isPlaying: false,
  },
  {
    id: "p-005",
    title: "Next.js 15 Complete Course - Part 5",
    thumbnail: "/api/placeholder/120/68",
    duration: 2789,
    channel: "CodeCraft Academy",
    views: 134000,
    isPlaying: false,
  },
]

// Video Source Types
type VideoSourceType = 'none' | 'url' | 'file' | 'youtube'

interface VideoSource {
  type: VideoSourceType
  url: string
  youtubeId?: string
  fileName?: string
}

// Extract YouTube video ID from various URL formats
const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Check if URL is a valid video URL
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v']
  const lowerUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowerUrl.includes(ext)) ||
         lowerUrl.includes('blob:') ||
         lowerUrl.includes('video')
}

// Helper Functions
const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(0)}K`
  }
  return views.toString()
}

const formatSubscribers = (subs: number): string => {
  if (subs >= 1000000) {
    return `${(subs / 1000000).toFixed(2)}M`
  }
  if (subs >= 1000) {
    return `${(subs / 1000).toFixed(0)}K`
  }
  return subs.toString()
}

export default function VideoPlayerSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  // Player State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(currentVideo.duration)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTheaterMode, setIsTheaterMode] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState("1080p")
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<"quality" | "speed" | "captions">("quality")
  const [buffered, setBuffered] = useState(0)
  const [isPiPActive, setIsPiPActive] = useState(false)

  // Video Source State
  const [videoSource, setVideoSource] = useState<VideoSource>({ type: 'none', url: '' })
  const [urlInput, setUrlInput] = useState('')
  const [sourceInputTab, setSourceInputTab] = useState<'url' | 'youtube' | 'file'>('url')
  const [showSourceInput, setShowSourceInput] = useState(true)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // UI State
  const [isSubscribed, setIsSubscribed] = useState(currentVideo.channel.isSubscribed)
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likes, setLikes] = useState(currentVideo.likes)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [commentSort, setCommentSort] = useState<"top" | "newest">("top")
  const [showShareModal, setShowShareModal] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [loopPlaylist, setLoopPlaylist] = useState(false)
  const [shufflePlaylist, setShufflePlaylist] = useState(false)

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current chapter
  const getCurrentChapter = useCallback(() => {
    for (let i = currentVideo.chapters.length - 1; i >= 0; i--) {
      if (currentTime >= currentVideo.chapters[i].startTime) {
        return currentVideo.chapters[i]
      }
    }
    return currentVideo.chapters[0]
  }, [currentTime])

  // Video event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
    setVideoError(null)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoading(false)
      setShowSourceInput(false)
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      // Update buffered progress
      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
        setBuffered((bufferedEnd / videoRef.current.duration) * 100)
      }
    }
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (autoplay && playlist.length > 0) {
      // Auto-play next video logic would go here
    }
  }, [autoplay])

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget
    setIsLoading(false)
    if (video.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          setVideoError('Video playback aborted')
          break
        case MediaError.MEDIA_ERR_NETWORK:
          setVideoError('Network error while loading video')
          break
        case MediaError.MEDIA_ERR_DECODE:
          setVideoError('Video decoding error')
          break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          setVideoError('Video format not supported')
          break
        default:
          setVideoError('Unknown error occurred')
      }
    }
  }, [])

  const handleCanPlay = useCallback(() => {
    setIsLoading(false)
  }, [])

  // Sync video playback state
  useEffect(() => {
    const video = videoRef.current
    if (!video || videoSource.type === 'none' || videoSource.type === 'youtube') return

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [isPlaying, videoSource.type])

  // Sync volume with video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = isMuted ? 0 : volume / 100
  }, [volume, isMuted])

  // Sync playback speed with video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackSpeed
  }, [playbackSpeed])

  // Hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current)
      }
      if (isPlaying) {
        controlsTimeout.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }
    }

    const player = playerRef.current
    if (player) {
      player.addEventListener("mousemove", handleMouseMove)
      return () => player.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isPlaying])

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false)
      setLikes((prev) => prev - 1)
    } else {
      setIsLiked(true)
      setLikes((prev) => prev + 1)
      if (isDisliked) setIsDisliked(false)
    }
  }

  const handleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false)
    } else {
      setIsDisliked(true)
      if (isLiked) {
        setIsLiked(false)
        setLikes((prev) => prev - 1)
      }
    }
  }

  const seekTo = useCallback((time: number) => {
    const clampedTime = Math.min(Math.max(0, time), duration)
    setCurrentTime(clampedTime)
    if (videoRef.current && videoSource.type !== 'youtube') {
      videoRef.current.currentTime = clampedTime
    }
  }, [duration, videoSource.type])

  const skip = useCallback((seconds: number) => {
    seekTo(currentTime + seconds)
  }, [currentTime, seekTo])

  // Handle video URL submission
  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) return

    const youtubeId = extractYoutubeId(urlInput)
    if (youtubeId) {
      setVideoSource({ type: 'youtube', url: urlInput, youtubeId })
      setVideoError(null)
      setShowSourceInput(false)
    } else if (isVideoUrl(urlInput) || urlInput.startsWith('http')) {
      setVideoSource({ type: 'url', url: urlInput })
      setVideoError(null)
    } else {
      setVideoError('Please enter a valid video URL or YouTube link')
    }
  }, [urlInput])

  // Handle file selection
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setVideoError('Please select a video file')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setVideoSource({ type: 'file', url: objectUrl, fileName: file.name })
    setVideoError(null)
  }, [])

  // Clear video source
  const clearVideoSource = useCallback(() => {
    if (videoSource.type === 'file' && videoSource.url) {
      URL.revokeObjectURL(videoSource.url)
    }
    setVideoSource({ type: 'none', url: '' })
    setShowSourceInput(true)
    setUrlInput('')
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setVideoError(null)
  }, [videoSource])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!playerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await playerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  // Toggle Picture-in-Picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current || videoSource.type === 'youtube') return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPiPActive(false)
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture()
        setIsPiPActive(true)
      }
    } catch (err) {
      console.error('PiP error:', err)
    }
  }, [videoSource.type])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard shortcuts for video control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if video is loaded and not typing in an input
      if (videoSource.type === 'none' || videoSource.type === 'youtube') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(5)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(prev => Math.min(100, prev + 10))
          setIsMuted(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(prev => Math.max(0, prev - 10))
          break
        case 'm':
          e.preventDefault()
          setIsMuted(prev => !prev)
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'p':
          e.preventDefault()
          togglePiP()
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          const percentage = parseInt(e.key) / 10
          seekTo(duration * percentage)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [videoSource.type, skip, toggleFullscreen, togglePiP, seekTo, duration])

  // Listen for PiP changes
  useEffect(() => {
    const handlePiPEnter = () => setIsPiPActive(true)
    const handlePiPLeave = () => setIsPiPActive(false)

    const video = videoRef.current
    if (video) {
      video.addEventListener('enterpictureinpicture', handlePiPEnter)
      video.addEventListener('leavepictureinpicture', handlePiPLeave)
      return () => {
        video.removeEventListener('enterpictureinpicture', handlePiPEnter)
        video.removeEventListener('leavepictureinpicture', handlePiPLeave)
      }
    }
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoSource.type === 'file' && videoSource.url) {
        URL.revokeObjectURL(videoSource.url)
      }
    }
  }, [videoSource])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`p-4 md:p-6 ${isTheaterMode ? "bg-black" : ""}`} data-tabz-section="video-player">
      <div className={`${isTheaterMode ? "max-w-full" : "max-w-[1800px]"} mx-auto`}>
        <div className={`flex flex-col ${isTheaterMode ? "" : "lg:flex-row"} gap-6`}>
          {/* Main Content */}
          <div className={`flex-1 ${isTheaterMode ? "w-full" : ""}`}>
            {/* Video Player */}
            <motion.div
              ref={playerRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`relative bg-black rounded-xl overflow-hidden ${
                isTheaterMode ? "aspect-video max-h-[85vh]" : "aspect-video"
              }`}
              onDoubleClick={toggleFullscreen}
            >
              {/* Video Element */}
              {videoSource.type === 'youtube' && videoSource.youtubeId ? (
                <iframe
                  className="absolute inset-0 w-full h-full border-0"
                  src={`https://www.youtube.com/embed/${videoSource.youtubeId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : videoSource.type !== 'none' ? (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  src={videoSource.url}
                  onLoadStart={handleLoadStart}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onError={handleError}
                  onCanPlay={handleCanPlay}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  playsInline
                  data-tabz-element="video"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black" />
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Source Input Overlay */}
              <AnimatePresence>
                {showSourceInput && videoSource.type === 'none' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/90 p-6"
                  >
                    <div className="w-full max-w-lg space-y-4">
                      <div className="text-center mb-6">
                        <FileVideo className="h-16 w-16 text-primary/50 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-foreground">Load a Video</h3>
                        <p className="text-sm text-muted-foreground">Enter a URL, paste a YouTube link, or select a local file</p>
                      </div>

                      {/* Source Type Tabs */}
                      <div className="flex gap-1 p-1 glass-dark rounded-lg">
                        <button
                          onClick={() => setSourceInputTab('url')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-colors ${
                            sourceInputTab === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Link className="h-4 w-4" />
                          URL
                        </button>
                        <button
                          onClick={() => setSourceInputTab('youtube')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-colors ${
                            sourceInputTab === 'youtube' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Youtube className="h-4 w-4" />
                          YouTube
                        </button>
                        <button
                          onClick={() => setSourceInputTab('file')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-colors ${
                            sourceInputTab === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          File
                        </button>
                      </div>

                      {/* URL/YouTube Input */}
                      {(sourceInputTab === 'url' || sourceInputTab === 'youtube') && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              placeholder={sourceInputTab === 'youtube' ? 'Paste YouTube URL...' : 'Enter video URL (.mp4, .webm, etc.)'}
                              className="glass border-border text-foreground placeholder:text-muted-foreground"
                              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                              data-tabz-input="video-url"
                            />
                            <Button onClick={handleUrlSubmit} data-tabz-action="load-video">
                              Load
                            </Button>
                          </div>
                          {sourceInputTab === 'youtube' && (
                            <p className="text-xs text-muted-foreground">
                              Supports youtube.com/watch?v=, youtu.be/, and embed URLs
                            </p>
                          )}
                        </div>
                      )}

                      {/* File Picker */}
                      {sourceInputTab === 'file' && (
                        <Button
                          variant="outline"
                          className="w-full h-24 border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary"
                          onClick={() => fileInputRef.current?.click()}
                          data-tabz-action="select-file"
                        >
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2" />
                            <span>Click to select a video file</span>
                          </div>
                        </Button>
                      )}

                      {/* Error Display */}
                      {videoError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-lg bg-destructive/20 border border-destructive/30"
                        >
                          <p className="text-destructive text-sm">{videoError}</p>
                        </motion.div>
                      )}

                      {/* Sample Videos */}
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Try a sample video:</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setUrlInput('https://www.w3schools.com/html/mov_bbb.mp4')
                              setSourceInputTab('url')
                            }}
                          >
                            Big Buck Bunny
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setUrlInput('https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4')
                              setSourceInputTab('url')
                            }}
                          >
                            Test Video (10s)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading Overlay */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/80"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">Loading video...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video Error Overlay */}
              <AnimatePresence>
                {videoError && videoSource.type !== 'none' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/90"
                  >
                    <div className="text-center p-6">
                      <X className="h-12 w-12 text-destructive mx-auto mb-3" />
                      <p className="text-destructive font-medium mb-2">{videoError}</p>
                      <Button variant="outline" onClick={clearVideoSource}>
                        Try Another Video
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Source Info Badge */}
              {videoSource.type !== 'none' && !showSourceInput && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <Badge variant="secondary" className="glass text-xs">
                    {videoSource.type === 'youtube' ? 'YouTube' : videoSource.type === 'file' ? videoSource.fileName : 'URL'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 glass"
                    onClick={clearVideoSource}
                    title="Change video"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Chapter Marker - only show when video is loaded and chapters exist */}
              <AnimatePresence>
                {showControls && videoSource.type !== 'none' && videoSource.type !== 'youtube' && duration > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-4 left-4 glass rounded-lg px-3 py-1.5"
                  >
                    <p className="text-foreground text-sm font-medium">
                      {getCurrentChapter()?.title || 'Playing'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center Play Button - only show when video is loaded */}
              <AnimatePresence>
                {!isPlaying && showControls && videoSource.type !== 'none' && videoSource.type !== 'youtube' && !isLoading && !videoError && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center z-10"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary/80 flex items-center justify-center hover:bg-primary transition-colors">
                      <Play className="h-10 w-10 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Controls Overlay - hide for YouTube (uses its own controls) */}
              <AnimatePresence>
                {showControls && videoSource.type !== 'youtube' && videoSource.type !== 'none' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4"
                  >
                    {/* Progress Bar */}
                    <div className="mb-4 group">
                      <div className="relative h-1 group-hover:h-1.5 transition-all bg-muted-foreground/30 rounded-full cursor-pointer">
                        {/* Chapter markers */}
                        {currentVideo.chapters.map((chapter, idx) => (
                          <div
                            key={idx}
                            className="absolute w-1 h-full bg-muted-foreground/50 rounded-full"
                            style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                          />
                        ))}
                        {/* Buffered */}
                        <div className="absolute h-full bg-muted-foreground/40 rounded-full" style={{ width: `${buffered}%` }} />
                        {/* Progress */}
                        <div
                          className="absolute h-full bg-primary rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                        {/* Seek handle */}
                        <div
                          className="absolute w-3 h-3 bg-primary rounded-full -top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${progress}% - 6px)` }}
                        />
                        {/* Click area */}
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={(e) => seekTo(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      {/* Time display */}
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Play/Pause */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-muted/20"
                          onClick={() => setIsPlaying(!isPlaying)}
                          data-tabz-action="play-pause"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" fill="currentColor" />
                          ) : (
                            <Play className="h-5 w-5" fill="currentColor" />
                          )}
                        </Button>

                        {/* Skip Buttons */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-muted/20"
                          onClick={() => skip(-10)}
                        >
                          <SkipBack className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-muted/20"
                          onClick={() => skip(10)}
                        >
                          <SkipForward className="h-5 w-5" />
                        </Button>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/volume">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-foreground hover:bg-muted/20"
                            onClick={() => setIsMuted(!isMuted)}
                            data-tabz-action="toggle-mute"
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX className="h-5 w-5" />
                            ) : (
                              <Volume2 className="h-5 w-5" />
                            )}
                          </Button>
                          <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300">
                            <Slider
                              value={[isMuted ? 0 : volume]}
                              max={100}
                              step={1}
                              onValueChange={(value) => {
                                setVolume(value[0])
                                setIsMuted(value[0] === 0)
                              }}
                              className="w-20"
                            />
                          </div>
                        </div>

                        {/* Current Time */}
                        <span className="text-foreground text-sm ml-2 hidden sm:inline">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Captions */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`text-foreground hover:bg-muted/20 ${selectedCaption ? "text-primary" : ""}`}
                            >
                              <Subtitles className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="glass border-border w-48 p-2">
                            <p className="text-muted-foreground text-xs mb-2 px-2">Subtitles</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`w-full justify-start ${!selectedCaption ? "bg-primary/20 text-primary" : "text-foreground"}`}
                              onClick={() => setSelectedCaption(null)}
                            >
                              Off
                            </Button>
                            {currentVideo.captions.map((caption) => (
                              <Button
                                key={caption.language}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start ${selectedCaption === caption.language ? "bg-primary/20 text-primary" : "text-foreground"}`}
                                onClick={() => setSelectedCaption(caption.language)}
                              >
                                {caption.label}
                              </Button>
                            ))}
                          </PopoverContent>
                        </Popover>

                        {/* Settings */}
                        <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-foreground hover:bg-muted/20"
                            >
                              <Settings className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="glass border-border w-64 p-0">
                            <div className="flex border-b border-border">
                              <button
                                className={`flex-1 py-2 text-sm ${settingsTab === "quality" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                                onClick={() => setSettingsTab("quality")}
                              >
                                Quality
                              </button>
                              <button
                                className={`flex-1 py-2 text-sm ${settingsTab === "speed" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                                onClick={() => setSettingsTab("speed")}
                              >
                                Speed
                              </button>
                            </div>
                            <div className="p-2">
                              {settingsTab === "quality" && (
                                <div className="space-y-1">
                                  {currentVideo.quality.map((q) => (
                                    <Button
                                      key={q.resolution}
                                      variant="ghost"
                                      size="sm"
                                      className={`w-full justify-between ${selectedQuality === q.resolution ? "bg-primary/20 text-primary" : "text-foreground"}`}
                                      onClick={() => {
                                        setSelectedQuality(q.resolution)
                                        setIsSettingsOpen(false)
                                      }}
                                    >
                                      <span>{q.resolution} {q.label}</span>
                                      <span className="text-muted-foreground text-xs">{q.bitrate}</span>
                                    </Button>
                                  ))}
                                </div>
                              )}
                              {settingsTab === "speed" && (
                                <div className="space-y-1">
                                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                                    <Button
                                      key={speed}
                                      variant="ghost"
                                      size="sm"
                                      className={`w-full justify-start ${playbackSpeed === speed ? "bg-primary/20 text-primary" : "text-foreground"}`}
                                      onClick={() => {
                                        setPlaybackSpeed(speed)
                                        setIsSettingsOpen(false)
                                      }}
                                    >
                                      {speed === 1 ? "Normal" : `${speed}x`}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Picture in Picture */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`text-foreground hover:bg-muted/20 hidden sm:flex ${isPiPActive ? "text-primary" : ""}`}
                          onClick={togglePiP}
                          title="Picture-in-Picture"
                          data-tabz-action="toggle-pip"
                        >
                          <PictureInPicture2 className="h-5 w-5" />
                        </Button>

                        {/* Theater Mode */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`text-foreground hover:bg-muted/20 hidden md:flex ${isTheaterMode ? "text-primary" : ""}`}
                          onClick={() => setIsTheaterMode(!isTheaterMode)}
                          title="Theater mode"
                          data-tabz-action="toggle-theater"
                        >
                          <MonitorPlay className="h-5 w-5" />
                        </Button>

                        {/* Fullscreen */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-muted/20"
                          onClick={toggleFullscreen}
                          title="Fullscreen"
                          data-tabz-action="toggle-fullscreen"
                        >
                          {isFullscreen ? (
                            <Minimize className="h-5 w-5" />
                          ) : (
                            <Maximize className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Video Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-4"
            >
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                {currentVideo.title}
              </h1>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Views and Date */}
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Eye className="h-4 w-4" />
                  <span>{formatViews(currentVideo.views)} views</span>
                  <span>•</span>
                  <Clock className="h-4 w-4" />
                  <span>{new Date(currentVideo.uploadDate).toLocaleDateString()}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center glass rounded-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-l-full rounded-r-none px-4 ${isLiked ? "text-primary" : "text-foreground"}`}
                      onClick={handleLike}
                      data-tabz-action="like"
                    >
                      <ThumbsUp className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                      {formatViews(likes)}
                    </Button>
                    <Separator orientation="vertical" className="h-6 bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-r-full rounded-l-none px-4 ${isDisliked ? "text-primary" : "text-foreground"}`}
                      onClick={handleDislike}
                      data-tabz-action="dislike"
                    >
                      <ThumbsDown className={`h-4 w-4 ${isDisliked ? "fill-current" : ""}`} />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="glass rounded-full text-foreground"
                    onClick={() => setShowShareModal(true)}
                    data-tabz-action="share"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={`glass rounded-full ${isSaved ? "text-primary" : "text-foreground"}`}
                    onClick={() => setIsSaved(!isSaved)}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                    Save
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="glass rounded-full text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Channel Info & Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="glass border-border mt-4 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={currentVideo.channel.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {currentVideo.channel.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-semibold text-foreground">
                          {currentVideo.channel.name}
                        </h3>
                        {currentVideo.channel.isVerified && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {formatSubscribers(currentVideo.channel.subscribers)} subscribers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSubscribed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-foreground"
                      >
                        <Bell className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      variant={isSubscribed ? "outline" : "default"}
                      className={isSubscribed ? "border-border text-foreground" : ""}
                      onClick={() => setIsSubscribed(!isSubscribed)}
                      data-tabz-action="subscribe"
                    >
                      {isSubscribed ? "Subscribed" : "Subscribe"}
                    </Button>
                  </div>
                </div>

                <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
                  <div className="glass-dark rounded-lg p-4">
                    <p className="text-foreground text-sm whitespace-pre-line">
                      {isDescriptionExpanded
                        ? currentVideo.description
                        : currentVideo.description.slice(0, 200) + "..."}
                    </p>
                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-foreground font-medium mb-2">Chapters</h4>
                        <div className="space-y-2">
                          {currentVideo.chapters.map((chapter, idx) => (
                            <button
                              key={idx}
                              className="flex items-center gap-3 w-full text-left hover:bg-primary/10 rounded-lg p-2 transition-colors"
                              onClick={() => seekTo(chapter.startTime)}
                            >
                              <span className="text-primary font-mono text-sm">
                                {formatTime(chapter.startTime)}
                              </span>
                              <span className="text-foreground text-sm">
                                {chapter.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-foreground"
                    >
                      {isDescriptionExpanded ? (
                        <>
                          Show less <ChevronUp className="h-4 w-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </Card>
            </motion.div>

            {/* Comments Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    {comments.length} Comments
                  </h3>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-foreground">
                      Sort by: {commentSort === "top" ? "Top" : "Newest"}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="glass border-border w-32 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start ${commentSort === "top" ? "text-primary" : "text-foreground"}`}
                      onClick={() => setCommentSort("top")}
                    >
                      Top
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start ${commentSort === "newest" ? "text-primary" : "text-foreground"}`}
                      onClick={() => setCommentSort("newest")}
                    >
                      Newest
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Add Comment */}
              <div className="flex gap-3 mb-6">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">U</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="glass border-border min-h-[80px] text-foreground placeholder:text-muted-foreground"
                    data-tabz-input="comment"
                  />
                  {commentText && (
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentText("")}
                        className="text-foreground"
                      >
                        Cancel
                      </Button>
                      <Button size="sm">Comment</Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Comment List */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          {!isTheaterMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full lg:w-[400px] space-y-4"
            >
              {/* Playlist */}
              <Card className="glass border-border">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ListVideo className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">
                        Next.js 15 Complete Course
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-foreground"
                      onClick={() => setShowPlaylist(!showPlaylist)}
                    >
                      {showPlaylist ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    CodeCraft Academy • 2/5
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-foreground ${loopPlaylist ? "text-primary" : ""}`}
                      onClick={() => setLoopPlaylist(!loopPlaylist)}
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-foreground ${shufflePlaylist ? "text-primary" : ""}`}
                      onClick={() => setShufflePlaylist(!shufflePlaylist)}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-muted-foreground text-sm">Autoplay</span>
                      <button
                        className={`w-10 h-5 rounded-full transition-colors ${autoplay ? "bg-primary" : "bg-muted"}`}
                        onClick={() => setAutoplay(!autoplay)}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-foreground transition-transform ${autoplay ? "translate-x-5" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showPlaylist && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <ScrollArea className="h-[300px]">
                        <div className="p-2">
                          {playlist.map((item, idx) => (
                            <div
                              key={item.id}
                              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                item.isPlaying ? "bg-primary/20" : "hover:bg-muted/20"
                              }`}
                            >
                              <span className="text-muted-foreground text-sm w-6 text-center">
                                {item.isPlaying ? (
                                  <Play className="h-4 w-4 text-primary" fill="currentColor" />
                                ) : (
                                  idx + 1
                                )}
                              </span>
                              <div className="relative w-[100px] aspect-video rounded overflow-hidden bg-muted flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                                <span className="absolute bottom-1 right-1 bg-black/80 text-foreground text-xs px-1 rounded">
                                  {formatTime(item.duration)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground text-sm line-clamp-2">
                                  {item.title}
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                  {item.channel}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Up Next</h3>
                <div className="space-y-3" data-tabz-list="recommendations">
                  {recommendations.map((video) => (
                    <div
                      key={video.id}
                      className="flex gap-3 cursor-pointer group"
                      data-tabz-item={video.id}
                    >
                      <div className="relative w-[168px] aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 group-hover:opacity-80 transition-opacity" />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-foreground text-xs px-1 rounded">
                          {formatTime(video.duration)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {video.channel}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatViews(video.views)} views
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass border-border rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Share</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShareModal(false)}
                  className="text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex gap-4 mb-6">
                <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Twitter className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="text-muted-foreground text-xs">Twitter</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Facebook className="h-6 w-6 text-blue-500" />
                  </div>
                  <span className="text-muted-foreground text-xs">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Send className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-xs">Email</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-secondary" />
                  </div>
                  <span className="text-muted-foreground text-xs">Embed</span>
                </button>
              </div>

              <div className="glass-dark rounded-lg p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={`https://example.com/watch?v=${currentVideo.id}`}
                  readOnly
                  className="flex-1 bg-transparent text-foreground text-sm outline-none"
                />
                <Button size="sm" variant="ghost" className="text-primary">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <input type="checkbox" className="rounded" />
                  Start at {formatTime(currentTime)}
                </label>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Comment Component
function CommentItem({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
  const [isLiked, setIsLiked] = useState(comment.isLiked)
  const [likes, setLikes] = useState(comment.likes)
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false)
      setLikes((prev) => prev - 1)
    } else {
      setIsLiked(true)
      setLikes((prev) => prev + 1)
    }
  }

  return (
    <div className={`flex gap-3 ${isReply ? "ml-12" : ""}`}>
      <Avatar className={isReply ? "h-8 w-8" : "h-10 w-10"}>
        <AvatarImage src={comment.author.avatar} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {comment.author.name[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-foreground text-sm font-medium">
            {comment.author.name}
          </span>
          <span className="text-muted-foreground text-xs">{comment.date}</span>
        </div>
        <p className="text-foreground text-sm mb-2">{comment.content}</p>
        <div className="flex items-center gap-4">
          <button
            className={`flex items-center gap-1 text-sm ${isLiked ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors`}
            onClick={handleLike}
          >
            <ThumbsUp className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsDown className="h-4 w-4" />
          </button>
          {!isReply && (
            <button
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Reply
            </button>
          )}
        </div>

        {/* Reply Input */}
        <AnimatePresence>
          {showReplyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex gap-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary">U</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="glass border-border min-h-[60px] text-foreground placeholder:text-muted-foreground text-sm"
                />
                {replyText && (
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyText("")
                        setShowReplyInput(false)
                      }}
                      className="text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button size="sm">Reply</Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            <button
              className="flex items-center gap-2 text-primary text-sm font-medium"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
            <AnimatePresence>
              {showReplies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-4"
                >
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
