"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Calendar, Clock, MessageSquare, CheckCircle2 } from "lucide-react"
import type { Task, Priority } from "../types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TaskLabels } from "./TaskLabels"
import { PriorityBadge } from "../shared/PriorityBadge"
import { cn } from "@/lib/utils"

interface TaskDetailsFormProps {
  task: Task
  onUpdate: (updates: Partial<Task>) => void
  className?: string
}

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"]

export function TaskDetailsForm({ task, onUpdate, className }: TaskDetailsFormProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [estimate, setEstimate] = useState(task.estimate || "")
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  )
  const [labels, setLabels] = useState<string[]>(task.labels)

  // Update local state when task changes
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description || "")
    setPriority(task.priority)
    setEstimate(task.estimate || "")
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
    setLabels(task.labels)
  }, [task])

  // Debounced update for text fields
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title !== task.title) {
        onUpdate({ title })
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [title, task.title, onUpdate])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (description !== (task.description || "")) {
        onUpdate({ description })
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [description, task.description, onUpdate])

  const handlePriorityChange = (value: Priority) => {
    setPriority(value)
    onUpdate({ priority: value })
  }

  const handleEstimateChange = (value: string) => {
    setEstimate(value)
    onUpdate({ estimate: value || undefined })
  }

  const handleDueDateChange = (value: string) => {
    setDueDate(value)
    onUpdate({ dueDate: value ? new Date(value) : undefined })
  }

  const handleLabelsChange = (newLabels: string[]) => {
    setLabels(newLabels)
    onUpdate({ labels: newLabels })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-6", className)}
    >
      {/* Title */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-black/20 border-white/10 focus:border-emerald-500/50 text-zinc-100"
          placeholder="Task title..."
          data-tabz-input="task-title"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-black/20 border-white/10 focus:border-emerald-500/50 text-zinc-100 min-h-[200px] max-h-[400px] resize-y"
          placeholder="Add a description..."
          data-tabz-input="task-description"
        />
      </div>

      {/* Priority & Estimate row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Priority</label>
          <Select value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="bg-black/20 border-white/10 focus:border-emerald-500/50" data-tabz-input="task-priority">
              <SelectValue>
                <PriorityBadge priority={priority} size="sm" />
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="hover:bg-white/5">
                  <PriorityBadge priority={p} size="sm" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estimate */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Estimate
          </label>
          <Input
            value={estimate}
            onChange={(e) => handleEstimateChange(e.target.value)}
            className="bg-black/20 border-white/10 focus:border-emerald-500/50 text-zinc-100"
            placeholder="e.g., 2h, 1d"
          />
        </div>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Due Date
        </label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => handleDueDateChange(e.target.value)}
          className="bg-black/20 border-white/10 focus:border-emerald-500/50 text-zinc-100"
        />
      </div>

      {/* Labels */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Labels</label>
        <TaskLabels labels={labels} onChange={handleLabelsChange} />
      </div>

      {/* Close reason for completed tasks */}
      {task.beadsMetadata?.closeReason && (
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completion Summary
          </label>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {task.beadsMetadata.closeReason}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
