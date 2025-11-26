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
  Calendar,
  Bookmark,
  RefreshCw,
  RotateCw,
  MapPin,
  ArrowUp,
  ArrowDown,
  Radio,
  AlertTriangle,
  Rss,
  Star,
  Timer,
  Zap,
  FolderOpen,
  History,
  Palette,
  SlidersHorizontal,
  Key,
  FileText,
  Clock,
  CheckCircle2,
  Grid,
  Search,
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
import { ThemeCustomizer } from "@/components/ThemeCustomizer"
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel"

// Import page content components
import WeatherDashboard from "./sections/weather"
import DailyFeedSection from "./sections/daily-feed"
import ApiPlaygroundSection from "./sections/api-playground"
import QuickNotesSection from "./sections/quick-notes"
import BookmarksSection from "./sections/bookmarks"

// ============================================================================
// TYPES
// ============================================================================

type Section = "home" | "weather" | "feed" | "api-playground" | "notes" | "bookmarks" | "settings"

interface SubItem {
  id: string
  label: string
  icon: React.ElementType
}

interface NavigationItem {
  id: Section
  label: string
  icon: React.ElementType
  description: string
  subItems?: SubItem[]
}

// ============================================================================
// NAVIGATION CONFIG
// ============================================================================

const navigationItems: NavigationItem[] = [
  {
    id: "weather",
    label: "Weather",
    icon: Cloud,
    description: "Live weather monitoring",
    subItems: [
      { id: "forecast", label: "Forecast", icon: Calendar },
      { id: "radar", label: "Radar", icon: Radio },
      { id: "alerts", label: "Alerts", icon: AlertTriangle },
    ]
  },
  {
    id: "feed",
    label: "Daily Feed",
    icon: Newspaper,
    description: "Aggregated content",
    subItems: [
      { id: "sources", label: "Sources", icon: Rss },
      { id: "saved", label: "Saved Items", icon: Star },
      { id: "refresh", label: "Refresh", icon: Timer },
    ]
  },
  {
    id: "api-playground",
    label: "API Playground",
    icon: Zap,
    description: "Test & debug APIs",
    subItems: [
      { id: "collections", label: "Collections", icon: FolderOpen },
      { id: "history", label: "History", icon: History },
    ]
  },
  {
    id: "notes",
    label: "Quick Notes",
    icon: FileText,
    description: "GitHub-synced notes",
    subItems: [
      { id: "files", label: "Browse Files", icon: FolderOpen },
      { id: "recent", label: "Recent", icon: Clock },
    ]
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    icon: Bookmark,
    description: "Quick links",
    subItems: [
      { id: "all", label: "All Links", icon: Grid },
      { id: "search", label: "Search", icon: Search },
    ]
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Theme & preferences",
    subItems: [
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "feed-config", label: "Feed Config", icon: SlidersHorizontal },
      { id: "api-keys", label: "API Keys", icon: Key },
    ]
  },
]

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

