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
  Home,
  Calendar,
  Bookmark,
  RefreshCw,
  MapPin,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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

// ============================================================================
// TYPES
// ============================================================================

type Section = "home" | "weather" | "feed" | "settings"

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
  { id: "feed", label: "Daily Feed", icon: Newspaper, description: "AI-curated content" },
  { id: "settings", label: "Settings", icon: Settings, description: "Theme & preferences" },
]

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

function SidebarContent({
  activeSection,
  setActiveSection,
  collapsed = false,
  mobile = false,
  onNavigate,
}: {
  activeSection: Section
  setActiveSection: (section: Section) => void
  collapsed?: boolean
  mobile?: boolean
  onNavigate?: () => void
}) {
  const handleClick = (id: Section) => {
    setActiveSection(id)
    onNavigate?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - clickable to return home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleClick("home")}
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
      <nav className="flex-1 p-4 overflow-hidden">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleClick(item.id)}
                      className={`
                        w-full flex items-center rounded-lg transition-colors duration-200
                        ${collapsed && !mobile ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                        ${activeSection === item.id
                          ? 'glass text-primary border-glow'
                          : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                        collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                      }`}>{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  {collapsed && !mobile && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
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

function SettingsSection() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold terminal-glow mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Customize your dashboard</p>

      <div className="max-w-3xl">
        <div className="glass rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-6">Theme & Appearance</h3>
          <ThemeSettingsPanel />
        </div>

        <div className="glass rounded-lg p-6">
          <h3 className="font-semibold mb-4">Feed Configuration</h3>
          <p className="text-sm text-muted-foreground mb-4">Configure your content sources</p>
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

  // Render the active section content
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <HomeSection onNavigate={setActiveSection} />
      case "weather":
        return <WeatherDashboard />
      case "feed":
        return <DailyFeedSection />
      case "settings":
        return <SettingsSection />
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
            <SidebarContent
              activeSection={activeSection}
              setActiveSection={setActiveSection}
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
