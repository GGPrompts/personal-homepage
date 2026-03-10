"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Heart,
  Copy,
  Check,
  Calendar,
  Bookmark,
  FileText,
  Edit2,
  X,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import type { Prompt } from "@/lib/prompts/types"
import { isTemplate, parseTemplate } from "@/lib/prompts/template"
import { PromptTemplateRenderer } from "./PromptTemplateRenderer"
import { useAuth } from "@/components/AuthProvider"
import {
  togglePromptLike,
  toggleBookmark,
  incrementUsageCount,
  isPromptLikedByUser,
  isPromptBookmarkedByUser,
} from "@/lib/prompts/interactions"
import { updatePrompt, deletePrompt } from "@/lib/prompts/database"
import { CATEGORIES } from "@/lib/prompts/categories"

interface PromptDetailModalProps {
  prompt: Prompt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (updatedPrompt: Prompt) => void
  onDelete?: (promptId: string) => void
}

export function PromptDetailModal({
  prompt,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: PromptDetailModalProps) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [filledContent, setFilledContent] = useState<string>("")
  const [editMode, setEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const copyButtonRef = useRef<HTMLButtonElement>(null)

  // Interaction state
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [interactionsLoading, setInteractionsLoading] = useState(false)

  // Edit state
  const [editedTitle, setEditedTitle] = useState("")
  const [editedContent, setEditedContent] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [editedCategory, setEditedCategory] = useState("")
  const [editedTags, setEditedTags] = useState("")
  const editContentRef = useRef<HTMLTextAreaElement>(null)

  const isOwner = useMemo(() => {
    if (!user || !prompt) return false
    return user.id === prompt.user_id
  }, [user, prompt])

  // Template field parsing for edit mode
  const editParsedTemplate = useMemo(
    () => parseTemplate(editedContent),
    [editedContent]
  )
  const editHasTemplateFields = useMemo(
    () => isTemplate(editedContent),
    [editedContent]
  )

  // Add fillable field at cursor position in edit mode
  const addEditFillableField = useCallback(() => {
    const textarea = editContentRef.current
    const existingNames = editParsedTemplate.fields.map((f) => f.id)
    const suggestions = ["input", "value", "content", "text", "details", "data"]
    let fieldName = suggestions[existingNames.length % suggestions.length]
    let counter = 1
    while (existingNames.includes(fieldName)) {
      fieldName = `${suggestions[existingNames.length % suggestions.length]}${counter}`
      counter++
    }
    const fieldSyntax = `{{${fieldName}}}`

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent =
        editedContent.slice(0, start) + fieldSyntax + editedContent.slice(end)
      setEditedContent(newContent)
      setTimeout(() => {
        textarea.focus()
        const pos = start + fieldSyntax.length
        textarea.setSelectionRange(pos, pos)
      }, 0)
    } else {
      setEditedContent(
        editedContent + (editedContent ? " " : "") + fieldSyntax
      )
    }
  }, [editedContent, editParsedTemplate.fields])

  // Load interaction state when prompt changes
  useEffect(() => {
    if (!prompt || !user || !open) return

    setLikeCount(prompt.like_count || 0)
    setInteractionsLoading(true)

    Promise.all([
      isPromptLikedByUser(prompt.id, user.id),
      isPromptBookmarkedByUser(prompt.id, user.id),
    ])
      .then(([liked, bookmarked]) => {
        setIsLiked(liked)
        setIsBookmarked(bookmarked)
      })
      .catch((err) => console.error("Failed to load interactions:", err))
      .finally(() => setInteractionsLoading(false))
  }, [prompt, user, open])

  // Reset edit state when prompt changes
  useEffect(() => {
    if (prompt) {
      setEditedTitle(prompt.title)
      setEditedContent(prompt.content)
      setEditedDescription(prompt.description || "")
      setEditedCategory(prompt.category || "")
      setEditedTags(prompt.tags?.join(", ") || "")
    }
  }, [prompt])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setEditMode(false)
      setIsExpanded(false)
    }
  }, [open])

  const promptIsTemplate = useMemo(() => {
    if (!prompt) return false
    return prompt.is_template || isTemplate(prompt.content)
  }, [prompt])

  const fieldCount = useMemo(() => {
    if (!prompt || !promptIsTemplate) return 0
    return parseTemplate(prompt.content).fields.length
  }, [prompt, promptIsTemplate])

  const handleFilledContentChange = useCallback((content: string) => {
    setFilledContent(content)
  }, [])

  const getContentToCopy = useCallback(() => {
    if (!prompt) return ""
    if (promptIsTemplate && filledContent) return filledContent
    return prompt.content
  }, [prompt, promptIsTemplate, filledContent])

  if (!prompt) return null

  const onCopy = async () => {
    const contentToCopy = getContentToCopy()
    try {
      await navigator.clipboard.writeText(contentToCopy)
      setCopied(true)
      try {
        await incrementUsageCount(prompt.id)
      } catch {
        // ignore tracking errors
      }
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  const onLikeClick = async () => {
    if (!user) return
    const prev = isLiked
    const prevCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)

    try {
      const result = await togglePromptLike(prompt.id, user.id)
      setIsLiked(result.liked)
      setLikeCount(result.newCount)
    } catch {
      setIsLiked(prev)
      setLikeCount(prevCount)
    }
  }

  const onBookmarkClick = async () => {
    if (!user) return
    const prev = isBookmarked
    setIsBookmarked(!isBookmarked)

    try {
      const result = await toggleBookmark(prompt.id, user.id)
      setIsBookmarked(result)
    } catch {
      setIsBookmarked(prev)
    }
  }

  const handleSave = async () => {
    if (!prompt || !user) return
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast.error("Title and content are required")
      return
    }
    if (!editedCategory) {
      toast.error("Please select a category")
      return
    }

    setIsSaving(true)
    const tags = editedTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const updatedPrompt = await updatePrompt(
        prompt.id,
        {
          title: editedTitle.trim(),
          content: editedContent.trim(),
          description: editedDescription.trim() || null,
          category: editedCategory,
          tags,
        },
        user.id
      )
      toast.success("Prompt updated")
      onUpdate?.(updatedPrompt)
      setEditMode(false)
    } catch (error) {
      console.error("Failed to update prompt:", error)
      toast.error("Failed to update prompt")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!prompt || !user) return
    setIsDeleting(true)

    try {
      await deletePrompt(prompt.id, user.id)
      toast.success("Prompt deleted")
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onDelete?.(prompt.id)
    } catch (error) {
      console.error("Failed to delete prompt:", error)
      toast.error("Failed to delete prompt")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[95vw] h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        data-tabz-region="prompt-detail"
      >
        {/* Header */}
        <DialogHeader
          className={`px-6 py-4 border-b border-border/50 shrink-0 transition-all duration-200 ${isExpanded ? "py-3" : ""}`}
        >
          {editMode ? (
            <div className="space-y-3 pr-8">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Prompt title..."
                className="text-xl font-semibold"
              />
              <Input
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Brief description..."
              />
              <div className="flex gap-3">
                <Select
                  value={editedCategory}
                  onValueChange={setEditedCategory}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={editedTags}
                  onChange={(e) => setEditedTags(e.target.value)}
                  placeholder="Tags (comma-separated)..."
                  className="flex-1"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="space-y-2">
                  <DialogTitle className="text-xl">
                    {prompt.title}
                  </DialogTitle>
                  {!isExpanded && (
                    <div className="flex flex-wrap gap-2">
                      {prompt.category && (
                        <Badge variant="secondary">{prompt.category}</Badge>
                      )}
                      {promptIsTemplate && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-primary/50 text-primary"
                        >
                          <FileText className="h-3 w-3" />
                          Template ({fieldCount}{" "}
                          {fieldCount === 1 ? "field" : "fields"})
                        </Badge>
                      )}
                      {prompt.tags &&
                        prompt.tags.length > 0 &&
                        prompt.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              {!isExpanded && prompt.description && (
                <DialogDescription className="text-left pt-2">
                  {prompt.description}
                </DialogDescription>
              )}
            </>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col min-h-0">
          <div className="flex flex-col flex-1 gap-4 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                {promptIsTemplate
                  ? "Fill in the fields below"
                  : "Prompt Content"}
              </span>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Collapse" : "Expand prompt area"}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  ref={copyButtonRef}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={onCopy}
                  data-tabz-action="copy"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {promptIsTemplate ? "Copy Filled" : "Copy"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div
              className={`glass rounded-lg p-4 border border-border/50 ${editMode ? "flex-1 flex flex-col min-h-0 gap-3" : "flex-1 min-h-[200px] overflow-y-auto"}`}
            >
              {editMode ? (
                <>
                  <div className="flex items-center justify-between shrink-0">
                    <p className="text-xs text-muted-foreground">
                      Use{" "}
                      <code className="px-1 py-0.5 rounded bg-muted text-[11px]">
                        {"{{fieldName}}"}
                      </code>{" "}
                      for template variables
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEditFillableField}
                      className="h-7 text-xs gap-1"
                      data-tabz-action="add-template-field"
                    >
                      <Plus className="w-3 h-3" />
                      Add Field
                    </Button>
                  </div>
                  <Textarea
                    ref={editContentRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Write your prompt here..."
                    className="flex-1 font-mono text-sm resize-none border-0 p-0 focus-visible:ring-0 min-h-0"
                  />
                  {editHasTemplateFields && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        Template fields:
                      </span>
                      {editParsedTemplate.fields.map((field) => (
                        <Badge
                          key={field.id}
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {field.name}
                          {field.hint && (
                            <span className="ml-1 text-muted-foreground">
                              ({field.hint})
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              ) : promptIsTemplate ? (
                <PromptTemplateRenderer
                  content={prompt.content}
                  onFilledContentChange={handleFilledContentChange}
                  onTabOut={() => copyButtonRef.current?.focus()}
                />
              ) : (
                <div className="font-mono text-sm whitespace-pre-wrap break-words text-foreground">
                  {prompt.content}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
          <div className="flex items-center justify-between w-full flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{prompt.username || "Anonymous"}</span>
              <span className="text-border">|</span>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(prompt.created_at)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={onLikeClick}
                disabled={interactionsLoading || !user}
              >
                <Heart
                  className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
                />
                {likeCount}
              </Button>

              <Button
                variant={isBookmarked ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={onBookmarkClick}
                disabled={interactionsLoading || !user}
              >
                <Bookmark
                  className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`}
                />
                <span className="sr-only">
                  {isBookmarked ? "Remove bookmark" : "Save prompt"}
                </span>
              </Button>

              {isOwner && (
                <>
                  {editMode ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setEditMode(false)
                          setEditedTitle(prompt.title)
                          setEditedContent(prompt.content)
                          setEditedDescription(prompt.description || "")
                          setEditedCategory(prompt.category || "")
                          setEditedTags(prompt.tags?.join(", ") || "")
                        }}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setEditMode(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogFooter>

        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{prompt.title}&quot;? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
