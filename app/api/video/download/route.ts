/**
 * Video Download API using yt-dlp
 *
 * POST - Start a new download with format options
 * GET - Get status of current downloads or stream progress via SSE
 */

import { NextRequest, NextResponse } from "next/server"
import { spawn, type ChildProcess } from "child_process"
import * as path from "path"
import * as os from "os"
import * as fs from "fs/promises"

// Download format presets
export type AudioFormat = "mp3" | "m4a" | "opus" | "flac" | "best"
export type VideoFormat = "mp4" | "webm" | "best"
export type VideoQuality = "2160" | "1440" | "1080" | "720" | "480" | "best"
export type DownloadType = "audio" | "video"

// Allowed values for runtime validation (prevents command injection)
const ALLOWED_AUDIO_FORMATS = new Set(["mp3", "m4a", "opus", "flac", "best"])
const ALLOWED_VIDEO_FORMATS = new Set(["mp4", "webm", "best"])
const ALLOWED_VIDEO_QUALITIES = new Set(["2160", "1440", "1080", "720", "480", "best"])
const ALLOWED_DOWNLOAD_TYPES = new Set(["audio", "video"])

export interface DownloadRequest {
  url: string
  type: DownloadType
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  videoQuality?: VideoQuality
  outputDir?: string
  filename?: string
}

export interface DownloadProgress {
  id: string
  url: string
  status: "pending" | "downloading" | "processing" | "complete" | "error"
  progress: number // 0-100
  speed?: string
  eta?: string
  filename?: string
  filesize?: string
  error?: string
  outputPath?: string
}

// In-memory download tracking
const activeDownloads = new Map<string, {
  progress: DownloadProgress
  process?: ChildProcess
  controller?: AbortController
}>()

// Generate unique download ID
function generateId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Get default download directory
async function getDownloadDir(type: DownloadType): Promise<string> {
  const homeDir = os.homedir()
  const defaultDir = type === "audio"
    ? path.join(homeDir, "Music", "yt-downloads")
    : path.join(homeDir, "Videos", "yt-downloads")

  // Ensure directory exists
  await fs.mkdir(defaultDir, { recursive: true })
  return defaultDir
}

// Build yt-dlp arguments based on options
function buildYtDlpArgs(request: DownloadRequest, outputTemplate: string): string[] {
  const args: string[] = [
    "--newline", // Output progress on new lines for parsing
    "--no-warnings",
    "--progress",
    "--progress-template", "download:[progress] %(progress._percent_str)s of %(progress._total_bytes_estimate_str)s at %(progress._speed_str)s ETA %(progress._eta_str)s",
    "-o", outputTemplate,
  ]

  if (request.type === "audio") {
    args.push("-x") // Extract audio
    if (request.audioFormat && request.audioFormat !== "best") {
      args.push("--audio-format", request.audioFormat)
      args.push("--audio-quality", "0") // Best quality
    }
    // Always get best audio
    args.push("-f", "bestaudio")
  } else {
    // Video download
    const quality = request.videoQuality || "best"
    const format = request.videoFormat || "mp4"

    if (quality === "best") {
      args.push("-f", `bestvideo[ext=${format}]+bestaudio/best[ext=${format}]/best`)
    } else {
      args.push("-f", `bestvideo[height<=${quality}][ext=${format}]+bestaudio/best[height<=${quality}][ext=${format}]/best[height<=${quality}]`)
    }

    // Merge to mp4/webm container
    args.push("--merge-output-format", format)
  }

  args.push(request.url)
  return args
}

// Parse yt-dlp output for progress info
function parseProgress(line: string): Partial<DownloadProgress> | null {
  // Match our custom progress template
  const progressMatch = line.match(/\[progress\]\s*([\d.]+)%\s*of\s*([^\s]+)\s*at\s*([^\s]+)\s*ETA\s*(.+)/)
  if (progressMatch) {
    return {
      progress: parseFloat(progressMatch[1]) || 0,
      filesize: progressMatch[2],
      speed: progressMatch[3],
      eta: progressMatch[4].trim(),
    }
  }

  // Match destination filename
  const destMatch = line.match(/\[(?:download|Merger)\]\s*Destination:\s*(.+)/)
  if (destMatch) {
    return {
      filename: path.basename(destMatch[1]),
      outputPath: destMatch[1],
    }
  }

  // Match merger progress
  if (line.includes("[Merger]") || line.includes("[FixupM4a]") || line.includes("[ExtractAudio]")) {
    return {
      status: "processing",
    }
  }

  // Match completion
  if (line.includes("has already been downloaded") || line.includes("[download] 100%")) {
    return {
      status: "complete",
      progress: 100,
    }
  }

  return null
}

