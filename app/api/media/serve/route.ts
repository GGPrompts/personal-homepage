import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import { stat } from "fs/promises"

// MIME types for media files
const MIME_TYPES: Record<string, string> = {
  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".avif": "image/avif",
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wma": "audio/x-ms-wma",
  ".opus": "audio/opus",
  // Video
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".m4v": "video/mp4",
}

// Expand home directory
function expandPath(inputPath: string): string {
  if (inputPath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    return path.join(home, inputPath.slice(1))
  }
  return inputPath
}

// Default allowed base directories for media files
const DEFAULT_ALLOWED_DIRS = ["~/Pictures", "~/Music", "~/Videos"]

// Validate path is within allowed directories (prevents path traversal attacks)
function isPathWithinAllowedDirs(requestedPath: string): boolean {
  const normalizedRequested = path.normalize(requestedPath)

  for (const allowedDir of DEFAULT_ALLOWED_DIRS) {
    const expandedAllowed = path.normalize(expandPath(allowedDir))
    if (normalizedRequested.startsWith(expandedAllowed + path.sep) ||
        normalizedRequested === expandedAllowed) {
      return true
    }
  }
  return false
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    const expandedPath = expandPath(filePath)

    // Security: Validate path is within allowed media directories
    if (!isPathWithinAllowedDirs(expandedPath)) {
      return NextResponse.json(
        { error: "Access denied: Path is outside allowed media directories" },
        { status: 403 }
      )
    }

    // Check if file exists
    let fileStats
    try {
      fileStats = await stat(expandedPath)
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (!fileStats.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 })
    }

    // Get MIME type
    const ext = path.extname(expandedPath).toLowerCase()
    const mimeType = MIME_TYPES[ext] || "application/octet-stream"

    // Handle range requests for video/audio streaming
    const rangeHeader = request.headers.get("range")
    const fileSize = fileStats.size

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const stream = fs.createReadStream(expandedPath, { start, end })
      const chunks: Buffer[] = []

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }

      const buffer = Buffer.concat(chunks)

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": mimeType,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    // Serve full file
    const stream = fs.createReadStream(expandedPath)
    const chunks: Buffer[] = []

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
