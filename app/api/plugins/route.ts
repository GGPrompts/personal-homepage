/**
 * Plugins API - List installed plugins
 *
 * GET /api/plugins - List all installed plugins with enabled/disabled status
 * Returns plugins grouped by marketplace with their enabled state
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { homedir } from 'os'
import { NextRequest } from 'next/server'

const homeDir = homedir()
const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json')
const claudeInstalledPluginsPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json')

/**
 * Expand ~ to home directory
 */
function expandTilde(p: string): string {
  if (p.startsWith('~')) {
    return path.join(homeDir, p.slice(1))
  }
  return p
}

interface ComponentFile {
  name: string
  path: string
}

interface ComponentFiles {
  skills?: ComponentFile[]
  agents?: ComponentFile[]
  commands?: ComponentFile[]
  hooks?: ComponentFile[]
  mcp?: ComponentFile[]
}

/**
 * Detect what components a plugin provides by checking its directory structure
 * Returns detailed info including file lists for each component type
 */
async function detectPluginComponents(installPath: string): Promise<{ components: string[], componentFiles: ComponentFiles }> {
  const components: string[] = []
  const componentFiles: ComponentFiles = {}

  if (!installPath) return { components, componentFiles }

  try {
    // Check for skills/ directory
    try {
      const skillsDir = path.join(installPath, 'skills')
      const stat = await fs.stat(skillsDir)
      if (stat.isDirectory()) {
        components.push('skill')
        // List skill subdirectories (each skill is a folder with SKILL.md)
        const skillDirs = await fs.readdir(skillsDir)
        const skills: ComponentFile[] = []
        for (const dir of skillDirs) {
          const skillPath = path.join(skillsDir, dir, 'SKILL.md')
          try {
            await fs.access(skillPath)
            skills.push({ name: dir, path: skillPath })
          } catch { /* skill doesn't exist */ }
        }
        if (skills.length > 0) componentFiles.skills = skills
      }
    } catch { /* skills dir doesn't exist */ }

    // Check for agents/ directory
    try {
      const agentsDir = path.join(installPath, 'agents')
      const stat = await fs.stat(agentsDir)
      if (stat.isDirectory()) {
        components.push('agent')
        // List agent .md files
        const files = await fs.readdir(agentsDir)
        const agents = files
          .filter(f => f.endsWith('.md'))
          .map(f => ({ name: f.replace('.md', ''), path: path.join(agentsDir, f) }))
        if (agents.length > 0) componentFiles.agents = agents
      }
    } catch { /* agents dir doesn't exist */ }

    // Check for commands/ directory
    try {
      const commandsDir = path.join(installPath, 'commands')
      const stat = await fs.stat(commandsDir)
      if (stat.isDirectory()) {
        components.push('command')
        // List command .md files
        const files = await fs.readdir(commandsDir)
        const commands = files
          .filter(f => f.endsWith('.md'))
          .map(f => ({ name: f.replace('.md', ''), path: path.join(commandsDir, f) }))
        if (commands.length > 0) componentFiles.commands = commands
      }
    } catch { /* commands dir doesn't exist */ }

    // Check for hooks/ directory
    try {
      const hooksDir = path.join(installPath, 'hooks')
      const stat = await fs.stat(hooksDir)
      if (stat.isDirectory()) {
        components.push('hook')
        // Check for hooks.json
        const hooksJson = path.join(hooksDir, 'hooks.json')
        try {
          await fs.access(hooksJson)
          componentFiles.hooks = [{ name: 'hooks.json', path: hooksJson }]
        } catch { /* hooks.json doesn't exist */ }
      }
    } catch { /* hooks dir doesn't exist */ }

    // Check for .mcp.json
    try {
      const mcpJson = path.join(installPath, '.mcp.json')
      await fs.access(mcpJson)
      components.push('mcp')
      componentFiles.mcp = [{ name: '.mcp.json', path: mcpJson }]
    } catch { /* .mcp.json doesn't exist */ }
  } catch { /* general error */ }

  return { components, componentFiles }
}

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

interface Settings {
  enabledPlugins?: Record<string, boolean>
}

