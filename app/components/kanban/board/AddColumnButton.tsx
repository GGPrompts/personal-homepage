"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Inbox,
  Sparkles,
  Puzzle,
  GitBranch,
  Code2,
  Eye,
  FileText,
  GitPullRequest,
  CheckCircle2,
  Layers,
} from "lucide-react"

import { useBoardStore } from "../lib/store"
import { COLUMN_COLORS, WORKFLOW_STEP_PRESETS, AgentType } from "../types"
import { cn } from "@/lib/utils"

// Explicit mappings for Tailwind to see the classes
const COLOR_BG_MAP: Record<string, string> = {
  'border-t-emerald-500': 'bg-emerald-500',
  'border-t-cyan-500': 'bg-cyan-500',
  'border-t-blue-500': 'bg-blue-500',
  'border-t-purple-500': 'bg-purple-500',
  'border-t-pink-500': 'bg-pink-500',
  'border-t-red-500': 'bg-red-500',
  'border-t-orange-500': 'bg-orange-500',
  'border-t-yellow-500': 'bg-yellow-500',
  'border-t-green-500': 'bg-green-500',
  'border-t-teal-500': 'bg-teal-500',
  'border-t-slate-500': 'bg-slate-500',
  'border-t-zinc-500': 'bg-zinc-500',
}

const COLOR_BG_LIGHT_MAP: Record<string, string> = {
  'border-t-emerald-500': 'bg-emerald-500/20',
  'border-t-cyan-500': 'bg-cyan-500/20',
  'border-t-blue-500': 'bg-blue-500/20',
  'border-t-purple-500': 'bg-purple-500/20',
  'border-t-pink-500': 'bg-pink-500/20',
  'border-t-red-500': 'bg-red-500/20',
  'border-t-orange-500': 'bg-orange-500/20',
  'border-t-yellow-500': 'bg-yellow-500/20',
  'border-t-green-500': 'bg-green-500/20',
  'border-t-teal-500': 'bg-teal-500/20',
  'border-t-slate-500': 'bg-slate-500/20',
  'border-t-zinc-500': 'bg-zinc-500/20',
}

const COLOR_BORDER_MAP: Record<string, string> = {
  'border-t-emerald-500': 'border-emerald-500',
  'border-t-cyan-500': 'border-cyan-500',
  'border-t-blue-500': 'border-blue-500',
  'border-t-purple-500': 'border-purple-500',
  'border-t-pink-500': 'border-pink-500',
  'border-t-red-500': 'border-red-500',
  'border-t-orange-500': 'border-orange-500',
  'border-t-yellow-500': 'border-yellow-500',
  'border-t-green-500': 'border-green-500',
  'border-t-teal-500': 'border-teal-500',
  'border-t-slate-500': 'border-slate-500',
  'border-t-zinc-500': 'border-zinc-500',
}

const COLOR_TEXT_MAP: Record<string, string> = {
  'border-t-emerald-500': 'text-emerald-500',
  'border-t-cyan-500': 'text-cyan-500',
  'border-t-blue-500': 'text-blue-500',
  'border-t-purple-500': 'text-purple-500',
  'border-t-pink-500': 'text-pink-500',
  'border-t-red-500': 'text-red-500',
  'border-t-orange-500': 'text-orange-500',
  'border-t-yellow-500': 'text-yellow-500',
  'border-t-green-500': 'text-green-500',
  'border-t-teal-500': 'text-teal-500',
  'border-t-slate-500': 'text-slate-500',
  'border-t-zinc-500': 'text-zinc-500',
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Inbox,
  Sparkles,
  Puzzle,
  GitBranch,
  Code2,
  Eye,
  FileText,
  GitPullRequest,
  CheckCircle2,
}

