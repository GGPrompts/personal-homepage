/**
 * Plugins Health API - Check plugin health and outdated versions
 *
 * GET /api/plugins/health - Check plugin health: outdated versions, cache size
 * Returns list of outdated plugins and cache statistics
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const homeDir = homedir()
const claudeInstalledPluginsPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json')
const claudeMarketplacesPath = path.join(homeDir, '.claude', 'plugins', 'known_marketplaces.json')
const claudePluginCachePath = path.join(homeDir, '.claude', 'plugins', 'cache')

interface Installation {
  installPath: string
  scope?: string
  version?: string
  installedAt?: string
  lastUpdated?: string
  gitCommitSha?: string
  isLocal?: boolean
  projectPath?: string
}

interface InstalledPlugins {
  plugins?: Record<string, Installation[]>
}

interface MarketplaceSource {
  source: string
  path?: string
  url?: string
}

interface MarketplaceInfo {
  source?: MarketplaceSource
  installLocation?: string
  isDiscovered?: boolean
}

interface OutdatedPlugin {
  pluginId: string
  name: string
  marketplace: string
  scope: string
  projectPath?: string
  installedSha: string
  currentSha: string
  lastUpdated?: string
}

interface CacheStats {
  totalSize: number
  totalVersions: number
  byMarketplace: Record<string, {
    size: number
    versions: number
    plugins: Record<string, number>
  }>
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
 * Check if a plugin's files changed between two commits
 * Returns true if files changed, false if unchanged
 * Uses git diff to compare only the plugin's directory
 */
function hasPluginChanged(repoPath: string, pluginName: string, fromCommit: string, toCommit: string): boolean {
  try {
    // Try plugins/<name> first (subdirectory plugin), then .claude-plugin (root plugin)
    const pluginPaths = [`plugins/${pluginName}`, '.claude-plugin']

    for (const pluginPath of pluginPaths) {
      try {
        // Check if the path exists at the current commit
        execSync(`git ls-tree HEAD -- "${pluginPath}"`, {
          cwd: repoPath,
          encoding: 'utf8',
          timeout: 5000
        })

        // Path exists, check for diff
        // git diff --quiet returns exit 0 if no changes, 1 if changes
        execSync(`git diff --quiet ${fromCommit} ${toCommit} -- "${pluginPath}"`, {
          cwd: repoPath,
          encoding: 'utf8',
          timeout: 5000
        })
        // If we get here, no changes (exit 0)
        return false
      } catch (err: unknown) {
        // If exit code 1, there are changes
        const execErr = err as { status?: number }
        if (execErr.status === 1) {
          return true
        }
        // Otherwise path doesn't exist or other error, try next path
      }
    }
    // If no paths found, assume changed (safer default)
    return true
  } catch {
    // On any error, assume changed (safer default)
    return true
  }
}

/**
 * Discover local plugin directories in ~/projects
 * Returns map of directory name -> path for dirs with .claude-plugin/ or plugins/
 */
async function discoverLocalMarketplaces(): Promise<Record<string, MarketplaceInfo>> {
  const projectsDir = path.join(homeDir, 'projects')
  const discovered: Record<string, MarketplaceInfo> = {}

  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dirPath = path.join(projectsDir, entry.name)

      // Check if it looks like a plugin marketplace (has .claude-plugin/ or plugins/)
      try {
        let hasPluginJson = false
        let hasPluginsDir = false

        try {
          await fs.access(path.join(dirPath, '.claude-plugin', 'plugin.json'))
          hasPluginJson = true
        } catch { /* doesn't exist */ }

        try {
          await fs.access(path.join(dirPath, 'plugins'))
          hasPluginsDir = true
        } catch { /* doesn't exist */ }

        if (hasPluginJson || hasPluginsDir) {
          // Use directory name as marketplace key (lowercase, hyphenated)
          const key = entry.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
          discovered[key] = {
            source: { source: 'directory', path: dirPath },
            installLocation: dirPath,
            isDiscovered: true
          }
        }
      } catch {
        // Ignore errors checking individual dirs
      }
    }
  } catch (err) {
    console.error('[API] Error discovering local marketplaces:', err)
  }

  return discovered
}

/**
 * Helper to check if a version looks like a semantic version (e.g., "1.0.0", "2.1.3")
 */
function isSemVer(v: string | undefined): boolean {
  return Boolean(v && /^\d+\.\d+(\.\d+)?$/.test(v))
}

