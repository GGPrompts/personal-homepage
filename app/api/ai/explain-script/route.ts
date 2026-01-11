/**
 * AI Explain Script API
 * Reads a script file and uses Claude CLI to explain what it does
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { spawn } from 'child_process'
import { getScriptInfo } from '@/lib/claudeFileTypes'

// Path to the Claude CLI binary - check local install first, fall back to PATH
const LOCAL_CLAUDE = join(homedir(), '.claude', 'local', 'claude')
const CLAUDE_BIN = existsSync(LOCAL_CLAUDE) ? LOCAL_CLAUDE : 'claude'

// Expand ~ to home directory
function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return join(homedir(), filePath.slice(1))
  }
  return filePath
}

// Get file extension
function getExtension(filePath: string): string {
  const parts = filePath.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

// Call Claude CLI and collect output
async function callClaude(prompt: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--output-format', 'text',
      '--model', 'claude-sonnet-4-20250514',
      prompt
    ]

    const claude = spawn(CLAUDE_BIN, args, {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: undefined // Force subscription auth
      },
      cwd: cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let output = ''
    let error = ''

    claude.stdout?.on('data', (data) => {
      output += data.toString()
    })

    claude.stderr?.on('data', (data) => {
      error += data.toString()
    })

    claude.on('error', (err) => {
      reject(new Error(`Failed to start Claude CLI: ${err.message}`))
    })

    claude.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim())
      } else {
        reject(new Error(error || `Claude CLI exited with code ${code}`))
      }
    })

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!claude.killed) {
        claude.kill()
        reject(new Error('Claude CLI timed out'))
      }
    }, 60000)
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: filePath } = body

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path required' },
        { status: 400 }
      )
    }

    // Expand and validate path
    const expandedPath = expandPath(filePath)

    if (!existsSync(expandedPath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file content
    const content = await readFile(expandedPath, 'utf-8')

    // Get script info for context
    const fileName = filePath.split('/').pop() || ''
    const scriptInfo = getScriptInfo(fileName, filePath)
    const ext = getExtension(fileName)

    // Determine language for context
    const languageMap: Record<string, string> = {
      sh: 'Bash shell',
      bash: 'Bash shell',
      zsh: 'Zsh shell',
      py: 'Python',
      js: 'JavaScript (Node.js)',
      mjs: 'JavaScript (ES Module)',
      ts: 'TypeScript',
      mts: 'TypeScript (ES Module)',
      rb: 'Ruby',
      pl: 'Perl',
      php: 'PHP',
      go: 'Go',
      rs: 'Rust',
      mk: 'Make',
    }

    let language = languageMap[ext] || 'script'
    if (fileName === 'Makefile' || fileName === 'makefile') {
      language = 'Make'
    }

    // Build the prompt - keep it concise for faster response
    const truncatedContent = content.slice(0, 8000)
    const isTruncated = content.length > 8000

    const prompt = `Analyze this ${language} script and explain what it does concisely.

File: ${fileName}

\`\`\`${ext || 'text'}
${truncatedContent}${isTruncated ? '\n... (truncated)' : ''}
\`\`\`

Provide a brief explanation (2-3 paragraphs) covering:
- Main purpose
- Key operations
- Notable dependencies or side effects`

    // Call Claude
    const explanation = await callClaude(prompt)

    return NextResponse.json({
      success: true,
      explanation,
      file: fileName,
      language,
      scriptType: scriptInfo?.type,
    })

  } catch (error) {
    console.error('[explain-script] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
