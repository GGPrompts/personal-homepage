import { NextRequest, NextResponse } from "next/server"
import { execFileSync } from "child_process"
import { existsSync } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

const GENERATION_SYSTEM_PROMPT = `You are a worker prompt writer for a software development team using the beads task system. Given a beads issue with title, description, type, and dependencies, create a clear, actionable prompt that a Claude worker could follow to complete the task.

The prompt should:
1. Start with a clear objective statement
2. List specific files to create, modify, or delete (if inferrable from description)
3. Include step-by-step implementation guidance
4. Note any constraints from blocking dependencies
5. Define acceptance criteria based on issue type and description
6. Keep it concise but complete (250-400 words)
7. Use Markdown formatting

Focus on being actionable and specific, not generic.`

/**
 * Validate and resolve workspace path
 */
function validateWorkspace(workspace: string | null): string | undefined {
  if (!workspace) return undefined

  const resolved = workspace.startsWith("~")
    ? path.join(process.env.HOME || "/home", workspace.slice(1))
    : workspace

  const absolute = path.resolve(resolved)

  if (!existsSync(absolute)) {
    throw new Error(`Workspace path does not exist: ${workspace}`)
  }

  const beadsDir = path.join(absolute, ".beads")
  if (!existsSync(beadsDir)) {
    throw new Error(`No .beads directory found in: ${workspace}`)
  }

  return absolute
}

/**
 * Raw issue from bd show --json
 */
interface RawBeadsIssue {
  id: string
  title: string
  description?: string
  notes?: string
  status: string
  priority: number
  issue_type?: string
  labels?: string[]
  dependencies?: Array<{
    id: string
    title: string
    status: string
    dependency_type: string
  }>
  dependents?: Array<{
    id: string
    title: string
    status: string
    dependency_type: string
  }>
}

/**
 * Build prompt context from issue details
 */
function buildIssueContext(issue: RawBeadsIssue): string {
  const lines: string[] = []

  lines.push(`Issue: ${issue.title}`)
  if (issue.issue_type) {
    lines.push(`Type: ${issue.issue_type}`)
  }
  lines.push(`Status: ${issue.status}`)
  lines.push(`Priority: ${issue.priority}`)
  if (issue.labels && issue.labels.length > 0) {
    lines.push(`Labels: ${issue.labels.join(", ")}`)
  }

  lines.push("")
  lines.push("Description:")
  lines.push(issue.description || "(No description provided)")

  // Add blocking dependencies
  if (issue.dependencies && issue.dependencies.length > 0) {
    const blockers = issue.dependencies.filter(
      (d) => d.dependency_type === "blocks"
    )
    if (blockers.length > 0) {
      lines.push("")
      lines.push("Blocked By:")
      for (const dep of blockers) {
        lines.push(`- ${dep.id}: ${dep.title} (${dep.status})`)
      }
    }
  }

  // Add dependents (what this blocks)
  if (issue.dependents && issue.dependents.length > 0) {
    const blocking = issue.dependents.filter(
      (d) => d.dependency_type === "blocks"
    )
    if (blocking.length > 0) {
      lines.push("")
      lines.push("Blocks:")
      for (const dep of blocking) {
        lines.push(`- ${dep.id}: ${dep.title}`)
      }
    }
  }

  return lines.join("\n")
}

/**
 * Parse SSE stream and collect full response text
 */
async function collectStreamResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("No response body")
  }

  const decoder = new TextDecoder()
  let fullText = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split("\n")

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            fullText += parsed.content
          }
          if (parsed.error) {
            throw new Error(parsed.error)
          }
        } catch (e) {
          // Skip non-JSON lines
          if (e instanceof SyntaxError) continue
          throw e
        }
      }
    }
  }

  return fullText
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/beads/issues/[id]/generate-prompt
 * Generate a worker prompt from issue details using AI
 *
 * Body:
 *   - workspace: Project path containing .beads directory
 *
 * Response:
 *   - prompt: Generated worker prompt text
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  try {
    const body = await request.json().catch(() => ({}))
    const { workspace } = body

    let cwd: string | undefined
    try {
      cwd = validateWorkspace(workspace)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid workspace" },
        { status: 400 }
      )
    }

    // Fetch issue details using bd show
    let rawIssues: RawBeadsIssue[]
    try {
      const output = execFileSync("bd", ["show", id, "--json"], {
        encoding: "utf-8",
        timeout: 10000,
        cwd,
      })
      rawIssues = JSON.parse(output)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch issue"
      if (message.includes("not found") || message.includes("no such issue")) {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: `Failed to fetch issue: ${message}` },
        { status: 500 }
      )
    }

    if (!rawIssues || rawIssues.length === 0) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const issue = rawIssues[0]

    // Build context from issue
    const issueContext = buildIssueContext(issue)

    // Call the chat API with Claude backend
    const chatUrl = new URL("/api/ai/chat", request.url)
    const chatResponse = await fetch(chatUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        backend: "claude",
        messages: [
          {
            role: "user",
            content: `Generate a worker prompt for the following issue:\n\n${issueContext}`,
          },
        ],
        settings: {
          systemPrompt: GENERATION_SYSTEM_PROMPT,
        },
        cwd,
      }),
    })

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text()
      return NextResponse.json(
        { error: `AI service error: ${errorText}` },
        { status: 500 }
      )
    }

    // Parse SSE stream and collect full response
    const prompt = await collectStreamResponse(chatResponse)

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 500 }
      )
    }

    return NextResponse.json({ prompt: prompt.trim() })
  } catch (error) {
    console.error(`Failed to generate prompt for issue ${id}:`, error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate prompt",
      },
      { status: 500 }
    )
  }
}
