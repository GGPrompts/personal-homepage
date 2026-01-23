"use client"

import { type Project } from "@/lib/projects"
import { KanbanBoard } from "@/app/components/kanban/board/KanbanBoard"
import { Cloud } from "lucide-react"

interface ProjectKanbanProps {
  project: Project
}

export default function ProjectKanban({ project }: ProjectKanbanProps) {
  // Get the local path for the project - needed for beads workspace
  const workspace = project.local?.path

  // If project is remote-only (no local clone), show appropriate message
  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-4 p-8">
        <Cloud className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-foreground mb-2">Remote Repository</h3>
          <p className="text-sm">
            This project is not cloned locally. Clone it to enable the beads-powered Kanban board.
          </p>
          {project.github?.clone_url && (
            <code className="text-xs text-cyan-500 mt-3 block break-all">
              git clone {project.github.clone_url}
            </code>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Project context header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kanban Board</h2>
          <p className="text-sm text-muted-foreground">
            Track issues for this project using beads
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {workspace}
        </div>
      </div>

      {/* Beads Kanban Board */}
      <div className="rounded-lg border border-border overflow-hidden bg-zinc-900/50 min-h-[500px]">
        <KanbanBoard workspace={workspace} />
      </div>
    </div>
  )
}
