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

// Max file size for writing (5MB)
const MAX_WRITE_SIZE = 5 * 1024 * 1024

interface WriteRequest {
  path: string
  content: string
  createIfMissing?: boolean
}

// POST /api/files/write - Save file content
export async function POST(request: NextRequest) {
  try {
    const body: WriteRequest = await request.json()
    const { path: filePath, content, createIfMissing = false } = body

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      )
    }

    if (content === undefined || content === null) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    // Check content size
    const contentSize = Buffer.byteLength(content, "utf-8")
    if (contentSize > MAX_WRITE_SIZE) {
      return NextResponse.json(
        { error: "Content too large (max 5MB)" },
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
    let fileExists = true
    try {
      const stats = await fs.stat(resolvedPath)
      if (stats.isDirectory()) {
        return NextResponse.json(
          { error: "Path is a directory, not a file" },
          { status: 400 }
        )
      }
    } catch {
      fileExists = false
    }

    // If file doesn't exist and createIfMissing is false, return error
    if (!fileExists && !createIfMissing) {
      return NextResponse.json(
        { error: "File not found. Set createIfMissing=true to create it." },
        { status: 404 }
      )
    }

    // If creating new file, ensure parent directory exists
    if (!fileExists) {
      const parentDir = path.dirname(resolvedPath)
      try {
        await fs.mkdir(parentDir, { recursive: true })
      } catch (err) {
        const error = err as NodeJS.ErrnoException
        if (error.code !== "EEXIST") {
          console.error("Error creating parent directory:", error)
          return NextResponse.json(
            { error: "Failed to create parent directory" },
            { status: 500 }
          )
        }
      }
    }

    // Write the file
    await fs.writeFile(resolvedPath, content, "utf-8")

    // Get updated stats
    const stats = await fs.stat(resolvedPath)

    return NextResponse.json({
      path: filePath,
      fileName: path.basename(filePath),
      fileSize: stats.size,
      modified: stats.mtime.toISOString(),
      created: !fileExists,
    })
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === "EACCES" || err.code === "EPERM") {
      return NextResponse.json(
        { error: "Permission denied: Cannot write to file" },
        { status: 403 }
      )
    }
    console.error("Error writing file:", error)
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    )
  }
}
