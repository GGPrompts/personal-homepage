"use client"

import * as React from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface UsePromptGenerationOptions {
  /** Workspace path for API calls */
  workspace?: string
  /** Called when prompt generation succeeds */
  onSuccess?: (prompt: string) => void
  /** Called when prompt generation fails */
  onError?: (error: string) => void
}

export interface UsePromptGenerationReturn {
  /** Generate a prompt for the given issue ID */
  generatePrompt: (issueId: string) => Promise<string | null>
  /** Save prompt to issue notes */
  savePrompt: (issueId: string, prompt: string, existingNotes?: string) => Promise<boolean>
  /** Whether currently generating */
  isGenerating: boolean
  /** Whether currently saving */
  isSaving: boolean
  /** Last error message */
  error: string | null
  /** Clear error state */
  clearError: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Section header for prepared prompts in notes */
export const PROMPT_SECTION_HEADER = "## prepared.prompt"

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract the prepared prompt from issue notes
 */
export function extractPromptFromNotes(notes: string | undefined | null): string | null {
  if (!notes) return null

  const headerIndex = notes.indexOf(PROMPT_SECTION_HEADER)
  if (headerIndex === -1) return null

  // Find the start of the prompt content (after header and newline)
  const contentStart = headerIndex + PROMPT_SECTION_HEADER.length
  const afterHeader = notes.slice(contentStart)

  // Skip leading whitespace/newlines
  const trimmedStart = afterHeader.search(/\S/)
  if (trimmedStart === -1) return null

  const promptStart = contentStart + trimmedStart

  // Find the next section header (## something) or end of string
  const nextSectionMatch = afterHeader.slice(trimmedStart).match(/\n##\s/)
  const promptEnd = nextSectionMatch
    ? promptStart + nextSectionMatch.index!
    : notes.length

  const prompt = notes.slice(promptStart, promptEnd).trim()
  return prompt || null
}

/**
 * Check if notes contain a prepared prompt
 */
export function hasPromptInNotes(notes: string | undefined | null): boolean {
  return extractPromptFromNotes(notes) !== null
}

/**
 * Insert or replace the prepared prompt section in notes
 */
export function updateNotesWithPrompt(
  existingNotes: string | undefined | null,
  prompt: string
): string {
  const notes = existingNotes || ""
  const headerIndex = notes.indexOf(PROMPT_SECTION_HEADER)

  const newSection = `${PROMPT_SECTION_HEADER}\n\n${prompt.trim()}`

  if (headerIndex === -1) {
    // No existing prompt section - append
    return notes.trim() ? `${notes.trim()}\n\n${newSection}` : newSection
  }

  // Find the end of the existing prompt section
  const afterHeader = notes.slice(headerIndex + PROMPT_SECTION_HEADER.length)
  const nextSectionMatch = afterHeader.match(/\n##\s/)

  if (nextSectionMatch) {
    // There's another section after the prompt - replace just the prompt section
    const beforePrompt = notes.slice(0, headerIndex)
    const afterPrompt = afterHeader.slice(nextSectionMatch.index!)
    return `${beforePrompt.trim()}${beforePrompt.trim() ? "\n\n" : ""}${newSection}${afterPrompt}`
  }

  // Prompt section is at the end - replace everything after the header
  const beforePrompt = notes.slice(0, headerIndex)
  return `${beforePrompt.trim()}${beforePrompt.trim() ? "\n\n" : ""}${newSection}`
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for generating and saving AI worker prompts for issues.
 * Calls the generate-prompt API endpoint and saves results to issue notes.
 */
export function usePromptGeneration(
  options: UsePromptGenerationOptions = {}
): UsePromptGenerationReturn {
  const { workspace, onSuccess, onError } = options

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const generatePrompt = React.useCallback(
    async (issueId: string): Promise<string | null> => {
      setIsGenerating(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/beads/issues/${encodeURIComponent(issueId)}/generate-prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspace }),
          }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const errorMsg = data.error || `Failed to generate prompt (${response.status})`
          setError(errorMsg)
          onError?.(errorMsg)
          return null
        }

        const data = await response.json()
        const prompt = data.prompt

        if (!prompt) {
          const errorMsg = "No prompt returned from API"
          setError(errorMsg)
          onError?.(errorMsg)
          return null
        }

        onSuccess?.(prompt)
        return prompt
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to generate prompt"
        setError(errorMsg)
        onError?.(errorMsg)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [workspace, onSuccess, onError]
  )

  const savePrompt = React.useCallback(
    async (
      issueId: string,
      prompt: string,
      existingNotes?: string
    ): Promise<boolean> => {
      setIsSaving(true)
      setError(null)

      try {
        const updatedNotes = updateNotesWithPrompt(existingNotes, prompt)

        const response = await fetch(
          `/api/beads/issues/${encodeURIComponent(issueId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspace,
              notes: updatedNotes,
            }),
          }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const errorMsg = data.error || `Failed to save prompt (${response.status})`
          setError(errorMsg)
          onError?.(errorMsg)
          return false
        }

        return true
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to save prompt"
        setError(errorMsg)
        onError?.(errorMsg)
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [workspace, onError]
  )

  return {
    generatePrompt,
    savePrompt,
    isGenerating,
    isSaving,
    error,
    clearError,
  }
}
