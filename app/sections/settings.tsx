"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CheckCircle2,
  XCircle,
  Cloud,
  TrendingUp,
  Github,
  Terminal,
  Eye,
  EyeOff,
  Download,
  Upload,
  RotateCcw,
  Loader2,
  ExternalLink,
  Bot,
  Key,
  Server,
  RefreshCw,
  Link2,
  Rss,
  Rocket,
  Settings,
  Palette,
  LayoutGrid,
  Blocks,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/AuthProvider"
import { useTerminalExtension } from "@/hooks/useTerminalExtension"
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel"
import { SectionSettings } from "@/components/SectionSettings"
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_VISIBILITY,
} from "@/hooks/useSectionPreferences"

// ============================================================================
// TYPES
// ============================================================================

interface ApiKeyConfig {
  id: string
  name: string
  description: string
  storageKey: string
  icon: React.ElementType
  docsUrl?: string
  free?: boolean
  note?: string
  envVar?: string
  testable?: boolean
}

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ElementType
  category: "auth" | "api" | "data"
  status: "connected" | "disconnected" | "partial"
  statusMessage?: string
  docsUrl?: string
  configLocation?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStoredApiKey(key: string): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(key) || ""
}

function setStoredApiKey(key: string, value: string): void {
  if (typeof window === "undefined") return
  if (value.trim()) {
    localStorage.setItem(key, value.trim())
  } else {
    localStorage.removeItem(key)
  }
}

// ============================================================================
// API KEY INPUT COMPONENT
// ============================================================================

