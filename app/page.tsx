"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Cloud,
  Newspaper,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Bookmark,
  RefreshCw,
  RotateCw,
  MapPin,
  ArrowUp,
  ArrowDown,
  Zap,
  FileText,
  CheckCircle2,
  Search,
  TrendingUp,
  User,
  FolderGit2,
  Github,
  MessageSquare,
  Play,
  Bitcoin,
  Rocket,
  AlertCircle,
  LayoutGrid,
  Image,
  Music,
  Video,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ThemeCustomizer } from "@/components/ThemeCustomizer"
import { useAuth } from "@/components/AuthProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  useSectionPreferences,
  ToggleableSection,
  DEFAULT_SECTION_ORDER,
  DEFAULT_VISIBILITY,
  CategoryId,
  CategoryMeta,
  DEFAULT_CATEGORY_ASSIGNMENTS,
  DEFAULT_COLLAPSED_CATEGORIES,
  CATEGORIES,
} from "@/hooks/useSectionPreferences"
import { useEnvironment, requiresLocalhost } from "@/hooks/useEnvironment"
import { useWorkingDirectory } from "@/hooks/useWorkingDirectory"
import { WorkingDirSelector } from "@/components/WorkingDirSelector"
import { WorldClocks } from "@/components/WorldClocks"
import { LocalOnlyOverlay, LocalOnlyBadge, EnvironmentBadge } from "@/components/LocalOnlyOverlay"

// Import page content components
import WeatherDashboard from "./sections/weather"
import DailyFeedSection from "./sections/daily-feed"
import ApiPlaygroundSection from "./sections/api-playground"
import QuickNotesSection from "./sections/quick-notes"
import BookmarksSection from "./sections/bookmarks"
import SearchHubSection from "./sections/search-hub"
import AIWorkspaceSection from "./sections/ai-workspace"
import StocksDashboard from "./sections/stocks-dashboard"
import ProfileSection from "./sections/profile"
import TasksSection from "./sections/tasks"
import ProjectsDashboard from "./sections/projects-dashboard"
import JobsSection from "./sections/jobs"
import CryptoDashboard from "./sections/crypto-dashboard"
import SpaceXTracker from "./sections/spacex-tracker"
import PhotoGallerySection from "./sections/photo-gallery"
import GitHubActivity from "./sections/github-activity"
import DisastersMonitor from "./sections/disasters-monitor"
import MarketPulseSection from "./sections/market-pulse"
import KanbanSection from "./sections/kanban"
import FilesSection from "./sections/files"
import SettingsSection from "./sections/settings"
import { MusicPlayerSection } from "./sections/music-player"
import dynamic from "next/dynamic"
import { useLoginTrigger } from "@/hooks/useLoginTrigger"
import { useMusicPlayerSafe } from "@/components/MusicPlayerProvider"

// Lazy-loaded sections
const VideoPlayerSection = dynamic(() => import("./sections/video-player"), {
  loading: () => <div className="p-6 text-muted-foreground">Loading video player...</div>,
})
import { StartupJobsModal } from "@/components/StartupJobsModal"
import { useJobResults } from "@/hooks/useJobResults"

// ============================================================================
// TYPES
// ============================================================================

// Re-export Section type from hook for consistency
type Section = "home" | ToggleableSection | "settings"

interface NavigationItem {
  id: Section
  label: string
  icon: React.ElementType
  description: string
}

// ============================================================================
// NAVIGATION CONFIG
// ============================================================================

