/**
 * Prompt interaction functions
 * Handles likes, bookmarks, usage tracking, and other user interactions
 * Ported from ggprompts-next, adapted for homepage Supabase client
 */

import { getSupabaseClient } from "@/lib/supabase"
import type { Prompt, PromptLikeRow, PromptBookmarkRow } from "./types"

// ============================================================================
// LIKE FUNCTIONS
// ============================================================================

/**
 * Toggle like status for a prompt
 * Returns the new liked state and updated like count
 */
export async function togglePromptLike(
  promptId: string,
  userId: string
): Promise<{ liked: boolean; newCount: number }> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  // Check if user already liked this prompt
  const { data: existingLike } = await supabase
    .from("prompt_likes")
    .select("id")
    .eq("prompt_id", promptId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingLike) {
    // Unlike: remove the like record
    const { error: deleteError } = await supabase
      .from("prompt_likes")
      .delete()
      .eq("prompt_id", promptId)
      .eq("user_id", userId)

    if (deleteError) {
      console.error("Failed to delete like:", deleteError)
      throw deleteError
    }

    // Decrement the like count
    const { data: currentPrompt } = await supabase
      .from("prompts")
      .select("like_count")
      .eq("id", promptId)
      .single()

    const newCount = Math.max(0, (currentPrompt?.like_count || 1) - 1)

    const { error: updateError } = await supabase
      .from("prompts")
      .update({ like_count: newCount })
      .eq("id", promptId)

    if (updateError) {
      console.error("Failed to update like count:", updateError)
    }

    return { liked: false, newCount }
  } else {
    // Like: insert a new like record
    const { error: insertError } = await supabase
      .from("prompt_likes")
      .insert({ prompt_id: promptId, user_id: userId })

    if (insertError) {
      console.error("Failed to insert like:", insertError)
      throw insertError
    }

    // Increment the like count
    const { data: currentPrompt } = await supabase
      .from("prompts")
      .select("like_count")
      .eq("id", promptId)
      .single()

    const newCount = (currentPrompt?.like_count || 0) + 1

    const { error: updateError } = await supabase
      .from("prompts")
      .update({ like_count: newCount })
      .eq("id", promptId)

    if (updateError) {
      console.error("Failed to update like count:", updateError)
    }

    return { liked: true, newCount }
  }
}

/**
 * Get list of prompt IDs that a user has liked
 */
export async function getUserLikedPromptIds(
  userId: string
): Promise<string[]> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data, error } = await supabase
    .from("prompt_likes")
    .select("prompt_id")
    .eq("user_id", userId)

  if (error) throw error
  return (
    (data as Pick<PromptLikeRow, "prompt_id">[] | null)?.map(
      (item) => item.prompt_id
    ) || []
  )
}

/**
 * Check if a specific prompt is liked by the user
 */
export async function isPromptLikedByUser(
  promptId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data } = await supabase
    .from("prompt_likes")
    .select("id")
    .eq("prompt_id", promptId)
    .eq("user_id", userId)
    .maybeSingle()

  return !!data
}

// ============================================================================
// BOOKMARK FUNCTIONS
// ============================================================================

/**
 * Toggle bookmark status for a prompt
 * Returns the new bookmarked state
 */
export async function toggleBookmark(
  promptId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  // Check if user already bookmarked this prompt
  const { data: existingBookmark } = await supabase
    .from("prompt_bookmarks")
    .select("id")
    .eq("prompt_id", promptId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingBookmark) {
    const { error } = await supabase
      .from("prompt_bookmarks")
      .delete()
      .eq("prompt_id", promptId)
      .eq("user_id", userId)

    if (error) throw error
    return false
  } else {
    const { error } = await supabase
      .from("prompt_bookmarks")
      .insert({ prompt_id: promptId, user_id: userId })

    if (error) throw error
    return true
  }
}

/**
 * Get list of prompt IDs that a user has bookmarked
 */
export async function getUserBookmarkedPromptIds(
  userId: string
): Promise<string[]> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data, error } = await supabase
    .from("prompt_bookmarks")
    .select("prompt_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (
    (data as Pick<PromptBookmarkRow, "prompt_id">[] | null)?.map(
      (item) => item.prompt_id
    ) || []
  )
}

/**
 * Get full prompt objects for user's bookmarked prompts
 */
export async function getUserBookmarkedPrompts(
  userId: string
): Promise<Prompt[]> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data: bookmarks, error: bookmarksError } = await supabase
    .from("prompt_bookmarks")
    .select("prompt_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (bookmarksError) throw bookmarksError
  if (!bookmarks || bookmarks.length === 0) return []

  const typedBookmarks = bookmarks as Pick<PromptBookmarkRow, "prompt_id">[]
  const promptIds = typedBookmarks.map((b) => b.prompt_id)

  const { data: prompts, error: promptsError } = await supabase
    .from("prompts")
    .select("*")
    .in("id", promptIds)

  if (promptsError) throw promptsError

  const typedPrompts = prompts as Prompt[] | null
  const promptMap = new Map(typedPrompts?.map((p) => [p.id, p]) || [])
  return promptIds
    .map((id: string) => promptMap.get(id))
    .filter((p): p is Prompt => p !== undefined)
}

/**
 * Check if a specific prompt is bookmarked by the user
 */
export async function isPromptBookmarkedByUser(
  promptId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const { data } = await supabase
    .from("prompt_bookmarks")
    .select("id")
    .eq("prompt_id", promptId)
    .eq("user_id", userId)
    .maybeSingle()

  return !!data
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Increment usage count when a prompt is copied
 * Returns the new usage count
 */
export async function incrementUsageCount(promptId: string): Promise<number> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  // Use RPC if available, otherwise do manual increment
  try {
    const { data, error } = await supabase.rpc("increment_prompt_usage", {
      prompt_id: promptId,
    })

    if (!error && data !== null) {
      return data as number
    }
  } catch {
    // RPC not available, fall back to manual increment
  }

  // Fallback: fetch current count and increment
  const { data: prompt } = await supabase
    .from("prompts")
    .select("usage_count")
    .eq("id", promptId)
    .single()

  const currentCount =
    (prompt as { usage_count: number } | null)?.usage_count || 0
  const newCount = currentCount + 1

  const { error: updateError } = await supabase
    .from("prompts")
    .update({ usage_count: newCount })
    .eq("id", promptId)

  if (updateError) {
    console.error("Failed to increment usage count:", updateError)
    return currentCount
  }

  return newCount
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get like and bookmark states for multiple prompts at once
 * Useful for loading a list of prompts with user interaction state
 */
export async function getUserInteractionStates(
  promptIds: string[],
  userId: string
): Promise<{ likedIds: Set<string>; bookmarkedIds: Set<string> }> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not configured")

  const [likesResult, bookmarksResult] = await Promise.all([
    supabase
      .from("prompt_likes")
      .select("prompt_id")
      .eq("user_id", userId)
      .in("prompt_id", promptIds),
    supabase
      .from("prompt_bookmarks")
      .select("prompt_id")
      .eq("user_id", userId)
      .in("prompt_id", promptIds),
  ])

  const likedData = likesResult.data as
    | Pick<PromptLikeRow, "prompt_id">[]
    | null
  const bookmarkedData = bookmarksResult.data as
    | Pick<PromptBookmarkRow, "prompt_id">[]
    | null

  return {
    likedIds: new Set(likedData?.map((l) => l.prompt_id) || []),
    bookmarkedIds: new Set(bookmarkedData?.map((b) => b.prompt_id) || []),
  }
}
