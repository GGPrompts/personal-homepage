'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useBoardStore } from '../lib/store'
import { Trash2, FolderOpen } from 'lucide-react'

interface BoardSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BoardSettingsDialog({ open, onOpenChange }: BoardSettingsDialogProps) {
  const { getCurrentBoard, updateBoard, deleteBoard, boards, setCurrentBoard } = useBoardStore()
  const board = getCurrentBoard()

  const [name, setName] = useState(board?.name || '')
  const [description, setDescription] = useState(board?.description || '')
  const [projectPath, setProjectPath] = useState(board?.settings?.projectPath || '')
  const [showEstimates, setShowEstimates] = useState(board?.settings?.showEstimates ?? true)
  const [showAgentStatus, setShowAgentStatus] = useState(board?.settings?.showAgentStatus ?? true)

  if (!board) return null

  const handleSave = () => {
    updateBoard(board.id, {
      name,
      description,
      settings: {
        ...board.settings,
        projectPath,
        showEstimates,
        showAgentStatus,
      },
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (boards.length <= 1) {
      alert('Cannot delete the last board')
      return
    }
    if (confirm(`Delete "${board.name}"? This cannot be undone.`)) {
      deleteBoard(board.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-overlay border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Board Settings</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Configure your workflow board
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Board Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-400 text-xs uppercase tracking-wide">
              Board Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
              placeholder="My Workflow"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-400 text-xs uppercase tracking-wide">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
              placeholder="Optional description"
            />
          </div>

          {/* Project Path */}
          <div className="space-y-2">
            <Label htmlFor="projectPath" className="text-zinc-400 text-xs uppercase tracking-wide">
              Project Directory
            </Label>
            <div className="flex gap-2">
              <Input
                id="projectPath"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 mono text-sm flex-1"
                placeholder="~/projects/my-app"
              />
              <Button variant="outline" size="icon" className="border-zinc-700 shrink-0">
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-zinc-600">
              Working directory for agent tasks
            </p>
          </div>

          {/* Display Options */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <Label className="text-zinc-400 text-xs uppercase tracking-wide">
              Display Options
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="showEstimates" className="text-zinc-300 text-sm">
                Show time estimates
              </Label>
              <Switch
                id="showEstimates"
                checked={showEstimates}
                onCheckedChange={setShowEstimates}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showAgentStatus" className="text-zinc-300 text-sm">
                Show agent status on cards
              </Label>
              <Switch
                id="showAgentStatus"
                checked={showAgentStatus}
                onCheckedChange={setShowAgentStatus}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Board
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
