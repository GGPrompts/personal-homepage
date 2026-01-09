/**
 * Plugins Update API - Update a single plugin
 *
 * POST /api/plugins/update - Update a plugin to latest version
 * Body: { pluginId: string, scope?: string }
 */

import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const homeDir = homedir()
const claudeInstalledPluginsPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json')

// Use CLAUDE_PATH env var if set, otherwise default to 'claude'
const claudeCmd = process.env.CLAUDE_PATH || 'claude'

interface Installation {
  installPath: string
  scope?: string
  version?: string
  projectPath?: string
}

interface InstalledPlugins {
  plugins?: Record<string, Installation[]>
}

interface UpdateRequest {
  pluginId: string
  scope?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateRequest = await request.json()
    const { pluginId, scope: requestedScope } = body

    if (!pluginId || typeof pluginId !== 'string') {
      return Response.json(
        { success: false, error: 'pluginId is required' },
        { status: 400 }
      )
    }

    // Look up the plugin installation details
    let scope = requestedScope
    let projectPath: string | undefined

    try {
      const data = await fs.readFile(claudeInstalledPluginsPath, 'utf-8')
      const parsed: InstalledPlugins = JSON.parse(data)
      const installations = parsed.plugins?.[pluginId]
      if (installations && installations.length > 0) {
        scope = scope || installations[0].scope
        projectPath = installations[0].projectPath
      }
    } catch {
      // If we can't read the file, default to user scope
      scope = scope || 'user'
    }

    // Build command with scope flag
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

    const result = execSync(cmd, execOptions)

    return Response.json({
      success: true,
      pluginId,
      scope,
      output: result.trim(),
      message: `Plugin ${pluginId} updated. Run /restart to apply changes.`
    })
  } catch (err: unknown) {
    console.error('[API] Failed to update plugin:', err)
    const execErr = err as { stderr?: string; message?: string }
    return Response.json(
      { success: false, error: execErr.stderr || execErr.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
