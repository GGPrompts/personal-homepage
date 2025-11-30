"use client"

import {
  Cloud,
  Newspaper,
  Zap,
  FileText,
  Bookmark,
  Search,
  TrendingUp,
  CheckCircle2,
  Link2,
  User,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Eye,
  EyeOff,
  FolderGit2,
  MessageSquare,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  useSectionPreferences,
  ToggleableSection,
  DEFAULT_SECTION_ORDER
} from "@/hooks/useSectionPreferences"

// Section metadata for display
const sectionMeta: Record<ToggleableSection, { label: string; icon: React.ElementType; description: string }> = {
  weather: { label: "Weather", icon: Cloud, description: "Live weather monitoring" },
  feed: { label: "Daily Feed", icon: Newspaper, description: "Aggregated content" },
  "api-playground": { label: "API Playground", icon: Zap, description: "Test & debug APIs" },
  notes: { label: "Quick Notes", icon: FileText, description: "GitHub-synced notes" },
  bookmarks: { label: "Bookmarks", icon: Bookmark, description: "Quick links" },
  search: { label: "Search Hub", icon: Search, description: "Search, AI & Image" },
  "ai-workspace": { label: "AI Workspace", icon: MessageSquare, description: "Chat with AI models" },
  stocks: { label: "Paper Trading", icon: TrendingUp, description: "Practice stock trading" },
  tasks: { label: "Tasks", icon: CheckCircle2, description: "Quick todo list" },
  projects: { label: "Projects", icon: FolderGit2, description: "GitHub & local repos" },
  jobs: { label: "Jobs", icon: Play, description: "Claude batch prompts" },
  integrations: { label: "Integrations", icon: Link2, description: "Connected services" },
  profile: { label: "Profile", icon: User, description: "Account & sync" },
}

export function SectionSettings() {
  const {
    visibility,
    order,
    isLoaded,
    toggleVisibility,
    moveUp,
    moveDown,
    resetToDefaults,
  } = useSectionPreferences()

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/20 rounded-lg" />
        ))}
      </div>
    )
  }

  const visibleCount = Object.values(visibility).filter(Boolean).length
  const hasChanges =
    JSON.stringify(order) !== JSON.stringify(DEFAULT_SECTION_ORDER) ||
    Object.values(visibility).some((v) => !v)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visibleCount} of {order.length} sections visible
        </p>
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="text-xs h-7 gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {order.map((sectionId, index) => {
          const meta = sectionMeta[sectionId]
          const Icon = meta.icon
          const isFirst = index === 0
          const isLast = index === order.length - 1
          const isEnabled = visibility[sectionId]

          return (
            <div
              key={sectionId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isEnabled
                  ? "border-border bg-background/50"
                  : "border-border/50 bg-muted/10 opacity-60"
              }`}
            >
              {/* Drag handle / reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={() => moveUp(sectionId)}
                  disabled={isFirst}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={() => moveDown(sectionId)}
                  disabled={isLast}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Section icon */}
              <div className={`h-8 w-8 rounded flex items-center justify-center flex-shrink-0 ${
                isEnabled ? "bg-primary/20" : "bg-muted/20"
              }`}>
                <Icon className={`h-4 w-4 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              {/* Section info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${!isEnabled && "text-muted-foreground"}`}>
                  {meta.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {meta.description}
                </p>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center gap-2">
                {isEnabled ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleVisibility(sectionId)}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Home and Settings are always visible. Hidden sections won&apos;t appear in the sidebar or on the Home dashboard.
      </p>
    </div>
  )
}
