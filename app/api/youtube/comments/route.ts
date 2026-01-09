import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// YouTube API types for comment threads
interface YouTubeCommentAuthor {
  displayName: string
  profileImageUrl: string
  channelUrl: string
}

interface YouTubeCommentSnippet {
  authorDisplayName: string
  authorProfileImageUrl: string
  authorChannelUrl: string
  textDisplay: string
  textOriginal: string
  likeCount: number
  publishedAt: string
  updatedAt: string
}

interface YouTubeComment {
  id: string
  snippet: YouTubeCommentSnippet
}

interface YouTubeCommentThreadSnippet {
  videoId: string
  topLevelComment: YouTubeComment
  canReply: boolean
  totalReplyCount: number
  isPublic: boolean
}

interface YouTubeCommentThread {
  id: string
  snippet: YouTubeCommentThreadSnippet
  replies?: {
    comments: YouTubeComment[]
  }
}

interface YouTubeCommentResponse {
  items: YouTubeCommentThread[]
  nextPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

// Simplified comment type for the frontend
export interface CommentData {
  id: string
  author: {
    name: string
    avatar: string
    channelUrl: string
  }
  content: string
  likes: number
  date: string
  publishedAt: string
  replyCount: number
  replies: CommentData[]
}

export interface CommentsResponse {
  comments: CommentData[]
  nextPageToken?: string
  totalResults: number
  error?: string
}

function getApiKey(request: NextRequest): string | null {
  const clientKey = request.headers.get("x-youtube-api-key")
  if (clientKey) return clientKey
  return process.env.YOUTUBE_API_KEY || null
}

// Format date to relative time string
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`
  return "Just now"
}

// Transform YouTube comment to our format
function transformComment(comment: YouTubeComment): CommentData {
  return {
    id: comment.id,
    author: {
      name: comment.snippet.authorDisplayName,
      avatar: comment.snippet.authorProfileImageUrl,
      channelUrl: comment.snippet.authorChannelUrl,
    },
    content: comment.snippet.textDisplay,
    likes: comment.snippet.likeCount,
    date: formatRelativeDate(comment.snippet.publishedAt),
    publishedAt: comment.snippet.publishedAt,
    replyCount: 0,
    replies: [],
  }
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)

  if (!apiKey) {
    return NextResponse.json<CommentsResponse>(
      { comments: [], totalResults: 0, error: "YouTube API key not configured" },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const maxResults = searchParams.get("maxResults") || "20"
  const order = searchParams.get("order") || "relevance" // relevance or time
  const pageToken = searchParams.get("pageToken")

  if (!videoId) {
    return NextResponse.json<CommentsResponse>(
      { comments: [], totalResults: 0, error: "Video ID is required" },
      { status: 400 }
    )
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,replies",
      videoId,
      maxResults: Math.min(parseInt(maxResults), 100).toString(),
      order,
      textFormat: "html",
      key: apiKey,
    })

    if (pageToken) {
      params.set("pageToken", pageToken)
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`,
      { next: { revalidate: 300 } }
    )

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error?.message || "YouTube API error"

      // Handle disabled comments
      if (response.status === 403 && errorMessage.includes("disabled comments")) {
        return NextResponse.json<CommentsResponse>(
          { comments: [], totalResults: 0, error: "Comments are disabled for this video" },
          { status: 200 }
        )
      }

      return NextResponse.json<CommentsResponse>(
        { comments: [], totalResults: 0, error: errorMessage },
        { status: response.status }
      )
    }

    const data: YouTubeCommentResponse = await response.json()

    const comments: CommentData[] = data.items.map((thread) => {
      const topComment = transformComment(thread.snippet.topLevelComment)
      topComment.replyCount = thread.snippet.totalReplyCount

      // Include first few replies if available
      if (thread.replies?.comments) {
        topComment.replies = thread.replies.comments.map(transformComment)
      }

      return topComment
    })

    return NextResponse.json<CommentsResponse>(
      {
        comments,
        nextPageToken: data.nextPageToken,
        totalResults: data.pageInfo.totalResults,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("YouTube comments error:", error)
    return NextResponse.json<CommentsResponse>(
      { comments: [], totalResults: 0, error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}
