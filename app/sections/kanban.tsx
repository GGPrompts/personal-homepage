"use client"

import * as React from "react"
import { KanbanBoard } from "@/app/components/kanban/board/KanbanBoard"

interface KanbanSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function KanbanSection({ activeSubItem, onSubItemHandled }: KanbanSectionProps) {
  // Handle sub-item navigation if needed
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  return (
    <div className="h-full flex flex-col" data-tabz-section="kanban">
      <div className="p-6 pb-0">
        <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow mb-2">
          Kanban
        </h1>
        <p className="text-muted-foreground mb-4">Visual task board for project management</p>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </div>
  )
}
