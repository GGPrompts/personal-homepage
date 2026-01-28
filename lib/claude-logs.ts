/**
 * Claude Session Log Parser
 * Reads JSONL session files from ~/.claude/projects/ to get real-time usage data
 *
 * Log format (relevant fields):
 * - type: "assistant" entries contain usage data
 * - message.usage: { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }
 * - timestamp: ISO date string
 * - message.model: model ID
 */

import { readdir, readFile, stat } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

export interface LiveUsageData {
  date: string
  inputTokens: number
  outputTokens: number
  cacheRead: number
  cacheWrite: number
  messageCount: number
  sessionCount: number
  toolCallCount: number
  tokensByModel: Record<string, number>
  isLive: true
  lastUpdated: string
}

interface SessionLogEntry {
  type: string
  timestamp: string
  message?: {
    model?: string
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
    role?: string
  }
  // Tool use entries
  toolUseID?: string
}

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 */
function getTodayDate(): string {
  const now = new Date()
  return now.toLocaleDateString('en-CA') // Returns YYYY-MM-DD format
}

/**
 * Check if a timestamp is from today (local timezone)
 */
function isToday(timestamp: string): boolean {
  const date = new Date(timestamp)
  const today = new Date()
  return date.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA')
}

/**
 * Parse a single JSONL file and extract usage data for today
 */
async function parseSessionFile(filePath: string): Promise<{
  inputTokens: number
  outputTokens: number
  cacheRead: number
  cacheWrite: number
  messageCount: number
  toolCallCount: number
  tokensByModel: Record<string, number>
  hasActivity: boolean
}> {
  const result = {
    inputTokens: 0,
    outputTokens: 0,
    cacheRead: 0,
    cacheWrite: 0,
    messageCount: 0,
    toolCallCount: 0,
    tokensByModel: {} as Record<string, number>,
    hasActivity: false
  }

  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        const entry: SessionLogEntry = JSON.parse(line)

        // Only process entries from today
        if (!entry.timestamp || !isToday(entry.timestamp)) {
          continue
        }

        result.hasActivity = true

        // Count assistant messages with usage data
        if (entry.type === 'assistant' && entry.message?.usage) {
          const usage = entry.message.usage
          const model = entry.message.model || 'unknown'

          result.inputTokens += usage.input_tokens || 0
          result.outputTokens += usage.output_tokens || 0
          result.cacheRead += usage.cache_read_input_tokens || 0
          result.cacheWrite += usage.cache_creation_input_tokens || 0
          result.messageCount += 1

          // Track tokens by model
          const modelOutput = usage.output_tokens || 0
          result.tokensByModel[model] = (result.tokensByModel[model] || 0) + modelOutput
        }

        // Count user messages
        if (entry.type === 'user' && entry.message?.role === 'user') {
          result.messageCount += 1
        }

        // Count tool calls (entries with toolUseID that aren't progress)
        if (entry.toolUseID && entry.type !== 'progress') {
          result.toolCallCount += 1
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File read error - skip this file
  }

  return result
}

/**
 * Find all JSONL files modified today across all project directories
 */
async function findTodaySessionFiles(): Promise<string[]> {
  const claudeDir = join(homedir(), '.claude', 'projects')
  const files: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const projectDirs = await readdir(claudeDir)

    for (const projectDir of projectDirs) {
      const projectPath = join(claudeDir, projectDir)

      try {
        const projectStat = await stat(projectPath)
        if (!projectStat.isDirectory()) continue

        // Check main project JSONL files
        const entries = await readdir(projectPath)
        for (const entry of entries) {
          if (!entry.endsWith('.jsonl')) continue

          const filePath = join(projectPath, entry)
          try {
            const fileStat = await stat(filePath)
            // Only include files modified today
            if (fileStat.mtime >= today) {
              files.push(filePath)
            }
          } catch {
            // Skip inaccessible files
          }
        }

        // Check subagent directories
        const subagentPath = join(projectPath, 'subagents')
        try {
          const subagentStat = await stat(subagentPath)
          if (subagentStat.isDirectory()) {
            const subagentEntries = await readdir(subagentPath)
            for (const entry of subagentEntries) {
              if (!entry.endsWith('.jsonl')) continue

              const filePath = join(subagentPath, entry)
              try {
                const fileStat = await stat(filePath)
                if (fileStat.mtime >= today) {
                  files.push(filePath)
                }
              } catch {
                // Skip inaccessible files
              }
            }
          }
        } catch {
          // No subagents directory
        }
      } catch {
        // Skip inaccessible project directories
      }
    }
  } catch {
    // Projects directory doesn't exist
  }

  return files
}

/**
 * Get today's usage data by parsing session logs
 */
export async function getTodayUsage(): Promise<LiveUsageData | null> {
  const today = getTodayDate()
  const files = await findTodaySessionFiles()

  if (files.length === 0) {
    return null
  }

  const aggregated: LiveUsageData = {
    date: today,
    inputTokens: 0,
    outputTokens: 0,
    cacheRead: 0,
    cacheWrite: 0,
    messageCount: 0,
    sessionCount: 0,
    toolCallCount: 0,
    tokensByModel: {},
    isLive: true,
    lastUpdated: new Date().toISOString()
  }

  // Track unique sessions (each JSONL file is a session)
  const sessionsWithActivity = new Set<string>()

  // Parse files in parallel for efficiency
  const results = await Promise.all(files.map(async (file) => {
    const data = await parseSessionFile(file)
    return { file, data }
  }))

  for (const { file, data } of results) {
    if (data.hasActivity) {
      sessionsWithActivity.add(file)
      aggregated.inputTokens += data.inputTokens
      aggregated.outputTokens += data.outputTokens
      aggregated.cacheRead += data.cacheRead
      aggregated.cacheWrite += data.cacheWrite
      aggregated.messageCount += data.messageCount
      aggregated.toolCallCount += data.toolCallCount

      // Merge tokens by model
      for (const [model, tokens] of Object.entries(data.tokensByModel)) {
        aggregated.tokensByModel[model] = (aggregated.tokensByModel[model] || 0) + tokens
      }
    }
  }

  aggregated.sessionCount = sessionsWithActivity.size

  // Return null if no activity today
  if (aggregated.messageCount === 0 && aggregated.sessionCount === 0) {
    return null
  }

  return aggregated
}

/**
 * Check if we need live data (stats cache is stale)
 */
export function needsLiveData(lastComputedDate: string): boolean {
  const today = getTodayDate()
  return lastComputedDate < today
}