// Start a download
async function startDownload(request: DownloadRequest): Promise<string> {
  const id = generateId()
  const outputDir = request.outputDir || await getDownloadDir(request.type)

  // Template for output filename
  const outputTemplate = path.join(
    outputDir,
    request.filename || "%(title)s.%(ext)s"
  )

  const args = buildYtDlpArgs(request, outputTemplate)

  const progress: DownloadProgress = {
    id,
    url: request.url,
    status: "pending",
    progress: 0,
  }

  const controller = new AbortController()

  activeDownloads.set(id, { progress, controller })

  // Spawn yt-dlp process
  try {
    const proc = spawn("yt-dlp", args, {
      signal: controller.signal,
    })

    activeDownloads.set(id, { progress, process: proc, controller })

    proc.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n")
      const download = activeDownloads.get(id)
      if (!download) return

      for (const line of lines) {
        const update = parseProgress(line)
        if (update) {
          download.progress = { ...download.progress, ...update }
          if (update.status) {
            download.progress.status = update.status as DownloadProgress["status"]
          }
          if (download.progress.progress > 0 && download.progress.status === "pending") {
            download.progress.status = "downloading"
          }
        }
      }
    })

    proc.stderr.on("data", (data: Buffer) => {
      const line = data.toString()
      const download = activeDownloads.get(id)
      if (!download) return

      // Some yt-dlp info goes to stderr
      const update = parseProgress(line)
      if (update) {
        download.progress = { ...download.progress, ...update }
      }

      // Check for actual errors
      if (line.includes("ERROR:")) {
        download.progress.status = "error"
        download.progress.error = line.replace("ERROR:", "").trim()
      }
    })

    proc.on("close", (code) => {
      const download = activeDownloads.get(id)
      if (!download) return

      if (code === 0) {
        download.progress.status = "complete"
        download.progress.progress = 100
      } else if (download.progress.status !== "error") {
        download.progress.status = "error"
        download.progress.error = `Process exited with code ${code}`
      }
    })

    proc.on("error", (err) => {
      const download = activeDownloads.get(id)
      if (!download) return

      download.progress.status = "error"
      download.progress.error = err.message
    })

  } catch (err) {
    const download = activeDownloads.get(id)
    if (download) {
      download.progress.status = "error"
      download.progress.error = err instanceof Error ? err.message : "Unknown error"
    }
  }

  return id
}

// POST - Start a new download
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json()

    // Validate URL
    if (!body.url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    // Validate URL is from allowed sources (YouTube, etc.)
    const urlObj = new URL(body.url)
    const allowedHosts = [
      "youtube.com", "www.youtube.com", "youtu.be",
      "m.youtube.com", "music.youtube.com",
      "vimeo.com", "www.vimeo.com",
      "soundcloud.com", "www.soundcloud.com",
    ]

    if (!allowedHosts.some(host => urlObj.hostname === host || urlObj.hostname.endsWith("." + host))) {
      return NextResponse.json(
        { error: "URL not from an allowed source" },
        { status: 400 }
      )
    }

    // Validate download type
    if (!body.type || !ALLOWED_DOWNLOAD_TYPES.has(body.type)) {
      return NextResponse.json(
        { error: "Invalid download type" },
        { status: 400 }
      )
    }

    // Validate format options (prevent command injection)
    if (body.audioFormat && !ALLOWED_AUDIO_FORMATS.has(body.audioFormat)) {
      return NextResponse.json(
        { error: "Invalid audio format" },
        { status: 400 }
      )
    }
    if (body.videoFormat && !ALLOWED_VIDEO_FORMATS.has(body.videoFormat)) {
      return NextResponse.json(
        { error: "Invalid video format" },
        { status: 400 }
      )
    }
    if (body.videoQuality && !ALLOWED_VIDEO_QUALITIES.has(body.videoQuality)) {
      return NextResponse.json(
        { error: "Invalid video quality" },
        { status: 400 }
      )
    }

    // Disallow custom outputDir and filename from API requests (path traversal prevention)
    // These are only used internally with safe defaults
    const safeRequest: DownloadRequest = {
      url: body.url,
      type: body.type,
      audioFormat: body.audioFormat,
      videoFormat: body.videoFormat,
      videoQuality: body.videoQuality,
      // outputDir and filename are intentionally omitted - use defaults only
    }

    // Start download
    const downloadId = await startDownload(safeRequest)
    const download = activeDownloads.get(downloadId)

    return NextResponse.json({
      id: downloadId,
      status: download?.progress.status || "pending",
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start download" },
      { status: 500 }
    )
  }
}

// GET - Get download status or stream progress via SSE
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const stream = searchParams.get("stream") === "true"

  // List all downloads
  if (!id) {
    const downloads = Array.from(activeDownloads.values()).map(d => d.progress)
    return NextResponse.json({ downloads })
  }

  // Get specific download
  const download = activeDownloads.get(id)
  if (!download) {
    return NextResponse.json(
      { error: "Download not found" },
      { status: 404 }
    )
  }

  // Stream progress via SSE
  if (stream) {
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      start(controller) {
        const sendProgress = () => {
          const dl = activeDownloads.get(id)
          if (!dl) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Download not found" })}\n\n`))
            controller.close()
            return
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(dl.progress)}\n\n`))

          // Stop streaming when complete or errored
          if (dl.progress.status === "complete" || dl.progress.status === "error") {
            controller.close()
            // Clean up completed downloads after a delay
            setTimeout(() => activeDownloads.delete(id), 60000)
          } else {
            setTimeout(sendProgress, 500)
          }
        }

        sendProgress()
      },
      cancel() {
        // Client disconnected
      }
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  }

  // Return current status
  return NextResponse.json(download.progress)
}

// DELETE - Cancel a download
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "Download ID is required" },
      { status: 400 }
    )
  }

  const download = activeDownloads.get(id)
  if (!download) {
    return NextResponse.json(
      { error: "Download not found" },
      { status: 404 }
    )
  }

  // Cancel the process
  if (download.controller) {
    download.controller.abort()
  }
  if (download.process) {
    download.process.kill()
  }

  download.progress.status = "error"
  download.progress.error = "Cancelled by user"

  // Clean up
  setTimeout(() => activeDownloads.delete(id), 5000)

  return NextResponse.json({ success: true })
}
