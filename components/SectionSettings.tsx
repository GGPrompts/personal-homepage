"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Cloud,
  Newspaper,
  Zap,
  Bookmark,
  Search,
  TrendingUp,
  CheckCircle2,
  User,
  GripVertical,
  RotateCcw,
  Eye,
  EyeOff,
  FolderGit2,
  FolderOpen,
  MessageSquare,
  Play,
  Bitcoin,
  Rocket,
  Github,
  AlertCircle,
  LayoutGrid,
  ChevronDown,
  Image,
  Music,
  Video,
  BarChart3,
  Beaker,
  GitBranch,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useSectionPreferences,
  ToggleableSection,
  DEFAULT_SECTION_ORDER,
  DEFAULT_CATEGORY_ASSIGNMENTS,
  DEFAULT_SECTION_AGENTS,
  CategoryId,
  CategoryMeta,
} from "@/hooks/useSectionPreferences"
import { useAgents } from "@/hooks/useAgents"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { isEmoji, isAvatarUrl } from "@/lib/ai/utils"
import { Bot } from "lucide-react"

// Section metadata for display
const sectionMeta: Record<ToggleableSection, { label: string; icon: React.ElementType; description: string }> = {
  weather: { label: "Weather", icon: Cloud, description: "Live weather monitoring" },
  feed: { label: "Daily Feed", icon: Newspaper, description: "Aggregated content" },
  "market-pulse": { label: "Market Pulse", icon: TrendingUp, description: "Tech salary & job trends" },
  "api-playground": { label: "API Playground", icon: Zap, description: "Test & debug APIs" },
  bookmarks: { label: "Bookmarks", icon: Bookmark, description: "Quick links" },
  search: { label: "Search Hub", icon: Search, description: "Search, AI & Image" },
  "ai-workspace": { label: "AI Workspace", icon: MessageSquare, description: "Chat with AI models" },
  stocks: { label: "Paper Trading", icon: TrendingUp, description: "Practice stock trading" },
  crypto: { label: "Crypto", icon: Bitcoin, description: "Live cryptocurrency prices" },
  spacex: { label: "SpaceX Launches", icon: Rocket, description: "Track rocket launches" },
  "photo-gallery": { label: "Photo Gallery", icon: Image, description: "Photography portfolio" },
  "github-activity": { label: "GitHub Activity", icon: Github, description: "GitHub events & repos" },
  disasters: { label: "Disasters", icon: AlertCircle, description: "Earthquakes & alerts" },
  tasks: { label: "Scratchpad", icon: CheckCircle2, description: "Quick notes and todos" },
  projects: { label: "Projects", icon: FolderGit2, description: "GitHub & local repos" },
  files: { label: "Files", icon: FolderOpen, description: "File browser & plugins" },
  jobs: { label: "Jobs", icon: Play, description: "Claude batch prompts" },
  analytics: { label: "Analytics", icon: BarChart3, description: "Claude Code usage stats" },
  "prompts-playground": { label: "Prompts Playground", icon: Beaker, description: "A/B test agents" },
  "video-player": { label: "Video Player", icon: Video, description: "Media playback" },
  profile: { label: "Profile", icon: User, description: "Account & sync" },
  kanban: { label: "Kanban", icon: LayoutGrid, description: "Visual task board" },
  "music-player": { label: "Music Player", icon: Music, description: "Synthwave music player" },
  flowchart: { label: "Flowchart", icon: GitBranch, description: "Workflow designer" },
}

// Agent card type for display
interface AgentOption {
  id: string
  name: string
  avatar: string
}

