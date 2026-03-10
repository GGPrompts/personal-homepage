"use client"

import { BookOpen } from "lucide-react"

interface PromptLibrarySectionProps {
  activeSubItem: string | null
  onSubItemHandled: () => void
}

export default function PromptLibrarySection({ activeSubItem, onSubItemHandled }: PromptLibrarySectionProps) {
  return (
    <div className="p-6 space-y-6" data-tabz-section="prompt-library">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold terminal-glow">Prompt Library</h2>
      </div>
      <div className="glass rounded-lg p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Prompt Library section coming soon. Browse and manage reusable prompts.
        </p>
      </div>
    </div>
  )
}
