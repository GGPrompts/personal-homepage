/**
 * Plugins Update All API - Update all outdated plugins
 *
 * POST /api/plugins/update-all - Update all outdated plugins
 * Body: { scope?: 'all' | 'user' } - 'user' only updates user-scoped plugins (default), 'all' tries all
 * Returns results for each plugin update attempt
 */

import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const homeDir = homedir()
const claudeInstalledPluginsPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json')
const claudeMarketplacesPath = path.join(homeDir, '.claude', 'plugins', 'known_marketplaces.json')

// Use CLAUDE_PATH env var if set, otherwise default to 'claude'
const claudeCmd = process.env.CLAUDE_PATH || 'claude'

interface Installation {
  installPath: string
  scope?: string
  version?: string
  gitCommitSha?: string
  projectPath?: string
}

interface InstalledPlugins {
  plugins?: Record<string, Installation[]>
}

interface MarketplaceInfo {
  installLocation?: string
}

interface UpdateResult {
  pluginId: string
  success: boolean
  output?: string
  error?: string
}

interface SkippedPlugin {
  pluginId: string
  scope: string
  reason: string
}

interface UpdateAllRequest {
  scope?: 'all' | 'user'
}

/**
 * Get git HEAD commit for a directory
 */
async function getGitHead(dir: string): Promise<string | null> {
  try {
    const head = execSync('git rev-parse HEAD', {
      cwd: dir,
      encoding: 'utf8',
      timeout: 5000
    }).trim()
    return head
  } catch {
    return null
  }
}

/**
 * Helper to check if a version looks like a semantic version (e.g., "1.0.0", "2.1.3")
 */
function isSemVer(v: string | undefined): boolean {
  return Boolean(v && /^\d+\.\d+(\.\d+)?$/.test(v))
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateAllRequest = await request.json()
    const scopeFilter = body.scope || 'user'

    // First get the list of outdated plugins using the health check logic
    let marketplaces: Record<string, MarketplaceInfo> = {}
    try {
      const data = await fs.readFile(claudeMarketplacesPath, 'utf-8')
      marketplaces = JSON.parse(data)
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code !== 'ENOENT') {
        throw err
      }
    }

    let installedPlugins: InstalledPlugins = {}
    try {
      const data = await fs.readFile(claudeInstalledPluginsPath, 'utf-8')
      const parsed = JSON.parse(data)
      installedPlugins = parsed
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code !== 'ENOENT') {
        throw err
      }
    }

    // Get current HEAD for each marketplace
    const marketplaceHeads: Record<string, string> = {}
    for (const [name, info] of Object.entries(marketplaces)) {
      const installLoc = info.installLocation
      if (installLoc) {
        const head = await getGitHead(installLoc)
        if (head) {
          marketplaceHeads[name] = head
        }
      }
    }

    // Find outdated plugins
    const outdated: { pluginId: string; scope: string; projectPath?: string }[] = []
    const skipped: SkippedPlugin[] = []

    for (const [pluginId, installations] of Object.entries(installedPlugins.plugins || {})) {
      const [, marketplace] = pluginId.split('@')
      const install = Array.isArray(installations) ? installations[0] : installations
      const installedSha = install.gitCommitSha
      const installedVersion = install.version
      const pluginScope = install.scope || 'user'

      if (marketplaceHeads[marketplace]) {
        // Skip plugins with semantic versions - they can't be compared to git HEAD
        if (isSemVer(installedVersion)) {
          continue
        }

        const currentSha = marketplaceHeads[marketplace]
        const currentShaShort = currentSha.substring(0, 12)
        const versionMatches = installedVersion === currentShaShort || installedVersion === currentSha
        const shaMatches = installedSha === currentSha

        if (!versionMatches && !shaMatches) {
          // Include project path for project-scoped plugins
          const projectPath = install.projectPath

          // Skip non-user scoped plugins unless explicitly requested OR we have projectPath
          if (scopeFilter === 'user' && pluginScope !== 'user' && !projectPath) {
            skipped.push({ pluginId, scope: pluginScope, reason: 'project/local scoped (no projectPath)' })
            continue
          }
          outdated.push({
            pluginId,
            scope: pluginScope,
            projectPath
          })
        }
      }
    }

    if (outdated.length === 0) {
      return Response.json({
        success: true,
        message: skipped.length > 0
          ? `All user-scoped plugins are up to date (${skipped.length} project/local plugins skipped)`
          : 'All plugins are up to date',
        results: [],
        skipped
      })
    }

    // Update each outdated plugin
    const results: UpdateResult[] = []
    for (const { pluginId, scope, projectPath } of outdated) {
      const scopeFlag = scope && scope !== 'user' ? ` --scope ${scope}` : ''
      const cmd = `${claudeCmd} plugin update "${pluginId}"${scopeFlag}`

      // For project-scoped plugins, run from the project directory
      const execOptions: { encoding: BufferEncoding; timeout: number; cwd?: string } = {
        encoding: 'utf8',
        timeout: 30000
      }
      if (projectPath && (scope === 'project' || scope === 'local')) {
        execOptions.cwd = projectPath
      }

      try {
        const output = execSync(cmd, execOptions)
        results.push({
          pluginId,
          success: true,
          output: output.trim()
        })
      } catch (err: unknown) {
        const execErr = err as { stderr?: string; message?: string }
        results.push({
          pluginId,
          success: false,
          error: execErr.stderr || execErr.message || 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return Response.json({
      success: true,
      message: `Updated ${successCount} plugins${failCount > 0 ? `, ${failCount} failed` : ''}${skipped.length > 0 ? ` (${skipped.length} skipped)` : ''}. Run /restart to apply changes.`,
      results,
      skipped
    })
  } catch (err) {
    console.error('[API] Failed to update all plugins:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
