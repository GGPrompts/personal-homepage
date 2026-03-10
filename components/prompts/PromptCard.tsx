"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Copy, Check, FileText, Bookmark } from "lucide-react"
import type { Prompt } from "@/lib/prompts/types"
import { isTemplate, parseTemplate } from "@/lib/prompts/template"
import { getCategoryByValue } from "@/lib/prompts/categories"
import { useAuth } from "@/components/AuthProvider"
import {
  togglePromptLike,
  toggleBookmark,
  incrementUsageCount,
} from "@/lib/prompts/interactions"

interface PromptCardProps {
  prompt: Prompt
  onClick: () => void
  isLiked?: boolean
  isBookmarked?: boolean
  onLikeChange?: (
    promptId: string,
    liked: boolean,
    newCount: number
  ) => void
  onBookmarkChange?: (promptId: string, bookmarked: boolean) => void
}

export function PromptCard({
  prompt,
  onClick,
  isLiked: initialIsLiked = false,
  isBookmarked: initialIsBookmarked = false,
  onLikeChange,
  onBookmarkChange,
}: PromptCardProps) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(prompt.like_count || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [isBookmarking, setIsBookmarking] = useState(false)

  const promptIsTemplate = prompt.is_template || isTemplate(prompt.content)
  const fieldCount = promptIsTemplate
    ? parseTemplate(prompt.content).fields.length
    : 0

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(prompt.content)
      setCopied(true)
      try {
        await incrementUsageCount(prompt.id)
      } catch (error) {
        console.warn("Failed to track usage:", error)
      }
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!user || isLiking) return

      const previousLiked = isLiked
      const previousCount = likeCount
      const newLiked = !isLiked
      setIsLiked(newLiked)
      setLikeCount(newLiked ? likeCount + 1 : likeCount - 1)
      setIsLiking(true)

      try {
        const result = await togglePromptLike(prompt.id, user.id)
        setIsLiked(result.liked)
        setLikeCount(result.newCount)
        onLikeChange?.(prompt.id, result.liked, result.newCount)
      } catch (error) {
        console.error("Failed to toggle like:", error)
        setIsLiked(previousLiked)
        setLikeCount(previousCount)
      } finally {
        setIsLiking(false)
      }
    },
    [user, isLiked, likeCount, isLiking, prompt.id, onLikeChange]
  )

  const handleBookmark = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!user || isBookmarking) return

      const previousBookmarked = isBookmarked
      setIsBookmarked(!isBookmarked)
      setIsBookmarking(true)

      try {
        const result = await toggleBookmark(prompt.id, user.id)
        setIsBookmarked(result)
        onBookmarkChange?.(prompt.id, result)
      } catch (error) {
        console.error("Failed to toggle bookmark:", error)
        setIsBookmarked(previousBookmarked)
      } finally {
        setIsBookmarking(false)
      }
    },
    [user, isBookmarked, isBookmarking, prompt.id, onBookmarkChange]
  )

  const category = prompt.category
    ? getCategoryByValue(prompt.category)
    : undefined
  const CategoryIcon = category?.icon

  return (
    <Card
      className="glass border-primary/20 hover:border-primary/50 transition-all cursor-pointer group h-full"
      onClick={onClick}
      data-tabz-item={prompt.id}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {prompt.title}
        </CardTitle>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {promptIsTemplate && (
            <Badge
              variant="outline"
              className="gap-1 border-primary/50 text-primary text-xs"
            >
              <FileText className="h-3 w-3" />
              {fieldCount}
            </Badge>
          )}
          {category && (
            <Badge variant="secondary" className="text-xs gap-1">
              {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
              {category.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {prompt.description || prompt.content}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-sm text-muted-foreground truncate max-w-[120px]">
            {prompt.username || "Anonymous"}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 h-8 px-2 ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
              onClick={handleLike}
              disabled={isLiking || !user}
            >
              <Heart
                className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
              />
              <span className="text-sm">{likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isBookmarked ? "text-primary" : "text-muted-foreground"}`}
              onClick={handleBookmark}
              disabled={isBookmarking || !user}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark
                className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`}
              />
              <span className="sr-only">
                {isBookmarked ? "Remove bookmark" : "Bookmark"}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy prompt</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
