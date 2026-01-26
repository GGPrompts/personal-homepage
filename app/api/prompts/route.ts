import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

interface PromptFile {
  path: string
  name: string
}

function findPromptsRecursively(dir: string, basePath: string = ''): PromptFile[] {
  const results: PromptFile[] = []

  // Resolve symlinks for the directory itself
  let resolvedDir = dir
  try {
    resolvedDir = fs.realpathSync(dir)
  } catch {
    // If realpath fails, directory doesn't exist
    return results
  }

  if (!fs.existsSync(resolvedDir)) {
    return results
  }

  const entries = fs.readdirSync(resolvedDir, { withFileTypes: true })

  for (const entry of entries) {
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
    const fullPath = path.join(resolvedDir, entry.name)

    // Use fs.statSync to follow symlinks when checking if it's a directory
    try {
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        results.push(...findPromptsRecursively(fullPath, relativePath))
      } else if (stats.isFile() && entry.name.endsWith('.prompty')) {
        results.push({
          path: relativePath,
          name: entry.name,
        })
      }
    } catch {
      // Skip entries that can't be stat'd (broken symlinks, permission issues)
    }
  }

  return results
}

export async function GET() {
  try {
    const promptsDir = path.join(os.homedir(), '.prompts')
    const prompts = findPromptsRecursively(promptsDir)
    return NextResponse.json(prompts)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to list prompts: ${err}` },
      { status: 500 }
    )
  }
}
