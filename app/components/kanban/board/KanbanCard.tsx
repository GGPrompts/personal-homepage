"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion, AnimatePresence } from "framer-motion"
import {
  GripVertical,
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  Unlock,
  CheckCircle2,
  Link,
  Zap,
  FileText,
  Calendar,
  MessageSquare,
  Clock,
  TestTube2,
  Eye,
  Code2,
  FileCheck,
  Hammer,
  Shield,
  Wand2,
  Loader2,
  Save,
  X,
  RefreshCw,
} from "lucide-react"
import { Task, PRIORITY_COLORS } from "../types"
import { useBoardStore } from "../lib/store"
import { useGraphMetricsContextSafe } from "../contexts/GraphMetricsContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  usePromptGeneration,
  extractPromptFromNotes,
  PROMPT_SECTION_HEADER,
} from "@/hooks/usePromptGeneration"
import { useWorkerStatusContextSafe } from "../contexts/WorkerStatusContext"
import { WorkerStatusBadge } from "./WorkerStatusBadge"

/**
 * Gate label configuration - maps gate: prefixed labels to icons and display names
 */
const GATE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>, label: string, color: string }> = {
  'test-runner': { icon: TestTube2, label: 'Tests', color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' },
  'visual-qa': { icon: Eye, label: 'Visual', color: 'bg-violet-500/15 border-violet-500/30 text-violet-400' },
  'codex-review': { icon: Code2, label: 'Review', color: 'bg-amber-500/15 border-amber-500/30 text-amber-400' },
  'docs-check': { icon: FileCheck, label: 'Docs', color: 'bg-purple-500/15 border-purple-500/30 text-purple-400' },
  'build': { icon: Hammer, label: 'Build', color: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
  'security': { icon: Shield, label: 'Security', color: 'bg-red-500/15 border-red-500/30 text-red-400' },
}

/**
 * Format duration between two dates in a human-readable format
 */
function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return ''

  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
  if (hours > 0) {
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }
  return `${minutes}m`
}

interface KanbanCardProps {
  task: Task
  isOverlay?: boolean
  /** Whether task is in the Done column (closed tasks) */
  isDoneColumn?: boolean
  /** Whether to show worker status badge (for in-progress column) */
  showWorkerStatus?: boolean
  /** Whether this task has a transcript available */
  hasTranscript?: boolean
  /** Workspace path for beads API calls */
  workspace?: string
  /** Initial notes from beads (for detecting existing prompts) */
  initialNotes?: string
}

export function KanbanCard({
  task,
  isOverlay = false,
  isDoneColumn = false,
  showWorkerStatus = false,
  hasTranscript = false,
  workspace,
  initialNotes,
}: KanbanCardProps) {
  const setSelectedTask = useBoardStore((state) => state.setSelectedTask)
  const graphMetrics = useGraphMetricsContextSafe()
  const workerStatusContext = useWorkerStatusContextSafe()

  // Get worker for this task if showing worker status
  const worker = showWorkerStatus && workerStatusContext
    ? workerStatusContext.getWorkerForIssue(task.id)
    : undefined

  // Get graph-computed metrics for this task
  const taskMetrics = graphMetrics?.getMetrics(task.id)

  // Prompt generation state
  const [isEditingPrompt, setIsEditingPrompt] = React.useState(false)
  const [promptDraft, setPromptDraft] = React.useState("")
  const [savedPrompt, setSavedPrompt] = React.useState<string | null>(() =>
    extractPromptFromNotes(initialNotes)
  )
  const [currentNotes, setCurrentNotes] = React.useState(initialNotes || "")
  const [showRegenerateConfirm, setShowRegenerateConfirm] = React.useState(false)

  const {
    generatePrompt,
    savePrompt,
    isGenerating,
    isSaving,
    error: promptError,
    clearError,
  } = usePromptGeneration({ workspace })

  // Check if task has a saved prompt
  const hasPrompt = savedPrompt !== null

  // Handle generate prompt click
  const handleGenerateClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      clearError()

      // If already has prompt, show confirmation
      if (hasPrompt && !showRegenerateConfirm) {
        setShowRegenerateConfirm(true)
        return
      }

      setShowRegenerateConfirm(false)

      // First, fetch current notes if we don't have them
      if (!currentNotes && workspace) {
        try {
          const res = await fetch(
            `/api/beads/issues/${encodeURIComponent(task.id)}?workspace=${encodeURIComponent(workspace)}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.issue?.notes) {
              setCurrentNotes(data.issue.notes)
            }
          }
        } catch {
          // Continue even if fetch fails
        }
      }

      const prompt = await generatePrompt(task.id)
      if (prompt) {
        setPromptDraft(prompt)
        setIsEditingPrompt(true)
      }
    },
    [
      task.id,
      hasPrompt,
      showRegenerateConfirm,
      currentNotes,
      workspace,
      generatePrompt,
      clearError,
    ]
  )

  // Handle save prompt
  const handleSavePrompt = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      const success = await savePrompt(task.id, promptDraft, currentNotes)
      if (success) {
        setSavedPrompt(promptDraft)
        setIsEditingPrompt(false)
        // Update current notes with the new prompt
        const headerIndex = currentNotes.indexOf(PROMPT_SECTION_HEADER)
        if (headerIndex === -1) {
          setCurrentNotes(
            currentNotes.trim()
              ? `${currentNotes.trim()}\n\n${PROMPT_SECTION_HEADER}\n\n${promptDraft.trim()}`
              : `${PROMPT_SECTION_HEADER}\n\n${promptDraft.trim()}`
          )
        }
      }
    },
    [task.id, promptDraft, currentNotes, savePrompt]
  )

  // Handle cancel edit
  const handleCancelEdit = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingPrompt(false)
    setPromptDraft("")
    setShowRegenerateConfirm(false)
  }, [])

  // Handle edit existing prompt
  const handleEditPrompt = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (savedPrompt) {
        setPromptDraft(savedPrompt)
        setIsEditingPrompt(true)
      }
    },
    [savedPrompt]
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return
    if ((e.target as HTMLElement).closest("[data-drag-handle]")) return
    setSelectedTask(task.id)
  }

  // Dependency state - prefer graph metrics when available
  const hasBlockers = taskMetrics ? taskMetrics.inDegree > 0 : (task.blockedBy && task.blockedBy.length > 0)
  const blocksOthers = taskMetrics ? taskMetrics.outDegree > 0 : (task.blocking && task.blocking.length > 0)
  const hasReadyLabel = task.labels?.includes('ready') ?? false
  const isCriticalPath = taskMetrics?.isCriticalPath ?? task.criticalPath

  // Graph-computed metrics for enhanced badges
  const unblockCount = taskMetrics?.unblockCount ?? 0
  const impactScore = taskMetrics?.impactScore ?? 0
  const blockerCount = task.blockedBy?.length ?? 0
  const effectiveUnblockCount = unblockCount > 0 ? unblockCount : (task.blocking?.length ?? 0)
  const showHighImpact = impactScore >= 25

  // Done column metadata
  const closeReason = task.beadsMetadata?.closeReason
  const closedAt = task.beadsMetadata?.closedAt ?? task.updatedAt
  const duration = closedAt && task.createdAt ? formatDuration(task.createdAt, closedAt) : null

  // Gate labels - filter labels starting with "gate:" and map to config
  const gateLabels = (task.labels ?? [])
    .filter(label => label.startsWith('gate:'))
    .map(label => {
      const gateName = label.replace('gate:', '')
      return { name: gateName, config: GATE_CONFIG[gateName] }
    })
    .filter(gate => gate.config) // Only show gates with known config

  // Non-gate labels for regular display
  const regularLabels = (task.labels ?? []).filter(label => !label.startsWith('gate:'))

  // Render overlay version (shown during drag)
  if (isOverlay) {
    return (
      <div className="kanban-card p-3 border-glow opacity-90 rotate-3">
        <h4 className="text-sm font-medium text-zinc-100 leading-tight mb-2 line-clamp-2">
          {task.title}
        </h4>
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      data-tabz-item={`task-${task.id}`}
      data-critical-path={isCriticalPath}
      data-blocked={hasBlockers}
      data-ready={hasReadyLabel}
      className={cn(
        "kanban-card group relative p-3",
        isDragging && "opacity-50 scale-[1.02] border-glow",
        hasBlockers && "ring-1 ring-red-500/30 border-red-500/20",
        isCriticalPath && "critical-path-glow",
        hasReadyLabel && !hasBlockers && !isDoneColumn && "ring-1 ring-cyan-500/20 border-cyan-500/10",
        isDoneColumn && "opacity-80"
      )}
      onClick={handleClick}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        data-drag-handle
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="pl-4">
        {/* Dependency indicators row */}
        {!isDoneColumn && (hasBlockers || effectiveUnblockCount > 0 || isCriticalPath || hasReadyLabel || showHighImpact) && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {hasBlockers && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-[10px] font-medium text-red-400 mono">
                  Blocked by {blockerCount}
                </span>
              </div>
            )}

            {effectiveUnblockCount > 0 && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                effectiveUnblockCount >= 3
                  ? "bg-orange-500/15 border-orange-500/30"
                  : "bg-amber-500/15 border-amber-500/30"
              )}>
                <Unlock className={cn(
                  "h-3 w-3",
                  effectiveUnblockCount >= 3 ? "text-orange-400" : "text-amber-400"
                )} />
                <span className={cn(
                  "text-[10px] font-medium mono",
                  effectiveUnblockCount >= 3 ? "text-orange-400" : "text-amber-400"
                )}>
                  Unblocks {effectiveUnblockCount}
                </span>
              </div>
            )}

            {isCriticalPath && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                <Link className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-400 mono">Critical</span>
              </div>
            )}

            {hasReadyLabel && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-400 mono">Ready</span>
              </div>
            )}

            {showHighImpact && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                impactScore >= 50
                  ? "bg-rose-500/15 border-rose-500/30"
                  : "bg-pink-500/15 border-pink-500/30"
              )}>
                <Zap className={cn(
                  "h-3 w-3",
                  impactScore >= 50 ? "text-rose-400" : "text-pink-400"
                )} />
                <span className={cn(
                  "text-[10px] font-medium mono",
                  impactScore >= 50 ? "text-rose-400" : "text-pink-400"
                )}>
                  {impactScore >= 50 ? 'Critical Impact' : 'High Impact'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Worker status badge for in-progress tasks */}
        {showWorkerStatus && worker && (
          <div className="mb-2">
            <WorkerStatusBadge worker={worker} />
          </div>
        )}

        {/* No worker indicator for in-progress tasks without active worker */}
        {showWorkerStatus && !worker && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-500/15 border border-zinc-500/30">
              <Clock className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-400 mono">
                No worker
              </span>
            </div>
          </div>
        )}

        {/* Done column: completed badge with metadata */}
        {isDoneColumn && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-[10px] font-medium text-green-400 mono">Completed</span>
            </div>
            {duration && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                <Clock className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400 mono">{duration}</span>
              </div>
            )}
            {hasTranscript && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 cursor-pointer hover:bg-violet-500/25 transition-colors"
                title="View transcript in task details"
              >
                <FileText className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] font-medium text-violet-400 mono">Transcript</span>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <h4 className="text-sm font-medium text-zinc-100 leading-tight mb-2 line-clamp-2">
          {task.title}
        </h4>

        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority badge */}
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded text-white uppercase tracking-wide mono",
              PRIORITY_COLORS[task.priority]
            )}
          >
            {task.priority}
          </span>

          {/* Issue type badge */}
          {task.beadsMetadata?.type && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border-white/10 text-zinc-400"
            >
              {task.beadsMetadata.type}
            </Badge>
          )}

          {/* Labels (excluding gate: labels) */}
          {regularLabels.slice(0, 2).map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border-white/10 text-zinc-400"
            >
              {label}
            </Badge>
          ))}
          {regularLabels.length > 2 && (
            <span className="text-[10px] text-zinc-500">
              +{regularLabels.length - 2}
            </span>
          )}
        </div>

        {/* Gate labels */}
        {gateLabels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {gateLabels.map(({ name, config }) => {
              const IconComponent = config.icon
              return (
                <div
                  key={name}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                    config.color
                  )}
                  title={`Gate: ${name}`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span className="text-[10px] font-medium mono">{config.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Git indicator */}
        {task.git?.branch && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
            <GitBranch className="h-3 w-3" />
            <span className="truncate max-w-24 mono text-[10px]">{task.git.branch}</span>
            {task.git.prNumber && (
              <div className="flex items-center gap-1 ml-auto">
                <GitPullRequest className="h-3 w-3" />
                <span className="text-zinc-400 mono text-[10px]">#{task.git.prNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Close reason for done tasks */}
        {isDoneColumn && closeReason && (
          <div className="mt-2 pt-2 border-t border-zinc-800/50">
            <div className="flex items-start gap-1.5">
              <MessageSquare className="h-3 w-3 text-zinc-300 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-300 line-clamp-2">{closeReason}</p>
            </div>
          </div>
        )}

        {/* Completion date for done tasks */}
        {isDoneColumn && closedAt && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-600">
            <Calendar className="h-3 w-3" />
            <span className="mono" suppressHydrationWarning>
              {closedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: closedAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </span>
          </div>
        )}

        {/* Estimate */}
        {task.estimate && !isDoneColumn && (
          <div className="text-[10px] text-zinc-600 mt-1.5 mono">
            Est: {task.estimate}
          </div>
        )}

        {/* Prompt Generation UI - hidden in done column and overlays */}
        {!isDoneColumn && !isOverlay && (
          <div className="mt-2">
            {/* Inline Prompt Editor */}
            <AnimatePresence mode="wait">
              {isEditingPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="border border-zinc-700/50 rounded-md bg-zinc-900/50 p-2"
                  onClick={(e) => e.stopPropagation()}
                  data-tabz-region="prompt-editor"
                >
                  <textarea
                    value={promptDraft}
                    onChange={(e) => setPromptDraft(e.target.value)}
                    className="w-full h-24 text-xs bg-transparent text-zinc-200 border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-zinc-600 mono"
                    placeholder="Generated prompt will appear here..."
                    data-tabz-input="prompt-editor"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                    {promptError && (
                      <span className="text-[10px] text-red-400 truncate max-w-[60%]">
                        {promptError}
                      </span>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="h-6 px-2 text-[10px] text-zinc-400 hover:text-zinc-200"
                        data-tabz-action="cancel-prompt"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleSavePrompt}
                        disabled={isSaving || !promptDraft.trim()}
                        className="h-6 px-2 text-[10px] bg-cyan-600 hover:bg-cyan-500"
                        data-tabz-action="save-prompt"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Regenerate Confirmation */}
            <AnimatePresence mode="wait">
              {showRegenerateConfirm && !isEditingPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center gap-2 p-2 mt-1 border border-amber-500/30 rounded-md bg-amber-500/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] text-amber-400">
                    Regenerate? Existing prompt will be replaced.
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowRegenerateConfirm(false)
                      }}
                      className="h-5 px-2 text-[10px] text-zinc-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleGenerateClick}
                      disabled={isGenerating}
                      className="h-5 px-2 text-[10px] bg-amber-600 hover:bg-amber-500"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Regenerate"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt Status / Generate Button */}
            {!isEditingPrompt && !showRegenerateConfirm && (
              <div className="flex items-center gap-1.5 mt-1">
                {hasPrompt ? (
                  // Has saved prompt - show indicator and edit/regenerate buttons
                  <>
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/25 transition-colors"
                      onClick={handleEditPrompt}
                      title="Click to edit prompt"
                      data-tabz-action="edit-prompt"
                    >
                      <FileText className="h-3 w-3 text-cyan-400" />
                      <span className="text-[10px] font-medium text-cyan-400 mono">
                        Has Prompt
                      </span>
                    </div>
                    <button
                      onClick={handleGenerateClick}
                      disabled={isGenerating}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-700/50"
                      title="Regenerate prompt"
                      data-tabz-action="regenerate-prompt"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 text-zinc-400 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
                      )}
                    </button>
                  </>
                ) : (
                  // No prompt - show generate button on hover
                  <button
                    onClick={handleGenerateClick}
                    disabled={isGenerating}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 hover:border-zinc-600/50"
                    title="Generate worker prompt"
                    data-tabz-action="generate-prompt"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
                        <span className="text-[10px] text-zinc-400 mono">
                          Generating...
                        </span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3 text-violet-400" />
                        <span className="text-[10px] text-zinc-400 mono">
                          Generate Prompt
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
