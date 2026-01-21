"use client"

import * as React from "react"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  PanelConfig,
  SavedComponent,
  ComponentFile,
  AgentConfig,
} from "@/lib/prompts-playground"
import { generateId, getLanguageFromPath } from "@/lib/prompts-playground"

interface SaveComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  panelConfig: PanelConfig | null
  currentPrompt: string
  onSave: (component: SavedComponent) => void
}

export function SaveComponentDialog({
  open,
  onOpenChange,
  panelConfig,
  currentPrompt,
  onSave,
}: SaveComponentDialogProps) {
  const [name, setName] = React.useState("")
  const [prompt, setPrompt] = React.useState(currentPrompt)
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [files, setFiles] = React.useState<ComponentFile[]>([])
  const [agentConfig, setAgentConfig] = React.useState<AgentConfig>({
    cli: "claude",
    model: "",
  })

  // Reset form when dialog opens with new panel config
  React.useEffect(() => {
    if (open && panelConfig) {
      setName("")
      setPrompt(currentPrompt)
      setTags([])
      setNotes("")
      setFiles([])
      setAgentConfig(
        panelConfig.agentConfig || { cli: "claude", model: "" }
      )
    }
  }, [open, panelConfig, currentPrompt])

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const addFile = () => {
    setFiles([
      ...files,
      { path: "", content: "", language: "typescript" },
    ])
  }

  const updateFile = (
    index: number,
    field: keyof ComponentFile,
    value: string
  ) => {
    const updated = [...files]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "path") {
      updated[index].language = getLanguageFromPath(value)
    }
    setFiles(updated)
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!name.trim()) return

    const component: SavedComponent = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      prompt,
      agentConfig,
      files,
      tags,
      notes: notes.trim() || undefined,
      panelLabel: panelConfig?.label,
    }

    onSave(component)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Component</DialogTitle>
          <DialogDescription>
            Save this component to your library for future reference or reuse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Component Name */}
          <div className="space-y-2">
            <Label>Component Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Login Form v2"
              autoFocus
            />
          </div>

          {/* Agent Config */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>CLI</Label>
              <Select
                value={agentConfig.cli}
                onValueChange={(v) =>
                  setAgentConfig({ ...agentConfig, cli: v as "claude" | "codex" | "gemini" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="codex">Codex</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={agentConfig.model}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, model: e.target.value })
                }
                placeholder="e.g., opus"
              />
            </div>

            <div className="space-y-2">
              <Label>Agent</Label>
              <Input
                value={agentConfig.agent || ""}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, agent: e.target.value })
                }
                placeholder="e.g., coder"
              />
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="The prompt used to generate this component..."
              className="h-24 font-mono text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Files */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Files</Label>
              <Button variant="outline" size="sm" onClick={addFile}>
                <Plus className="h-4 w-4 mr-1" />
                Add File
              </Button>
            </div>

            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No files added. Click "Add File" to include source files.
              </p>
            ) : (
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="border border-border/20 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={file.path}
                        onChange={(e) => updateFile(index, "path", e.target.value)}
                        placeholder="components/LoginForm.tsx"
                        className="flex-1 text-sm font-mono"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      value={file.content}
                      onChange={(e) => updateFile(index, "content", e.target.value)}
                      placeholder="Paste file content here..."
                      className="h-32 font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this component..."
              className="h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