// Sortable section item component
function SortableItem({
  sectionId,
  isEnabled,
  categoryId,
  agentId,
  categories,
  agents,
  onToggleVisibility,
  onCategoryChange,
  onAgentChange,
  isOverlay = false,
}: {
  sectionId: ToggleableSection
  isEnabled: boolean
  categoryId: CategoryId
  agentId: string | null
  categories: CategoryMeta[]
  agents: AgentOption[]
  onToggleVisibility: () => void
  onCategoryChange: (categoryId: CategoryId) => void
  onAgentChange: (agentId: string | null) => void
  isOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId })

  const meta = sectionMeta[sectionId]
  // Skip sections that don't have metadata (e.g., removed sections still in localStorage)
  if (!meta) return null
  const Icon = meta.icon
  const currentCategory = categories.find(c => c.id === categoryId)
  const currentAgent = agents.find(a => a.id === agentId)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isEnabled
          ? "border-border bg-background/50"
          : "border-border/50 bg-muted/10 opacity-60"
      } ${isDragging && !isOverlay ? "opacity-30" : ""} ${
        isOverlay ? "shadow-lg ring-2 ring-primary/50 bg-background" : ""
      }`}
    >
      {/* Drag handle */}
      <button
        className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted/50 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

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

      {/* Category selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border/50 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="max-w-[70px] truncate">{currentCategory?.label}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {categories.map((category) => (
            <DropdownMenuItem
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={categoryId === category.id ? "bg-primary/10" : ""}
            >
              {category.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Agent selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
              currentAgent
                ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {currentAgent ? (
              <Avatar className="h-4 w-4">
                {isAvatarUrl(currentAgent.avatar) ? (
                  <AvatarImage src={currentAgent.avatar} alt={currentAgent.name} />
                ) : null}
                <AvatarFallback className="text-[8px] bg-primary/20">
                  {isEmoji(currentAgent.avatar)
                    ? currentAgent.avatar
                    : currentAgent.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Bot className="h-3 w-3" />
            )}
            <span className="max-w-[50px] truncate">
              {currentAgent?.name || "Agent"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => onAgentChange(null)}
            className={!agentId ? "bg-primary/10" : ""}
          >
            <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
            No default agent
          </DropdownMenuItem>
          {agents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => onAgentChange(agent.id)}
              className={agentId === agent.id ? "bg-primary/10" : ""}
            >
              <Avatar className="h-4 w-4 mr-2">
                {isAvatarUrl(agent.avatar) ? (
                  <AvatarImage src={agent.avatar} alt={agent.name} />
                ) : null}
                <AvatarFallback className="text-[8px] bg-primary/20">
                  {isEmoji(agent.avatar)
                    ? agent.avatar
                    : agent.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {agent.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Visibility toggle */}
      <div className="flex items-center gap-2">
        {isEnabled ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggleVisibility}
        />
      </div>
    </div>
  )
}

// Drop indicator line component
function DropIndicator() {
  return (
    <div className="h-0.5 bg-primary rounded-full mx-2 my-1 transition-opacity" />
  )
}

export function SectionSettings() {
  const {
    visibility,
    order,
    categoryAssignments,
    sectionAgents,
    isLoaded,
    toggleVisibility,
    reorder,
    resetToDefaults,
    setSectionCategory,
    setSectionAgent,
    getAllCategories,
  } = useSectionPreferences()

  const { agents: registryAgents, isLoading: agentsLoading } = useAgents()

  const categories = getAllCategories()

  // Convert registry agents to simple options for dropdown
  const agentOptions: AgentOption[] = registryAgents.map(a => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar,
  }))

  const [activeId, setActiveId] = useState<ToggleableSection | null>(null)
  const [overId, setOverId] = useState<ToggleableSection | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
    Object.values(visibility).some((v) => !v) ||
    JSON.stringify(categoryAssignments) !== JSON.stringify(DEFAULT_CATEGORY_ASSIGNMENTS) ||
    JSON.stringify(sectionAgents) !== JSON.stringify(DEFAULT_SECTION_AGENTS)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as ToggleableSection)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    setOverId(over ? (over.id as ToggleableSection) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveId(null)
    setOverId(null)

    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as ToggleableSection)
      const newIndex = order.indexOf(over.id as ToggleableSection)
      const newOrder = arrayMove(order, oldIndex, newIndex)
      reorder(newOrder)
    }
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverId(null)
  }

  // Calculate where to show the drop indicator
  const activeIndex = activeId ? order.indexOf(activeId) : -1
  const overIndex = overId ? order.indexOf(overId) : -1
  const showIndicatorAfter = activeId && overId && activeIndex < overIndex

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

      <p className="text-xs text-muted-foreground">
        Drag sections to reorder, change categories with the dropdown, or toggle visibility. Changes are saved automatically.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((sectionId, index) => {
              const isEnabled = visibility[sectionId]
              // Show indicator before this item if dragging from above
              const showIndicatorBefore = activeId && overId === sectionId && activeIndex > overIndex
              // Show indicator after this item if dragging from below
              const showIndicatorAfterThis = activeId && overId === sectionId && activeIndex < overIndex

              return (
                <div key={sectionId}>
                  {showIndicatorBefore && <DropIndicator />}
                  <SortableItem
                    sectionId={sectionId}
                    isEnabled={isEnabled}
                    categoryId={categoryAssignments[sectionId]}
                    agentId={sectionAgents[sectionId]}
                    categories={categories}
                    agents={agentOptions}
                    onToggleVisibility={() => toggleVisibility(sectionId)}
                    onCategoryChange={(categoryId) => setSectionCategory(sectionId, categoryId)}
                    onAgentChange={(agentId) => setSectionAgent(sectionId, agentId)}
                  />
                  {showIndicatorAfterThis && <DropIndicator />}
                </div>
              )
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <SortableItem
              sectionId={activeId}
              isEnabled={visibility[activeId]}
              categoryId={categoryAssignments[activeId]}
              agentId={sectionAgents[activeId]}
              categories={categories}
              agents={agentOptions}
              onToggleVisibility={() => {}}
              onCategoryChange={() => {}}
              onAgentChange={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-muted-foreground pt-2">
        Home and Settings are always visible. Hidden sections won&apos;t appear in the sidebar or on the Home dashboard. Categories help organize sections into collapsible groups.
      </p>
    </div>
  )
}
