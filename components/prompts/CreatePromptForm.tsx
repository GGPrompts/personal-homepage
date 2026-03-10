"use client"

import { useState, useRef, useCallback, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORIES } from "@/lib/prompts/categories"
import { parseTemplate, isTemplate } from "@/lib/prompts/template"
import {
  createPrompt,
  updatePrompt,
  validatePromptData,
} from "@/lib/prompts/database"
import { useAuth } from "@/components/AuthProvider"
import { toast } from "sonner"
import { Plus, Loader2, Sparkles, AlertCircle, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Prompt, CreatePromptInput, UpdatePromptInput } from "@/lib/prompts/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  title: string
  description: string
  category: string
  content: string
  tags: string
  attribution_url: string
  attribution_text: string
}

interface FormErrors {
  title?: string
  description?: string
  category?: string
  content?: string
  tags?: string
  attribution_url?: string
  attribution_text?: string
  general?: string
}

interface CreatePromptFormProps {
  /** When set, the form operates in edit mode for an existing prompt */
  prompt?: Prompt | null
  /** Called after a successful create or update */
  onSuccess?: (prompt: Prompt) => void
  /** Called when the user cancels */
  onCancel?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatePromptForm({
  prompt,
  onSuccess,
  onCancel,
}: CreatePromptFormProps) {
  const { user } = useAuth()
  const [isPending, startTransition] = useTransition()
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const isEditMode = !!prompt

  const [formData, setFormData] = useState<FormData>({
    title: prompt?.title ?? "",
    description: prompt?.description ?? "",
    category: prompt?.category ?? "",
    content: prompt?.content ?? "",
    tags: prompt?.tags?.join(", ") ?? "",
    attribution_url: prompt?.attribution_url ?? "",
    attribution_text: prompt?.attribution_text ?? "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  // Parse template fields from content
  const parsedTemplate = parseTemplate(formData.content)
  const hasTemplateFields = isTemplate(formData.content)

  // Handle input changes
  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors]
  )

  // Mark field as touched on blur
  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => new Set(prev).add(field))
  }, [])

  // Smart field name suggestion based on cursor context
  const getContextualFieldName = useCallback((): string => {
    const textarea = contentTextareaRef.current
    if (!textarea) return "field"

    const start = textarea.selectionStart
    const content = formData.content

    // Get surrounding text for context
    const beforeCursor = content
      .slice(Math.max(0, start - 50), start)
      .toLowerCase()
    const afterCursor = content
      .slice(start, Math.min(content.length, start + 50))
      .toLowerCase()

    // Smart naming based on context
    const contextPatterns: [string[], string][] = [
      [["name", "person", "who"], "name"],
      [["topic", "subject", "about"], "topic"],
      [["style", "manner", "way"], "style"],
      [["type", "kind", "sort"], "type"],
      [["format", "structure"], "format"],
      [["length", "words", "characters"], "length"],
      [["audience", "reader", "viewer"], "audience"],
      [["tone", "voice", "mood"], "tone"],
      [["goal", "objective", "purpose"], "goal"],
      [["company", "business", "organization"], "company"],
      [["product", "service", "item"], "product"],
      [["language", "lang"], "language"],
      [["context", "background"], "context"],
      [["example", "sample"], "example"],
      [["instructions", "steps"], "instructions"],
    ]

    for (const [patterns, name] of contextPatterns) {
      for (const pattern of patterns) {
        if (beforeCursor.includes(pattern) || afterCursor.includes(pattern)) {
          return name
        }
      }
    }

    // Default suggestions
    const fieldCount = parsedTemplate.fields.length + 1
    const suggestions = [
      "input",
      "value",
      "content",
      "text",
      "details",
      "data",
    ]
    return suggestions[(fieldCount - 1) % suggestions.length]
  }, [formData.content, parsedTemplate.fields.length])

  // Add fillable field at cursor position
  const addFillableField = useCallback(() => {
    const textarea = contentTextareaRef.current
    let contextualName = getContextualFieldName()

    // Ensure uniqueness by adding a number if name exists
    const existingFieldNames = parsedTemplate.fields.map((f) => f.id)
    let finalFieldName = contextualName
    let counter = 1
    while (existingFieldNames.includes(finalFieldName)) {
      finalFieldName = `${contextualName}${counter}`
      counter++
    }

    const fieldSyntax = `{{${finalFieldName}}}`

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentContent = formData.content

      // Insert field at cursor position
      const newContent =
        currentContent.slice(0, start) +
        fieldSyntax +
        currentContent.slice(end)
      handleChange("content", newContent)

      // Set cursor position after the inserted field
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + fieldSyntax.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    } else {
      // Fallback: add to end
      const newContent =
        formData.content + (formData.content ? " " : "") + fieldSyntax
      handleChange("content", newContent)
    }
  }, [
    formData.content,
    getContextualFieldName,
    handleChange,
    parsedTemplate.fields,
  ])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const validation = validatePromptData({
      title: formData.title,
      content: formData.content,
      category: formData.category,
      description: formData.description,
      attribution_url: formData.attribution_url || undefined,
    })

    if (!validation.valid) {
      const newErrors: FormErrors = {}
      for (const error of validation.errors) {
        if (error.includes("Title")) newErrors.title = error
        else if (error.includes("Content")) newErrors.content = error
        else if (error.includes("Category")) newErrors.category = error
        else if (error.includes("Description")) newErrors.description = error
        else if (error.includes("URL")) newErrors.attribution_url = error
        else newErrors.general = error
      }
      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }, [formData])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("You must be logged in to save a prompt")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    startTransition(async () => {
      try {
        // Parse tags from comma-separated string
        const tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)

        let result: Prompt

        if (isEditMode && prompt) {
          // Update existing prompt
          const updateData: UpdatePromptInput = {
            title: formData.title.trim(),
            content: formData.content.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            tags,
            attribution_url: formData.attribution_url.trim() || null,
            attribution_text: formData.attribution_text.trim() || null,
          }
          result = await updatePrompt(prompt.id, updateData, user.id)
          toast.success("Prompt updated successfully!")
        } else {
          // Create new prompt
          const createData: CreatePromptInput = {
            title: formData.title.trim(),
            content: formData.content.trim(),
            description: formData.description.trim() || undefined,
            category: formData.category,
            tags,
            attribution_url: formData.attribution_url.trim() || undefined,
            attribution_text: formData.attribution_text.trim() || undefined,
            user_id: user.id,
            username:
              user.user_metadata?.username || user.email?.split("@")[0],
          }
          result = await createPrompt(createData)
          toast.success("Prompt created successfully!")
        }

        onSuccess?.(result)
      } catch (error) {
        console.error("Failed to save prompt:", error)
        toast.error(
          error instanceof Error ? error.message : "Failed to save prompt"
        )
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      data-tabz-region="prompt-form"
    >
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="pf-title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="pf-title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          onBlur={() => handleBlur("title")}
          placeholder="Enter a descriptive title for your prompt"
          className={cn(
            "glass border-border/50",
            errors.title && "border-destructive"
          )}
          disabled={isPending}
          data-tabz-input="prompt-title"
        />
        {errors.title && touched.has("title") && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="pf-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="pf-description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          onBlur={() => handleBlur("description")}
          placeholder="Brief description of what this prompt does..."
          rows={2}
          className={cn(
            "glass border-border/50",
            errors.description && "border-destructive"
          )}
          disabled={isPending}
          data-tabz-input="prompt-description"
        />
        {errors.description && touched.has("description") && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="pf-category" className="text-sm font-medium">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.category}
          onValueChange={(value) => handleChange("category", value)}
          disabled={isPending}
        >
          <SelectTrigger
            id="pf-category"
            className={cn(
              "glass border-border/50",
              errors.category && "border-destructive"
            )}
          >
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <cat.icon className="w-4 h-4 text-muted-foreground" />
                  <span>{cat.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.category}
          </p>
        )}
      </div>

      {/* Content Builder */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Content Builder</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFillableField}
            disabled={isPending}
            className="h-8 glass border-border/50"
            data-tabz-action="add-template-field"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Field
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add fillable fields using{" "}
          <code className="px-1 py-0.5 rounded bg-muted text-[11px]">
            {"{{fieldName}}"}
          </code>{" "}
          or{" "}
          <code className="px-1 py-0.5 rounded bg-muted text-[11px]">
            {"{{fieldName:hint text}}"}
          </code>{" "}
          or click &quot;Add Field&quot; to insert at cursor.
        </p>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="pf-content" className="text-sm font-medium">
          Content <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="pf-content"
          ref={contentTextareaRef}
          value={formData.content}
          onChange={(e) => handleChange("content", e.target.value)}
          onBlur={() => handleBlur("content")}
          placeholder={`Write your prompt here. Use {{fieldName}} to create fillable fields.\nExample: "Write a {{type}} about {{topic}} in a {{tone}} style."`}
          rows={10}
          className={cn(
            "font-mono text-sm glass border-border/50",
            errors.content && "border-destructive"
          )}
          disabled={isPending}
          data-tabz-input="prompt-content"
        />
        {errors.content && touched.has("content") && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.content}
          </p>
        )}

        {/* Template Fields Preview */}
        {hasTemplateFields && (
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              Template fields:
            </span>
            {parsedTemplate.fields.map((field) => (
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
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="pf-tags" className="text-sm font-medium">
          Tags
        </Label>
        <Input
          id="pf-tags"
          value={formData.tags}
          onChange={(e) => handleChange("tags", e.target.value)}
          placeholder="Enter tags separated by commas (e.g., writing, creative, blog)"
          className="glass border-border/50"
          disabled={isPending}
          data-tabz-input="prompt-tags"
        />
        <p className="text-xs text-muted-foreground">
          Separate tags with commas to help with discovery.
        </p>
      </div>

      {/* Attribution */}
      <div className="space-y-3 p-4 rounded-lg glass border border-border/50">
        <h3 className="font-medium text-sm">Attribution (Optional)</h3>
        <p className="text-xs text-muted-foreground">
          Credit the original source if this prompt is inspired by or adapted
          from someone else&apos;s work.
        </p>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pf-attribution-text" className="text-sm font-medium">
              Attribution Text
            </Label>
            <Input
              id="pf-attribution-text"
              value={formData.attribution_text}
              onChange={(e) =>
                handleChange("attribution_text", e.target.value)
              }
              placeholder='Credit the original source (e.g., "Inspired by OpenAI")'
              className="glass border-border/50"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pf-attribution-url" className="text-sm font-medium">
              Attribution URL
            </Label>
            <Input
              id="pf-attribution-url"
              type="url"
              value={formData.attribution_url}
              onChange={(e) =>
                handleChange("attribution_url", e.target.value)
              }
              onBlur={() => handleBlur("attribution_url")}
              placeholder="https://example.com/original-source"
              className={cn(
                "glass border-border/50",
                errors.attribution_url && "border-destructive"
              )}
              disabled={isPending}
            />
            {errors.attribution_url && touched.has("attribution_url") && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.attribution_url}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {errors.general}
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="glass border-border/50"
            data-tabz-action="cancel-prompt-form"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          data-tabz-action={isEditMode ? "save-prompt" : "create-prompt"}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditMode ? "Saving..." : "Creating..."}
            </>
          ) : (
            <>
              {isEditMode ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isEditMode ? "Save Changes" : "Create Prompt"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
