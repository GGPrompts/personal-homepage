"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Play,
  Heart,
  ListMusic,
  ListPlus,
  Search,
  LogOut,
  Loader2,
  AlertCircle,
  ChevronDown,
  Music,
  Clock,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMusicPlayer, type TimeRange } from "@/components/MusicPlayerProvider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  search,
  getPlaylists,
  getPlaylistTracks,
  getSavedTracks,
  saveTracks,
  removeTracks,
  checkSavedTracks,
  getRecentlyPlayed,
  addToQueue,
  type SpotifyTrack,
  type SpotifyPlaylist,
  type SpotifySearchResults,
} from "@/lib/spotify"

// ============================================================================
// SPOTIFY SETUP COMPONENT
// ============================================================================

function SpotifySetup({
  clientId,
  setClientId,
  onLogin,
  error,
}: {
  clientId: string | null
  setClientId: (id: string) => void
  onLogin: () => void
  error: string | null
}) {
  const [inputValue, setInputValue] = useState(clientId || "")

  const handleSave = () => {
    if (inputValue.trim()) {
      setClientId(inputValue.trim())
    }
  }

  return (
    <Card className="glass border-border/30 p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Connect to Spotify</h2>
        <p className="text-muted-foreground text-sm">
          Stream music directly from your Spotify Premium account
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-id">Spotify Client ID</Label>
          <Input
            id="client-id"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your Spotify Client ID"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Get your Client ID from the{" "}
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1DB954] hover:underline"
            >
              Spotify Developer Dashboard
            </a>
          </p>
        </div>

        {inputValue !== clientId && (
          <Button onClick={handleSave} variant="outline" className="w-full">
            Save Client ID
          </Button>
        )}

        <Button
          onClick={onLogin}
          disabled={!clientId}
          className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
        >
          Connect with Spotify
        </Button>

        <div className="pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Setup Instructions:</strong>
          </p>
          <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
            <li>Go to developer.spotify.com/dashboard</li>
            <li>Create a new app (or use existing)</li>
            <li>Copy the Client ID</li>
            <li>Add redirect URI: <code className="text-[#1DB954]">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}/api/spotify/callback</code></li>
            <li>Click &quot;Connect with Spotify&quot; above</li>
          </ol>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// MAIN SPOTIFY PLAYER COMPONENT
// ============================================================================