export async function GET() {
  try {
    // Read marketplaces config to get source locations
    let marketplaces: Record<string, MarketplaceInfo> = {}
    try {
      const data = await fs.readFile(claudeMarketplacesPath, 'utf-8')
      marketplaces = JSON.parse(data)
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code !== 'ENOENT') {
        console.error('[API] Error reading marketplaces:', nodeErr.message)
      }
    }

    // Also discover local plugin directories in ~/projects
    const discoveredMarketplaces = await discoverLocalMarketplaces()
    // Merge discovered marketplaces (don't override registered ones)
    for (const [key, info] of Object.entries(discoveredMarketplaces)) {
      if (!marketplaces[key]) {
        marketplaces[key] = info
      }
    }

    // Read installed plugins
    let installedPlugins: InstalledPlugins = {}
    try {
      const data = await fs.readFile(claudeInstalledPluginsPath, 'utf-8')
      const parsed = JSON.parse(data)
      installedPlugins = parsed
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code !== 'ENOENT') {
        console.error('[API] Error reading installed plugins:', nodeErr.message)
      }
    }

    // Get current HEAD for each marketplace
    const marketplaceHeads: Record<string, { head: string; path: string; source?: MarketplaceSource }> = {}
    for (const [name, info] of Object.entries(marketplaces)) {
      const installLoc = info.installLocation
      if (installLoc) {
        const head = await getGitHead(installLoc)
        if (head) {
          marketplaceHeads[name] = {
            head,
            path: installLoc,
            source: info.source
          }
        }
      }
    }

    // Compare installed plugins to marketplace HEAD
    const outdated: OutdatedPlugin[] = []
    const current: { pluginId: string; name: string; marketplace: string }[] = []
    const unknown: { pluginId: string; name: string; marketplace: string }[] = []

    for (const [pluginId, installations] of Object.entries(installedPlugins.plugins || {})) {
      const [name, marketplace] = pluginId.split('@')
      const install = Array.isArray(installations) ? installations[0] : installations
      const installedSha = install.gitCommitSha
      const installedVersion = install.version

      if (marketplaceHeads[marketplace]) {
        const currentSha = marketplaceHeads[marketplace].head
        const currentShaShort = currentSha.substring(0, 12)

        // Skip version checking for plugins with semantic versions (e.g., "1.0.0")
        // These can't be compared to git HEAD and were installed with explicit versions
        if (isSemVer(installedVersion)) {
          current.push({ pluginId, name, marketplace })
          continue
        }

        // Plugin is current if EITHER version or gitCommitSha matches HEAD
        const versionMatches = installedVersion === currentShaShort || installedVersion === currentSha
        const shaMatches = installedSha === currentSha

        if (versionMatches || shaMatches) {
          // Commits match, plugin is current
          current.push({ pluginId, name, marketplace })
        } else {
          // Commits differ - but did the plugin's actual files change?
          const repoPath = marketplaceHeads[marketplace].path
          const fromCommit = installedVersion || installedSha || ''
          const filesChanged = hasPluginChanged(repoPath, name, fromCommit, currentSha)

          if (filesChanged) {
            outdated.push({
              pluginId,
              name,
              marketplace,
              scope: install.scope || 'user',
              projectPath: install.projectPath,
              installedSha: installedVersion || (installedSha ? installedSha.substring(0, 12) : 'unknown'),
              currentSha: currentShaShort,
              lastUpdated: install.lastUpdated
            })
          } else {
            // Repo has new commits but plugin files unchanged
            current.push({ pluginId, name, marketplace })
          }
        }
      } else {
        unknown.push({ pluginId, name, marketplace })
      }
    }

    // Calculate cache statistics
    const cacheStats: CacheStats = {
      totalSize: 0,
      totalVersions: 0,
      byMarketplace: {}
    }

    try {
      const marketplaceDirs = await fs.readdir(claudePluginCachePath)
      for (const mpDir of marketplaceDirs) {
        const mpPath = path.join(claudePluginCachePath, mpDir)
        let stat
        try {
          stat = await fs.stat(mpPath)
        } catch { continue }
        if (!stat.isDirectory()) continue

        let mpSize = 0
        let mpVersions = 0
        const pluginVersions: Record<string, number> = {}

        const pluginDirs = await fs.readdir(mpPath)
        for (const pluginDir of pluginDirs) {
          const pluginPath = path.join(mpPath, pluginDir)
          let pluginStat
          try {
            pluginStat = await fs.stat(pluginPath)
          } catch { continue }
          if (!pluginStat.isDirectory()) continue

          const versionDirs = await fs.readdir(pluginPath)
          // Check which entries are directories
          const versionChecks = await Promise.all(versionDirs.map(async (v) => {
            try {
              const s = await fs.stat(path.join(pluginPath, v))
              return s.isDirectory() ? v : null
            } catch { return null }
          }))
          const versionCount = versionChecks.filter(Boolean).length

          pluginVersions[pluginDir] = versionCount
          mpVersions += versionCount

          // Calculate size (rough estimate via du)
          try {
            const size = parseInt(execSync(`du -s "${pluginPath}" | cut -f1`, { encoding: 'utf8' }).trim())
            mpSize += size
          } catch { /* ignore size calculation errors */ }
        }

        cacheStats.byMarketplace[mpDir] = {
          size: mpSize,
          versions: mpVersions,
          plugins: pluginVersions
        }
        cacheStats.totalSize += mpSize
        cacheStats.totalVersions += mpVersions
      }
    } catch (err) {
      console.error('[API] Error calculating cache stats:', err)
    }

    return Response.json({
      success: true,
      data: {
        outdated,
        current: current.length,
        unknown: unknown.length,
        marketplaceHeads,
        cache: cacheStats
      }
    })
  } catch (err) {
    console.error('[API] Failed to check plugin health:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
