"use client"

import * as React from "react"
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
  { id: "home", label: "Home", icon: Home, description: "Dashboard overview" },
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
      {/* Header */}
      <div className={`p-4 border-b border-border/20 transition-all duration-300 ${collapsed && !mobile ? 'px-3' : ''}`}>
        <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden ${collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="font-semibold text-foreground">Personal Home</p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`border-b border-border/20 transition-all duration-300 overflow-hidden ${
        collapsed && !mobile ? 'h-0 p-0 opacity-0' : 'h-auto p-4 opacity-100'
      }`}>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="glass rounded p-2">
            <p className="text-xl font-bold text-primary">72°</p>
            <p className="text-xs text-muted-foreground">Weather</p>
          </div>
          <div className="glass rounded p-2">
            <p className="text-xl font-bold text-secondary">18</p>
            <p className="text-xs text-muted-foreground">Feed Items</p>
          </div>
        </div>
      </div>

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
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200
                        ${collapsed && !mobile ? 'justify-center' : ''}
                        ${activeSection === item.id
                          ? 'glass text-primary border-glow'
                          : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className={`transition-all duration-300 overflow-hidden ${
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
// HOME SECTION (Placeholder)
// ============================================================================

function HomeSection() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold terminal-glow mb-2">Welcome Home</h1>
      <p className="text-muted-foreground mb-8">Your personal dashboard overview</p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="glass rounded-lg p-6">
          <Cloud className="h-8 w-8 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Weather</h3>
          <p className="text-sm text-muted-foreground">Live weather monitoring with Open-Meteo</p>
        </div>

        <div className="glass rounded-lg p-6">
          <Newspaper className="h-8 w-8 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Daily Feed</h3>
          <p className="text-sm text-muted-foreground">AI-curated content from HN, GitHub, Reddit</p>
        </div>

        <div className="glass rounded-lg p-6">
          <Settings className="h-8 w-8 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Settings</h3>
          <p className="text-sm text-muted-foreground">Customize themes and preferences</p>
        </div>
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

      <div className="max-w-2xl">
        <div className="glass rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Theme & Appearance</h3>
          <ThemeCustomizer />
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
  const [activeSection, setActiveSection] = React.useState<Section>("weather")

  // Render the active section content
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <HomeSection />
      case "weather":
        return <WeatherDashboard />
      case "feed":
        return <DailyFeedSection />
      case "settings":
        return <SettingsSection />
      default:
        return <HomeSection />
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen">
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
