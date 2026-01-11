import { exec } from "child_process"
import { promisify } from "util"
import { existsSync, mkdirSync } from "fs"
import { createHash } from "crypto"
import path from "path"
import os from "os"

const execAsync = promisify(exec)

// Cache directory for thumbnails
const THUMBNAIL_CACHE_DIR = path.join(os.tmpdir(), "video-thumbnails")

// Ensure cache directory exists
export function ensureCacheDir(): void {
  if (!existsSync(THUMBNAIL_CACHE_DIR)) {
    mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true })
  }
}

// Generate a hash for the video path to use as cache key
export function getVideoHash(videoPath: string): string {
  return createHash("md5").update(videoPath).digest("hex")
}

// Get the thumbnail path for a video
export function getThumbnailPath(videoPath: string): string {
  ensureCacheDir()
  const hash = getVideoHash(videoPath)
  return path.join(THUMBNAIL_CACHE_DIR, `${hash}.jpg`)
}

export interface VideoMetadata {
  duration: number // Duration in seconds
  durationFormatted: string // HH:MM:SS format
  width: number
  height: number
  codec: string
  bitrate: number
  frameRate: string
  audioCodec: string | null
  audioChannels: number | null
  fileSize: number
}

// Format duration to HH:MM:SS
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Extract metadata using ffprobe
export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`,
      { timeout: 30000 }
    )

    const data = JSON.parse(stdout)
    const format = data.format || {}
    const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "video")
    const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "audio")

    const duration = parseFloat(format.duration) || 0

    return {
      duration,
      durationFormatted: formatDuration(duration),
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      codec: videoStream?.codec_name || "unknown",
      bitrate: parseInt(format.bit_rate) || 0,
      frameRate: videoStream?.avg_frame_rate || videoStream?.r_frame_rate || "unknown",
      audioCodec: audioStream?.codec_name || null,
      audioChannels: audioStream?.channels || null,
      fileSize: parseInt(format.size) || 0,
    }
  } catch (error) {
    console.error("Failed to get video metadata:", error)
    throw new Error("Failed to extract video metadata")
  }
}

// Generate thumbnail using ffmpeg
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  options: {
    timestamp?: string // Default: 00:00:03
    width?: number // Default: 320
    quality?: number // Default: 2 (1-31, lower is better)
  } = {}
): Promise<void> {
  const { timestamp = "00:00:03", width = 320, quality = 2 } = options

  try {
    // First, try to get a frame at the specified timestamp
    // If video is shorter than timestamp, ffmpeg will use the first frame
    const cmd = `ffmpeg -ss ${timestamp} -i "${videoPath}" -frames:v 1 -vf "scale=${width}:-1" -q:v ${quality} -y "${outputPath}"`
    await execAsync(cmd, { timeout: 30000 })
  } catch (error) {
    // If that fails, try getting the first frame
    try {
      const fallbackCmd = `ffmpeg -i "${videoPath}" -frames:v 1 -vf "scale=${width}:-1" -q:v ${quality} -y "${outputPath}"`
      await execAsync(fallbackCmd, { timeout: 30000 })
    } catch (fallbackError) {
      console.error("Failed to generate thumbnail:", fallbackError)
      throw new Error("Failed to generate thumbnail")
    }
  }
}

// Check if thumbnail exists in cache
export function thumbnailExists(videoPath: string): boolean {
  const thumbnailPath = getThumbnailPath(videoPath)
  return existsSync(thumbnailPath)
}

// Generate thumbnail with smart timing (10% into video)
export async function generateSmartThumbnail(
  videoPath: string,
  outputPath: string,
  options: { width?: number; quality?: number } = {}
): Promise<void> {
  const { width = 320, quality = 2 } = options

  try {
    // Get video duration first
    const metadata = await getVideoMetadata(videoPath)

    // Calculate timestamp at 10% of the video (but at least 1 second, max 10 seconds)
    let targetTime = Math.min(Math.max(metadata.duration * 0.1, 1), 10)
    if (metadata.duration < 1) {
      targetTime = 0
    }

    const timestamp = formatTimestamp(targetTime)
    await generateThumbnail(videoPath, outputPath, { timestamp, width, quality })
  } catch {
    // Fallback to simple thumbnail generation
    await generateThumbnail(videoPath, outputPath, { width, quality })
  }
}

// Format seconds to ffmpeg timestamp format
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Check if ffmpeg and ffprobe are available
export async function checkFfmpegAvailable(): Promise<{ ffmpeg: boolean; ffprobe: boolean }> {
  const result = { ffmpeg: false, ffprobe: false }

  try {
    await execAsync("ffmpeg -version", { timeout: 5000 })
    result.ffmpeg = true
  } catch {
    // ffmpeg not available
  }

  try {
    await execAsync("ffprobe -version", { timeout: 5000 })
    result.ffprobe = true
  } catch {
    // ffprobe not available
  }

  return result
}
