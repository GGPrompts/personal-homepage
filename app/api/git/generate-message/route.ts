import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import { exec } from "child_process"
import { existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = "force-dynamic"

const PROJECTS_DIR = join(homedir(), "projects")

// Validate path is within allowed directories
function validatePath(path: string): boolean {
  const resolved = join(path)
  return resolved.startsWith(PROJECTS_DIR) || resolved.startsWith(homedir())
}

// Check if directory is a git repo
function isGitRepo(path: string): boolean {
  return existsSync(join(path, ".git"))
}

/**
 * POST /api/git/generate-message
 * Generate a commit message using Claude CLI with Haiku model
 * Body: { repoPath: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repoPath } = body as { repoPath: string }

    if (!repoPath) {
      return NextResponse.json(
        { success: false, error: "repoPath is required" },
        { status: 400 }
      )
    }

    if (!validatePath(repoPath)) {
      return NextResponse.json(
        { success: false, error: "Invalid path" },
        { status: 403 }
      )
    }

    if (!existsSync(repoPath)) {
      return NextResponse.json(
        { success: false, error: "Path does not exist" },
        { status: 404 }
      )
    }

    if (!isGitRepo(repoPath)) {
      return NextResponse.json(
        { success: false, error: "Not a git repository" },
        { status: 400 }
      )
    }

    // Get the staged diff
    const { stdout: diff } = await execAsync("git diff --cached", {
      cwd: repoPath,
      maxBuffer: 1024 * 1024, // 1MB buffer for large diffs
    })

    if (!diff.trim()) {
      return NextResponse.json(
        { success: false, error: "No staged changes to generate a message for" },
        { status: 400 }
      )
    }

    // Truncate diff if too large (Claude has context limits)
    const maxDiffLength = 50000
    const truncatedDiff =
      diff.length > maxDiffLength
        ? diff.slice(0, maxDiffLength) + "\n\n[... diff truncated ...]"
        : diff

    // Build the prompt - strict to avoid conversational responses
    const prompt = `Write a git commit message for the following diff.

CRITICAL OUTPUT RULES:
- Output ONLY the commit message text, nothing else
- NO code fences, NO backticks, NO markdown
- NO XML tags like <output> or </output>
- NO "Here's a commit message:" or similar preamble
- NO "Co-Authored-By" or attribution lines
- NO trailing explanations

FORMAT:
- Use conventional commit prefix: feat:, fix:, refactor:, docs:, chore:
- First line under 72 chars
- Optional: blank line + bullet points for details

DIFF:
${truncatedDiff}`

    console.log("[generate-message] Generating commit message with haiku")

    // Run claude CLI with haiku model, passing prompt via stdin
    const message = await new Promise<string>((resolve, reject) => {
      const child = spawn("claude", ["--model", "haiku", "--print", "-p", "-"], {
        cwd: repoPath,
        timeout: 30000,
        stdio: ["pipe", "pipe", "pipe"],
      })

      let stdout = ""
      let stderr = ""

      child.stdout.on("data", (data) => {
        stdout += data.toString()
      })
      child.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      child.on("error", (err) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`))
      })

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `claude exited with code ${code}`))
        } else {
          resolve(stdout)
        }
      })

      // Write prompt to stdin and close it
      child.stdin.write(prompt)
      child.stdin.end()
    })

    const cleanMessage = message.trim()

    if (!cleanMessage) {
      return NextResponse.json(
        { success: false, error: "Claude returned empty response" },
        { status: 500 }
      )
    }

    console.log(
      `[generate-message] Generated: ${cleanMessage.split("\n")[0]}...`
    )

    return NextResponse.json({
      success: true,
      message: cleanMessage,
    })
  } catch (error) {
    console.error("[generate-message] Error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate message"

    // Check if claude CLI is not available
    if (
      errorMessage.includes("ENOENT") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("spawn claude")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
