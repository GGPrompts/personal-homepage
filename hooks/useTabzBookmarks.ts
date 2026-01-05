"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface ChromeBookmark {
  id: string
  title: string
  url: string
  parentId: string
}

interface SearchState {
  results: ChromeBookmark[]
  isLoading: boolean
  error: string | null
  query: string
}

interface SaveResult {
  success: boolean
  error?: string
  bookmark?: ChromeBookmark
}

interface OpenUrlResult {
  success: boolean
  error?: string
  tabId?: number
}

/**
 * Hook for searching Chrome bookmarks via TabzChrome MCP
 *
 * Features:
 * - Live search with debouncing
 * - Open URLs via TabzChrome
 * - Save new bookmarks
 */
export function useTabzBookmarks(debounceMs = 300) {
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    query: "",
  })
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if MCP is available
  const checkAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/tabz/bookmarks/search?q=test&limit=1")
      // If we get a 503, MCP is not available
      if (response.status === 503) {
        setIsAvailable(false)
        return false
      }
      setIsAvailable(true)
      return true
    } catch {
      setIsAvailable(false)
      return false
    }
  }, [])

  // Check availability on mount
  useEffect(() => {
    checkAvailability()
  }, [checkAvailability])

  // Search bookmarks with debouncing
  const search = useCallback(
    async (query: string) => {
      // Clear previous debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Update query immediately for UI
      setSearchState((prev) => ({ ...prev, query }))

      // Clear results if query is empty
      if (!query.trim()) {
        setSearchState((prev) => ({
          ...prev,
          results: [],
          isLoading: false,
          error: null,
        }))
        return
      }

      // Debounce the actual search
      debounceRef.current = setTimeout(async () => {
        setSearchState((prev) => ({ ...prev, isLoading: true, error: null }))

        // Create new abort controller for this request
        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
          const response = await fetch(
            `/api/tabz/bookmarks/search?q=${encodeURIComponent(query)}&limit=20`,
            { signal: controller.signal }
          )

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Search failed")
          }

          const data = await response.json()
          setSearchState((prev) => ({
            ...prev,
            results: data.results || [],
            isLoading: false,
          }))
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request was aborted, ignore
            return
          }
          setSearchState((prev) => ({
            ...prev,
            results: [],
            isLoading: false,
            error: error instanceof Error ? error.message : "Search failed",
          }))
        }
      }, debounceMs)
    },
    [debounceMs]
  )

  // Clear search results
  const clearSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setSearchState({
      results: [],
      isLoading: false,
      error: null,
      query: "",
    })
  }, [])

  // Open URL via TabzChrome
  const openUrl = useCallback(
    async (
      url: string,
      options?: { newTab?: boolean; background?: boolean; reuseExisting?: boolean }
    ): Promise<OpenUrlResult> => {
      try {
        const response = await fetch("/api/tabz/open-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            newTab: options?.newTab ?? true,
            background: options?.background ?? false,
            reuseExisting: options?.reuseExisting ?? true,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          // If URL is not allowed by TabzChrome, fall back to window.open
          if (response.status === 403) {
            window.open(url, "_blank")
            return { success: true }
          }
          return { success: false, error: data.error || "Failed to open URL" }
        }

        const data = await response.json()
        return data
      } catch (error) {
        // Fall back to window.open if MCP fails
        window.open(url, "_blank")
        return { success: true }
      }
    },
    []
  )

  // Save a bookmark
  const saveBookmark = useCallback(
    async (
      url: string,
      title: string,
      parentId?: string
    ): Promise<SaveResult> => {
      try {
        const response = await fetch("/api/tabz/bookmarks/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, title, parentId }),
        })

        if (!response.ok) {
          const data = await response.json()
          return { success: false, error: data.error || "Failed to save bookmark" }
        }

        const data = await response.json()
        return data
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save bookmark",
        }
      }
    },
    []
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // Search state
    results: searchState.results,
    isLoading: searchState.isLoading,
    error: searchState.error,
    query: searchState.query,

    // Availability
    isAvailable,
    checkAvailability,

    // Actions
    search,
    clearSearch,
    openUrl,
    saveBookmark,
  }
}
