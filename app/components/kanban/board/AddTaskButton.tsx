"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X } from "lucide-react"

import { useBoardStore } from "../lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AddTaskButtonProps {
  columnId: string
}

export function AddTaskButton({ columnId }: AddTaskButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addTask = useBoardStore((state) => state.addTask)
  const getTasksByColumn = useBoardStore((state) => state.getTasksByColumn)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!taskTitle.trim()) return

    const tasksInColumn = getTasksByColumn(columnId)
    const newOrder = tasksInColumn.length

    addTask({
      title: taskTitle.trim(),
      columnId,
      order: newOrder,
      priority: "medium",
      labels: [],
    })

    setTaskTitle("")
    // Keep the input open for adding more tasks
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && taskTitle.trim()) {
      handleSubmit()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setTaskTitle("")
    }
  }

  const handleBlur = () => {
    // Only close if empty
    if (!taskTitle.trim()) {
      setIsAdding(false)
    }
  }

  return (
    <div className="p-2">
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.form
            key="input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit}
            className="space-y-2"
          >
            <Input
              ref={inputRef}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Enter task title..."
              className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-500 text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!taskTitle.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
              >
                Add Task
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false)
                  setTaskTitle("")
                }}
                className="text-zinc-400 hover:text-zinc-300"
              >
                <X className="size-4" />
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAdding(true)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-sm text-zinc-400 hover:text-zinc-300",
              "hover:bg-white/5 transition-colors group"
            )}
          >
            <Plus className="size-4 group-hover:text-emerald-400 transition-colors" />
            <span>Add task</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
