"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  StickyNote,
  ListTodo,
  FolderGit2,
  User,
  Inbox,
  RotateCw,
  Sparkles,
  ArrowUpDown,
  MoreHorizontal,
  Wand2,
  ListChecks,
  FolderInput,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAIDrawerTrigger } from "@/hooks/useAIDrawerChat"
import { useProjects } from "@/hooks/useProjects"

// ============================================================================
// TYPES
// ============================================================================

interface Task {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
}

interface QuickNote {
  id: string
  project: string // "general" | "personal" | project name
  text: string
  createdAt: string
  updatedAt?: string
}

interface NotesData {
  version: number
  notes: QuickNote[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "quick-tasks"

const DEFAULT_NOTES_DATA: NotesData = {
  version: 1,
  notes: [],
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function loadTasks(): Task[] {
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

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

// ============================================================================
// TASK ITEM COMPONENT
// ============================================================================

function TaskItem({
  task,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
        task.completed
          ? "border-border/30 bg-muted/20 opacity-60"
          : "border-border bg-background/50 hover:border-primary/30"
      }`}
      data-tabz-item={`task-${task.id}`}
    >
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
      >
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>

      {/* Task text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            task.completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {task.text}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="h-3 w-3" />
          {task.completed && task.completedAt
            ? `Completed ${formatDate(task.completedAt)}`
            : `Added ${formatDate(task.createdAt)}`}
        </p>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// NOTE ITEM COMPONENT
// ============================================================================

function NoteItem({
  note,
  onDelete,
  onUpdate,
  onConvertToTask,
  onMoveToProject,
  openWithMessage,
  availableProjects,
}: {
  note: QuickNote
  onDelete: () => void
  onUpdate: (id: string, text: string) => void
  onConvertToTask?: (id: string) => void
  onMoveToProject?: (id: string, project: string) => void
  openWithMessage?: (message: string) => void
  availableProjects?: string[]
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editText, setEditText] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const startEditing = () => {
    setEditText(note.text)
    setIsEditing(true)
  }

  const saveEdit = () => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === note.text) {
      setIsEditing(false)
      return
    }
    onUpdate(note.id, trimmed)
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  // Auto-focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [isEditing])

  // Projects the note can be moved to (exclude current)
  const moveTargets = (availableProjects || ["general", "personal"]).filter(
    (p) => p !== note.project
  )

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg border border-border bg-background/50 hover:border-primary/30 transition-all">
      <StickyNote className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                saveEdit()
              } else if (e.key === "Escape") {
                e.preventDefault()
                cancelEdit()
              }
            }}
            onBlur={saveEdit}
            rows={3}
            className="text-sm resize-none"
          />
        ) : (
          <p
            className="text-sm text-foreground whitespace-pre-wrap cursor-pointer hover:text-primary/80 transition-colors"
            onClick={startEditing}
            title="Click to edit"
          >
            {note.text}
          </p>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3" />
          {formatDate(note.updatedAt || note.createdAt)}
          {note.updatedAt && " (edited)"}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {openWithMessage && (
            <DropdownMenuItem
              onClick={() =>
                openWithMessage(
                  `Expand on this idea and add context:\n\n${note.text}`
                )
              }
            >
              <Wand2 className="h-4 w-4" />
              Expand with AI
            </DropdownMenuItem>
          )}
          {onConvertToTask && (
            <DropdownMenuItem onClick={() => onConvertToTask(note.id)}>
              <ListChecks className="h-4 w-4" />
              Convert to task
            </DropdownMenuItem>
          )}
          {onMoveToProject && moveTargets.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4" />
                Move to...
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {moveTargets.map((project) => (
                    <DropdownMenuItem
                      key={project}
                      onClick={() => onMoveToProject(note.id, project)}
                    >
                      {project === "general" ? (
                        <Inbox className="h-4 w-4" />
                      ) : project === "personal" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <FolderGit2 className="h-4 w-4" />
                      )}
                      {project === "general"
                        ? "General"
                        : project === "personal"
                          ? "Personal"
                          : project}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ============================================================================
// NOTES TAB COMPONENT (Local Storage)
// ============================================================================

function NotesTab() {
  const queryClient = useQueryClient()
  const [newNoteText, setNewNoteText] = React.useState("")
  const [selectedProject, setSelectedProject] = React.useState("general")
  const [notesView, setNotesView] = React.useState<'inbox' | 'projects' | 'personal'>('inbox')
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest'>(() => {
    if (typeof window === "undefined") return "newest"
    return (localStorage.getItem("notes-sort-order") as 'newest' | 'oldest') || "newest"
  })
  const [filterCategory, setFilterCategory] = React.useState<string>("all")
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const { isAvailable, openWithMessage } = useAIDrawerTrigger()
  const { localProjects } = useProjects()

  // Sync selectedProject default when switching views
  React.useEffect(() => {
    if (notesView === 'inbox') setSelectedProject("general")
    else if (notesView === 'personal') setSelectedProject("personal")
  }, [notesView])

  // Reset filter when switching views
  React.useEffect(() => {
    setFilterCategory("all")
  }, [notesView])

  // Persist sort order to localStorage
  React.useEffect(() => {
    localStorage.setItem("notes-sort-order", sortOrder)
  }, [sortOrder])

  // Fetch notes from local API
  const {
    data: notesData,
    isLoading: notesLoading,
  } = useQuery({
    queryKey: ["quicknotes-local"],
    queryFn: async () => {
      const res = await fetch("/api/quicknotes")
      if (!res.ok) return DEFAULT_NOTES_DATA
      return res.json() as Promise<NotesData>
    },
    staleTime: 10 * 1000,
  })

  // Add note mutation
  const addMutation = useMutation({
    mutationFn: async (note: { project: string; text: string }) => {
      const res = await fetch("/api/quicknotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      })
      if (!res.ok) throw new Error("Failed to add note")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicknotes-local"] })
    },
  })

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const res = await fetch("/api/quicknotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      })
      if (!res.ok) throw new Error("Failed to update note")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicknotes-local"] })
    },
  })

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quicknotes?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete note")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicknotes-local"] })
    },
  })

  const handleAddNote = async () => {
    const text = newNoteText.trim()
    if (!text) return

    const project = selectedProject
    setNewNoteText("")
    inputRef.current?.focus()

    const data = await addMutation.mutateAsync({ project, text })

    // Auto-suggest category when adding to General
    if (project === "general" && data?.note?.id) {
      const lowerText = text.toLowerCase()
      const match = localProjects.find(p =>
        lowerText.includes(p.name.toLowerCase())
      )
      if (match) {
        toast(`File under "${match.name}"?`, {
          duration: 8000,
          action: {
            label: "Move",
            onClick: () => {
              moveMutation.mutate({ id: data.note.id, project: match.name })
            },
          },
        })
      }
    }
  }

  const handleUpdateNote = (id: string, text: string) => {
    updateMutation.mutate({ id, text })
  }

  const handleDeleteNote = (id: string) => {
    deleteMutation.mutate(id)
  }

  // Move note to a different project/category
  const moveMutation = useMutation({
    mutationFn: async ({ id, project }: { id: string; project: string }) => {
      const res = await fetch("/api/quicknotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, project }),
      })
      if (!res.ok) throw new Error("Failed to move note")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicknotes-local"] })
    },
  })

  const handleMoveToProject = (id: string, project: string) => {
    moveMutation.mutate({ id, project })
  }

  // Convert note to a task: create task in localStorage, then delete the note
  const handleConvertToTask = (id: string) => {
    const note = notesData?.notes?.find((n) => n.id === id)
    if (!note) return

    const tasks = loadTasks()
    const newTask: Task = {
      id: generateId(),
      text: note.text,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    saveTasks([newTask, ...tasks])
    deleteMutation.mutate(id)
  }

  // Get display name for project
  const getProjectDisplayName = (project: string) => {
    if (project === "general") return "General"
    if (project === "personal") return "Personal"
    // Check if it matches a known local project and use its name
    const match = localProjects.find(p => p.name === project)
    if (match) return match.name
    return project
  }

  // Get icon for project
  const getProjectIcon = (project: string) => {
    if (project === "general") return <Inbox className="h-4 w-4" />
    if (project === "personal") return <User className="h-4 w-4" />
    return <FolderGit2 className="h-4 w-4" />
  }

  // All available project names for the "Move to" menu
  const allProjectNames = React.useMemo(() => {
    const names = new Set(["general", "personal"])
    for (const p of localProjects) names.add(p.name)
    if (notesData?.notes) {
      for (const n of notesData.notes) names.add(n.project)
    }
    return Array.from(names)
  }, [localProjects, notesData?.notes])

  // Badge counts for sub-tabs (computed from full list, not affected by sort/filter)
  const viewCounts = React.useMemo(() => {
    const notes = notesData?.notes || []
    return {
      inbox: notes.filter(n => n.project === "general").length,
      projects: notes.filter(n => n.project !== "general" && n.project !== "personal").length,
      personal: notes.filter(n => n.project === "personal").length,
    }
  }, [notesData?.notes])

  // Filter notes by current view before applying category/sort
  const viewFilteredNotes = React.useMemo(() => {
    const notes = notesData?.notes || []
    switch (notesView) {
      case 'inbox': return notes.filter(n => n.project === "general")
      case 'personal': return notes.filter(n => n.project === "personal")
      case 'projects': return notes.filter(n => n.project !== "general" && n.project !== "personal")
    }
  }, [notesData?.notes, notesView])

  // Categories relevant to the current view
  const viewCategories = React.useMemo(() => {
    const cats = new Set(viewFilteredNotes.map(n => n.project))
    return Array.from(cats).sort()
  }, [viewFilteredNotes])

  // Sort comparator for notes
  const sortNotes = React.useCallback((a: QuickNote, b: QuickNote) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB
  }, [sortOrder])

  // Group notes by project (with view, sorting and filtering applied)
  const groupedNotes = React.useMemo(() => {
    if (viewFilteredNotes.length === 0) return new Map<string, QuickNote[]>()

    const filtered = filterCategory === "all"
      ? viewFilteredNotes
      : viewFilteredNotes.filter(n => n.project === filterCategory)

    const groups = new Map<string, QuickNote[]>()
    for (const note of filtered) {
      const existing = groups.get(note.project) || []
      existing.push(note)
      groups.set(note.project, existing)
    }

    // Sort notes within each group
    for (const [key, notes] of groups) {
      groups.set(key, [...notes].sort(sortNotes))
    }

    return groups
  }, [viewFilteredNotes, filterCategory, sortNotes])

  const totalNotes = notesData?.notes?.length || 0
  const viewNoteCount = viewFilteredNotes.length
  const isSaving = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending || moveMutation.isPending

  return (
    <div className="space-y-6">
      {/* Add Note Input */}
      <Card className="glass p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  General
                </div>
              </SelectItem>
              <SelectItem value="personal">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal
                </div>
              </SelectItem>
              {localProjects.length > 0 && (
                <>
                  <SelectSeparator />
                  {localProjects.map((project) => (
                    <SelectItem key={project.name} value={project.name}>
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          <div className="flex gap-3 flex-1">
            <Textarea
              ref={inputRef}
              placeholder="Quick note... (Shift+Enter for newline)"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAddNote()
                }
              }}
              rows={2}
              className="flex-1 resize-none"
              disabled={isSaving}
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNoteText.trim() || isSaving}
              className="self-end"
            >
              {isSaving ? (
                <RotateCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {!isSaving && "Add"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sub-tab pills: Inbox / Projects / Personal */}
      <div className="flex items-center gap-1.5">
        {([
          { key: 'inbox' as const, label: 'Inbox', icon: <Inbox className="h-3 w-3" />, count: viewCounts.inbox },
          { key: 'projects' as const, label: 'Projects', icon: <FolderGit2 className="h-3 w-3" />, count: viewCounts.projects },
          { key: 'personal' as const, label: 'Personal', icon: <User className="h-3 w-3" />, count: viewCounts.personal },
        ]).map(({ key, label, icon, count }) => (
          <button
            key={key}
            onClick={() => setNotesView(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              notesView === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {icon}
            {label}
            {count > 0 && (
              <span className={`ml-0.5 text-[10px] tabular-nums ${
                notesView === key ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* AI Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!isAvailable || totalNotes === 0}
          onClick={() => {
            openWithMessage(
              `Here are all my quick notes:\n\n\`\`\`json\n${JSON.stringify(notesData?.notes || [], null, 2)}\n\`\`\`\n\nSummarize these notes: find common themes, highlight stale items (older than 7 days), identify actionable items, and suggest which notes to prioritize this week. Group insights by project.`
            )
          }}
        >
          <Sparkles className="h-4 w-4" />
          Summarize
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!isAvailable || viewCounts.inbox === 0}
          onClick={() => {
            const inboxNotes = (notesData?.notes || []).filter(n => n.project === "general")
            const availableTargets = localProjects.map(p => p.name)
            openWithMessage(
              `I have ${inboxNotes.length} unprocessed notes in my inbox that need triage. Available project categories: ${availableTargets.length > 0 ? availableTargets.join(", ") : "(none yet)"}.\n\nHere are the inbox notes:\n\n\`\`\`json\n${JSON.stringify(inboxNotes, null, 2)}\n\`\`\`\n\nFor each note, suggest one action: move to a specific project, convert to a task, or keep in inbox. Be decisive — most notes should be routed somewhere.\n\nRespond with a JSON block in this format:\n\`\`\`json\n{ "recommendations": [{ "noteId": "...", "noteText": "first 50 chars...", "action": "move" | "convert-task" | "keep", "target": "project-name or null", "reason": "brief reason" }] }\n\`\`\`\nThen explain your reasoning below the JSON.`
            )
          }}
        >
          <Inbox className="h-4 w-4" />
          Triage Inbox
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!isAvailable || totalNotes === 0}
          onClick={() => {
            const availableTargets = localProjects.map(p => p.name)
            openWithMessage(
              `Here are my quick notes:\n\n\`\`\`json\n${JSON.stringify(notesData?.notes || [], null, 2)}\n\`\`\`\n\nAvailable project categories: ${availableTargets.length > 0 ? availableTargets.join(", ") : "(none yet)"}.\n\nFor each note: suggest which project in ~/projects/ it belongs to (check if the note content relates to any project name), whether it's a personal note, or an actionable task that should become a todo. Group your recommendations by action type (move to project, keep as personal, convert to task). Be specific about which project directory each note should be filed under.\n\nRespond with a JSON block in this format:\n\`\`\`json\n{ "recommendations": [{ "noteId": "...", "noteText": "first 50 chars...", "action": "move" | "convert-task" | "keep", "target": "project-name or null", "reason": "brief reason" }] }\n\`\`\`\nThen explain your reasoning below the JSON.`
            )
          }}
        >
          <ArrowUpDown className="h-4 w-4" />
          AI Sort
        </Button>
      </div>

      {/* Sort & Filter Toolbar */}
      {!notesLoading && viewNoteCount > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === "newest" ? "Newest first" : "Oldest first"}
          </Button>
          {notesView === 'projects' && viewCategories.length > 1 && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-7 w-[160px] text-xs text-muted-foreground">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Projects</SelectItem>
                <SelectSeparator />
                {viewCategories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    <div className="flex items-center gap-2">
                      {getProjectIcon(cat)}
                      {getProjectDisplayName(cat)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Loading State */}
      {notesLoading && (
        <Card className="glass p-8 text-center">
          <RotateCw className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        </Card>
      )}

      {/* Empty State */}
      {!notesLoading && viewNoteCount === 0 && (
        <Card className="glass p-8 text-center">
          <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {notesView === 'inbox' ? 'Inbox is empty' : notesView === 'personal' ? 'No personal notes' : 'No project notes'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {notesView === 'inbox'
              ? 'Capture a quick thought above'
              : notesView === 'personal'
                ? 'Add a personal note to get started'
                : 'Notes filed under projects will appear here'}
          </p>
        </Card>
      )}

      {/* Notes list */}
      {!notesLoading && Array.from(groupedNotes.entries()).map(([project, notes]) => (
        <div key={project} className="space-y-2">
          {/* Show group headers only in projects view with multiple groups */}
          {notesView === 'projects' && filterCategory === "all" && (
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {getProjectIcon(project)}
              {getProjectDisplayName(project)} ({notes.length})
            </h3>
          )}
          <div className="space-y-2">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onDelete={() => handleDeleteNote(note.id)}
                onUpdate={handleUpdateNote}
                onConvertToTask={handleConvertToTask}
                onMoveToProject={handleMoveToProject}
                openWithMessage={isAvailable ? openWithMessage : undefined}
                availableProjects={allProjectNames}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// TASKS TAB COMPONENT
// ============================================================================

function TasksTab() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [newTaskText, setNewTaskText] = React.useState("")
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [showCompleted, setShowCompleted] = React.useState(true)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Load tasks from localStorage
  React.useEffect(() => {
    setTasks(loadTasks())
    setIsLoaded(true)
  }, [])

  // Save tasks whenever they change
  React.useEffect(() => {
    if (isLoaded) {
      saveTasks(tasks)
    }
  }, [tasks, isLoaded])

  // Add a new task
  const addTask = () => {
    const text = newTaskText.trim()
    if (!text) return

    const newTask: Task = {
      id: generateId(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    setTasks((prev) => [newTask, ...prev])
    setNewTaskText("")
    inputRef.current?.focus()
  }

  // Toggle task completion
  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? new Date().toISOString() : undefined,
            }
          : task
      )
    )
  }

  // Delete a task
  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  // Move task up
  const moveUp = (index: number) => {
    if (index === 0) return
    setTasks((prev) => {
      const newTasks = [...prev]
      ;[newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]]
      return newTasks
    })
  }

  // Move task down
  const moveDown = (index: number) => {
    setTasks((prev) => {
      if (index >= prev.length - 1) return prev
      const newTasks = [...prev]
      ;[newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]]
      return newTasks
    })
  }

  // Clear completed tasks
  const clearCompleted = () => {
    setTasks((prev) => prev.filter((task) => !task.completed))
  }

  // Split tasks into pending and completed
  const pendingTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  const totalTasks = tasks.length
  const completedCount = completedTasks.length
  const pendingCount = pendingTasks.length

  return (
    <div className="space-y-6">
      {/* Add Task Input */}
      <Card className="glass p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addTask()
          }}
          className="flex gap-3"
        >
          <Input
            ref={inputRef}
            placeholder="What needs to be done?"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-1"
            data-tabz-input="new-task"
          />
          <Button type="submit" disabled={!newTaskText.trim()} data-tabz-action="add-task">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </form>
      </Card>

      {/* Empty State */}
      {totalTasks === 0 && isLoaded && (
        <Card className="glass p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
          <p className="text-sm text-muted-foreground">
            Add your first task above to get started
          </p>
        </Card>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div id="tasks-pending" className="scroll-mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Circle className="h-4 w-4" />
            To Do ({pendingCount})
          </h3>
          <div className="space-y-2" data-tabz-list="tasks">
            {pendingTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
                onMoveUp={() => moveUp(tasks.indexOf(task))}
                onMoveDown={() => moveDown(tasks.indexOf(task))}
                isFirst={index === 0}
                isLast={index === pendingTasks.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div id="tasks-completed" className="scroll-mt-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed ({completedCount})
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showCompleted ? "" : "-rotate-90"}`}
              />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          </div>
          {showCompleted && (
            <div className="space-y-2">
              {completedTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onMoveUp={() => moveUp(tasks.indexOf(task))}
                  onMoveDown={() => moveDown(tasks.indexOf(task))}
                  isFirst={index === 0}
                  isLast={index === completedTasks.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TasksSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  const [activeTab, setActiveTab] = React.useState("tasks")

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem) {
      if (activeSubItem === "notes") {
        setActiveTab("notes")
      } else {
        const element = document.getElementById(`tasks-${activeSubItem}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Count notes for badge (from local API)
  const { data: notesData } = useQuery({
    queryKey: ["quicknotes-local"],
    queryFn: async () => {
      const res = await fetch("/api/quicknotes")
      if (!res.ok) return DEFAULT_NOTES_DATA
      return res.json() as Promise<NotesData>
    },
    staleTime: 10 * 1000,
  })

  const notesCount = notesData?.notes?.length || 0

  return (
    <div className="p-6" data-tabz-section="tasks">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow">Scratchpad</h1>
      </div>
      <p className="text-muted-foreground mb-6">Capture thoughts and track todos</p>

      <div className="max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
              {notesCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {notesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TasksTab />
          </TabsContent>

          <TabsContent value="notes">
            <NotesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
