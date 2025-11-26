import { NextRequest, NextResponse } from "next/server"
import { FeedItem, FeedResponse, FeedSource, SOURCE_CONFIG } from "./types"
import { fetchHackerNews } from "./fetchers/hackernews"
import { fetchGitHub } from "./fetchers/github"
import { fetchReddit } from "./fetchers/reddit"
import { fetchLobsters } from "./fetchers/lobsters"
import { fetchDevTo } from "./fetchers/devto"

export const dynamic = "force-dynamic"
export const revalidate = 900 // 15 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sourcesParam = searchParams.get("sources")
  const subredditsParam = searchParams.get("subreddits")

  // Parse requested sources, default to all
  const requestedSources: FeedSource[] = sourcesParam
    ? (sourcesParam.split(",") as FeedSource[])
    : (Object.keys(SOURCE_CONFIG) as FeedSource[])

  // Parse custom subreddits if provided
  const customSubreddits = subredditsParam
    ? subredditsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined

  // Validate sources
  const validSources = requestedSources.filter(
    (s) => s in SOURCE_CONFIG
  )

  if (validSources.length === 0) {
    return NextResponse.json(
      { error: "No valid sources specified" },
      { status: 400 }
    )
  }

  // Fetch from all requested sources in parallel
  const fetchPromises: Promise<{ source: FeedSource; items: FeedItem[]; error?: string }>[] = []

  if (validSources.includes("hackernews")) {
    fetchPromises.push(
      fetchHackerNews(SOURCE_CONFIG.hackernews.limit)
        .then((items) => ({ source: "hackernews" as FeedSource, items }))
        .catch((e) => ({ source: "hackernews" as FeedSource, items: [], error: e.message }))
    )
  }

  if (validSources.includes("github")) {
    fetchPromises.push(
      fetchGitHub(SOURCE_CONFIG.github.limit)
        .then((items) => ({ source: "github" as FeedSource, items }))
        .catch((e) => ({ source: "github" as FeedSource, items: [], error: e.message }))
    )
  }

  if (validSources.includes("reddit")) {
    fetchPromises.push(
      fetchReddit(5, customSubreddits) // 5 per subreddit
        .then((items) => ({ source: "reddit" as FeedSource, items }))
        .catch((e) => ({ source: "reddit" as FeedSource, items: [], error: e.message }))
    )
  }

  if (validSources.includes("lobsters")) {
    fetchPromises.push(
      fetchLobsters(SOURCE_CONFIG.lobsters.limit)
        .then((items) => ({ source: "lobsters" as FeedSource, items }))
        .catch((e) => ({ source: "lobsters" as FeedSource, items: [], error: e.message }))
    )
  }

  if (validSources.includes("devto")) {
    fetchPromises.push(
      fetchDevTo(SOURCE_CONFIG.devto.limit)
        .then((items) => ({ source: "devto" as FeedSource, items }))
        .catch((e) => ({ source: "devto" as FeedSource, items: [], error: e.message }))
    )
  }

  const results = await Promise.all(fetchPromises)

  // Combine all items
  const allItems: FeedItem[] = results.flatMap((r) => r.items)

  // Sort by score (descending) then by date (newest first)
  allItems.sort((a, b) => {
    // Normalize scores across sources (HN/Reddit scores vs GitHub stars)
    const scoreA = a.score
    const scoreB = b.score

    if (scoreB !== scoreA) {
      return scoreB - scoreA
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const response: FeedResponse = {
    items: allItems,
    fetchedAt: new Date().toISOString(),
    sources: results.map((r) => ({
      source: r.source,
      count: r.items.length,
      error: r.error,
    })),
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  })
}
