/**
 * Claude Code Stats API
 * Reads usage statistics from ~/.claude/stats-cache.json
 *
 * GET /api/claude-stats - Get Claude Code usage statistics
 */

import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

interface DailyActivity {
  date: string
  messageCount: number
  sessionCount: number
  toolCallCount: number
}

interface DailyModelTokens {
  date: string
  tokensByModel: Record<string, number>
}

interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  webSearchRequests: number
  costUSD: number
  contextWindow: number
  maxOutputTokens: number
}

interface StatsCache {
  version: number
  lastComputedDate: string
  dailyActivity: DailyActivity[]
  dailyModelTokens: DailyModelTokens[]
  modelUsage: Record<string, ModelUsage>
  totalSessions: number
  totalMessages: number
  longestSession?: {
    sessionId: string
    duration: number
    messageCount: number
    timestamp: string
  }
  firstSessionDate?: string
  hourCounts?: Record<string, number>
}

export interface ClaudeStatsResponse {
  success: boolean
  data?: {
    dailyTokenUsage: Array<{
      date: string
      inputTokens: number
      outputTokens: number
      cacheRead: number
      cacheWrite: number
      totalTokens: number
    }>
    modelUsage: Record<string, ModelUsage>
    totalSessions: number
    totalMessages: number
    dailyActivity: DailyActivity[]
    lastComputedDate: string
    firstSessionDate?: string
    hourCounts?: Record<string, number>
  }
  error?: string
}

/**
 * GET /api/claude-stats
 * Returns Claude Code usage statistics
 */
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const statsPath = join(homedir(), '.claude', 'stats-cache.json')

    let statsData: StatsCache
    try {
      const content = await readFile(statsPath, 'utf-8')
      statsData = JSON.parse(content)
    } catch (err) {
      // Stats file doesn't exist or is invalid
      return Response.json({
        success: false,
        error: 'Claude Code stats not found. Run /stats in Claude Code to generate statistics.'
      } satisfies ClaudeStatsResponse, { status: 404 })
    }

    // Calculate overall input/output ratio across all models (excluding outliers like Haiku)
    // This gives a more accurate average ratio for estimating daily input tokens
    const totalInputAllModels = Object.values(statsData.modelUsage).reduce((sum, m) => sum + m.inputTokens, 0)
    const totalOutputAllModels = Object.values(statsData.modelUsage).reduce((sum, m) => sum + m.outputTokens, 0)
    const overallInputOutputRatio = totalOutputAllModels > 0 ? totalInputAllModels / totalOutputAllModels : 1

    // Process daily token usage - combine model tokens by day
    // The dailyModelTokens contains output tokens per model per day
    // We estimate input tokens using the overall input/output ratio
    const dailyTokenUsage = statsData.dailyModelTokens.map(day => {
      const totalOutputForDay = Object.values(day.tokensByModel).reduce((sum, t) => sum + t, 0)

      // Use overall ratio to estimate input (more stable than per-model ratios)
      const estimatedInputForDay = Math.round(totalOutputForDay * overallInputOutputRatio)

      return {
        date: day.date,
        inputTokens: estimatedInputForDay,
        outputTokens: totalOutputForDay,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: estimatedInputForDay + totalOutputForDay
      }
    })

    const response: ClaudeStatsResponse = {
      success: true,
      data: {
        dailyTokenUsage,
        modelUsage: statsData.modelUsage,
        totalSessions: statsData.totalSessions,
        totalMessages: statsData.totalMessages,
        dailyActivity: statsData.dailyActivity,
        lastComputedDate: statsData.lastComputedDate,
        firstSessionDate: statsData.firstSessionDate,
        hourCounts: statsData.hourCounts
      }
    }

    return Response.json(response)
  } catch (error) {
    console.error('Claude stats error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ClaudeStatsResponse, { status: 500 })
  }
}
