import { NextRequest, NextResponse } from 'next/server'
import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

const CACHE_DIR = join(process.env.HOME || '/tmp', '.cache', 'homepage-tts')
const VOICE = 'en-US-AndrewNeural'
const RATE = '+20%'

// Track the current mpv process so DELETE can kill it
let currentMpv: ReturnType<typeof spawn> | null = null

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json() as { text?: string }

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Check edge-tts is available
    try {
      execSync('which edge-tts', { stdio: 'ignore' })
    } catch {
      return NextResponse.json({ error: 'edge-tts not installed' }, { status: 500 })
    }

    // Ensure cache dir exists
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }

    // Hash for cache key
    const hash = createHash('md5').update(VOICE).update(RATE).update(text).digest('hex')
    const mp3Path = join(CACHE_DIR, `${hash}.mp3`)

    // Generate if not cached
    if (!existsSync(mp3Path)) {
      try {
        execSync(
          `edge-tts --voice "${VOICE}" --rate "${RATE}" --write-media "${mp3Path}" --text ${JSON.stringify(text)}`,
          { timeout: 30000, stdio: 'pipe' }
        )
      } catch {
        return NextResponse.json({ error: 'edge-tts generation failed' }, { status: 500 })
      }
    }

    // Kill any currently playing audio
    if (currentMpv) {
      try { currentMpv.kill() } catch { /* already dead */ }
      currentMpv = null
    }

    // Play with mpv (non-blocking)
    const child = spawn('mpv', ['--no-video', '--really-quiet', mp3Path], {
      stdio: 'ignore',
      detached: false,
    })
    currentMpv = child

    // Wait for playback to finish
    await new Promise<void>((resolve) => {
      child.on('close', () => {
        if (currentMpv === child) currentMpv = null
        resolve()
      })
      child.on('error', () => {
        if (currentMpv === child) currentMpv = null
        resolve()
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  if (currentMpv) {
    try { currentMpv.kill() } catch { /* already dead */ }
    currentMpv = null
  }
  return NextResponse.json({ ok: true })
}