function SidebarContent({
  activeSection,
  setActiveSection,
  expandedSection,
  setExpandedSection,
  setActiveSubItem,
  weatherAlertCount = 0,
  collapsed = false,
  mobile = false,
  onNavigate,
}: {
  activeSection: Section
  setActiveSection: (section: Section) => void
  expandedSection: Section | null
  setExpandedSection: (section: Section | null) => void
  setActiveSubItem?: (subItem: string | null) => void
  weatherAlertCount?: number
  collapsed?: boolean
  mobile?: boolean
  onNavigate?: () => void
}) {
  const handleSectionClick = (id: Section) => {
    // Navigate to section
    setActiveSection(id)
    // Clear any active sub-item when clicking section header
    setActiveSubItem?.(null)
    // Toggle expand (collapse if already expanded, expand otherwise)
    setExpandedSection(expandedSection === id ? null : id)
    // Don't close mobile menu on section click - let user explore sub-items
  }

  const handleSubItemClick = (sectionId: Section, subItemId: string) => {
    setActiveSection(sectionId)
    // Trigger scroll to the sub-item's anchor
    setActiveSubItem?.(subItemId)
    onNavigate?.() // Close mobile menu when sub-item is clicked
  }

  const handleHomeClick = () => {
    setActiveSection("home")
    setExpandedSection(null)
    onNavigate?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - clickable to return home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleHomeClick}
            className={`p-4 border-b border-border/20 transition-all duration-300 w-full text-left hover:bg-primary/5 ${collapsed && !mobile ? 'px-3' : ''}`}
          >
            <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed && !mobile ? 'justify-center' : ''}`}>
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="font-semibold text-foreground">Personal Home</p>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
          </button>
        </TooltipTrigger>
        {(collapsed && !mobile) && (
          <TooltipContent side="right">
            <p>Home</p>
          </TooltipContent>
        )}
      </Tooltip>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            const isExpanded = expandedSection === item.id
            const hasSubItems = item.subItems && item.subItems.length > 0

            return (
              <li key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSectionClick(item.id)}
                      className={`
                        w-full flex items-center rounded-lg transition-all duration-200
                        ${collapsed && !mobile ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                        ${isActive
                          ? 'glass text-primary border-glow'
                          : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className={`flex-1 text-left transition-all duration-300 overflow-hidden whitespace-nowrap ${
                        collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                      }`}>{item.label}</span>
                      {/* Chevron for expandable items */}
                      {hasSubItems && !(collapsed && !mobile) && (
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && !mobile && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Sub-items (accordion content) */}
                {hasSubItems && !(collapsed && !mobile) && (
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <ul className="ml-4 mt-1 space-y-0.5 border-l border-border/20 pl-3">
                      {item.subItems!.map((subItem) => {
                        const SubIcon = subItem.icon
                        // Show alert count badge for weather alerts
                        const showAlertBadge = item.id === "weather" && subItem.id === "alerts"
                        return (
                          <li key={subItem.id}>
                            <button
                              onClick={() => handleSubItemClick(item.id, subItem.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded transition-colors"
                            >
                              <SubIcon className="h-3.5 w-3.5" />
                              <span className="flex-1 text-left">{subItem.label}</span>
                              {showAlertBadge && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  weatherAlertCount > 0
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  ({weatherAlertCount})
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
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

function HomeSection({ onNavigate }: { onNavigate: (section: Section) => void }) {
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
      <h1 className="text-3xl font-bold terminal-glow mb-2">Welcome Home</h1>
      <p className="text-muted-foreground mb-8">Your personal dashboard overview</p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Weather Card */}
        <button
          onClick={() => onNavigate("weather")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
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

        {/* Daily Feed Card */}
        <button
          onClick={() => onNavigate("feed")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
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

        {/* API Playground Card */}
        <button
          onClick={() => onNavigate("api-playground")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
        >
          <div className="flex items-start justify-between mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">API Playground</h3>
          <p className="text-sm text-muted-foreground">Test and debug API requests</p>
        </button>

        {/* Quick Notes Card */}
        <button
          onClick={() => onNavigate("notes")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
        >
          <div className="flex items-start justify-between mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Quick Notes</h3>
          <p className="text-sm text-muted-foreground">GitHub-synced markdown notes</p>
        </button>

        {/* Bookmarks Card */}
        <button
          onClick={() => onNavigate("bookmarks")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
        >
          <div className="flex items-start justify-between mb-4">
            <Bookmark className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Bookmarks</h3>
          <p className="text-sm text-muted-foreground">Organized quick links</p>
        </button>

        {/* Settings Card */}
        <button
          onClick={() => onNavigate("settings")}
          className="glass rounded-lg p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
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
// SETTINGS SECTION
// ============================================================================

function GitHubSettings() {
  const [token, setToken] = React.useState("")
  const [repo, setRepo] = React.useState("")
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null)
  const [showToken, setShowToken] = React.useState(false)

  // Load saved values
  React.useEffect(() => {
    const savedToken = localStorage.getItem("github-token") || ""
    const savedRepo = localStorage.getItem("github-repo") || ""
    setToken(savedToken)
    setRepo(savedRepo)
  }, [])

  // Save token
  const handleTokenChange = (value: string) => {
    setToken(value)
    localStorage.setItem("github-token", value)
    setTestResult(null)
  }

  // Save repo
  const handleRepoChange = (value: string) => {
    setRepo(value)
    localStorage.setItem("github-repo", value)
    setTestResult(null)
  }

  // Test connection
  const handleTest = async () => {
    if (!token || !repo) {
      setTestResult({ success: false, message: "Please enter both token and repository" })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const { testConnection } = await import("@/lib/github")
      const result = await testConnection(token, repo)
      if (result.success) {
        setTestResult({ success: true, message: `Connected to ${result.repoName}` })
      } else {
        setTestResult({ success: false, message: result.error || "Connection failed" })
      }
    } catch (error) {
      setTestResult({ success: false, message: "Failed to test connection" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Personal Access Token</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-mono"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowToken(!showToken)}
            className="h-10 w-10"
          >
            {showToken ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Create at <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/settings/tokens</a> with <code className="px-1 py-0.5 bg-muted rounded text-[10px]">repo</code> scope
        </p>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Repository</label>
        <input
          type="text"
          value={repo}
          onChange={(e) => handleRepoChange(e.target.value)}
          placeholder="username/ObsidianVault"
          className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Format: <code className="px-1 py-0.5 bg-muted rounded text-[10px]">owner/repo</code>
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleTest} disabled={testing || !token || !repo} variant="outline">
          {testing ? (
            <>
              <RotateCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
        {testResult && (
          <span className={`text-sm ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  )
}

function SettingsSection({ activeSubItem, onSubItemHandled }: { activeSubItem?: string | null; onSubItemHandled?: () => void }) {
  // Scroll to sub-item when activeSubItem changes
  React.useEffect(() => {
    if (activeSubItem) {
      // Small delay to ensure DOM is ready after section switch
      const timer = setTimeout(() => {
        const element = document.getElementById(`settings-${activeSubItem}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        onSubItemHandled?.()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeSubItem, onSubItemHandled])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold terminal-glow mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Customize your dashboard</p>

      <div className="max-w-3xl">
        <div id="settings-appearance" className="glass rounded-lg p-6 mb-6 scroll-mt-6">
          <h3 className="font-semibold mb-6">Theme & Appearance</h3>
          <ThemeSettingsPanel />
        </div>

        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <h3 className="font-semibold">GitHub Integration</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Connect to a GitHub repository for Quick Notes sync</p>
          <GitHubSettings />
        </div>

        <div id="settings-feed-config" className="glass rounded-lg p-6 mb-6 scroll-mt-6">
          <h3 className="font-semibold mb-4">Feed Configuration</h3>
          <p className="text-sm text-muted-foreground mb-4">Configure your content sources</p>
          <Button variant="outline" disabled>Coming Soon</Button>
        </div>

        <div id="settings-api-keys" className="glass rounded-lg p-6 scroll-mt-6">
          <h3 className="font-semibold mb-4">API Keys</h3>
          <p className="text-sm text-muted-foreground mb-4">Manage API keys and environments</p>
          <Button variant="outline" disabled>Coming Soon</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PersonalHomepage() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<Section>("home")
  const [expandedSection, setExpandedSection] = React.useState<Section | null>(null)
  const [activeSubItem, setActiveSubItem] = React.useState<string | null>(null)
  const [weatherAlertCount, setWeatherAlertCount] = React.useState<number>(0)

  // Clear sub-item after scroll completes
  const clearSubItem = React.useCallback(() => {
    setActiveSubItem(null)
  }, [])

  // Render the active section content
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <HomeSection onNavigate={setActiveSection} />
      case "weather":
        return <WeatherDashboard activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onAlertCountChange={setWeatherAlertCount} />
      case "feed":
        return <DailyFeedSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "api-playground":
        return <ApiPlaygroundSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      case "notes":
        return <QuickNotesSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSettings={() => setActiveSection("settings")} />
      case "bookmarks":
        return <BookmarksSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} onNavigateToSettings={() => setActiveSection("settings")} />
      case "settings":
        return <SettingsSection activeSubItem={activeSubItem} onSubItemHandled={clearSubItem} />
      default:
        return <HomeSection onNavigate={setActiveSection} />
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
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 glass-dark border-r-border/20 p-0">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation for the dashboard</SheetDescription>
            </VisuallyHidden>
            <SidebarContent
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              expandedSection={expandedSection}
              setExpandedSection={setExpandedSection}
              setActiveSubItem={setActiveSubItem}
              weatherAlertCount={weatherAlertCount}
              mobile
              onNavigate={() => setMobileMenuOpen(false)}
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
            >
              <SidebarContent
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
                setActiveSubItem={setActiveSubItem}
                weatherAlertCount={weatherAlertCount}
                collapsed={sidebarCollapsed}
              />
            </aside>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-4 top-20 glass rounded-full h-8 w-8 z-20"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Mobile header spacer */}
            <div className="h-16 lg:hidden" />

            {renderContent()}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
