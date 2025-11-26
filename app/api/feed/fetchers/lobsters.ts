import { FeedItem } from "../types"

interface LobstersItem {
  short_id: string
  title: string
  url: string
  created_at: string
  score: number
  comment_count: number
  comments_url: string
  submitter_user: {
    username: string
  }
  tags: string[]
}

export async function fetchLobsters(limit: number = 20): Promise<FeedItem[]> {
  try {
    const res = await fetch("https://lobste.rs/hottest.json", {
      next: { revalidate: 900 }, // 15 min cache
    })

    if (!res.ok) {
      throw new Error(`Lobsters API error: ${res.status}`)
    }

    const items: LobstersItem[] = await res.json()

    return items.slice(0, limit).map((item): FeedItem => ({
      id: `lobsters-${item.short_id}`,
      title: item.title,
      url: item.url || item.comments_url, // Some are text posts
      source: "lobsters",
      author: item.submitter_user.username,
      score: item.score,
      commentCount: item.comment_count,
      commentsUrl: item.comments_url,
      createdAt: item.created_at,
      tags: item.tags,
    }))
  } catch (error) {
    console.error("Failed to fetch Lobsters:", error)
    return []
  }
}