export function SpotifyPlayer() {
  // Use shared context instead of separate hook instances
  const { auth, player, topTracks, topTracksTimeRange, setTopTracksTimeRange, isLoadingTopTracks } = useMusicPlayer()

  const {
    isAuthenticated,
    isLoading: authLoading,
    user,
    error: authError,
    clientId,
    setClientId,
    login,
    logout,
    isPremium,
  } = auth

  const {
    error: playerError,
    isReady,
    currentTrack,
    playTrack,
    playContext,
  } = player

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifySearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Library state
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [savedTracks, setSavedTracks] = useState<SpotifyTrack[]>([])
  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([])

  // Liked state for current track
  const [currentTrackLiked, setCurrentTrackLiked] = useState(false)

  // Active view
  const [activeTab, setActiveTab] = useState<"search" | "playlists" | "liked" | "recent" | "top">("playlists")

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const results = await search(searchQuery, ["track", "artist", "album", "playlist"])
      setSearchResults(results)
    } catch (err) {
      console.error("Search failed:", err)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Load playlists
  useEffect(() => {
    if (isAuthenticated && isPremium) {
      getPlaylists().then((data) => setPlaylists(data.items)).catch(console.error)
      getSavedTracks(50).then((data) => setSavedTracks(data.items.map((i) => i.track))).catch(console.error)
      getRecentlyPlayed(50).then((data) => {
        // Deduplicate by track ID, keeping only the first (most recent) occurrence
        const seen = new Set<string>()
        const uniqueTracks = data.items
          .map((i) => i.track)
          .filter((track) => {
            if (seen.has(track.id)) return false
            seen.add(track.id)
            return true
          })
        setRecentTracks(uniqueTracks)
      }).catch(console.error)
    }
  }, [isAuthenticated, isPremium])

  // Check if current track is liked
  useEffect(() => {
    if (currentTrack?.id) {
      checkSavedTracks([currentTrack.id])
        .then(([isLiked]) => setCurrentTrackLiked(isLiked))
        .catch(console.error)
    }
  }, [currentTrack?.id])

  // Load playlist tracks
  const loadPlaylistTracks = async (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist)
    try {
      const data = await getPlaylistTracks(playlist.id)
      setPlaylistTracks(data.items.map((i) => i.track).filter(Boolean))
    } catch (err) {
      console.error("Failed to load playlist tracks:", err)
    }
  }

  // Toggle like for current track
  const toggleLike = async () => {
    if (!currentTrack?.id) return
    try {
      if (currentTrackLiked) {
        await removeTracks([currentTrack.id])
        setCurrentTrackLiked(false)
      } else {
        await saveTracks([currentTrack.id])
        setCurrentTrackLiked(true)
      }
    } catch (err) {
      console.error("Failed to toggle like:", err)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
      </div>
    )
  }

  // Setup/login state
  if (!isAuthenticated) {
    return (
      <SpotifySetup
        clientId={clientId}
        setClientId={setClientId}
        onLogin={login}
        error={authError}
      />
    )
  }

  // Premium required warning
  if (!isPremium) {
    return (
      <Card className="glass border-border/30 p-8 max-w-md mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Premium Required</h2>
        <p className="text-muted-foreground mb-4">
          Spotify Web Playback requires a Premium subscription.
        </p>
        <Button variant="outline" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with user info */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.images?.[0]?.url} />
            <AvatarFallback className="bg-[#1DB954]/20 text-[#1DB954]">
              {user?.display_name?.charAt(0) || "S"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user?.display_name}</p>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs bg-[#1DB954]/20 text-[#1DB954]">
                Premium
              </Badge>
              {isReady && (
                <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                  Connected
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Error display */}
      {playerError && (
        <div className="p-3 mx-4 mt-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{playerError}</p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 justify-start">
            <TabsTrigger value="playlists" className="gap-1">
              <ListMusic className="h-4 w-4" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-1">
              <Heart className="h-4 w-4" />
              Liked
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1">
              <Clock className="h-4 w-4" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              Top
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 overflow-hidden m-0 p-4">
            <div className="space-y-4 h-full flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, artists, albums..."
                  className="pl-10"
                />
              </div>

              <ScrollArea className="flex-1">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults?.tracks?.items?.length ? (
                  <div className="space-y-1">
                    {searchResults.tracks.items.map((track) => (
                      <div
                        key={track.id}
                        className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors ${
                          currentTrack?.id === track.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => playTrack(track.uri)}
                      >
                        {track.album.images?.[0] ? (
                          <Image
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Music className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-primary" : ""}`}>
                            {track.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artists.map((a) => a.name).join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToQueue(track.uri).catch(console.error)
                          }}
                          title="Add to queue"
                        >
                          <ListPlus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(track.duration_ms)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found
                  </div>
                ) : null}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full">
              {selectedPlaylist ? (
                <div className="space-y-4">
                  <Button variant="ghost" onClick={() => setSelectedPlaylist(null)} className="gap-1">
                    <ChevronDown className="h-4 w-4 rotate-90" />
                    Back to Playlists
                  </Button>
                  <div className="flex items-center gap-4 mb-4">
                    {selectedPlaylist.images?.[0] ? (
                      <Image
                        src={selectedPlaylist.images[0].url}
                        alt={selectedPlaylist.name}
                        width={80}
                        height={80}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                        <ListMusic className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{selectedPlaylist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlaylist.tracks.total} tracks
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 bg-[#1DB954] hover:bg-[#1ed760]"
                        onClick={() => playContext(selectedPlaylist.uri)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {playlistTracks.map((track, idx) => (
                      <div
                        key={`${track.id}-${idx}`}
                        className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors ${
                          currentTrack?.id === track.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => playTrack(track.uri)}
                      >
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                        {track.album.images?.[0] ? (
                          <Image
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            width={36}
                            height={36}
                            className="rounded"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-muted rounded flex items-center justify-center">
                            <Music className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-primary" : ""}`}>
                            {track.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artists.map((a) => a.name).join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToQueue(track.uri).catch(console.error)
                          }}
                          title="Add to queue"
                        >
                          <ListPlus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(track.duration_ms)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {playlists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      className="glass border-border/30 p-1.5 cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => loadPlaylistTracks(playlist)}
                    >
                      {playlist.images?.[0] ? (
                        <Image
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          width={128}
                          height={128}
                          className="w-full aspect-square object-cover rounded mb-1"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded mb-1 flex items-center justify-center">
                          <ListMusic className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs font-medium truncate">{playlist.name}</p>
                      <p className="text-[10px] text-muted-foreground">{playlist.tracks.total} tracks</p>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Liked Songs Tab */}
          <TabsContent value="liked" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {savedTracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors ${
                      currentTrack?.id === track.id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => playTrack(track.uri)}
                  >
                    {track.album.images?.[0] ? (
                      <Image
                        src={track.album.images[0].url}
                        alt={track.album.name}
                        width={40}
                        height={40}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-primary" : ""}`}>
                        {track.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        addToQueue(track.uri).catch(console.error)
                      }}
                      title="Add to queue"
                    >
                      <ListPlus className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(track.duration_ms)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {recentTracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors ${
                      currentTrack?.id === track.id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => playTrack(track.uri)}
                  >
                    {track.album.images?.[0] ? (
                      <Image
                        src={track.album.images[0].url}
                        alt={track.album.name}
                        width={40}
                        height={40}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-primary" : ""}`}>
                        {track.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        addToQueue(track.uri).catch(console.error)
                      }}
                      title="Add to queue"
                    >
                      <ListPlus className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(track.duration_ms)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Top Tracks Tab */}
          <TabsContent value="top" className="flex-1 overflow-hidden m-0 p-4">
            <div className="space-y-4 h-full flex flex-col">
              {/* Time Range Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Time range:</span>
                <Select
                  value={topTracksTimeRange || "medium_term"}
                  onValueChange={(value) => setTopTracksTimeRange(value as TimeRange)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_term">Last 4 weeks</SelectItem>
                    <SelectItem value="medium_term">Last 6 months</SelectItem>
                    <SelectItem value="long_term">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="flex-1">
                {isLoadingTopTracks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : topTracks.length ? (
                  <div className="space-y-1">
                    {topTracks.map((track, idx) => (
                      <div
                        key={`${track.id}-${idx}`}
                        className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors ${
                          currentTrack?.id === track.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => playTrack(track.uri)}
                      >
                        <span className="text-sm text-muted-foreground w-6 text-right tabular-nums">
                          #{idx + 1}
                        </span>
                        {track.album.images?.[0] ? (
                          <Image
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Music className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-primary" : ""}`}>
                            {track.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artists.map((a) => a.name).join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToQueue(track.uri).catch(console.error)
                          }}
                          title="Add to queue"
                        >
                          <ListPlus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(track.duration_ms)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No top tracks available
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
