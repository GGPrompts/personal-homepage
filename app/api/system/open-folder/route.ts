import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'

/**
 * POST /api/system/open-folder
 * Opens a folder in the system's default file manager
 */
export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json()

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      )
    }

    // Validate path exists
    if (!existsSync(path)) {
      return NextResponse.json(
        { error: 'Path does not exist' },
        { status: 404 }
      )
    }

    // Security: Only allow opening directories, not files
    const stats = require('fs').statSync(path)
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path must be a directory' },
        { status: 400 }
      )
    }

    // Determine the command based on the platform
    const platform = process.platform
    let command: string
    let args: string[]

    if (platform === 'darwin') {
      // macOS
      command = 'open'
      args = [path]
    } else if (platform === 'win32') {
      // Windows
      command = 'explorer'
      args = [path]
    } else {
      // Linux/WSL - check if we're in WSL and use explorer.exe, otherwise xdg-open
      const isWSL = process.env.WSL_DISTRO_NAME ||
                   require('fs').existsSync('/proc/sys/fs/binfmt_misc/WSLInterop')
      if (isWSL) {
        // Convert Linux path to Windows UNC path: /home/user -> \\wsl$\Ubuntu\home\user
        const distro = process.env.WSL_DISTRO_NAME || 'Ubuntu'
        const winPath = `\\\\wsl$\\${distro}${path.replace(/\//g, '\\')}`
        command = 'explorer.exe'
        args = [winPath]
      } else {
        command = 'xdg-open'
        args = [path]
      }
    }

    // Spawn the process detached so it doesn't block
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()

    return NextResponse.json({
      success: true,
      path,
      platform,
    })
  } catch (error) {
    console.error('Failed to open folder:', error)
    return NextResponse.json(
      { error: 'Failed to open folder' },
      { status: 500 }
    )
  }
}
