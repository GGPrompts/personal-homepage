/**
 * Plugins Toggle API - Enable/disable plugins
 *
 * POST /api/plugins/toggle - Toggle a plugin's enabled status
 * Body: { pluginId: string, enabled: boolean }
 */

import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { homedir } from 'os'

const homeDir = homedir()
const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json')

interface Settings {
  enabledPlugins?: Record<string, boolean>
  [key: string]: unknown
}

interface ToggleRequest {
  pluginId: string
  enabled: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ToggleRequest = await request.json()
    const { pluginId, enabled } = body

    if (!pluginId || typeof pluginId !== 'string') {
      return Response.json(
        { success: false, error: 'pluginId is required' },
        { status: 400 }
      )
    }

    if (typeof enabled !== 'boolean') {
      return Response.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    // Read current settings
    let settings: Settings = {}
    try {
      const data = await fs.readFile(claudeSettingsPath, 'utf-8')
      settings = JSON.parse(data)
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code !== 'ENOENT') {
        throw err
      }
      // File doesn't exist, start with empty settings
    }

    // Initialize enabledPlugins if not present
    if (!settings.enabledPlugins) {
      settings.enabledPlugins = {}
    }

    // Update the plugin status
    settings.enabledPlugins[pluginId] = enabled

    // Write back to file
    await fs.writeFile(claudeSettingsPath, JSON.stringify(settings, null, 2), 'utf-8')

    return Response.json({
      success: true,
      pluginId,
      enabled,
      message: `Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}. Run /restart to apply changes.`
    })
  } catch (err) {
    console.error('[API] Failed to toggle plugin:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
