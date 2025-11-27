"use client"

import * as React from "react"
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  RotateCcw,
  Calendar,
  Clock,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "quick-tasks"

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
// MAIN COMPONENT
// ============================================================================

export default function TasksSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
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

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem) {
      const element = document.getElementById(`tasks-${activeSubItem}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

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

  // Stats
  const totalTasks = tasks.length
  const completedCount = completedTasks.length
  const pendingCount = pendingTasks.length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold terminal-glow">Tasks</h1>
        {totalTasks > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              {pendingCount} pending
            </Badge>
            {completedCount > 0 && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                {completedCount} done
              </Badge>
            )}
          </div>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Quick task tracking for your day</p>

      <div className="max-w-2xl">
        {/* Add Task Input */}
        <Card className="glass p-4 mb-6">
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
            />
            <Button type="submit" disabled={!newTaskText.trim()}>
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
          <div id="tasks-pending" className="mb-6 scroll-mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Circle className="h-4 w-4" />
              To Do ({pendingCount})
            </h3>
            <div className="space-y-2">
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
    </div>
  )
}
