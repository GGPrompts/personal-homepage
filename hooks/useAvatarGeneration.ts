"use client"

import { useCallback, useState } from "react"
import type { AgentPersonalityTrait } from "@/lib/agents/types"

// ============================================================================
// TYPES
// ============================================================================

export interface AvatarGenerationState {
  /** Current status of avatar generation */
  status: "idle" | "generating" | "success" | "error"
  /** Generated DALL-E prompt */
  prompt: string | null
  /** Error message if generation failed */
  error: string | null
  /** Generated avatar URL/path */
  avatarUrl: string | null
}

export interface UseAvatarGenerationReturn {
  /** Current generation state */
  state: AvatarGenerationState
  /** Generate a DALL-E prompt based on agent traits */
  generatePrompt: (name: string, personality: AgentPersonalityTrait[], description?: string) => string
  /** Set avatar URL manually (from file picker or paste) */
  setAvatarUrl: (url: string) => void
  /** Clear the current avatar */
  clearAvatar: () => void
  /** Reset the generation state */
  reset: () => void
  /** Check if a string is a valid image URL or data URL */
  isValidAvatarUrl: (url: string) => boolean
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const PERSONALITY_VISUAL_TRAITS: Record<AgentPersonalityTrait, string> = {
  helpful: "warm and approachable expression, soft lighting",
  concise: "minimal, clean design, simple shapes",
  detailed: "intricate patterns, rich textures",
  technical: "geometric shapes, circuit-like patterns, digital aesthetic",
  friendly: "bright colors, welcoming smile, rounded shapes",
  formal: "professional, elegant, sophisticated design",
  creative: "vibrant colors, artistic flourishes, imaginative elements",
  analytical: "sharp lines, data-inspired patterns, precise symmetry",
}

const AVATAR_STYLES = [
  "digital art style, high quality, professional",
  "3D rendered, clean aesthetic, modern",
  "illustrated, colorful, friendly design",
  "minimalist icon design, flat colors",
]

// ============================================================================
// HOOK
// ============================================================================

export function useAvatarGeneration(): UseAvatarGenerationReturn {
  const [state, setState] = useState<AvatarGenerationState>({
    status: "idle",
    prompt: null,
    error: null,
    avatarUrl: null,
  })

  /**
   * Generate a DALL-E prompt based on agent characteristics
   */
  const generatePrompt = useCallback(
    (name: string, personality: AgentPersonalityTrait[], description?: string): string => {
      // Get visual traits from personality
      const visualTraits = personality
        .slice(0, 3)
        .map((trait) => PERSONALITY_VISUAL_TRAITS[trait])
        .filter(Boolean)
        .join(", ")

      // Choose a random style
      const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)]

      // Build the prompt
      const promptParts = [
        `AI assistant avatar for "${name}"`,
        visualTraits,
        description ? `representing ${description.slice(0, 50)}` : "",
        style,
        "circular portrait, centered, white or transparent background",
        "no text, no watermarks",
      ].filter(Boolean)

      const prompt = promptParts.join(", ")

      setState((prev) => ({
        ...prev,
        prompt,
        status: "idle",
      }))

      return prompt
    },
    []
  )

  /**
   * Set avatar URL (from file path, URL, or data URL)
   */
  const setAvatarUrl = useCallback((url: string) => {
    setState((prev) => ({
      ...prev,
      avatarUrl: url,
      status: "success",
      error: null,
    }))
  }, [])

  /**
   * Clear the avatar
   */
  const clearAvatar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      avatarUrl: null,
      status: "idle",
    }))
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      status: "idle",
      prompt: null,
      error: null,
      avatarUrl: null,
    })
  }, [])

  /**
   * Check if a URL is a valid avatar source
   */
  const isValidAvatarUrl = useCallback((url: string): boolean => {
    if (!url || typeof url !== "string") return false

    // Data URL check
    if (url.startsWith("data:image/")) return true

    // HTTP/HTTPS URL check
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    // File path (from DALL-E download)
    if (url.startsWith("/") || url.startsWith("~") || url.includes("/ai-images/")) {
      return true
    }

    return false
  }, [])

  return {
    state,
    generatePrompt,
    setAvatarUrl,
    clearAvatar,
    reset,
    isValidAvatarUrl,
  }
}

export default useAvatarGeneration
