/**
 * Prompt CRUD operations
 * Handles prompt creation, retrieval, updates, and deletion
 * Ported from ggprompts-next, adapted for homepage Supabase client
 */

import { getSupabaseClient } from "@/lib/supabase"
import type { Prompt, CreatePromptInput, UpdatePromptInput } from "./types"
import { parseTemplate, isTemplate } from "./template"

// ============================================================================
// CREATE
// ============================================================================

/**
 * Create a new prompt
 * Automatically detects template fields from content
 */
export async function createPrompt(data: CreatePromptInput): Promise<Prompt> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  // Parse template fields from content
  const hasTemplateFields = isTemplate(data.content)
  const parsed = hasTemplateFields ? parseTemplate(data.content) : null
  const templateFields = parsed?.fields.reduce(
    (acc, field) => {
      acc[field.id] = { hint: field.hint, placeholder: field.placeholder }
      return acc
    },
    {} as Record<string, { hint: string; placeholder: string }>
  )

  const insertData = {
    title: data.title.trim(),
    content: data.content.trim(),
    description: data.description?.trim() || null,
    category: data.category,
    tags: data.tags || [],
    user_id: data.user_id,
    username: data.username || null,
    is_template: hasTemplateFields,
    template_fields: templateFields || null,
    attribution_url: data.attribution_url?.trim() || null,
    attribution_text: data.attribution_text?.trim() || null,
    like_count: 0,
    usage_count: 0,
  }

  const { data: prompt, error } = await supabase
    .from("prompts")
    .insert(insertData)
    .select("*")
    .single()

  if (error) {
    console.error("Error creating prompt:", error)
    throw new Error(`Failed to create prompt: ${error.message}`)
  }

  return prompt as Prompt
}

// ============================================================================
// READ
// ============================================================================

/**
 * Get a single prompt by ID
 */
export async function getPromptById(promptId: string): Promise<Prompt | null> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", promptId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching prompt:", error)
    throw new Error(`Failed to fetch prompt: ${error.message}`)
  }

  return data as Prompt
}

/**
 * Get prompts by user ID
 */
export async function getPromptsByUserId(userId: string): Promise<Prompt[]> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user prompts:", error)
    throw new Error(`Failed to fetch user prompts: ${error.message}`)
  }

  return (data as Prompt[]) || []
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Update an existing prompt
 * Re-parses template fields if content changes
 * Personal use: no admin check needed, owner can update any of their prompts
 */
export async function updatePrompt(
  promptId: string,
  data: UpdatePromptInput,
  userId: string
): Promise<Prompt> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.title !== undefined) {
    updateData.title = data.title.trim()
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null
  }

  if (data.category !== undefined) {
    updateData.category = data.category
  }

  if (data.tags !== undefined) {
    updateData.tags = data.tags
  }

  if (data.attribution_url !== undefined) {
    updateData.attribution_url = data.attribution_url?.trim() || null
  }

  if (data.attribution_text !== undefined) {
    updateData.attribution_text = data.attribution_text?.trim() || null
  }

  // If content is being updated, re-parse template fields
  if (data.content !== undefined) {
    const content = data.content.trim()
    updateData.content = content

    const hasTemplateFields = isTemplate(content)
    updateData.is_template = hasTemplateFields

    if (hasTemplateFields) {
      const parsed = parseTemplate(content)
      updateData.template_fields = parsed.fields.reduce(
        (acc, field) => {
          acc[field.id] = { hint: field.hint, placeholder: field.placeholder }
          return acc
        },
        {} as Record<string, { hint: string; placeholder: string }>
      )
    } else {
      updateData.template_fields = null
    }
  }

  const { data: prompt, error } = await supabase
    .from("prompts")
    .update(updateData)
    .eq("id", promptId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    console.error("Error updating prompt:", error)
    throw new Error(`Failed to update prompt: ${error.message}`)
  }

  return prompt as Prompt
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Delete a prompt
 * Personal use: owner can delete any of their prompts
 */
export async function deletePrompt(
  promptId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { error } = await supabase
    .from("prompts")
    .delete()
    .eq("id", promptId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting prompt:", error)
    throw new Error(`Failed to delete prompt: ${error.message}`)
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate prompt data before creation/update
 */
export function validatePromptData(
  data: Partial<CreatePromptInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.title?.trim()) {
    errors.push("Title is required")
  } else if (data.title.length > 200) {
    errors.push("Title must be less than 200 characters")
  }

  if (!data.content?.trim()) {
    errors.push("Content is required")
  } else if (data.content.length > 50000) {
    errors.push("Content must be less than 50,000 characters")
  }

  if (!data.category) {
    errors.push("Category is required")
  }

  if (data.description && data.description.length > 500) {
    errors.push("Description must be less than 500 characters")
  }

  if (data.attribution_url) {
    try {
      new URL(data.attribution_url)
    } catch {
      errors.push("Attribution URL must be a valid URL")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
