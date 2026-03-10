"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  BookOpen,
  Search,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  Heart,
  Bookmark,
  User,
  Loader2,
  Sparkles,
  Check,
  Plus,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/components/AuthProvider"
import { PromptCard } from "@/components/prompts/PromptCard"
import { PromptDetailModal } from "@/components/prompts/PromptDetailModal"
import { PromptGridSkeleton } from "@/components/prompts/PromptCardSkeleton"
import { CreatePromptForm } from "@/components/prompts/CreatePromptForm"
import {
  fetchPrompts,
  type SortOption,
  type FetchPromptsParams,
  PROMPTS_PER_PAGE,
} from "@/lib/prompts/fetch"
import { getUserInteractionStates } from "@/lib/prompts/interactions"
import { CATEGORIES } from "@/lib/prompts/categories"
import { cn } from "@/lib/utils"
import type { Prompt } from "@/lib/prompts/types"
import Fuse from "fuse.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptLibrarySectionProps {
  activeSubItem: string | null
  onSubItemHandled: () => void
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most-liked", label: "Most Liked" },
  { value: "most-used", label: "Most Used" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PromptLibrarySection({
  activeSubItem,
  onSubItemHandled,
}: PromptLibrarySectionProps) {
  const { user } = useAuth()

  // Data state
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Interaction states
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [sort, setSort] = useState<SortOption>("newest")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [myPromptsOnly, setMyPromptsOnly] = useState(false)
  const [likedOnly, setLikedOnly] = useState(false)
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Detail modal
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Create / edit form view
  const [showCreateForm, setShowCreateForm] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters =
    sort !== "newest" || myPromptsOnly || likedOnly || bookmarkedOnly

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // Build fetch params from filter state
  const fetchParams: FetchPromptsParams = useMemo(
    () => ({
      page: 1,
      query: debouncedQuery || undefined,
      categories:
        selectedCategories.length > 0 ? selectedCategories : undefined,
      sort,
      userId: user?.id,
      myPromptsOnly,
      likedOnly,
      bookmarkedOnly,
    }),
    [
      debouncedQuery,
      selectedCategories,
      sort,
      user?.id,
      myPromptsOnly,
      likedOnly,
      bookmarkedOnly,
    ]
  )

  // Fetch prompts when filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setCurrentPage(1)

    fetchPrompts(fetchParams)
      .then((result) => {
        if (cancelled) return
        setPrompts(result.prompts)
        setTotal(result.total)
        setHasMore(result.hasMore)
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to fetch prompts:", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchParams])

  // Load interaction states
  useEffect(() => {
    if (!user || prompts.length === 0) {
      setLikedIds(new Set())
      setBookmarkedIds(new Set())
      return
    }

    const promptIds = prompts.map((p) => p.id)
    getUserInteractionStates(promptIds, user.id)
      .then(({ likedIds, bookmarkedIds }) => {
        setLikedIds(likedIds)
        setBookmarkedIds(bookmarkedIds)
      })
      .catch((err) =>
        console.error("Failed to fetch interaction states:", err)
      )
  }, [user, prompts])

  // Client-side fuzzy search with Fuse.js
  const fuse = useMemo(() => {
    if (!prompts.length) return null
    return new Fuse(prompts, {
      keys: ["title", "description", "content"],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    })
  }, [prompts])

  const displayPrompts = useMemo(() => {
    if (!debouncedQuery || !fuse) return prompts
    return fuse.search(debouncedQuery).map((r) => r.item)
  }, [prompts, debouncedQuery, fuse])

  // Load more
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    try {
      const nextPage = currentPage + 1
      const result = await fetchPrompts({ ...fetchParams, page: nextPage })
      const existingIds = new Set(prompts.map((p) => p.id))
      const newPrompts = result.prompts.filter((p) => !existingIds.has(p.id))

      setPrompts((prev) => [...prev, ...newPrompts])
      setTotal(result.total)
      setHasMore(result.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error("Error loading more prompts:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, currentPage, fetchParams, prompts])

  // Prompt click -> detail modal
  const handlePromptClick = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setModalOpen(true)
  }

  // Handle prompt update from modal
  const handlePromptUpdate = useCallback((updatedPrompt: Prompt) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p))
    )
    setSelectedPrompt(updatedPrompt)
  }, [])

  // Handle prompt delete from modal
  const handlePromptDelete = useCallback((promptId: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== promptId))
    setTotal((prev) => prev - 1)
  }, [])

  // Handle successful prompt creation
  const handleCreateSuccess = useCallback((newPrompt: Prompt) => {
    setPrompts((prev) => [newPrompt, ...prev])
    setTotal((prev) => prev + 1)
    setShowCreateForm(false)
  }, [])

  // Like/bookmark changes from cards
  const handleLikeChange = useCallback(
    (promptId: string, liked: boolean, newCount: number) => {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (liked) next.add(promptId)
        else next.delete(promptId)
        return next
      })
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === promptId ? { ...p, like_count: newCount } : p
        )
      )
    },
    []
  )

  const handleBookmarkChange = useCallback(
    (promptId: string, bookmarked: boolean) => {
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        if (bookmarked) next.add(promptId)
        else next.delete(promptId)
        return next
      })
    },
    []
  )

  // Category toggle
  const handleCategoryClick = (categoryValue: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryValue)
        ? prev.filter((c) => c !== categoryValue)
        : [...prev, categoryValue]
    )
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("")
    setDebouncedQuery("")
    setSort("newest")
    setSelectedCategories([])
    setMyPromptsOnly(false)
    setLikedOnly(false)
    setBookmarkedOnly(false)
    setFiltersOpen(false)
  }

  // Handle sub-item navigation
  useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled()
    }
  }, [activeSubItem, onSubItemHandled])

  const displayCount = displayPrompts.length

  return (
    <div className="p-6 space-y-6" data-tabz-section="prompt-library">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showCreateForm && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowCreateForm(false)}
              data-tabz-action="back-to-library"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold terminal-glow">
            {showCreateForm ? "New Prompt" : "Prompt Library"}
          </h2>
        </div>
        {!showCreateForm && user && (
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            className="gap-2"
            data-tabz-action="create-prompt"
          >
            <Plus className="h-4 w-4" />
            New Prompt
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="glass rounded-lg p-6 border border-border/50">
          <CreatePromptForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Search + Sort + Filters */}
      {!showCreateForm && <><div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (searchQuery) {
                    setSearchQuery("")
                    setDebouncedQuery("")
                  }
                  inputRef.current?.blur()
                }
              }}
              className="pl-10 pr-10 h-10 glass border-border/50 focus:border-primary/50"
              data-tabz-input="search-prompts"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => {
                  setSearchQuery("")
                  setDebouncedQuery("")
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Sort */}
          <Select
            value={sort}
            onValueChange={(val) => setSort(val as SortOption)}
          >
            <SelectTrigger className="w-[140px] h-10 glass border-border/50">
              <ArrowUpDown className="h-4 w-4 mr-1.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 glass border-border/50 relative",
                  hasActiveFilters && "border-primary/50 text-primary"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 glass" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                      onClick={clearAllFilters}
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="pl-my-prompts"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <User className="h-4 w-4" />
                        My Prompts
                      </Label>
                      <Switch
                        id="pl-my-prompts"
                        checked={myPromptsOnly}
                        onCheckedChange={setMyPromptsOnly}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="pl-liked"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Heart className="h-4 w-4" />
                        Liked
                      </Label>
                      <Switch
                        id="pl-liked"
                        checked={likedOnly}
                        onCheckedChange={setLikedOnly}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="pl-bookmarked"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Bookmark className="h-4 w-4" />
                        Bookmarked
                      </Label>
                      <Switch
                        id="pl-bookmarked"
                        checked={bookmarkedOnly}
                        onCheckedChange={setBookmarkedOnly}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sign in to filter by your prompts, likes, and bookmarks.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active filter badges */}
        {(myPromptsOnly || likedOnly || bookmarkedOnly) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            {myPromptsOnly && (
              <button
                onClick={() => setMyPromptsOnly(false)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                <User className="h-3 w-3" />
                My Prompts
                <X className="h-3 w-3" />
              </button>
            )}
            {likedOnly && (
              <button
                onClick={() => setLikedOnly(false)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <Heart className="h-3 w-3 fill-current" />
                Liked
                <X className="h-3 w-3" />
              </button>
            )}
            {bookmarkedOnly && (
              <button
                onClick={() => setBookmarkedOnly(false)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <Bookmark className="h-3 w-3 fill-current" />
                Bookmarked
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategories([])}
            className={cn(
              "glass px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all border text-xs",
              selectedCategories.length === 0
                ? "border-primary bg-primary/20 text-primary"
                : "border-border/50 hover:border-primary/30 text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            All
          </button>
          {CATEGORIES.map((category) => {
            const isActive = selectedCategories.includes(category.value)
            const Icon = category.icon
            return (
              <button
                key={category.value}
                onClick={() => handleCategoryClick(category.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all border text-xs",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "glass border-border/50 hover:border-primary/30 text-foreground"
                )}
              >
                {isActive ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                {category.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="text-foreground font-medium">{displayCount}</span>
            {total > displayCount && (
              <>
                {" "}
                of{" "}
                <span className="text-foreground font-medium">{total}</span>
              </>
            )}{" "}
            prompts
          </p>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <PromptGridSkeleton count={6} />
      ) : displayPrompts.length === 0 ? (
        <div className="glass rounded-lg p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {debouncedQuery || selectedCategories.length > 0 || hasActiveFilters
              ? "No prompts match your filters. Try adjusting your search or filters."
              : "No prompts found. The prompt library is empty."}
          </p>
          {(debouncedQuery ||
            selectedCategories.length > 0 ||
            hasActiveFilters) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={clearAllFilters}
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label="Prompts"
            data-tabz-list="prompts"
          >
            {displayPrompts.map((prompt) => (
              <div key={prompt.id} role="listitem">
                <PromptCard
                  prompt={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  isLiked={likedIds.has(prompt.id)}
                  isBookmarked={bookmarkedIds.has(prompt.id)}
                  onLikeChange={handleLikeChange}
                  onBookmarkChange={handleBookmarkChange}
                />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="glass border-border/50 hover:border-primary/50 min-w-[160px]"
                data-tabz-action="load-more"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
      </>}

      <PromptDetailModal
        prompt={selectedPrompt}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={handlePromptUpdate}
        onDelete={handlePromptDelete}
      />
    </div>
  )
}
