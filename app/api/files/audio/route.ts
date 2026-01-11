import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"

// Expand ~ to home directory
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    return path.join(home, filePath.slice(1))
  }
  return filePath
}

// Security: Prevent path traversal attacks
function isPathSafe(requestedPath: string): boolean {
  const normalizedPath = path.normalize(requestedPath)

  // Block obvious traversal attempts
  if (normalizedPath.includes("..")) {
    const segments = normalizedPath.split(path.sep)
    if (segments.includes("..")) return false
  }

  // Block system directories
  const blockedPaths = ["/etc", "/var", "/usr", "/bin", "/sbin", "/boot", "/root"]
  for (const blocked of blockedPaths) {
    if (normalizedPath.startsWith(blocked + path.sep) || normalizedPath === blocked) {
      return false
    }
  }

  return true
}

// Audio MIME types
const AUDIO_MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  webm: "audio/webm",
  flac: "audio/flac",
  aac: "audio/aac",
  opus: "audio/opus",
  wma: "audio/x-ms-wma",
}

// Max audio file size (50MB)
const MAX_AUDIO_SIZE = 50 * 1024 * 1024

// GET /api/files/audio - Serve audio as base64 data URI
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      )
    }

    // Expand ~ and resolve path
    const expandedPath = expandTilde(filePath)
    const resolvedPath = path.resolve(expandedPath)

    // Security check
    if (!isPathSafe(resolvedPath)) {
      return NextResponse.json(
        { error: "Access denied: Path is not allowed" },
        { status: 403 }
      )
    }

    // Check if file exists
    try {
      await fs.access(resolvedPath)
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Get file extension and validate it's an audio file
    const ext = path.extname(resolvedPath).toLowerCase().slice(1)
    const mimeType = AUDIO_MIME_TYPES[ext]

    if (!mimeType) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          message: `Only audio files are allowed: ${Object.keys(AUDIO_MIME_TYPES).join(", ")}`,
          extension: ext,
        },
        { status: 400 }
      )
    }

    // Check file size
    const stats = await fs.stat(resolvedPath)
    if (stats.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large (max 50MB)" },
        { status: 400 }
      )
    }

    // Read the file and convert to base64
    const fileBuffer = await fs.readFile(resolvedPath)
    const base64 = fileBuffer.toString("base64")
    const dataUri = `data:${mimeType};base64,${base64}`

    return NextResponse.json({
      dataUri,
      mimeType,
      size: fileBuffer.length,
      path: resolvedPath,
    })
  } catch (error) {
    console.error("Error serving audio:", error)
    return NextResponse.json(
      { error: "Failed to serve audio" },
      { status: 500 }
    )
  }
}