function ApiKeyInput({
  config,
  value,
  onChange,
  status,
  onTest,
  testing,
}: {
  config: ApiKeyConfig
  value: string
  onChange: (value: string) => void
  status: "valid" | "invalid" | "unknown" | "free"
  onTest?: () => void
  testing?: boolean
}) {
  const [showKey, setShowKey] = React.useState(false)
  const Icon = config.icon

  const statusConfig = {
    valid: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Connected" },
    invalid: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Invalid" },
    unknown: { icon: Key, color: "text-muted-foreground", bg: "bg-muted/10", label: "Not Configured" },
    free: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Free" },
  }

  const currentStatus = statusConfig[status]
  const StatusIcon = currentStatus.icon

  return (
    <Card
      className={`glass p-4 transition-colors ${
        status === "valid" || status === "free"
          ? "border-emerald-500/30"
          : status === "invalid"
            ? "border-red-500/30"
            : "border-border"
      }`}
      data-tabz-card={`api-key-${config.id}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${currentStatus.bg} flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${currentStatus.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{config.name}</h4>
            <Badge
              variant="outline"
              className={`${currentStatus.color} border-current/30 text-xs py-0`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {currentStatus.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{config.description}</p>

          {config.note && (
            <p className="text-xs text-muted-foreground mb-3 italic">{config.note}</p>
          )}

          {!config.free && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={config.envVar ? `${config.envVar} or paste key` : "Paste your API key"}
                    className="font-mono text-sm pr-10"
                    data-tabz-input={`${config.id}-api-key`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 z-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey(!showKey)}
                    data-tabz-button={`toggle-${config.id}-visibility`}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {config.testable && onTest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTest}
                    disabled={!value.trim() || testing}
                    data-tabz-button={`test-${config.id}`}
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                  </Button>
                )}
              </div>

              {config.docsUrl && (
                <a
                  href={config.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  data-tabz-link={`${config.id}-docs`}
                >
                  Get API key <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// INTEGRATION CARD COMPONENT
// ============================================================================

function IntegrationCard({
  integration,
  onNavigate,
}: {
  integration: Integration
  onNavigate?: (tab: string) => void
}) {
  const Icon = integration.icon

  const statusConfig = {
    connected: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Connected",
    },
    disconnected: {
      icon: XCircle,
      color: "text-muted-foreground",
      bg: "bg-muted/10",
      border: "border-border",
      label: "Not Connected",
    },
    partial: {
      icon: RefreshCw,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "Partially Configured",
    },
  }

  const config = statusConfig[integration.status]
  const StatusIcon = config.icon

  return (
    <Card className={`glass p-5 ${config.border} transition-colors`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${config.bg} flex-shrink-0`}>
          <Icon className={`h-6 w-6 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{integration.name}</h3>
            <Badge
              variant="outline"
              className={`${config.color} border-current/30 text-xs py-0`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {integration.description}
          </p>

          {integration.statusMessage && (
            <p className="text-xs text-muted-foreground mb-3 italic">
              {integration.statusMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {integration.configLocation && onNavigate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate(integration.configLocation!)}
                className="gap-1"
              >
                <Settings className="h-3 w-3" />
                Configure
              </Button>
            )}
            {integration.docsUrl && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-1"
              >
                <a
                  href={integration.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                  Docs
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// GENERAL TAB (Theme & Appearance)
// ============================================================================

function GeneralTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Theme & Appearance
        </h3>
        <div className="glass rounded-lg p-6">
          <ThemeSettingsPanel />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SECTIONS TAB
// ============================================================================

function SectionsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          Sidebar Sections
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle sections on or off and reorder them in the sidebar
        </p>
        <div className="glass rounded-lg p-6">
          <SectionSettings />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// API KEYS TAB
// ============================================================================

function ApiKeysTab() {
  const { user } = useAuth()

  // Fetch server-side API status
  const { data: apiStatus, isLoading } = useQuery<{
    apis: { finnhub: boolean; alphaVantage: boolean; github: boolean }
  }>({
    queryKey: ["api-status"],
    queryFn: async () => {
      const res = await fetch("/api/status")
      if (!res.ok) throw new Error("Failed to fetch status")
      return res.json()
    },
    staleTime: 30000,
  })

  // Client-side API key states
  const [finnhubKey, setFinnhubKey] = React.useState(() => getStoredApiKey("finnhub-api-key"))
  const [alphaVantageKey, setAlphaVantageKey] = React.useState(() => getStoredApiKey("alpha-vantage-api-key"))
  const [anthropicKey, setAnthropicKey] = React.useState(() => getStoredApiKey("anthropic-api-key"))
  const [openaiKey, setOpenaiKey] = React.useState(() => getStoredApiKey("openai-api-key"))
  const [googleAiKey, setGoogleAiKey] = React.useState(() => getStoredApiKey("google-ai-key"))

  // Test states
  const [testingFinnhub, setTestingFinnhub] = React.useState(false)
  const [finnhubStatus, setFinnhubStatus] = React.useState<"valid" | "invalid" | "unknown">("unknown")

  // Save keys to localStorage
  React.useEffect(() => {
    setStoredApiKey("finnhub-api-key", finnhubKey)
  }, [finnhubKey])

  React.useEffect(() => {
    setStoredApiKey("alpha-vantage-api-key", alphaVantageKey)
  }, [alphaVantageKey])

  React.useEffect(() => {
    setStoredApiKey("anthropic-api-key", anthropicKey)
  }, [anthropicKey])

  React.useEffect(() => {
    setStoredApiKey("openai-api-key", openaiKey)
  }, [openaiKey])

  React.useEffect(() => {
    setStoredApiKey("google-ai-key", googleAiKey)
  }, [googleAiKey])

  // Test Finnhub API key
  const testFinnhub = async () => {
    if (!finnhubKey.trim()) return
    setTestingFinnhub(true)
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${finnhubKey.trim()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.c && data.c > 0) {
          setFinnhubStatus("valid")
        } else {
          setFinnhubStatus("invalid")
        }
      } else {
        setFinnhubStatus("invalid")
      }
    } catch {
      setFinnhubStatus("invalid")
    } finally {
      setTestingFinnhub(false)
    }
  }

  const apiConfigs: ApiKeyConfig[] = [
    {
      id: "open-meteo",
      name: "Open-Meteo (Weather)",
      description: "Weather data including forecasts, radar, and alerts",
      storageKey: "",
      icon: Cloud,
      free: true,
      note: "Free API, no configuration required",
    },
    {
      id: "finnhub",
      name: "Finnhub",
      description: "Real-time stock quotes for Paper Trading",
      storageKey: "finnhub-api-key",
      icon: TrendingUp,
      docsUrl: "https://finnhub.io/register",
      envVar: "FINNHUB_API_KEY",
      note: "Free tier: 60 requests/min",
      testable: true,
    },
    {
      id: "alpha-vantage",
      name: "Alpha Vantage",
      description: "Historical chart data for Paper Trading",
      storageKey: "alpha-vantage-api-key",
      icon: TrendingUp,
      docsUrl: "https://www.alphavantage.co/support/#api-key",
      envVar: "ALPHA_VANTAGE_API_KEY",
      note: "Free tier: 25 requests/day, 5/min",
    },
    {
      id: "anthropic",
      name: "Anthropic (Claude)",
      description: "AI chat and code assistance in AI Workspace",
      storageKey: "anthropic-api-key",
      icon: Bot,
      docsUrl: "https://console.anthropic.com/settings/keys",
      note: "Required for AI Workspace and Jobs sections",
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT models for AI Workspace",
      storageKey: "openai-api-key",
      icon: Bot,
      docsUrl: "https://platform.openai.com/api-keys",
      note: "Optional, enables GPT models in AI Workspace",
    },
    {
      id: "google-ai",
      name: "Google AI (Gemini)",
      description: "Gemini models for AI Workspace",
      storageKey: "google-ai-key",
      icon: Bot,
      docsUrl: "https://aistudio.google.com/app/apikey",
      note: "Optional, enables Gemini models in AI Workspace",
    },
  ]

  const getKeyValue = (id: string): string => {
    switch (id) {
      case "finnhub": return finnhubKey
      case "alpha-vantage": return alphaVantageKey
      case "anthropic": return anthropicKey
      case "openai": return openaiKey
      case "google-ai": return googleAiKey
      default: return ""
    }
  }

  const setKeyValue = (id: string, value: string) => {
    switch (id) {
      case "finnhub": setFinnhubKey(value); break
      case "alpha-vantage": setAlphaVantageKey(value); break
      case "anthropic": setAnthropicKey(value); break
      case "openai": setOpenaiKey(value); break
      case "google-ai": setGoogleAiKey(value); break
    }
  }

  const getStatus = (id: string): "valid" | "invalid" | "unknown" | "free" => {
    if (id === "open-meteo") return "free"
    if (id === "finnhub") {
      if (apiStatus?.apis.finnhub) return "valid"
      if (finnhubStatus === "valid") return "valid"
      if (finnhubStatus === "invalid") return "invalid"
      return finnhubKey.trim() ? "unknown" : "unknown"
    }
    if (id === "alpha-vantage") {
      return apiStatus?.apis.alphaVantage ? "valid" : alphaVantageKey.trim() ? "unknown" : "unknown"
    }
    const value = getKeyValue(id)
    return value.trim() ? "unknown" : "unknown"
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys
        </h3>
        <p className="text-muted-foreground mb-6">
          Add API keys to unlock features. Most features work without any keys.
        </p>
      </div>

      {/* GitHub OAuth Status */}
      <Card className={`glass p-4 ${user ? "border-emerald-500/30" : "border-border"}`} data-tabz-card="github-oauth">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${user ? "bg-emerald-500/10" : "bg-muted/10"} flex-shrink-0`}>
            <Github className={`h-5 w-5 ${user ? "text-emerald-500" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">GitHub OAuth</h4>
              <Badge
                variant="outline"
                className={`${user ? "text-emerald-500" : "text-muted-foreground"} border-current/30 text-xs py-0`}
              >
                {user ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </>
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Sign in with GitHub to sync Quick Notes and Bookmarks across devices
            </p>
            {user ? (
              <p className="text-xs text-emerald-500">
                Signed in as @{user.user_metadata?.user_name || user.email}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Go to Profile section to sign in
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* API Keys */}
      <div className="space-y-4">
        {apiConfigs.map((config) => (
          <ApiKeyInput
            key={config.id}
            config={config}
            value={getKeyValue(config.id)}
            onChange={(v) => setKeyValue(config.id, v)}
            status={getStatus(config.id)}
            onTest={config.id === "finnhub" ? testFinnhub : undefined}
            testing={config.id === "finnhub" ? testingFinnhub : false}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground pt-4">
        Environment variable API keys (from .env.local) take precedence over stored keys.
      </p>
    </div>
  )
}

// ============================================================================
// INTEGRATIONS TAB
// ============================================================================

function IntegrationsTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const { user } = useAuth()

  // Fetch API status
  const { data: apiStatus, isLoading } = useQuery<{
    apis: { finnhub: boolean; alphaVantage: boolean; github: boolean }
  }>({
    queryKey: ["api-status"],
    queryFn: async () => {
      const res = await fetch("/api/status")
      if (!res.ok) throw new Error("Failed to fetch status")
      return res.json()
    },
    staleTime: 30000,
  })

  // Build integrations list based on current status
  const integrations: Integration[] = [
    {
      id: "github-oauth",
      name: "GitHub (OAuth)",
      description: "Sign in with GitHub to sync Quick Notes and Bookmarks across devices",
      icon: Github,
      category: "auth",
      status: user ? "connected" : "disconnected",
      statusMessage: user
        ? `Signed in as ${user.user_metadata?.user_name || user.email}`
        : "Sign in to enable cloud sync features",
      docsUrl: "https://docs.github.com/en/apps/oauth-apps",
    },
    {
      id: "github-api",
      name: "GitHub API (Server)",
      description: "Server-side GitHub access for enhanced features",
      icon: Github,
      category: "api",
      status: apiStatus?.apis.github ? "connected" : "disconnected",
      statusMessage: apiStatus?.apis.github
        ? "GITHUB_TOKEN configured in environment"
        : "Optional: Set GITHUB_TOKEN in .env.local",
      configLocation: "api-keys",
      docsUrl: "https://github.com/settings/tokens/new",
    },
    {
      id: "finnhub",
      name: "Finnhub",
      description: "Real-time stock quotes for Paper Trading (60 requests/min free tier)",
      icon: TrendingUp,
      category: "api",
      status: apiStatus?.apis.finnhub ? "connected" : "disconnected",
      statusMessage: apiStatus?.apis.finnhub
        ? "API key configured"
        : "Set FINNHUB_API_KEY in .env.local",
      configLocation: "api-keys",
      docsUrl: "https://finnhub.io/register",
    },
    {
      id: "alpha-vantage",
      name: "Alpha Vantage",
      description: "Historical stock data and charts (25 requests/day free tier)",
      icon: TrendingUp,
      category: "api",
      status: apiStatus?.apis.alphaVantage ? "connected" : "disconnected",
      statusMessage: apiStatus?.apis.alphaVantage
        ? "API key configured"
        : "Set ALPHA_VANTAGE_API_KEY in .env.local",
      configLocation: "api-keys",
      docsUrl: "https://www.alphavantage.co/support/#api-key",
    },
    {
      id: "open-meteo",
      name: "Open-Meteo",
      description: "Weather data including forecasts, radar, and alerts",
      icon: Cloud,
      category: "data",
      status: "connected",
      statusMessage: "Free API, no configuration required",
      docsUrl: "https://open-meteo.com/",
    },
    {
      id: "feeds",
      name: "Content Feeds",
      description: "HN, GitHub Trending, Reddit, Lobsters, Dev.to aggregation",
      icon: Rss,
      category: "data",
      status: "connected",
      statusMessage: "Public APIs, no configuration required",
    },
    {
      id: "spacex",
      name: "SpaceX API",
      description: "Launch schedules, rocket data, and mission tracking",
      icon: Rocket,
      category: "data",
      status: "connected",
      statusMessage: "Free public API, no configuration required",
      docsUrl: "https://github.com/r-spacex/SpaceX-API",
    },
    {
      id: "claude-cli",
      name: "Claude CLI",
      description: "AI Workspace and Claude Jobs powered by Claude Code CLI",
      icon: Terminal,
      category: "api",
      status: "connected",
      statusMessage: "Uses local Claude CLI installation",
      docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
    },
  ]

  // Group by category
  const authIntegrations = integrations.filter((i) => i.category === "auth")
  const apiIntegrations = integrations.filter((i) => i.category === "api")
  const dataIntegrations = integrations.filter((i) => i.category === "data")

  // Stats
  const connectedCount = integrations.filter((i) => i.status === "connected").length
  const totalCount = integrations.length

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Blocks className="h-5 w-5 text-primary" />
            Integrations
          </h3>
          <Badge variant="outline" className="text-primary border-primary/30">
            {connectedCount}/{totalCount} connected
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Connect external services to enhance your dashboard
        </p>
      </div>

      {/* Authentication */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Key className="h-4 w-4" />
          Authentication
        </h4>
        <div className="space-y-4">
          {authIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onNavigate={onSwitchTab}
            />
          ))}
        </div>
      </div>

      {/* API Services */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Link2 className="h-4 w-4" />
          API Services
        </h4>
        <div className="space-y-4">
          {apiIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onNavigate={onSwitchTab}
            />
          ))}
        </div>
      </div>

      {/* Data Sources */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Rss className="h-4 w-4" />
          Data Sources
        </h4>
        <div className="space-y-4">
          {dataIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onNavigate={onSwitchTab}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TABZCHROME TAB
// ============================================================================

function TabzChromeTab() {
  const {
    backendRunning,
    authenticated,
    error,
    hasToken,
    defaultWorkDir,
    setApiToken,
    clearApiToken,
    refreshStatus,
    updateDefaultWorkDir,
    runCommand,
  } = useTerminalExtension()

  const [tokenInput, setTokenInput] = React.useState("")
  const [showToken, setShowToken] = React.useState(false)
  const [tokenError, setTokenError] = React.useState<string | null>(null)
  const [workDirInput, setWorkDirInput] = React.useState(defaultWorkDir)
  const [refreshing, setRefreshing] = React.useState(false)
  const [testingSpawn, setTestingSpawn] = React.useState(false)
  const [spawnResult, setSpawnResult] = React.useState<string | null>(null)

  React.useEffect(() => {
    setWorkDirInput(defaultWorkDir)
  }, [defaultWorkDir])

  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) return
    setTokenError(null)
    const success = await setApiToken(tokenInput.trim())
    if (success) {
      setTokenInput("")
      setShowToken(false)
    } else {
      setTokenError("Could not verify token. Make sure the TabzChrome backend is running.")
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setTokenError(null)
    await refreshStatus()
    setRefreshing(false)
  }

  const handleTestSpawn = async () => {
    setTestingSpawn(true)
    setSpawnResult(null)
    try {
      const result = await runCommand("echo 'TabzChrome test - connection working!'", {
        name: "Connection Test",
        workingDir: workDirInput || defaultWorkDir,
      })
      if (result.success) {
        setSpawnResult("success")
      } else {
        setSpawnResult(result.error || "Failed to spawn terminal")
      }
    } catch (err) {
      setSpawnResult(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setTestingSpawn(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          TabzChrome Integration
        </h3>
        <p className="text-muted-foreground">
          Connect TabzChrome to launch terminals from bookmarks and control browser tabs.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="glass p-4" data-tabz-card="connection-status">
        <div className="space-y-4">
          {/* Backend Status */}
          <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
            <div className="flex items-center gap-3">
              <Server className={`h-5 w-5 ${backendRunning ? "text-emerald-400" : "text-muted-foreground"}`} />
              <div>
                <p className="font-medium">Backend Server</p>
                <p className="text-xs text-muted-foreground">localhost:8129</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={backendRunning
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-muted text-muted-foreground"
                }
              >
                {backendRunning ? "Running" : "Not Running"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={refreshing}
                data-tabz-button="refresh-status"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Auth Status */}
          <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
            <div className="flex items-center gap-3">
              <Key className={`h-5 w-5 ${authenticated ? "text-emerald-400" : hasToken ? "text-amber-400" : "text-muted-foreground"}`} />
              <div>
                <p className="font-medium">API Token</p>
                <p className="text-xs text-muted-foreground">
                  {authenticated
                    ? "Authenticated"
                    : hasToken
                    ? "Token stored (not verified)"
                    : "Not configured"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {authenticated ? (
                <>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                    Connected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={clearApiToken}
                    data-tabz-button="clear-token"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Required
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && !authenticated && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">{error}</p>
        </div>
      )}

      {/* Token Input */}
      {!authenticated && (
        <Card className="glass p-4" data-tabz-card="token-input">
          <Label className="text-sm mb-2 block">API Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value)
                  setTokenError(null)
                }}
                placeholder="Paste your TabzChrome API token"
                className="font-mono text-sm pr-10"
                data-tabz-input="tabz-api-token"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 z-10 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(!showToken)}
                data-tabz-button="toggle-token-visibility"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              onClick={handleTokenSubmit}
              disabled={!tokenInput.trim()}
              data-tabz-button="save-token"
            >
              Save
            </Button>
          </div>
          {tokenError && (
            <p className="text-xs text-destructive mt-2">{tokenError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Get your API token from TabzChrome extension: <strong>Settings → API Token → Copy</strong>
          </p>
        </Card>
      )}

      {/* Default Working Directory */}
      <Card className="glass p-4" data-tabz-card="default-workdir">
        <Label className="text-sm mb-2 block">Default Working Directory</Label>
        <div className="flex gap-2">
          <Input
            value={workDirInput}
            onChange={(e) => setWorkDirInput(e.target.value)}
            placeholder="~/projects"
            className="font-mono text-sm"
            data-tabz-input="default-workdir"
          />
          <Button
            onClick={() => updateDefaultWorkDir(workDirInput)}
            disabled={workDirInput === defaultWorkDir}
            variant={workDirInput === defaultWorkDir ? "outline" : "default"}
            data-tabz-button="save-workdir"
          >
            {workDirInput === defaultWorkDir ? "Saved" : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Used when launching terminals without a specific working directory.
        </p>
      </Card>

      {/* Test Spawn Button */}
      {authenticated && (
        <Card className="glass p-4" data-tabz-card="test-spawn">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Test Terminal Spawn</h4>
              <p className="text-sm text-muted-foreground">
                Spawn a test terminal to verify everything is working
              </p>
            </div>
            <Button
              onClick={handleTestSpawn}
              disabled={testingSpawn}
              data-tabz-button="test-spawn"
            >
              {testingSpawn ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Terminal className="h-4 w-4 mr-2" />
                  Test Spawn
                </>
              )}
            </Button>
          </div>
          {spawnResult && (
            <div className={`mt-3 p-2 rounded text-sm ${
              spawnResult === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}>
              {spawnResult === "success" ? "Terminal spawned successfully!" : spawnResult}
            </div>
          )}
        </Card>
      )}

      {/* Extension Link */}
      <div className="text-center text-sm text-muted-foreground">
        <a
          href="https://github.com/anthropics/tabz-chrome"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
          data-tabz-link="extension-install"
        >
          Install TabzChrome Extension <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

