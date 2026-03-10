import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function PromptCardSkeleton() {
  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-4 w-20" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-12 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PromptGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PromptCardSkeleton key={i} />
      ))}
    </div>
  )
}