const navigationItems: NavigationItem[] = [
  { id: "weather", label: "Weather", icon: Cloud, description: "Live weather monitoring" },
  { id: "feed", label: "Daily Feed", icon: Newspaper, description: "Aggregated content" },
  { id: "market-pulse", label: "Market Pulse", icon: TrendingUp, description: "Tech salary & job trends" },
  { id: "api-playground", label: "API Playground", icon: Zap, description: "Test & debug APIs" },
  { id: "notes", label: "Docs Editor", icon: FileText, description: "GitHub-synced documentation" },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark, description: "Quick links" },
  { id: "search", label: "Search Hub", icon: Search, description: "Search, AI & Image" },
  { id: "ai-workspace", label: "AI Workspace", icon: MessageSquare, description: "Chat with AI models" },
  { id: "stocks", label: "Paper Trading", icon: TrendingUp, description: "Practice stock trading" },
  { id: "crypto", label: "Crypto", icon: Bitcoin, description: "Live cryptocurrency prices" },
  { id: "spacex", label: "SpaceX Launches", icon: Rocket, description: "Track rocket launches" },
  { id: "photo-gallery", label: "Photo Gallery", icon: Image, description: "Photography portfolio" },
  { id: "github-activity", label: "GitHub Activity", icon: Github, description: "GitHub events & repos" },
  { id: "disasters", label: "Disasters", icon: AlertCircle, description: "Earthquakes & alerts" },
  { id: "tasks", label: "Scratchpad", icon: CheckCircle2, description: "Quick notes and todos" },
  { id: "projects", label: "Projects", icon: FolderGit2, description: "GitHub & local repos" },
  { id: "files", label: "Files", icon: FolderOpen, description: "File browser & plugins" },
  { id: "kanban", label: "Kanban", icon: LayoutGrid, description: "Visual task board" },
  { id: "jobs", label: "Jobs", icon: Play, description: "Claude batch prompts" },
  { id: "music-player", label: "Music Player", icon: Music, description: "Synthwave music player" },
  { id: "video-player", label: "Video Player", icon: Video, description: "Media playback" },
  { id: "profile", label: "Profile", icon: User, description: "Account & sync" },
  { id: "settings", label: "Settings", icon: Settings, description: "Theme & preferences" },
]

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

