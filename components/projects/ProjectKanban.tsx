"use client"

import * as React from "react"
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
  Clock,
  Cloud,
  CloudOff,
  Loader2,
  AlertCircle,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type Project, type ProjectTask } from "@/lib/projects"
import { useProjectMeta } from "@/hooks/useProjectMeta"

interface ProjectKanbanProps {
  project: Project
}

const COLUMNS: { id: ProjectTask["status"]; title: string; icon: React.ReactNode; color: string }[] = [
  { id: "todo", title: "To Do", icon: <Circle className="h-4 w-4" />, color: "border-t-gray-500" },
  { id: "in-progress", title: "In Progress", icon: <Clock className="h-4 w-4" />, color: "border-t-amber-500" },
  { id: "done", title: "Done", icon: <CheckCircle2 className="h-4 w-4" />, color: "border-t-emerald-500" },
]

export default function ProjectKanban({ project }: ProjectKanbanProps) {
  const {
    meta,
    isLoading,
    isSyncing,
    syncStatus,
    isConfigured,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    migrateFromLocalStorage,
    hasLocalStorageData,
  } = useProjectMeta(project.slug)

  const tasks = meta.tasks

  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [addToColumn, setAddToColumn] = React.useState<ProjectTask["status"]>("todo")
  const [editingTask, setEditingTask] = React.useState<ProjectTask | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<ProjectTask | null>(null)
  const [draggedTask, setDraggedTask] = React.useState<ProjectTask | null>(null)
  const [dragOverColumn, setDragOverColumn] = React.useState<ProjectTask["status"] | null>(null)
  const [showMigrationDialog, setShowMigrationDialog] = React.useState(false)

  // Form state
  const [formTitle, setFormTitle] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")

  // Check for migration on mount
  React.useEffect(() => {
    if (isConfigured && hasLocalStorageData && !isLoading) {
      setShowMigrationDialog(true)
    }
  }, [isConfigured, hasLocalStorageData, isLoading])

  const resetForm = () => {
    setFormTitle("")
    setFormDescription("")
    setEditingTask(null)
  }

  const handleAddTask = () => {
    addTask({
      title: formTitle,
      description: formDescription || undefined,
      status: addToColumn,
    })
    resetForm()
    setAddDialogOpen(false)
  }

  const handleUpdateTask = () => {
    if (!editingTask) return
    updateTask(editingTask.id, {
      title: formTitle,
      description: formDescription || undefined,
    })
    resetForm()
    setAddDialogOpen(false)
  }

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId)
    setDeleteConfirm(null)
  }

  const openAddDialog = (column: ProjectTask["status"]) => {
    resetForm()
    setAddToColumn(column)
    setAddDialogOpen(true)
  }

  const openEditDialog = (task: ProjectTask) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description || "")
    setAddToColumn(task.status)
    setAddDialogOpen(true)
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, task: ProjectTask) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", task.id)
    setTimeout(() => {
      const element = document.getElementById(`task-${task.id}`)
      if (element) {
        element.style.opacity = "0.5"
      }
    }, 0)
  }

  const handleDragEnd = () => {
    if (draggedTask) {
      const element = document.getElementById(`task-${draggedTask.id}`)
      if (element) {
        element.style.opacity = "1"
      }
    }
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, column: ProjectTask["status"]) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(column)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget?.closest("[data-column]")) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = (e: React.DragEvent, column: ProjectTask["status"]) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== column) {
      moveTask(draggedTask.id, column)
    }
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const getColumnTasks = (status: ProjectTask["status"]) => {
    return tasks.filter((t) => t.status === status)
  }

  const handleMigrate = async () => {
    await migrateFromLocalStorage()
    setShowMigrationDialog(false)
  }

  // Sync status icon
  const SyncStatusIcon = () => {
    switch (syncStatus) {
      case "synced":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Cloud className="h-4 w-4 text-emerald-500" />
              </TooltipTrigger>
              <TooltipContent>Synced to GitHub</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case "syncing":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              </TooltipTrigger>
              <TooltipContent>Syncing...</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case "error":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>Sync error</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case "offline":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CloudOff className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Offline (stored locally)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kanban Board</h2>
          <p className="text-sm text-muted-foreground">
            Track tasks for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatusIcon />
          <span className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = getColumnTasks(column.id)
          const isOver = dragOverColumn === column.id

          return (
            <div
              key={column.id}
              data-column={column.id}
              className={`glass rounded-lg p-4 border-t-4 ${column.color} transition-colors ${
                isOver ? "bg-primary/10 ring-2 ring-primary/50" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {column.icon}
                  <span className="font-medium">{column.title}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openAddDialog(column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Tasks */}
              <div className="space-y-2 min-h-[100px]">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    id={`task-${task.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className="bg-background/50 rounded-lg p-3 border cursor-move hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm cursor-pointer hover:text-primary"
                          onClick={() => openEditDialog(task)}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => setDeleteConfirm(task)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>No tasks</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openAddDialog(column.id)}
                      className="mt-1"
                    >
                      Add one
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setAddDialogOpen(open) }}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Add Task"}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update this task"
                : `Add a new task to ${COLUMNS.find((c) => c.id === addToColumn)?.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description (optional)
              </label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setAddDialogOpen(false) }}>
              Cancel
            </Button>
            <Button
              onClick={editingTask ? handleUpdateTask : handleAddTask}
              disabled={!formTitle.trim() || isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingTask ? (
                "Save Changes"
              ) : (
                "Add Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteTask(deleteConfirm.id)}
              disabled={isSyncing}
            >
              {isSyncing ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration Dialog */}
      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Migrate Local Data</DialogTitle>
            <DialogDescription>
              You have tasks stored locally for this project. Would you like to sync them to GitHub for cross-device access?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrationDialog(false)}>
              Keep Local
            </Button>
            <Button onClick={handleMigrate} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Sync to GitHub
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
