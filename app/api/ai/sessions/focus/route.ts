import { NextRequest, NextResponse } from 'next/server'
import { kittyRemote } from '@/lib/terminal-native'

export async function POST(request: NextRequest) {
  try {
    const { windowId, socket } = await request.json() as { windowId?: number; socket?: string }

    if (typeof windowId !== 'number') {
      return NextResponse.json({ error: 'windowId is required' }, { status: 400 })
    }

    kittyRemote(['focus-window', '--match', `id:${windowId}`], 5000, socket)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to focus window'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
