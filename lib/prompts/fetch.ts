/**
 * Client-side prompt fetching with search, filter, sort, and pagination
 * Adapted from ggprompts-next server actions to work as client-side Supabase queries
 */

import { getSupabaseClient } from "@/lib/supabase"
import type { Prompt } from "./types"

export type SortOption = "newest" | "oldest" | "most-liked" | "most-used"

export const PROMPTS_PER_PAGE = 24

export interface FetchPromptsParams {
  page?: number
  query?: string
  categories?: string[]
  sort?: SortOption
  userId?: string
  myPromptsOnly?: boolean
  likedOnly?: boolean
  bookmarkedOnly?: boolean
}

export interface FetchPromptsResult {
  prompts: Prompt[]
  total: number
  hasMore: boolean
}

export async function fetchPrompts(
  params: FetchPromptsParams
): Promise<FetchPromptsResult> {
  const {
    page = 1,
    query,
    categories,
    sort = "newest",
    userId,
    myPromptsOnly,
    likedOnly,
    bookmarkedOnly,
  } = params

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { prompts: [], total: 0, hasMore: false }
  }

  const offset = (page - 1) * PROMPTS_PER_PAGE

  // Handle liked/bookmarked filters - need to get IDs first
  let promptIds: string[] | null = null

  if (userId && (likedOnly || bookmarkedOnly)) {
    const ids: string[] = []

    if (likedOnly) {
      const { data: likedData } = await supabase
        .from("prompt_likes")
        .select("prompt_id")
        .eq("user_id", userId)

      if (likedData && likedData.length > 0) {
        ids.push(...likedData.map((l) => l.prompt_id))
      } else {
        return { prompts: [], total: 0, hasMore: false }
      }
    }

    if (bookmarkedOnly) {
      const { data: bookmarkedData } = await supabase
        .from("prompt_bookmarks")
        .select("prompt_id")
        .eq("user_id", userId)

      if (bookmarkedData && bookmarkedData.length > 0) {
        if (likedOnly) {
          const bookmarkedIds = new Set(
            bookmarkedData.map((b) => b.prompt_id)
          )
          promptIds = ids.filter((id) => bookmarkedIds.has(id))
          if (promptIds.length === 0)
            return { prompts: [], total: 0, hasMore: false }
        } else {
          ids.push(...bookmarkedData.map((b) => b.prompt_id))
        }
      } else {
        return { prompts: [], total: 0, hasMore: false }
      }
    }

    if (!promptIds) {
      promptIds = [...new Set(ids)]
    }
  }

  // Build count query
  let countQuery = supabase
    .from("prompts")
    .select("*", { count: "exact", head: true })

  // Build data query
  let dataQuery = supabase.from("prompts").select("*")

  // Sorting
  switch (sort) {
    case "oldest":
      dataQuery = dataQuery.order("created_at", { ascending: true })
      break
    case "most-liked":
      dataQuery = dataQuery.order("like_count", { ascending: false })
      break
    case "most-used":
      dataQuery = dataQuery.order("usage_count", { ascending: false })
      break
    case "newest":
    default:
      dataQuery = dataQuery.order("created_at", { ascending: false })
      break
  }

  // Search filter
  if (query) {
    const searchFilter = `title.ilike.%${query}%,content.ilike.%${query}%,description.ilike.%${query}%`
    countQuery = countQuery.or(searchFilter)
    dataQuery = dataQuery.or(searchFilter)
  }

  // Category filter
  if (categories && categories.length > 0) {
    countQuery = countQuery.in("category", categories)
    dataQuery = dataQuery.in("category", categories)
  }

  // My prompts filter
  if (userId && myPromptsOnly) {
    countQuery = countQuery.eq("user_id", userId)
    dataQuery = dataQuery.eq("user_id", userId)
  }

  // Liked/bookmarked filter
  if (promptIds) {
    countQuery = countQuery.in("id", promptIds)
    dataQuery = dataQuery.in("id", promptIds)
  }

  // Pagination
  dataQuery = dataQuery.range(offset, offset + PROMPTS_PER_PAGE - 1)

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

  if (dataResult.error) {
    console.error("Error fetching prompts:", dataResult.error)
    return { prompts: [], total: 0, hasMore: false }
  }

  const total = countResult.count || 0
  const prompts = dataResult.data as Prompt[]
  const hasMore = offset + prompts.length < total

  return { prompts, total, hasMore }
}
