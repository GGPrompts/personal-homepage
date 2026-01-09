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

// Max file size for content viewing (1MB)
const MAX_FILE_SIZE = 1024 * 1024

// GET /api/files/content - Get file content
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

    // Check if file exists and get stats
    let stats
    try {
      stats = await fs.stat(resolvedPath)
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if it's a directory
    if (stats.isDirectory()) {
      return NextResponse.json(
        { error: "Path is a directory, not a file" },
        { status: 400 }
      )
    }

    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 1MB for viewing)" },
        { status: 400 }
      )
    }

    // Read the file
    const content = await fs.readFile(resolvedPath, "utf-8")

    return NextResponse.json({
      path: filePath,
      content,
      fileName: path.basename(filePath),
      fileSize: stats.size,
      modified: stats.mtime.toISOString(),
    })
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    console.error("Error reading file content:", error)
    return NextResponse.json(
      { error: "Failed to read file content" },
      { status: 500 }
    )
  }
}
