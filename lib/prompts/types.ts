/**
 * Prompt types for the prompt library section
 * Ported from ggprompts-next
 */

export interface Prompt {
  id: string
  title: string
  content: string
  description: string | null
  category: string | null
  tags: string[] | null
  user_id: string | null
  username: string | null
  like_count: number
  usage_count: number
  is_template: boolean
  template_fields: Record<string, unknown> | null
  attribution_url: string | null
  attribution_text: string | null
  created_at: string
  updated_at: string
}

export interface TemplateField {
  id: string
  name: string
  hint: string
  placeholder: string
  startIndex: number
  endIndex: number
  fullMatch: string
}

export interface ParsedTemplate {
  content: string
  fields: TemplateField[]
  hasFields: boolean
}

export interface ValidationError {
  fieldId: string
  type: "required" | "format" | "length"
  message: string
}

export interface ValidationWarning {
  fieldId: string
  type: "suggestion" | "length"
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  filledCount: number
  totalCount: number
}

export interface CreatePromptInput {
  title: string
  content: string
  description?: string
  category: string
  tags?: string[]
  attribution_url?: string
  attribution_text?: string
  user_id: string
  username?: string
}

export interface UpdatePromptInput {
  title?: string
  content?: string
  description?: string | null
  category?: string
  tags?: string[]
  attribution_url?: string | null
  attribution_text?: string | null
}

export interface PromptLikeRow {
  id: string
  prompt_id: string
  user_id: string
  created_at: string
}

export interface PromptBookmarkRow {
  id: string
  prompt_id: string
  user_id: string
  created_at: string
}
