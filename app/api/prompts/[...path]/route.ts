import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const promptPath = pathSegments.join('/')

  // Validate path (prevent path traversal)
  if (promptPath.includes('..')) {
    return NextResponse.json(
      { error: 'Invalid prompt path' },
      { status: 400 }
    )
  }

  const promptsDir = path.join(os.homedir(), '.prompts')
  const filePath = path.join(promptsDir, promptPath)

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Prompt not found: ${promptPath}` },
        { status: 404 }
      )
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read prompt: ${err}` },
      { status: 500 }
    )
  }
}
