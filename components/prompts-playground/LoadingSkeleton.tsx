"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Loading skeleton for initial panel load
interface PanelSkeletonProps {
  className?: string
}

export function PanelSkeleton({ className }: PanelSkeletonProps) {
  return (
    <div className={cn("glass rounded-lg overflow-hidden h-full animate-pulse", className)}>
      {/* Header skeleton */}
      <div className="flex items-center gap-2 p-2 border-b border-border/20 bg-background/50">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-6 w-32 rounded-full" />
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-7" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

// Loading skeleton for metrics panel
export function MetricsSkeleton() {
  return (
    <div className="glass rounded-lg overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  )
}

// Loading skeleton for prompt input
export function PromptInputSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-[100px] w-full rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  )
}

// Full page loading skeleton
interface PlaygroundSkeletonProps {
  panelCount?: number
}

export function PlaygroundSkeleton({ panelCount = 4 }: PlaygroundSkeletonProps) {
  const cols = panelCount <= 2 ? panelCount : 2
  const rows = Math.ceil(panelCount / cols)

  return (
    <div className="h-full flex flex-col p-6 gap-4 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <div>
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Prompt input skeleton */}
      <PromptInputSkeleton />

      {/* Panels grid skeleton */}
      <div className="flex-1 min-h-0">
        <div
          className="grid gap-2 h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: panelCount }).map((_, i) => (
            <PanelSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Metrics skeleton */}
      <MetricsSkeleton />

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

// Transition wrapper for smooth state changes
interface TransitionWrapperProps {
  children: React.ReactNode
  show?: boolean
  className?: string
}

export function TransitionWrapper({
  children,
  show = true,
  className,
}: TransitionWrapperProps) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 pointer-events-none",
        className
      )}
    >
      {children}
    </div>
  )
}

// Fade in wrapper for initial load
interface FadeInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    const timeout = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {children}
    </div>
  )
}
