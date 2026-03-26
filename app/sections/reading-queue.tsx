"use client"

import * as React from "react"
import {
  BookOpen,
  Plus,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  StickyNote,
  Tag,
  BarChart3,
  X,
  Loader2,
  Link as LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

// ============================================================================
// TYPES
// ============================================================================

export interface ReadingItem {
  id: string
  title: string
  url: string
  status: "queued" | "reading" | "done"
  addedAt: string
  startedAt?: string
  completedAt?: string
  estimatedMinutes?: number
  tags?: string[]
  notes?: string
}

type TabStatus = "queued" | "reading" | "done"

// ============================================================================
// STORAGE
// ============================================================================

export const STORAGE_KEY = "reading-queue-items"

function loadItems(): ReadingItem[] {
  if (typeof window === "undefined") return []
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }
  return []
}

function saveItems(items: ReadingItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.error("Failed to save reading queue items to localStorage:", err)
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `rq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return date >= startOfWeek
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ReadingQueueProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function ReadingQueueSection({ activeSubItem, onSubItemHandled }: ReadingQueueProps) {
  const [items, setItems] = React.useState<ReadingItem[]>([])
  const [activeTab, setActiveTab] = React.useState<TabStatus>("queued")
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [addUrl, setAddUrl] = React.useState("")
  const [addTitle, setAddTitle] = React.useState("")
  const [addEstimate, setAddEstimate] = React.useState("")
  const [addTags, setAddTags] = React.useState("")
  const [fetchingTitle, setFetchingTitle] = React.useState(false)
  const [editingNotesId, setEditingNotesId] = React.useState<string | null>(null)
  const [editingNotes, setEditingNotes] = React.useState("")
  const urlInputRef = React.useRef<HTMLInputElement>(null)

  // Load items on mount
  React.useEffect(() => {
    setItems(loadItems())
  }, [])

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Persist items when they change (functional updater pattern to avoid stale closures)
  const updateItemsFn = React.useCallback((updater: (prev: ReadingItem[]) => ReadingItem[]) => {
    setItems((prev) => {
      const newItems = updater(prev)
      saveItems(newItems)
      return newItems
    })
  }, [])

  // Auto-fetch title when URL is pasted/entered
  const handleUrlBlur = React.useCallback(async () => {
    if (!addUrl.trim() || addTitle.trim()) return
    try {
      const url = new URL(addUrl.trim())
      setFetchingTitle(true)
      // Try to fetch the title via a simple proxy or just use the domain
      try {
        const res = await fetch(`/api/fetch-title?url=${encodeURIComponent(url.toString())}`)
        if (res.ok) {
          const data = await res.json()
          if (data.title) {
            setAddTitle(data.title)
          }
        }
      } catch {
        // Fallback: use domain as title hint
        setAddTitle(url.hostname.replace("www.", ""))
      }
    } catch {
      // Invalid URL, ignore
    } finally {
      setFetchingTitle(false)
    }
  }, [addUrl, addTitle])

  // Add new item
  const handleAdd = React.useCallback(() => {
    if (!addUrl.trim() || !addTitle.trim()) return
    if (!isSafeUrl(addUrl.trim())) return

    const newItem: ReadingItem = {
      id: generateId(),
      title: addTitle.trim(),
      url: addUrl.trim(),
      status: "queued",
      addedAt: new Date().toISOString(),
      estimatedMinutes: addEstimate ? parseInt(addEstimate) : undefined,
      tags: addTags.trim() ? addTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    }

    updateItemsFn((prev) => [newItem, ...prev])
    setAddUrl("")
    setAddTitle("")
    setAddEstimate("")
    setAddTags("")
    setShowAddForm(false)
  }, [addUrl, addTitle, addEstimate, addTags, updateItemsFn])

  // Move item to next status
  const moveForward = React.useCallback((id: string) => {
    updateItemsFn((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (item.status === "queued") {
          return { ...item, status: "reading" as const, startedAt: new Date().toISOString() }
        }
        if (item.status === "reading") {
          return { ...item, status: "done" as const, completedAt: new Date().toISOString() }
        }
        return item
      })
    )
  }, [updateItemsFn])

  // Move item back to previous status
  const moveBack = React.useCallback((id: string) => {
    updateItemsFn((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (item.status === "reading") {
          return { ...item, status: "queued" as const, startedAt: undefined }
        }
        if (item.status === "done") {
          return { ...item, status: "reading" as const, completedAt: undefined }
        }
        return item
      })
    )
  }, [updateItemsFn])

  // Delete item
  const deleteItem = React.useCallback((id: string) => {
    updateItemsFn((prev) => prev.filter((item) => item.id !== id))
  }, [updateItemsFn])

  // Save notes for an item
  const saveNotes = React.useCallback((id: string) => {
    updateItemsFn((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, notes: editingNotes || undefined } : item
      )
    )
    setEditingNotesId(null)
    setEditingNotes("")
  }, [editingNotes, updateItemsFn])

  // Computed stats
  const queuedItems = items.filter((i) => i.status === "queued")
  const readingItems = items.filter((i) => i.status === "reading")
  const doneItems = items.filter((i) => i.status === "done")
  const completedThisWeek = doneItems.filter((i) => i.completedAt && isThisWeek(i.completedAt))
  const completionRate = items.length > 0 ? Math.round((doneItems.length / items.length) * 100) : 0

  // Get items for active tab, sorted by most recent first
  const tabItems = React.useMemo(() => {
    const filtered = items.filter((i) => i.status === activeTab)
    return filtered.sort((a, b) => {
      const dateA = a.status === "done" ? a.completedAt : a.status === "reading" ? a.startedAt : a.addedAt
      const dateB = b.status === "done" ? b.completedAt : b.status === "reading" ? b.startedAt : b.addedAt
      return new Date(dateB || b.addedAt).getTime() - new Date(dateA || a.addedAt).getTime()
    })
  }, [items, activeTab])

  return (
    <div className="p-6" data-tabz-section="reading-queue">
      {/* Header */}
      <div className="flex items-start justify-between mb-1 sm:mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-mono gradient-text-theme terminal-glow">
          Reading Queue
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAddForm(!showAddForm)
            setTimeout(() => urlInputRef.current?.focus(), 100)
          }}
          className="gap-1.5"
          data-tabz-action="add-item"
        >
          <Plus className="h-4 w-4" />
          Add URL
        </Button>
      </div>
      <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
        Track articles and pages to read later
      </p>

      {/* Stats Bar */}
      <div className="glass rounded-lg p-3 sm:p-4 mb-6" data-tabz-region="stats">
        <div className="flex items-center gap-4 sm:gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Stats</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-primary">{queuedItems.length}</span>
            <span className="text-muted-foreground">queued</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-amber-400">{readingItems.length}</span>
            <span className="text-muted-foreground">reading</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-emerald-400">{doneItems.length}</span>
            <span className="text-muted-foreground">done</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="font-mono text-cyan-400">{completedThisWeek.length}</span>
            <span className="text-muted-foreground">this week</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="font-mono text-primary">{completionRate}%</span>
            <span className="text-muted-foreground">completion</span>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass rounded-lg p-4 mb-6 animate-fade-in" data-tabz-region="add-form">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add to Reading Queue
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  ref={urlInputRef}
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://example.com/article"
                  className="text-sm"
                  data-tabz-input="add-url"
                />
              </div>
              {fetchingTitle && (
                <div className="flex items-center px-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <Input
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="Title"
              className="text-sm"
              data-tabz-input="add-title"
            />
            <div className="flex gap-2">
              <Input
                value={addEstimate}
                onChange={(e) => setAddEstimate(e.target.value.replace(/\D/g, ""))}
                placeholder="Est. minutes (optional)"
                className="text-sm w-48"
                data-tabz-input="add-estimate"
              />
              <Input
                value={addTags}
                onChange={(e) => setAddTags(e.target.value)}
                placeholder="Tags, comma separated (optional)"
                className="text-sm flex-1"
                data-tabz-input="add-tags"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!addUrl.trim() || !addTitle.trim()}
                data-tabz-action="submit-add"
              >
                Add to Queue
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false)
                  setAddUrl("")
                  setAddTitle("")
                  setAddEstimate("")
                  setAddTags("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["queued", "reading", "done"] as TabStatus[]).map((tab) => {
          const count = tab === "queued" ? queuedItems.length : tab === "reading" ? readingItems.length : doneItems.length
          const tabIcon = tab === "queued" ? BookOpen : tab === "reading" ? Clock : CheckCircle2
          const TabIcon = tabIcon
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                }
              `}
              data-tabz-action={`tab-${tab}`}
            >
              <TabIcon className="h-4 w-4" />
              <span className="capitalize">{tab}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {count}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Item List */}
      <div className="space-y-2" data-tabz-list="reading-items">
        {tabItems.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {activeTab === "queued"
                ? "No items in queue. Add a URL to get started."
                : activeTab === "reading"
                ? "Nothing currently being read."
                : "No completed items yet."}
            </p>
          </div>
        ) : (
          tabItems.map((item) => (
            <div
              key={item.id}
              className="glass rounded-lg p-3 sm:p-4 hover:bg-primary/5 transition-colors group"
              data-tabz-item={item.id}
            >
              <div className="flex items-start gap-3">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={isSafeUrl(item.url) ? item.url : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors truncate"
                      data-tabz-action="open-url"
                    >
                      {item.title}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {getDomain(item.url)}
                    </span>
                    <span suppressHydrationWarning>
                      {item.status === "done" && item.completedAt
                        ? `Completed ${formatRelativeTime(item.completedAt)}`
                        : item.status === "reading" && item.startedAt
                        ? `Started ${formatRelativeTime(item.startedAt)}`
                        : `Added ${formatRelativeTime(item.addedAt)}`}
                    </span>
                    {item.estimatedMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.estimatedMinutes}m
                      </span>
                    )}
                  </div>
                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Notes display */}
                  {item.notes && editingNotesId !== item.id && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/20 rounded px-2 py-1.5 border border-muted/30">
                      <StickyNote className="h-3 w-3 inline mr-1" />
                      {item.notes}
                    </div>
                  )}
                  {/* Notes editor */}
                  {editingNotesId === item.id && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        placeholder="Add notes about this article..."
                        className="text-xs min-h-[60px] resize-none"
                        data-tabz-input="edit-notes"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => saveNotes(item.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setEditingNotesId(null)
                            setEditingNotes("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Notes button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (editingNotesId === item.id) {
                        setEditingNotesId(null)
                        setEditingNotes("")
                      } else {
                        setEditingNotesId(item.id)
                        setEditingNotes(item.notes || "")
                      }
                    }}
                    title="Edit notes"
                    data-tabz-action="edit-notes"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                  </Button>
                  {/* Move back */}
                  {item.status !== "queued" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => moveBack(item.id)}
                      title={item.status === "reading" ? "Move back to Queued" : "Move back to Reading"}
                      data-tabz-action="move-back"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {/* Move forward */}
                  {item.status !== "done" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveForward(item.id)}
                      title={item.status === "queued" ? "Start Reading" : "Mark as Done"}
                      data-tabz-action="move-forward"
                    >
                      {item.status === "queued" ? (
                        <ArrowRight className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </Button>
                  )}
                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                    onClick={() => deleteItem(item.id)}
                    title="Delete"
                    data-tabz-action="delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
