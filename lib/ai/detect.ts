/**
 * Backend Detection Utility
 * Checks which AI backends are available on the system
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export type AIBackend = 'claude' | 'docker' | 'mock'

export interface BackendStatus {
  backend: AIBackend
  available: boolean
  error?: string
}

/**
 * Check if Claude CLI is available
 */
export async function checkClaudeCLI(): Promise<BackendStatus> {
  try {
    await execAsync('command -v claude')
    return { backend: 'claude', available: true }
  } catch (error) {
    return {
      backend: 'claude',
      available: false,
      error: 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code'
    }
  }
}

/**
 * Check if Docker Model Runner API is available
 */
export async function checkDockerModels(): Promise<BackendStatus> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const response = await fetch('http://localhost:12434/v1/models', {
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (response.ok) {
      return { backend: 'docker', available: true }
    }

    return {
      backend: 'docker',
      available: false,
      error: 'Docker Model Runner API not responding'
    }
  } catch (error) {
    return {
      backend: 'docker',
      available: false,
      error: 'Docker Model Runner not running at localhost:12434'
    }
  }
}

/**
 * Mock backend is always available as fallback
 */
export function checkMock(): BackendStatus {
  return { backend: 'mock', available: true }
}

/**
 * Check all backends and return their status
 */
export async function detectAvailableBackends(): Promise<BackendStatus[]> {
  const [claude, docker, mock] = await Promise.all([
    checkClaudeCLI(),
    checkDockerModels(),
    Promise.resolve(checkMock())
  ])

  return [claude, docker, mock]
}

/**
 * Get the first available backend (priority order: claude, docker, mock)
 */
export async function getDefaultBackend(): Promise<AIBackend> {
  const backends = await detectAvailableBackends()
  const available = backends.find(b => b.available)
  return available?.backend || 'mock'
}