interface Plugin {
  id: string
  name: string
  marketplace: string
  enabled: boolean
  scope: string
  version: string
  installPath: string
  installedAt?: string
  lastUpdated?: string
  gitCommitSha: string | null
  isLocal: boolean
  components: string[]
  componentFiles: ComponentFiles
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workingDir = searchParams.get('workingDir')
    const expandedWorkingDir = workingDir ? expandTilde(workingDir) : null

    // Read installed plugins from global location
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

    // If workingDir provided, also check project-scoped plugins
    if (expandedWorkingDir && expandedWorkingDir !== homeDir) {
      const projectPluginsPath = path.join(expandedWorkingDir, '.claude', 'plugins', 'installed_plugins.json')
      try {
        const data = await fs.readFile(projectPluginsPath, 'utf-8')
        const parsed = JSON.parse(data)
        // Merge project plugins with global plugins
        if (parsed.plugins) {
          installedPlugins.plugins = {
            ...installedPlugins.plugins,
            ...parsed.plugins
          }
        }
      } catch (err: unknown) {
        const nodeErr = err as NodeJS.ErrnoException
        if (nodeErr.code !== 'ENOENT') {
          console.error('[API] Error reading project plugins:', nodeErr.message)
        }
      }
    }

    // Read global settings for enabled status
    let enabledPlugins: Record<string, boolean> = {}
    try {
      const data = await fs.readFile(claudeSettingsPath, 'utf-8')
      const parsed: Settings = JSON.parse(data)
      enabledPlugins = parsed.enabledPlugins || {}
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code !== 'ENOENT') {
        console.error('[API] Error reading claude settings:', nodeErr.message)
      }
    }

    // Also check project-scoped settings if workingDir provided
    if (expandedWorkingDir && expandedWorkingDir !== homeDir) {
      const projectSettingsPath = path.join(expandedWorkingDir, '.claude', 'settings.json')
      try {
        const data = await fs.readFile(projectSettingsPath, 'utf-8')
        const parsed: Settings = JSON.parse(data)
        // Merge project settings (project overrides global)
        enabledPlugins = { ...enabledPlugins, ...parsed.enabledPlugins }
      } catch {
        // Project settings don't exist, that's fine
      }
    }

    // Build plugin list grouped by marketplace
    const marketplaces: Record<string, Plugin[]> = {}

    for (const [pluginId, installations] of Object.entries(installedPlugins.plugins || {})) {
      // pluginId format: "pluginName@marketplace"
      const [name, marketplace] = pluginId.split('@')

      if (!marketplaces[marketplace]) {
        marketplaces[marketplace] = []
      }

      // Get first installation (usually only one)
      const install = Array.isArray(installations) ? installations[0] : installations

      // Check enabled status (default to true if not specified)
      const enabled = enabledPlugins[pluginId] !== false

      // Detect what components this plugin provides
      const { components, componentFiles } = await detectPluginComponents(install.installPath)

      marketplaces[marketplace].push({
        id: pluginId,
        name,
        marketplace,
        enabled,
        scope: install.scope || 'user',
        version: install.version || 'unknown',
        installPath: install.installPath,
        installedAt: install.installedAt,
        lastUpdated: install.lastUpdated,
        gitCommitSha: install.gitCommitSha || null,
        isLocal: install.isLocal || false,
        components,
        componentFiles
      })
    }

    // Sort plugins within each marketplace alphabetically
    for (const marketplace of Object.keys(marketplaces)) {
      marketplaces[marketplace].sort((a, b) => a.name.localeCompare(b.name))
    }

    // Count enabled/disabled, component types, and scopes
    let enabledCount = 0
    let disabledCount = 0
    const componentCounts: Record<string, number> = { skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 }
    const scopeCounts: Record<string, number> = { user: 0, local: 0, project: 0 }

    for (const plugins of Object.values(marketplaces)) {
      for (const plugin of plugins) {
        if (plugin.enabled) enabledCount++
        else disabledCount++
        for (const comp of plugin.components) {
          if (componentCounts[comp] !== undefined) componentCounts[comp]++
        }
        if (scopeCounts[plugin.scope] !== undefined) scopeCounts[plugin.scope]++
      }
    }

    return Response.json({
      success: true,
      data: {
        marketplaces,
        totalPlugins: enabledCount + disabledCount,
        enabledCount,
        disabledCount,
        componentCounts,
        scopeCounts
      }
    })
  } catch (err) {
    console.error('[API] Failed to get plugins:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