function SidebarContent({
  activeSection,
  setActiveSection,
  jobsNeedsHumanCount = 0,
  collapsed = false,
  mobile = false,
  onNavigate,
  userAvatar,
  userName,
  sectionOrder,
  sectionVisibility,
  categoryAssignments,
  collapsedCategories,
  onToggleCategoryCollapsed,
  prefsLoaded = false,
  isLocal = false,
  workingDir,
  setWorkingDir,
  recentDirs,
  removeFromRecentDirs,
  clearWorkingDir,
  categories,
}: {
  activeSection: Section
  setActiveSection: (section: Section) => void
  jobsNeedsHumanCount?: number
  collapsed?: boolean
  mobile?: boolean
  onNavigate?: () => void
  userAvatar?: string | null
  userName?: string | null
  sectionOrder: ToggleableSection[]
  sectionVisibility: Record<ToggleableSection, boolean>
  categoryAssignments: Record<ToggleableSection, CategoryId>
  collapsedCategories: Record<CategoryId, boolean>
  onToggleCategoryCollapsed: (categoryId: CategoryId) => void
  prefsLoaded?: boolean
  isLocal?: boolean
  workingDir: string
  setWorkingDir: (dir: string) => void
  recentDirs: string[]
  removeFromRecentDirs: (dir: string) => void
  clearWorkingDir: () => void
  categories: CategoryMeta[]
}) {
  // Music player context for now-playing indicator
  const musicContext = useMusicPlayerSafe()

  // Get current track info from music player
  const currentTrack = musicContext?.player?.currentTrack ||
    (musicContext?.remotePlayback?.item ? {
      name: musicContext.remotePlayback.item.name,
      artists: musicContext.remotePlayback.item.artists.map(a => ({ name: a.name })),
    } : null)
  const isPlaying = musicContext?.player?.isActive
    ? musicContext.player.isPlaying
    : (musicContext?.remotePlayback?.is_playing ?? false)
  const isMusicActive = currentTrack && (isPlaying || musicContext?.isDrawerOpen)

  const handleSectionClick = (id: Section) => {
    setActiveSection(id)
    onNavigate?.() // Close mobile menu when section is clicked
    // If navigating to music-player and music is playing, also open the drawer
    if (id === "music-player" && musicContext && isPlaying) {
      musicContext.setDrawerOpen(true)
    }
  }

  const handleHomeClick = () => {
    setActiveSection("home")
    onNavigate?.()
  }

  // Group sections by category
  const getSectionsByCategory = React.useCallback(() => {
    const effectiveOrder = prefsLoaded ? sectionOrder : DEFAULT_SECTION_ORDER
    const effectiveVisibility = prefsLoaded ? sectionVisibility : DEFAULT_VISIBILITY
    const effectiveAssignments = prefsLoaded ? categoryAssignments : DEFAULT_CATEGORY_ASSIGNMENTS

    // Initialize result with all categories (dynamic)
    const result: Record<CategoryId, NavigationItem[]> = {}
    for (const category of categories) {
      result[category.id] = []
    }

    for (const id of effectiveOrder) {
      if (effectiveVisibility[id]) {
        const item = navigationItems.find((i) => i.id === id)
        if (item) {
          const category = effectiveAssignments[id]
          if (!result[category]) {
            result[category] = []
          }
          result[category].push(item)
        }
      }
    }

    return result
  }, [prefsLoaded, sectionOrder, sectionVisibility, categoryAssignments, categories])

  const sectionsByCategory = getSectionsByCategory()
  const effectiveCollapsedCategories = prefsLoaded ? collapsedCategories : DEFAULT_COLLAPSED_CATEGORIES

  // Track which category flyout is open (for collapsed sidebar)
  const [openCategoryFlyout, setOpenCategoryFlyout] = React.useState<CategoryId | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Header - clickable to return home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleHomeClick}
            className={`p-4 border-b border-border/20 transition-all duration-300 w-full text-left hover:bg-primary/5 ${collapsed && !mobile ? 'px-3' : ''}`}
            data-tabz-section="home"
            data-tabz-action="navigate"
          >
            <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed && !mobile ? 'justify-center' : ''}`}>
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className={`flex-1 transition-[max-width,opacity] duration-300 overflow-hidden ${collapsed && !mobile ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">Personal Home</p>
                  <EnvironmentBadge isLocal={isLocal} collapsed={collapsed && !mobile} />
                </div>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
              {userAvatar && !collapsed && (
                <Avatar className="h-8 w-8 border border-primary/20 flex-shrink-0">
                  <AvatarImage src={userAvatar} alt={userName || "User"} />
                  <AvatarFallback>{userName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </button>
        </TooltipTrigger>
        {(collapsed && !mobile) && (
          <TooltipContent side="right">
            <p>Home</p>
          </TooltipContent>
        )}
      </Tooltip>

      {/* Working Directory Selector */}
      <WorkingDirSelector
        workingDir={workingDir}
        setWorkingDir={setWorkingDir}
        recentDirs={recentDirs}
        removeFromRecentDirs={removeFromRecentDirs}
        clearWorkingDir={clearWorkingDir}
        collapsed={collapsed}
        mobile={mobile}
      />

      {/* Navigation with Categories */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {/* Collapsed sidebar: show category icons with flyout popovers */}
          {collapsed && !mobile ? (
            <div className="space-y-1">
              {categories.map((category) => {
                const sections = sectionsByCategory[category.id]
                if (sections.length === 0) return null

                const CategoryIcon = category.icon
                const hasActiveSection = sections.some((s) => s.id === activeSection)

                return (
                  <Popover
                    key={category.id}
                    open={openCategoryFlyout === category.id}
                    onOpenChange={(open) => setOpenCategoryFlyout(open ? category.id : null)}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            className={`
                              w-full flex items-center justify-center p-2.5 rounded-lg transition-colors
                              ${hasActiveSection
                                ? 'glass text-primary border-glow'
                                : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                              }
                            `}
                            data-tabz-category={category.id}
                            data-tabz-action="open-category-flyout"
                          >
                            <CategoryIcon className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{category.label}</p>
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent side="right" align="start" className="w-56 p-2" sideOffset={8}>
                      <div className="mb-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {category.label}
                      </div>
                      <ul className="space-y-1">
                        {sections.map((item) => {
                          const Icon = item.icon
                          const isActive = activeSection === item.id

                          // Special handling for music player: show current track info
                          const isMusicItem = item.id === "music-player"
                          const showNowPlaying = isMusicItem && isMusicActive && currentTrack
                          const displayLabel = showNowPlaying
                            ? `${currentTrack.name} - ${currentTrack.artists.map(a => a.name).join(", ")}`
                            : item.label

                          return (
                            <li key={item.id}>
                              <button
                                onClick={() => {
                                  handleSectionClick(item.id)
                                  setOpenCategoryFlyout(null)
                                }}
                                className={`
                                  w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                                  ${isActive
                                    ? 'glass text-primary border-glow'
                                    : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                                  }
                                  ${showNowPlaying ? 'text-[#1DB954]' : ''}
                                `}
                                data-tabz-section={item.id}
                                data-tabz-action="navigate"
                              >
                                <div className="relative flex-shrink-0">
                                  <Icon className={`h-4 w-4 ${showNowPlaying && isPlaying ? 'animate-pulse' : ''}`} />
                                  {item.id === "jobs" && jobsNeedsHumanCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-[9px] flex items-center justify-center text-white font-medium">
                                      {jobsNeedsHumanCount > 9 ? '!' : jobsNeedsHumanCount}
                                    </span>
                                  )}
                                </div>
                                <span className={`flex-1 text-left text-sm truncate ${showNowPlaying ? 'max-w-[120px]' : ''}`}>
                                  {displayLabel}
                                </span>
                                {!isLocal && requiresLocalhost(item.id) && (
                                  <LocalOnlyBadge />
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </PopoverContent>
                  </Popover>
                )
              })}
            </div>
          ) : (
            /* Expanded sidebar: show full category headers with collapsible sections */
            categories.map((category) => {
              const sections = sectionsByCategory[category.id]
              if (sections.length === 0) return null

              const isCatCollapsed = effectiveCollapsedCategories[category.id]

              return (
                <div key={category.id} data-tabz-category={category.id}>
                  {/* Category Header */}
                  <button
                    onClick={() => onToggleCategoryCollapsed(category.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
                    data-tabz-action="toggle-category"
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform duration-200 ${isCatCollapsed ? '-rotate-90' : ''}`}
                    />
                    <span className="flex-1 text-left">{category.label}</span>
                    <span className="text-[10px] font-normal opacity-0 group-hover:opacity-60 transition-opacity">
                      {sections.length}
                    </span>
                  </button>

                  {/* Category Items */}
                  <ul
                    className={`space-y-1 overflow-hidden transition-all duration-200 ${
                      isCatCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                    }`}
                  >
                    {sections.map((item) => {
                      const Icon = item.icon
                      const isActive = activeSection === item.id

                      // Special handling for music player: show current track info
                      const isMusicItem = item.id === "music-player"
                      const showNowPlaying = isMusicItem && isMusicActive && currentTrack
                      const displayLabel = showNowPlaying
                        ? `${currentTrack.name} - ${currentTrack.artists.map(a => a.name).join(", ")}`
                        : item.label

                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => handleSectionClick(item.id)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2 pl-5 rounded-lg transition-colors
                              ${isActive
                                ? 'glass text-primary border-glow'
                                : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                              }
                              ${showNowPlaying ? 'text-[#1DB954]' : ''}
                            `}
                            data-tabz-section={item.id}
                            data-tabz-action="navigate"
                          >
                            <div className="relative flex-shrink-0">
                              <Icon className={`h-4 w-4 ${showNowPlaying && isPlaying ? 'animate-pulse' : ''}`} />
                              {item.id === "jobs" && jobsNeedsHumanCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-[9px] flex items-center justify-center text-white font-medium">
                                  {jobsNeedsHumanCount > 9 ? '!' : jobsNeedsHumanCount}
                                </span>
                              )}
                            </div>
                            <span className={`flex-1 text-left text-sm truncate ${showNowPlaying ? 'max-w-[140px]' : ''}`}>
                              {displayLabel}
                            </span>
                            {!isLocal && requiresLocalhost(item.id) && (
                              <LocalOnlyBadge />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}

          {/* Settings - always at the end, outside categories */}
          <div className="pt-2 border-t border-border/10">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSectionClick("settings")}
                  className={`
                    w-full flex items-center rounded-lg transition-[background-color,color,padding,gap] duration-200
                    ${collapsed && !mobile ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'}
                    ${activeSection === "settings"
                      ? 'glass text-primary border-glow'
                      : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                    }
                  `}
                  data-tabz-section="settings"
                  data-tabz-action="navigate"
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className={`flex-1 text-left text-sm transition-[max-width,opacity] duration-300 overflow-hidden whitespace-nowrap ${
                    collapsed && !mobile ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'
                  }`}>Settings</span>
                </button>
              </TooltipTrigger>
              {collapsed && !mobile && (
                <TooltipContent side="right">
                  <p>Settings</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-border/20 transition-all duration-300 ${collapsed && !mobile ? 'px-3' : ''}`}>
        <div className={`text-xs text-muted-foreground transition-all duration-300 overflow-hidden ${
          collapsed && !mobile ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3 w-3" />
            <span>Last updated: Just now</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HOME SECTION
// ============================================================================

// Default location (San Francisco)
const DEFAULT_LOCATION = {
  latitude: 37.7749,
  longitude: -122.4194,
  name: "San Francisco, CA",
}

// Weather code to condition mapping
function getConditionFromCode(code: number): string {
  if (code === 0) return "Clear"
  if (code <= 3) return "Partly Cloudy"
  if (code <= 48) return "Foggy"
  if (code <= 67) return "Rainy"
  if (code <= 77) return "Snowy"
  if (code <= 82) return "Showers"
  return "Stormy"
}

// Fetch weather summary for home card
async function fetchHomeWeather(lat: number, lon: number, unit: "fahrenheit" | "celsius") {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min",
    temperature_unit: unit,
    forecast_days: "1",
    timezone: "auto",
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error("Failed to fetch weather")
  const data = await res.json()
  return {
    temp: Math.round(data.current.temperature_2m),
    condition: getConditionFromCode(data.current.weather_code),
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
  }
}

function HomeSection({ onNavigate, userName, isVisible, prefsLoaded, sectionOrder }: { onNavigate: (section: Section) => void; userName?: string | null; isVisible: (section: ToggleableSection) => boolean; prefsLoaded: boolean; sectionOrder: ToggleableSection[] }) {
  // Use default visibility (all visible) during SSR to prevent hydration mismatch
  const checkVisible = (section: ToggleableSection) => prefsLoaded ? isVisible(section) : true
  // Use default order during SSR to prevent hydration mismatch
  const effectiveOrder = prefsLoaded ? sectionOrder : DEFAULT_SECTION_ORDER
  // Get saved location and temp unit from localStorage (same as Weather section)
  const [location, setLocation] = React.useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("weather-location")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Invalid JSON
        }
      }
    }
    return DEFAULT_LOCATION
  })

  const [tempUnit] = React.useState<"fahrenheit" | "celsius">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("weather-temp-unit")
      if (saved === "celsius" || saved === "fahrenheit") return saved
    }
    return "fahrenheit"
  })

  // Use same query key pattern as Weather section for cache sharing
  const { data: weather, isLoading: weatherLoading } = useQuery({
    queryKey: ["home-weather", location.latitude, location.longitude, tempUnit],
    queryFn: () => fetchHomeWeather(location.latitude, location.longitude, tempUnit),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // Listen for location changes from Weather section
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "weather-location" && e.newValue) {
        try {
          setLocation(JSON.parse(e.newValue))
        } catch {
          // Invalid JSON
        }
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  // Fetch feed count using same query as Daily Feed section
  const { data: feedData } = useQuery({
    queryKey: ["feed", ["hackernews", "github", "reddit", "lobsters", "devto"], ["commandline", "ClaudeAI", "ClaudeCode", "cli", "tui"]],
    queryFn: async () => {
      const res = await fetch("/api/feed")
      if (!res.ok) throw new Error("Failed to fetch feed")
      return res.json()
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
  const feedCount = feedData?.items?.length ?? null

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow mb-2">
        Welcome Home{userName ? `, ${userName.split(' ')[0]}` : ''}
      </h1>
      <p className="text-muted-foreground mb-6">Your personal dashboard overview</p>

      {/* World Clocks Widget */}
      <div className="mb-6">
        <WorldClocks />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Render tiles in order from section preferences */}
        {effectiveOrder.map((sectionId) => {
          if (!checkVisible(sectionId)) return null

          // Weather tile - has dynamic data
          if (sectionId === "weather") {
            return (
              <button
                key={sectionId}
                onClick={() => onNavigate("weather")}
                className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                data-tabz-section="weather"
                data-tabz-action="navigate"
              >
                <div className="flex items-start justify-between mb-4">
                  <Cloud className="h-8 w-8 text-primary" />
                  {weather && (
                    <span className="text-3xl font-bold text-primary">{weather.temp}°</span>
                  )}
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Weather</h3>
                {weather ? (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{weather.condition}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-0.5">
                        <ArrowUp className="h-3 w-3 text-red-400" />
                        {weather.high}°
                      </span>
                      <span className="flex items-center gap-0.5">
                        <ArrowDown className="h-3 w-3 text-blue-400" />
                        {weather.low}°
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {location.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {weatherLoading ? "Loading weather data..." : "Unable to load weather"}
                  </p>
                )}
              </button>
            )
          }

          // Feed tile - has dynamic data
          if (sectionId === "feed") {
            return (
              <button
                key={sectionId}
                onClick={() => onNavigate("feed")}
                className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                data-tabz-section="feed"
                data-tabz-action="navigate"
              >
                <div className="flex items-start justify-between mb-4">
                  <Newspaper className="h-8 w-8 text-primary" />
                  {feedCount !== null && (
                    <span className="text-3xl font-bold text-primary">{feedCount}</span>
                  )}
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Daily Feed</h3>
                {feedCount !== null ? (
                  <p className="text-sm text-muted-foreground">
                    {feedCount} items from HN, GitHub, Reddit & more
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading feed...</p>
                )}
              </button>
            )
          }

          // Static tiles configuration
          const tileConfig: Record<ToggleableSection, { icon: React.ElementType; label: string; description: string } | null> = {
            weather: null, // Handled above
            feed: null, // Handled above
            "market-pulse": { icon: TrendingUp, label: "Market Pulse", description: "Tech salary & job trends" },
            "api-playground": { icon: Zap, label: "API Playground", description: "Test and debug API requests" },
            notes: { icon: FileText, label: "Docs Editor", description: "GitHub-synced documentation" },
            bookmarks: { icon: Bookmark, label: "Bookmarks", description: "Organized quick links" },
            search: { icon: Search, label: "Search Hub", description: "Multi-engine web search" },
            "ai-workspace": { icon: MessageSquare, label: "AI Workspace", description: "Chat with Claude & local models" },
            stocks: { icon: TrendingUp, label: "Paper Trading", description: "Practice stock trading" },
            crypto: { icon: Bitcoin, label: "Crypto", description: "Live cryptocurrency prices" },
            spacex: { icon: Rocket, label: "SpaceX Launches", description: "Track rocket launches" },
            "photo-gallery": { icon: Image, label: "Photo Gallery", description: "Photography portfolio" },
            "github-activity": { icon: Github, label: "GitHub Activity", description: "GitHub events & repos" },
            disasters: { icon: AlertCircle, label: "Disasters", description: "Earthquakes & alerts" },
            tasks: { icon: CheckCircle2, label: "Scratchpad", description: "Quick notes and todos" },
            projects: { icon: FolderGit2, label: "Projects", description: "GitHub & local repos" },
            files: { icon: FolderOpen, label: "Files", description: "File browser & plugins" },
            kanban: { icon: LayoutGrid, label: "Kanban", description: "Visual task board" },
            jobs: { icon: Play, label: "Jobs", description: "Claude batch prompts" },
            "music-player": { icon: Music, label: "Music Player", description: "Synthwave music player" },
            "video-player": { icon: Video, label: "Video Player", description: "Media playback" },
            profile: { icon: User, label: "Profile", description: "Account & sync status" },
          }

          const config = tileConfig[sectionId]
          if (!config) return null

          const Icon = config.icon
          return (
            <button
              key={sectionId}
              onClick={() => onNavigate(sectionId)}
              className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
              data-tabz-section={sectionId}
              data-tabz-action="navigate"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{config.label}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </button>
          )
        })}

        {/* Settings Card - always visible at the end */}
        <button
          onClick={() => onNavigate("settings")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
          data-tabz-section="settings"
          data-tabz-action="navigate"
        >
          <div className="flex items-start justify-between mb-4">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Settings</h3>
          <p className="text-sm text-muted-foreground">Customize themes and preferences</p>
        </button>
      </div>
    </div>
  )
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PersonalHomepage() {
  const { user } = useAuth()
  const {
    visibility,
    order,
    isVisible,
    isLoaded,
    categoryAssignments,
    collapsedCategories,
    toggleCategoryCollapsed,
    getAllCategories,
  } = useSectionPreferences()

  // Get dynamic categories (default + custom)
  // Use default categories until preferences are loaded to prevent hydration mismatch
  const categories = isLoaded ? getAllCategories() : CATEGORIES
  const { isLocal } = useEnvironment()
  const {
    workingDir,
    setWorkingDir,
    recentDirs,
    removeFromRecentDirs,
    clearWorkingDir,
    isLoaded: workingDirLoaded,
  } = useWorkingDirectory()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<Section>("home")
  const [activeSubItem, setActiveSubItem] = React.useState<string | null>(null)
  const [aiWorkspaceProject, setAiWorkspaceProject] = React.useState<string | null>(null)
  const [sectionRestored, setSectionRestored] = React.useState(false)

  // Restore active section from localStorage after mount (avoids hydration mismatch)
  React.useEffect(() => {
    const saved = localStorage.getItem("active-section")
    if (saved && navigationItems.some(item => item.id === saved)) {
      setActiveSection(saved as Section)
    }
    setSectionRestored(true)
  }, [])

  // Persist active section to localStorage (only after initial restore)
  React.useEffect(() => {
    if (sectionRestored) {
      localStorage.setItem("active-section", activeSection)
    }
  }, [activeSection, sectionRestored])

  // Set CSS variable for sidebar width (used by PersistentMusicDrawer)
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      sidebarCollapsed ? '80px' : '280px'
    )
  }, [sidebarCollapsed])

  // Get user info for personalization
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.user_name || null
  const userAvatar = user?.user_metadata?.avatar_url || null
  const [weatherAlertCount, setWeatherAlertCount] = React.useState<number>(0)

  // On-login trigger for startup jobs
  const { pendingJobs, hasPendingJobs, clearPendingJobs } = useLoginTrigger()
  const [showStartupModal, setShowStartupModal] = React.useState(false)

  // Job results for needs-human badge
  const { needsHumanCount } = useJobResults()

  // Show startup modal when there are pending jobs
  React.useEffect(() => {
    if (hasPendingJobs) {
      setShowStartupModal(true)
    }
  }, [hasPendingJobs])

  // Clear sub-item after scroll completes
  const clearSubItem = React.useCallback(() => {
    setActiveSubItem(null)
  }, [])

  // Render the active section content
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <HomeSection onNavigate={setActiveSection} userName={userName} isVisible={isVisible} prefsLoaded={isLoaded} sectionOrder={order} />
      case "weather":
        return <WeatherDashboard activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onAlertCountChange={setWeatherAlertCount} />
      case "feed":
        return <DailyFeedSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "market-pulse":
        return <MarketPulseSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "api-playground":
        return <ApiPlaygroundSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "notes":
        return <QuickNotesSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSettings={() => setActiveSection("profile")} />
      case "bookmarks":
        return <BookmarksSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSettings={() => setActiveSection("profile")} />
      case "search":
        return <SearchHubSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "ai-workspace":
        if (!isLocal) {
          return <LocalOnlyOverlay sectionName="AI Workspace" description="This feature streams from local AI CLIs (Claude, Gemini, Codex) that require localhost to run." />
        }
        return <AIWorkspaceSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} initialProjectPath={aiWorkspaceProject} onProjectPathConsumed={() => setAiWorkspaceProject(null)} defaultWorkingDir={workingDir} />
      case "stocks":
        return <StocksDashboard activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSettings={() => setActiveSection("settings")} />
      case "crypto":
        return <CryptoDashboard activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "spacex":
        return <SpaceXTracker activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "photo-gallery":
        return <PhotoGallerySection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "github-activity":
        return <GitHubActivity activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "disasters":
        return <DisastersMonitor activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "tasks":
        return <TasksSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSettings={() => setActiveSection("profile")} />
      case "projects":
        if (!isLocal) {
          return <LocalOnlyOverlay sectionName="Projects" description="This feature scans your local ~/projects/ directory and requires localhost to access the file system." />
        }
        return <ProjectsDashboard activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSection={(section, projectPath) => {
          if (section === 'ai-workspace' && projectPath) {
            setAiWorkspaceProject(projectPath)
          }
          setActiveSection(section as Section)
        }} />
      case "jobs":
        if (!isLocal) {
          return <LocalOnlyOverlay sectionName="Jobs" description="This feature executes Claude CLI commands against local projects and requires localhost to run." />
        }
        return <JobsSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "files":
        if (!isLocal) {
          return <LocalOnlyOverlay sectionName="Files" description="This feature browses local files and manages Claude Code plugins, requiring localhost access." />
        }
        return <FilesSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "kanban":
        return <KanbanSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "music-player":
        return <MusicPlayerSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "video-player":
        return <VideoPlayerSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "profile":
        return <ProfileSection />
      case "settings":
        return <SettingsSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      default:
        return <HomeSection onNavigate={setActiveSection} userName={userName} isVisible={isVisible} prefsLoaded={isLoaded} sectionOrder={order} />
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen relative z-10">
        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 lg:hidden glass"
              data-tabz-action="toggle-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 glass-dark border-r-border/20 p-0" data-tabz-container="mobile-sidebar">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation for the dashboard</SheetDescription>
            </VisuallyHidden>
            <SidebarContent
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              jobsNeedsHumanCount={needsHumanCount}
              mobile
              onNavigate={() => setMobileMenuOpen(false)}
              userAvatar={userAvatar}
              userName={userName}
              sectionOrder={order}
              sectionVisibility={visibility}
              categoryAssignments={categoryAssignments}
              collapsedCategories={collapsedCategories}
              onToggleCategoryCollapsed={toggleCategoryCollapsed}
              prefsLoaded={isLoaded}
              isLocal={isLocal}
              workingDir={workingDir}
              categories={categories}
              setWorkingDir={setWorkingDir}
              recentDirs={recentDirs}
              removeFromRecentDirs={removeFromRecentDirs}
              clearWorkingDir={clearWorkingDir}
            />
          </SheetContent>
        </Sheet>

        <div className="flex h-screen">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block relative flex-shrink-0">
            <aside
              className={`h-full glass-dark border-r border-border/20 transition-[width] duration-300 ease-in-out overflow-hidden ${
                sidebarCollapsed ? 'w-[80px]' : 'w-[280px]'
              }`}
              data-tabz-container="sidebar"
            >
              <SidebarContent
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                jobsNeedsHumanCount={needsHumanCount}
                collapsed={sidebarCollapsed}
                userAvatar={userAvatar}
                userName={userName}
                sectionOrder={order}
                sectionVisibility={visibility}
                categoryAssignments={categoryAssignments}
                collapsedCategories={collapsedCategories}
                onToggleCategoryCollapsed={toggleCategoryCollapsed}
                prefsLoaded={isLoaded}
                isLocal={isLocal}
                workingDir={workingDir}
                setWorkingDir={setWorkingDir}
                recentDirs={recentDirs}
                removeFromRecentDirs={removeFromRecentDirs}
                clearWorkingDir={clearWorkingDir}
                categories={categories}
              />
            </aside>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-4 top-20 glass rounded-full h-8 w-8 z-20"
              data-tabz-action="toggle-sidebar"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto" data-tabz-container="main" data-tabz-section={activeSection}>
            {/* Mobile header spacer */}
            <div className="h-16 lg:hidden" />

            {renderContent()}
          </main>
        </div>

        {/* Startup Jobs Modal */}
        <StartupJobsModal
          open={showStartupModal}
          jobs={pendingJobs}
          onClose={() => {
            setShowStartupModal(false)
            clearPendingJobs()
          }}
          onSkipAll={() => {
            setShowStartupModal(false)
            clearPendingJobs()
          }}
        />
      </div>
    </TooltipProvider>
  )
}
