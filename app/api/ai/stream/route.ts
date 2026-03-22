import { NextRequest } from 'next/server'
import { openSync, readSync, fstatSync, closeSync } from 'fs'
import { parseJsonlEntries } from '@/lib/ai/jsonl-parser'

const POLL_INTERVAL = 500
const INITIAL_READ_SIZE = 200 * 1024

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')

  if (!path) {
    return new Response('Missing path parameter', { status: 400 })
  }

  if (!path.includes('.claude/') || !path.endsWith('.jsonl')) {
    return new Response('Invalid path', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let offset = 0
      let pollTimer: ReturnType<typeof setInterval> | null = null
      let closed = false
      let fileFound = false

      function sendEvent(event: string, data: unknown) {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          cleanup()
        }
      }

      function cleanup() {
        closed = true
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      function tryReadFile() {
        let fd: number
        try {
          fd = openSync(path!, 'r')
        } catch {
          if (!fileFound) {
            sendEvent('waiting', { message: 'Waiting for session to start...' })
          }
          return
        }

        try {
          const stat = fstatSync(fd)
          const fileSize = stat.size

          if (!fileFound) {
            fileFound = true
            let readFrom = 0
            if (fileSize > INITIAL_READ_SIZE) {
              readFrom = fileSize - INITIAL_READ_SIZE
            }

            const bufSize = fileSize - readFrom
            const buf = Buffer.alloc(bufSize)
            readSync(fd, buf, 0, bufSize, readFrom)

            let text = buf.toString('utf-8')

            if (readFrom > 0) {
              const newlineIdx = text.indexOf('\n')
              if (newlineIdx !== -1) {
                text = text.slice(newlineIdx + 1)
              }
            }

            const entries = parseJsonlEntries(text)
            sendEvent('initial', { entries })
            offset = fileSize
            return
          }
        } finally {
          closeSync(fd)
        }
      }

      function poll() {
        if (closed) return

        if (!fileFound) {
          tryReadFile()
          return
        }

        let fd: number
        try {
          fd = openSync(path!, 'r')
        } catch {
          return
        }

        try {
          const stat = fstatSync(fd)
          const currentSize = stat.size

          if (currentSize < offset) {
            offset = 0
            sendEvent('reset', {})
          }

          if (currentSize > offset) {
            const readSize = currentSize - offset
            const buf = Buffer.alloc(readSize)
            readSync(fd, buf, 0, readSize, offset)

            const text = buf.toString('utf-8')
            const entries = parseJsonlEntries(text)

            if (entries.length > 0) {
              sendEvent('update', { entries })
            }

            offset = currentSize
          }
        } finally {
          closeSync(fd)
        }
      }

      tryReadFile()
      pollTimer = setInterval(poll, POLL_INTERVAL)

      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
