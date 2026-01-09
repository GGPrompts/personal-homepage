/**
 * Plugins Cache Prune API - Clean old cached plugin versions
 *
 * POST /api/plugins/cache/prune - Remove old cached plugin versions
 * Body: { marketplace?: string, keepLatest: number (default 1) }
 */

import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const homeDir = homedir()
const claudePluginCachePath = path.join(homeDir, '.claude', 'plugins', 'cache')

interface PruneRequest {
  marketplace?: string
  keepLatest?: number
}

interface VersionInfo {
  name: string
  path: string
  mtime: Date
}

export async function POST(request: NextRequest) {
  try {
    const body: PruneRequest = await request.json()
    const { marketplace, keepLatest = 1 } = body

    let removed = 0
    let freedBytes = 0

    let marketplacesToPrune: string[]
    try {
      marketplacesToPrune = marketplace
        ? [marketplace]
        : await fs.readdir(claudePluginCachePath)
    } catch {
      // Cache directory doesn't exist
      return Response.json({
        success: true,
        removed: 0,
        freedBytes: 0,
        freedMB: '0.00'
      })
    }

    for (const mpDir of marketplacesToPrune) {
      const mpPath = path.join(claudePluginCachePath, mpDir)
      try {
        const stat = await fs.stat(mpPath)
        if (!stat.isDirectory()) continue
      } catch { continue }

      let pluginDirs: string[]
      try {
        pluginDirs = await fs.readdir(mpPath)
      } catch { continue }

      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(mpPath, pluginDir)
        try {
          const stat = await fs.stat(pluginPath)
          if (!stat.isDirectory()) continue
        } catch { continue }

        // Get version directories sorted by modification time (newest first)
        let versionDirs: string[]
        try {
          versionDirs = await fs.readdir(pluginPath)
        } catch { continue }

        const versions: VersionInfo[] = []
        for (const v of versionDirs) {
          const vPath = path.join(pluginPath, v)
          try {
            const stat = await fs.stat(vPath)
            if (stat.isDirectory()) {
              versions.push({ name: v, path: vPath, mtime: stat.mtime })
            }
          } catch { /* ignore */ }
        }

        // Sort by modification time descending
        versions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

        // Remove all but keepLatest versions
        for (let i = keepLatest; i < versions.length; i++) {
          try {
            // Get size before removing
            let size = 0
            try {
              size = parseInt(execSync(`du -s "${versions[i].path}" | cut -f1`, { encoding: 'utf8' }).trim())
            } catch { /* ignore size errors */ }
            freedBytes += size * 1024 // du returns KB

            await fs.rm(versions[i].path, { recursive: true, force: true })
            removed++
          } catch (err) {
            console.error(`[API] Failed to remove ${versions[i].path}:`, err)
          }
        }
      }
    }

    return Response.json({
      success: true,
      removed,
      freedBytes,
      freedMB: (freedBytes / (1024 * 1024)).toFixed(2)
    })
  } catch (err) {
    console.error('[API] Failed to prune cache:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
