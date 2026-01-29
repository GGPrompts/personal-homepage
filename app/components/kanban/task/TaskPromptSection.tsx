"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Wand2, Save, RefreshCw, Loader2, FileText, AlertCircle } from "lucide-react"
import type { Task } from "../types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  usePromptGeneration,
  extractPromptFromNotes,
  PROMPT_SECTION_HEADER,
} from "@/hooks/usePromptGeneration"

interface TaskPromptSectionProps {
  task: Task
  workspace: string | null
}

export function TaskPromptSection({ task, workspace }: TaskPromptSectionProps) {
  const [notes, setNotes] = useState<string>("")
  const [promptDraft, setPromptDraft] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(true)

  const {
    generatePrompt,
    savePrompt,
    isGenerating,
    isSaving,
    error,
    clearError,
  } = usePromptGeneration({ workspace: workspace || undefined })

  // Fetch notes on mount
  useEffect(() => {
    async function fetchNotes() {
      if (!workspace) {
        setIsLoadingNotes(false)
        return
      }

      try {
        const res = await fetch(
          `/api/beads/issues/${encodeURIComponent(task.id)}?workspace=${encodeURIComponent(workspace)}`
        )
        if (res.ok) {
          const data = await res.json()
          setNotes(data.issue?.notes || "")
        }
      } catch {
        // Ignore fetch errors
      }
      setIsLoadingNotes(false)
    }

    fetchNotes()
  }, [task.id, workspace])

  const savedPrompt = extractPromptFromNotes(notes)
  const hasPrompt = savedPrompt !== null

  const handleGenerate = useCallback(async () => {
    clearError()
    const prompt = await generatePrompt(task.id)
    if (prompt) {
      setPromptDraft(prompt)
      setIsEditing(true)
    }
  }, [task.id, generatePrompt, clearError])

  const handleSave = useCallback(async () => {
    const success = await savePrompt(task.id, promptDraft, notes)
    if (success) {
      // Update local notes with new prompt
      const headerIndex = notes.indexOf(PROMPT_SECTION_HEADER)
      if (headerIndex === -1) {
        setNotes(
          notes.trim()
            ? `${notes.trim()}\n\n${PROMPT_SECTION_HEADER}\n\n${promptDraft.trim()}`
            : `${PROMPT_SECTION_HEADER}\n\n${promptDraft.trim()}`
        )
      } else {
        // Replace existing prompt section
        const beforeHeader = notes.substring(0, headerIndex)
        setNotes(`${beforeHeader.trim()}\n\n${PROMPT_SECTION_HEADER}\n\n${promptDraft.trim()}`)
      }
      setIsEditing(false)
    }
  }, [task.id, promptDraft, notes, savePrompt])

  const handleEdit = useCallback(() => {
    if (savedPrompt) {
      setPromptDraft(savedPrompt)
      setIsEditing(true)
    }
  }, [savedPrompt])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setPromptDraft("")
    clearError()
  }, [clearError])

  if (isLoadingNotes) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-200">Worker Prompt</span>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {hasPrompt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
              >
                <FileText className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-7 text-xs bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : hasPrompt ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 mr-1" />
                  Generate Prompt
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Prompt content */}
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            className="bg-black/20 border-white/10 focus:border-violet-500/50 text-zinc-100 min-h-[300px] font-mono text-sm"
            placeholder="Worker prompt will appear here..."
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !promptDraft.trim()}
              className="h-8 bg-cyan-600 hover:bg-cyan-500"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save Prompt
                </>
              )}
            </Button>
          </div>
        </div>
      ) : hasPrompt ? (
        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
            {savedPrompt}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 bg-black/20 border border-white/10 border-dashed rounded-lg">
          <Wand2 className="h-8 w-8 mb-3 text-zinc-600" />
          <p className="text-sm mb-1">No prompt generated yet</p>
          <p className="text-xs text-zinc-600">
            Click "Generate Prompt" to create a worker prompt for this task
          </p>
        </div>
      )}

      {/* Notes info */}
      {notes && !hasPrompt && (
        <div className="text-xs text-zinc-500">
          <span className="font-medium">Note:</span> This task has notes but no prepared prompt section.
        </div>
      )}
    </motion.div>
  )
}
