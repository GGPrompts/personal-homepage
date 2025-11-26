import { FeedItem, REDDIT_SUBREDDITS } from "../types"

interface RedditPost {
  data: {
    id: string
    title: string
    url: string
    permalink: string
    author: string
    score: number
    num_comments: number
    created_utc: number
    subreddit: string
    is_self: boolean
    selftext?: string
    link_flair_text?: string
  }
}

interface RedditResponse {
  data: {
    children: RedditPost[]
  }
}

async function fetchSubreddit(
  subreddit: string,
  limit: number = 5
): Promise<FeedItem[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: {
          // Reddit requires a User-Agent
          "User-Agent": "personal-homepage-feed/1.0",
        },
        next: { revalidate: 900 }, // 15 min cache
      }
    )

    if (!res.ok) {
      console.warn(`Reddit r/${subreddit} error: ${res.status}`)
      return []
    }

    const data: RedditResponse = await res.json()

    return data.data.children
      .filter((post) => {
        // Filter out stickied/pinned posts and ads
        const d = post.data
        return d.title && !d.title.includes("[Megathread]")
      })
      .map((post): FeedItem => {
        const d = post.data
        return {
          id: `reddit-${d.id}`,
          title: d.title,
          url: d.is_self
            ? `https://reddit.com${d.permalink}`
            : d.url,
          source: "reddit",
          author: d.author,
          score: d.score,
          commentCount: d.num_comments,
          commentsUrl: `https://reddit.com${d.permalink}`,
          createdAt: new Date(d.created_utc * 1000).toISOString(),
          subreddit: d.subreddit,
          tags: d.link_flair_text ? [d.link_flair_text.toLowerCase()] : [],
        }
      })
  } catch (error) {
    console.error(`Failed to fetch r/${subreddit}:`, error)
    return []
  }
}

export async function fetchReddit(
  limitPerSubreddit: number = 5,
  customSubreddits?: string[]
): Promise<FeedItem[]> {
  try {
    const subreddits = customSubreddits && customSubreddits.length > 0
      ? customSubreddits
      : REDDIT_SUBREDDITS

    // Fetch all subreddits in parallel
    const results = await Promise.all(
      subreddits.map((sub) => fetchSubreddit(sub, limitPerSubreddit))
    )

    // Flatten and return
    return results.flat()
  } catch (error) {
    console.error("Failed to fetch Reddit:", error)
    return []
  }
}
