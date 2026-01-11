import { NextRequest, NextResponse } from "next/server"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import path from "path"
import os from "os"
import {
  getThumbnailPath,
  thumbnailExists,
  generateSmartThumbnail,
  checkFfmpegAvailable,
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

  // Check if ffmpeg is available
  const { ffmpeg } = await checkFfmpegAvailable()
  if (!ffmpeg) {
    return NextResponse.json(
      { error: "ffmpeg not available on this system" },
      { status: 503 }
    )
  }

  const thumbnailPath = getThumbnailPath(expandedPath)

  // Generate thumbnail if not cached
  if (!thumbnailExists(expandedPath)) {
    try {
      await generateSmartThumbnail(expandedPath, thumbnailPath)
    } catch (error) {
      console.error("Thumbnail generation failed:", error)
      return NextResponse.json(
        { error: "Failed to generate thumbnail" },
        { status: 500 }
      )
    }
  }

  // Read and return the thumbnail
  try {
    const thumbnail = await readFile(thumbnailPath)
    return new NextResponse(thumbnail, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error("Failed to read thumbnail:", error)
    return NextResponse.json({ error: "Failed to read thumbnail" }, { status: 500 })
  }
}