export function AddColumnButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  const [columnName, setColumnName] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLUMN_COLORS[0])
  const [systemPrompt, setSystemPrompt] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const getCurrentBoard = useBoardStore((state) => state.getCurrentBoard)
  const addColumn = useBoardStore((state) => state.addColumn)
  const updateColumn = useBoardStore((state) => state.updateColumn)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const board = getCurrentBoard()
    if (!board) return

    if (activeTab === 'presets' && selectedPreset) {
      const preset = WORKFLOW_STEP_PRESETS[selectedPreset]
      addColumn(board.id, preset.title, preset.color)

      // Get the newly created column and update it with agent config
      const updatedBoard = getCurrentBoard()
      const newColumn = updatedBoard?.columns.find(c => c.title === preset.title)
      if (newColumn && preset.agent) {
        updateColumn(board.id, newColumn.id, {
          assignedAgent: preset.agent,
          agentConfig: {
            systemPrompt: preset.prompt,
            autoStart: false,
            autoAdvance: true,
          },
        })
      }
    } else if (columnName.trim()) {
      addColumn(board.id, columnName.trim(), selectedColor)

      // If custom prompt was provided, update the column
      if (systemPrompt.trim()) {
        const updatedBoard = getCurrentBoard()
        const newColumn = updatedBoard?.columns.find(c => c.title === columnName.trim())
        if (newColumn) {
          updateColumn(board.id, newColumn.id, {
            assignedAgent: 'claude-code' as AgentType,
            agentConfig: {
              systemPrompt: systemPrompt.trim(),
              autoStart: false,
            },
          })
        }
      }
    }

    // Reset form
    setColumnName("")
    setSelectedColor(COLUMN_COLORS[0])
    setSystemPrompt("")
    setSelectedPreset(null)
    setIsOpen(false)
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="glass-dark min-w-[340px] w-[340px] h-32 flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer group transition-all hover:border-glow shrink-0"
      >
        <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
          <Plus className="size-5 text-zinc-400 group-hover:text-teal-400 transition-colors" />
        </div>
        <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
          Add Workflow Step
        </span>
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-overlay border-zinc-800 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-500" />
              Add Workflow Step
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'custom')}>
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
              <TabsTrigger value="presets" className="data-[state=active]:bg-teal-600">
                Presets
              </TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:bg-teal-600">
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Presets Tab */}
            <TabsContent value="presets" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(WORKFLOW_STEP_PRESETS).map(([key, preset]) => {
                  const Icon = ICONS[preset.icon] || Inbox
                  const bgClass = COLOR_BG_LIGHT_MAP[preset.color] || 'bg-zinc-500/20'
                  const borderClass = COLOR_BORDER_MAP[preset.color] || 'border-zinc-500'
                  const textClass = COLOR_TEXT_MAP[preset.color] || 'text-zinc-500'

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPreset(key)}
                      className={cn(
                        "p-3 rounded-lg border transition-all text-left",
                        bgClass,
                        selectedPreset === key
                          ? cn(borderClass, "ring-2 ring-offset-2 ring-offset-zinc-900 ring-teal-500")
                          : "border-transparent hover:border-zinc-700"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mb-1.5", textClass)} />
                      <div className="text-xs font-medium text-zinc-200 truncate">
                        {preset.title}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Preview selected preset */}
              {selectedPreset && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <h4 className="text-sm font-medium text-zinc-200 mb-1">
                    {WORKFLOW_STEP_PRESETS[selectedPreset].title}
                  </h4>
                  <p className="text-xs text-zinc-500 mb-2">
                    {WORKFLOW_STEP_PRESETS[selectedPreset].description}
                  </p>
                  {WORKFLOW_STEP_PRESETS[selectedPreset].prompt && (
                    <div className="p-2 rounded bg-zinc-800/50 border border-zinc-700">
                      <div className="text-[10px] uppercase text-zinc-500 mb-1">
                        Agent Prompt
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-3">
                        {WORKFLOW_STEP_PRESETS[selectedPreset].prompt}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Custom Tab */}
            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Step Name
                </label>
                <Input
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="e.g., Review, Testing, Deploy..."
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "size-7 rounded-md border-2 transition-all",
                        COLOR_BG_MAP[color] || 'bg-zinc-500',
                        selectedColor === color
                          ? "border-white scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Agent Prompt (Optional)
                </label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instructions for what the agent should do at this step..."
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 min-h-[80px] text-sm"
                />
                <p className="text-[10px] text-zinc-600">
                  This prompt will be used when Claude works on tasks in this column
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={activeTab === 'presets' ? !selectedPreset : !columnName.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white"
            >
              Add Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
