import { FeedItem } from "../types"

interface HNItem {
  id: number
  title: string
  url?: string
  by: string
  score: number
  descendants?: number
  time: number
  type: string
}

export async function fetchHackerNews(limit: number = 30): Promise<FeedItem[]> {
  try {
    // Get top story IDs
    const topStoriesRes = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { next: { revalidate: 900 } } // 15 min cache
    )

    if (!topStoriesRes.ok) {
      throw new Error(`HN API error: ${topStoriesRes.status}`)
    }

    const storyIds: number[] = await topStoriesRes.json()
    const topIds = storyIds.slice(0, limit)

    // Fetch each story in parallel
    const stories = await Promise.all(
      topIds.map(async (id): Promise<FeedItem | null> => {
        try {
          const res = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            { next: { revalidate: 900 } }
          )

          if (!res.ok) return null

          const item: HNItem = await res.json()

          // Skip if no title or is a job/poll
          if (!item.title || item.type === "job" || item.type === "poll") {
            return null
          }

          return {
            id: `hn-${item.id}`,
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            source: "hackernews",
            author: item.by,
            score: item.score || 0,
            commentCount: item.descendants || 0,
            commentsUrl: `https://news.ycombinator.com/item?id=${item.id}`,
            createdAt: new Date(item.time * 1000).toISOString(),
          }
        } catch {
          return null
        }
      })
    )

    return stories.filter((s): s is FeedItem => s !== null)
  } catch (error) {
    console.error("Failed to fetch Hacker News:", error)
    return []
  }
}
