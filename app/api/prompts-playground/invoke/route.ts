/**
 * Prompts Playground Model Invocation API
 * POST: Invoke a model via CLI and return response
 * Supports both streaming and non-streaming modes
 */

import { NextRequest, NextResponse } from 'next/server'
import { invokeModel, invokeModelStream, type InvocationRequest } from '@/lib/model-invoker'
import { getModelById } from '@/lib/models-registry'

interface InvokeRequestBody {
  modelId: string
  prompt: string
  systemPrompt?: string
  workspace?: string
  stream?: boolean
  timeout?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: InvokeRequestBody = await request.json()

    const { modelId, prompt, systemPrompt, workspace, stream = false, timeout } = body

    // Validate required fields
    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      )
    }

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    // Validate model exists
    const model = getModelById(modelId)
    if (!model) {
      return NextResponse.json(
        { error: `Unknown model: ${modelId}` },
        { status: 400 }
      )
    }

    const invocationRequest: InvocationRequest = {
      modelId,
      prompt: prompt.trim(),
      systemPrompt: systemPrompt?.trim(),
      workspace,
      timeout,
    }

    // Streaming mode
    if (stream) {
      const { stream: responseStream } = invokeModelStream(invocationRequest)

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming mode
    const result = await invokeModel(invocationRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Prompts Playground invoke error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: '',
        timing: 0,
        modelId: '',
      },
      { status: 500 }
    )
  }
}
