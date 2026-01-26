import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Workflows stored in BeadsHive/docs/flowchart/workflows/
const WORKFLOWS_DIR = path.join(os.homedir(), 'BeadsHive', 'docs', 'flowchart', 'workflows')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// GET /api/workflows - list all workflows
export async function GET() {
  try {
    ensureDir(WORKFLOWS_DIR)
    const files = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.json'))
    const workflows: unknown[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8')
        const parsed = JSON.parse(content)
        workflows.push(parsed)
      } catch {
        // Skip invalid JSON files
      }
    }

    return NextResponse.json(workflows)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to list workflows: ${err}` },
      { status: 500 }
    )
  }
}

// PUT /api/workflows - bulk write all workflows
export async function PUT(request: NextRequest) {
  try {
    const workflows = await request.json()

    if (!Array.isArray(workflows)) {
      return NextResponse.json(
        { error: 'Expected array of workflows' },
        { status: 400 }
      )
    }

    ensureDir(WORKFLOWS_DIR)

    // Get existing files to detect deletions
    const existingFiles = new Set(
      fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.json'))
    )

    // Write each workflow to its own file (using id as filename)
    const writtenFiles = new Set<string>()
    for (const workflow of workflows) {
      if (!workflow.id) continue
      const filename = `${workflow.id}.json`
      const filePath = path.join(WORKFLOWS_DIR, filename)
      fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8')
      writtenFiles.add(filename)
    }

    // Delete files that are no longer in the array
    for (const existingFile of existingFiles) {
      if (!writtenFiles.has(existingFile) && existingFile !== '.gitkeep') {
        fs.unlinkSync(path.join(WORKFLOWS_DIR, existingFile))
      }
    }

    return NextResponse.json({ success: true, count: workflows.length })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to write workflows: ${err}` },
      { status: 400 }
    )
  }
}