// ============================================================================
// IMPORT/EXPORT TAB
// ============================================================================

function ImportExportTab() {
  const { defaultWorkDir, updateDefaultWorkDir } = useTerminalExtension()

  const [importError, setImportError] = React.useState<string | null>(null)
  const [importSuccess, setImportSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const exportConfig = () => {
    // Get current preferences from localStorage
    let visibility = DEFAULT_VISIBILITY
    let order = DEFAULT_SECTION_ORDER
    try {
      const saved = localStorage.getItem("section-preferences")
      if (saved) {
        const parsed = JSON.parse(saved)
        visibility = parsed.visibility || DEFAULT_VISIBILITY
        order = parsed.order || DEFAULT_SECTION_ORDER
      }
    } catch {
      // Use defaults
    }

    const config = {
      version: 1,
      exportedAt: new Date().toISOString(),
      apiKeys: {
        finnhub: getStoredApiKey("finnhub-api-key") ? "***configured***" : null,
        alphaVantage: getStoredApiKey("alpha-vantage-api-key") ? "***configured***" : null,
        anthropic: getStoredApiKey("anthropic-api-key") ? "***configured***" : null,
        openai: getStoredApiKey("openai-api-key") ? "***configured***" : null,
        googleAi: getStoredApiKey("google-ai-key") ? "***configured***" : null,
      },
      sections: {
        visibility,
        order,
      },
      tabzChrome: {
        token: getStoredApiKey("tabz-api-token") ? "***configured***" : null,
        defaultWorkDir,
      },
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `personal-homepage-config-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError(null)
    setImportSuccess(false)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string)

        if (!config.version) {
          throw new Error("Invalid config file: missing version")
        }

        // Import sections preferences
        if (config.sections) {
          if (config.sections.visibility) {
            localStorage.setItem("section-preferences", JSON.stringify({
              visibility: config.sections.visibility,
              order: config.sections.order || DEFAULT_SECTION_ORDER,
            }))
          }
        }

        // Import TabzChrome settings
        if (config.tabzChrome?.defaultWorkDir) {
          updateDefaultWorkDir(config.tabzChrome.defaultWorkDir)
        }

        setImportSuccess(true)
        // Reload to apply changes
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Failed to parse config file")
      }
    }
    reader.readAsText(file)
  }

  const resetToDefaults = () => {
    if (!confirm("This will reset all settings to defaults. API keys will NOT be deleted. Continue?")) {
      return
    }

    localStorage.setItem("section-preferences", JSON.stringify({
      visibility: DEFAULT_VISIBILITY,
      order: DEFAULT_SECTION_ORDER,
    }))
    updateDefaultWorkDir("~/projects")
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Import / Export
        </h3>
        <p className="text-muted-foreground">
          Backup your configuration or restore from a previous export.
        </p>
      </div>

      {/* Export */}
      <Card className="glass p-6" data-tabz-card="export">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-1">Export Configuration</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Download your current settings as a JSON file. API keys are not exported for security.
            </p>
            <Button onClick={exportConfig} data-tabz-button="export-config">
              <Download className="h-4 w-4 mr-2" />
              Export Config
            </Button>
          </div>
        </div>
      </Card>

      {/* Import */}
      <Card className="glass p-6" data-tabz-card="import">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-1">Import Configuration</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Restore settings from a previously exported JSON file.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-tabz-button="import-config"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Config
            </Button>
            {importError && (
              <p className="text-sm text-destructive mt-2">{importError}</p>
            )}
            {importSuccess && (
              <p className="text-sm text-emerald-500 mt-2">
                Config imported successfully! Reloading...
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Reset */}
      <Card className="glass p-6 border-destructive/20" data-tabz-card="reset">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-destructive/10 flex-shrink-0">
            <RotateCcw className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-1">Reset to Defaults</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Reset section visibility and order to defaults. API keys will be preserved.
            </p>
            <Button
              variant="destructive"
              onClick={resetToDefaults}
              data-tabz-button="reset-defaults"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  const [activeTab, setActiveTab] = React.useState("general")

  // Handle sub-item navigation (e.g., deep links to specific tabs)
  React.useEffect(() => {
    if (activeSubItem) {
      const validTabs = ["general", "sections", "api-keys", "integrations", "tabzchrome", "import-export"]
      if (validTabs.includes(activeSubItem)) {
        setActiveTab(activeSubItem)
      }
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  return (
    <div className="p-6" data-tabz-section="settings">
      <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Customize your dashboard</p>

      <div className="max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 mb-6">
            <TabsTrigger value="general" className="gap-2">
              <Palette className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Sections
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Blocks className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="tabzchrome" className="gap-2">
              <Terminal className="h-4 w-4" />
              TabzChrome
            </TabsTrigger>
            <TabsTrigger value="import-export" className="gap-2">
              <Download className="h-4 w-4" />
              Import/Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="sections">
            <SectionsTab />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsTab onSwitchTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="tabzchrome">
            <TabzChromeTab />
          </TabsContent>

          <TabsContent value="import-export">
            <ImportExportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
