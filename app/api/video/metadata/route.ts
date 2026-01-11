import { NextRequest, NextResponse } from "next/server"
import { existsSync } from "fs"
import path from "path"
import os from "os"
import {
  getVideoMetadata,
  checkFfmpegAvailable,
  type VideoMetadata,
} from "@/lib/video-utils"

// Allowed video extensions
const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".wmv", ".flv"]

// Expand ~ to home directory
function expandPath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1))
  }
  return filePath
}

// Validate that the path is a video file
function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return VIDEO_EXTENSIONS.includes(ext)
}

export interface MetadataResponse {
  path: string
  metadata: VideoMetadata
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const videoPath = searchParams.get("path")

  if (!videoPath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
  }

  const expandedPath = expandPath(videoPath)

  // Validate it's a video file
  if (!isVideoFile(expandedPath)) {
    return NextResponse.json({ error: "Not a video file" }, { status: 400 })
  }

  // Check if video exists
  if (!existsSync(expandedPath)) {
    return NextResponse.json({ error: "Video file not found" }, { status: 404 })
  }

  // Check if ffprobe is available
  const { ffprobe } = await checkFfmpegAvailable()
  if (!ffprobe) {
    return NextResponse.json(
      { error: "ffprobe not available on this system" },
      { status: 503 }
    )
  }

  try {
    const metadata = await getVideoMetadata(expandedPath)
    const response: MetadataResponse = {
      path: videoPath,
      metadata,
    }
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("Metadata extraction failed:", error)
    return NextResponse.json(
      { error: "Failed to extract metadata" },
      { status: 500 }
    )
  }
}

// Support batch metadata requests via POST
export async function POST(req: NextRequest) {
  const { ffprobe } = await checkFfmpegAvailable()
  if (!ffprobe) {
    return NextResponse.json(
      { error: "ffprobe not available on this system" },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const paths: string[] = body.paths

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: "Missing paths array" }, { status: 400 })
    }

    // Limit batch size to prevent abuse
    if (paths.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 files per batch request" },
        { status: 400 }
      )
    }

    const results: Record<string, VideoMetadata | { error: string }> = {}

    // Process files in parallel with concurrency limit
    const CONCURRENCY = 5
    for (let i = 0; i < paths.length; i += CONCURRENCY) {
      const batch = paths.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.all(
        batch.map(async (videoPath) => {
          const expandedPath = expandPath(videoPath)

          if (!isVideoFile(expandedPath)) {
            return { path: videoPath, result: { error: "Not a video file" } }
          }

          if (!existsSync(expandedPath)) {
            return { path: videoPath, result: { error: "File not found" } }
          }

          try {
            const metadata = await getVideoMetadata(expandedPath)
            return { path: videoPath, result: metadata }
          } catch {
            return { path: videoPath, result: { error: "Failed to extract metadata" } }
          }
        })
      )

      for (const { path, result } of batchResults) {
        results[path] = result
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Batch metadata extraction failed:", error)
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}
