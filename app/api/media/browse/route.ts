import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"
import { stat } from "fs/promises"

// Supported media types
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".heic", ".avif"]
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma", ".opus"]
const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv", ".m4v"]

export interface MediaFile {
  name: string
  path: string
  type: "image" | "audio" | "video" | "directory"
  size: number
  modified: string
  extension: string
}

function getMediaType(ext: string): "image" | "audio" | "video" | null {
  const lowerExt = ext.toLowerCase()
  if (IMAGE_EXTENSIONS.includes(lowerExt)) return "image"
  if (AUDIO_EXTENSIONS.includes(lowerExt)) return "audio"
  if (VIDEO_EXTENSIONS.includes(lowerExt)) return "video"
  return null
}

function getAllowedExtensions(mediaType?: string): string[] {
  switch (mediaType) {
    case "image":
      return IMAGE_EXTENSIONS
    case "audio":
      return AUDIO_EXTENSIONS
    case "video":
      return VIDEO_EXTENSIONS
    default:
      return [...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]
  }
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

// GET - List directory contents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dirPath = searchParams.get("path") || "~"
    const mediaType = searchParams.get("type") // image, audio, video, or all
    const recursive = searchParams.get("recursive") === "true"
    const limit = parseInt(searchParams.get("limit") || "100", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const expandedPath = expandPath(dirPath)

    // Security: Validate path is within allowed media directories
    if (!isPathWithinAllowedDirs(expandedPath)) {
      return NextResponse.json(
        { error: "Access denied: Path is outside allowed media directories" },
        { status: 403 }
      )
    }

    // Check if directory exists
    try {
      const stats = await stat(expandedPath)
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: "Path is not a directory" },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: "Directory does not exist" },
        { status: 404 }
      )
    }

    const allowedExtensions = getAllowedExtensions(mediaType || undefined)
    const files: MediaFile[] = []

    async function scanDirectory(dir: string, depth: number = 0) {
      if (!recursive && depth > 0) return
      if (depth > 5) return // Max recursion depth

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          // Skip hidden files/directories
          if (entry.name.startsWith(".")) continue

          const fullPath = path.join(dir, entry.name)

          if (entry.isDirectory()) {
            // Add directory entry if not filtering by type
            if (!mediaType) {
              files.push({
                name: entry.name,
                path: fullPath,
                type: "directory",
                size: 0,
                modified: "",
                extension: "",
              })
            }

            // Recurse into subdirectories
            if (recursive) {
              await scanDirectory(fullPath, depth + 1)
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            const fileMediaType = getMediaType(ext)

            if (fileMediaType && allowedExtensions.includes(ext)) {
              try {
                const fileStats = await stat(fullPath)
                files.push({
                  name: entry.name,
                  path: fullPath,
                  type: fileMediaType,
                  size: fileStats.size,
                  modified: fileStats.mtime.toISOString(),
                  extension: ext,
                })
              } catch {
                // Skip files we can't stat
              }
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    await scanDirectory(expandedPath)

    // Sort: directories first, then by name
    files.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1
      if (a.type !== "directory" && b.type === "directory") return 1
      return a.name.localeCompare(b.name, undefined, { numeric: true })
    })

    // Paginate
    const total = files.length
    const paginatedFiles = files.slice(offset, offset + limit)

    return NextResponse.json({
      path: expandedPath,
      files: paginatedFiles,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error("Error browsing directory:", error)
    return NextResponse.json(
      { error: "Failed to browse directory" },
      { status: 500 }
    )
  }
}

// POST - Get file metadata or thumbnail
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: filePath } = body

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

    switch (action) {
      case "metadata": {
        const stats = await stat(expandedPath)
        const ext = path.extname(filePath).toLowerCase()
        const mediaType = getMediaType(ext)

        return NextResponse.json({
          name: path.basename(filePath),
          path: expandedPath,
          type: mediaType,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
          extension: ext,
        })
      }

      case "exists": {
        try {
          await stat(expandedPath)
          return NextResponse.json({ exists: true })
        } catch {
          return NextResponse.json({ exists: false })
        }
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
