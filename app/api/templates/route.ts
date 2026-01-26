import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Templates stored in BeadsHive/docs/flowchart/templates/
const TEMPLATES_DIR = path.join(os.homedir(), 'BeadsHive', 'docs', 'flowchart', 'templates')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// GET /api/templates - list all templates
export async function GET() {
  try {
    ensureDir(TEMPLATES_DIR)
    const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'))
    const templates: unknown[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8')
        const parsed = JSON.parse(content)
        templates.push(parsed)
      } catch {
        // Skip invalid JSON files
      }
    }

    return NextResponse.json(templates)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to list templates: ${err}` },
      { status: 500 }
    )
  }
}

// PUT /api/templates - bulk write all templates
export async function PUT(request: NextRequest) {
  try {
    const templates = await request.json()

    if (!Array.isArray(templates)) {
      return NextResponse.json(
        { error: 'Expected array of templates' },
        { status: 400 }
      )
    }

    ensureDir(TEMPLATES_DIR)

    // Get existing files to detect deletions
    const existingFiles = new Set(
      fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'))
    )

    // Write each template to its own file (using id as filename)
    const writtenFiles = new Set<string>()
    for (const template of templates) {
      if (!template.id) continue
      const filename = `${template.id}.json`
      const filePath = path.join(TEMPLATES_DIR, filename)
      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8')
      writtenFiles.add(filename)
    }

    // Delete files that are no longer in the array
    for (const existingFile of existingFiles) {
      if (!writtenFiles.has(existingFile) && existingFile !== '.gitkeep') {
        fs.unlinkSync(path.join(TEMPLATES_DIR, existingFile))
      }
    }

    return NextResponse.json({ success: true, count: templates.length })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to write templates: ${err}` },
      { status: 400 }
    )
  }
}
