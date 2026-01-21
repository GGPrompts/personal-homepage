import { NextRequest, NextResponse } from 'next/server'
import {
  ClaudeCodeUsageReport,
  AnalyticsRequestParams,
  AggregatedMetrics,
  UserMetricsSummary,
  ClaudeCodeUsageRecord,
  ANTHROPIC_ADMIN_API_BASE,
  ANALYTICS_ENDPOINT,
  ANTHROPIC_VERSION,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/lib/analytics/types'

export const dynamic = 'force-dynamic'

const ADMIN_API_KEY = process.env.ANTHROPIC_ADMIN_API_KEY

/**
 * Fetch Claude Code analytics from the Admin API
 */
async function fetchAnalytics(params: AnalyticsRequestParams): Promise<ClaudeCodeUsageReport> {
  if (!ADMIN_API_KEY) {
    throw new Error('ANTHROPIC_ADMIN_API_KEY not configured')
  }

  const url = new URL(`${ANTHROPIC_ADMIN_API_BASE}${ANALYTICS_ENDPOINT}`)
  url.searchParams.set('starting_at', params.starting_at)
  if (params.limit) {
    url.searchParams.set('limit', String(Math.min(params.limit, MAX_LIMIT)))
  }
  if (params.page) {
    url.searchParams.set('page', params.page)
  }

  const response = await fetch(url.toString(), {
    headers: {
      'x-api-key': ADMIN_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'User-Agent': 'PersonalHomepage/1.0.0',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Analytics API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Fetch all pages for a date range
 */
async function fetchAllPagesForDate(date: string): Promise<ClaudeCodeUsageRecord[]> {
  const allRecords: ClaudeCodeUsageRecord[] = []
  let page: string | undefined

  do {
    const result = await fetchAnalytics({
      starting_at: date,
      limit: MAX_LIMIT,
      page,
    })
    allRecords.push(...result.data)
    page = result.next_page ?? undefined
  } while (page)

  return allRecords
}

/**
 * Calculate tool acceptance rate from accepted/rejected counts
 */
function calculateAcceptanceRate(accepted: number, rejected: number): number {
  const total = accepted + rejected
  return total > 0 ? accepted / total : 0
}

/**
 * Aggregate metrics from usage records
 */
function aggregateMetrics(records: ClaudeCodeUsageRecord[], dateRange: { start: string; end: string }): AggregatedMetrics {
  const uniqueUsers = new Set<string>()
  const toolCounts: Record<string, { accepted: number; rejected: number }> = {}

  let totalSessions = 0
  let totalLinesAdded = 0
  let totalLinesRemoved = 0
  let totalCommits = 0
  let totalPullRequests = 0
  let totalCostCents = 0
  const totalTokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }

  for (const record of records) {
    // Track unique users
    const userId = record.actor.type === 'user_actor'
      ? record.actor.email_address
      : record.actor.api_key_name
    uniqueUsers.add(userId)

    // Core metrics
    totalSessions += record.core_metrics.num_sessions
    totalLinesAdded += record.core_metrics.lines_of_code.added
    totalLinesRemoved += record.core_metrics.lines_of_code.removed
    totalCommits += record.core_metrics.commits_by_claude_code
    totalPullRequests += record.core_metrics.pull_requests_by_claude_code

    // Tool actions
    for (const [tool, counts] of Object.entries(record.tool_actions)) {
      if (!counts) continue
      if (!toolCounts[tool]) {
        toolCounts[tool] = { accepted: 0, rejected: 0 }
      }
      toolCounts[tool].accepted += counts.accepted
      toolCounts[tool].rejected += counts.rejected
    }

    // Model breakdown
    for (const model of record.model_breakdown) {
      totalCostCents += model.estimated_cost.amount
      totalTokens.input += model.tokens.input
      totalTokens.output += model.tokens.output
      totalTokens.cacheRead += model.tokens.cache_read
      totalTokens.cacheCreation += model.tokens.cache_creation
    }
  }

  // Calculate acceptance rates
  const toolAcceptanceRates: Record<string, number> = {}
  for (const [tool, counts] of Object.entries(toolCounts)) {
    toolAcceptanceRates[tool] = calculateAcceptanceRate(counts.accepted, counts.rejected)
  }

  return {
    totalSessions,
    totalLinesAdded,
    totalLinesRemoved,
    totalCommits,
    totalPullRequests,
    toolAcceptanceRates,
    totalCostCents,
    totalTokens,
    activeUsers: uniqueUsers.size,
    dateRange,
  }
}

/**
 * Generate per-user summaries from records
 */
function generateUserSummaries(records: ClaudeCodeUsageRecord[]): UserMetricsSummary[] {
  const userMap = new Map<string, UserMetricsSummary>()

  for (const record of records) {
    const identifier = record.actor.type === 'user_actor'
      ? record.actor.email_address
      : record.actor.api_key_name
    const actorType = record.actor.type

    let summary = userMap.get(identifier)
    if (!summary) {
      summary = {
        identifier,
        actorType,
        sessions: 0,
        netLinesChanged: 0,
        commits: 0,
        pullRequests: 0,
        acceptanceRate: 0,
        costCents: 0,
      }
      userMap.set(identifier, summary)
    }

    summary.sessions += record.core_metrics.num_sessions
    summary.netLinesChanged +=
      record.core_metrics.lines_of_code.added - record.core_metrics.lines_of_code.removed
    summary.commits += record.core_metrics.commits_by_claude_code
    summary.pullRequests += record.core_metrics.pull_requests_by_claude_code

    // Calculate total acceptance/rejection for this record
    let totalAccepted = 0
    let totalRejected = 0
    for (const counts of Object.values(record.tool_actions)) {
      if (counts) {
        totalAccepted += counts.accepted
        totalRejected += counts.rejected
      }
    }

    // Running average (simplified - actual should weight by total actions)
    summary.acceptanceRate = calculateAcceptanceRate(totalAccepted, totalRejected)

    // Sum costs from model breakdown
    for (const model of record.model_breakdown) {
      summary.costCents += model.estimated_cost.amount
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.sessions - a.sessions)
}

/**
 * GET /api/analytics
 *
 * Query parameters:
 * - date: UTC date (YYYY-MM-DD) for single day metrics
 * - start_date: Start of date range (YYYY-MM-DD)
 * - end_date: End of date range (YYYY-MM-DD)
 * - aggregate: If 'true', return aggregated metrics instead of raw records
 * - users: If 'true', include per-user summaries
 * - limit: Records per page (default: 20, max: 1000)
 * - page: Pagination cursor
 */
export async function GET(request: NextRequest) {
  // Check API key configuration
  if (!ADMIN_API_KEY) {
    return NextResponse.json(
      {
        error: 'Claude Code Analytics API not configured',
        details: 'Add ANTHROPIC_ADMIN_API_KEY to .env.local',
        note: 'Admin API keys start with sk-ant-admin... and require organization membership',
      },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const aggregate = searchParams.get('aggregate') === 'true'
  const includeUsers = searchParams.get('users') === 'true'
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  )
  const page = searchParams.get('page') ?? undefined

  // Validate date parameters
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (date && !dateRegex.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 }
    )
  }
  if (startDate && !dateRegex.test(startDate)) {
    return NextResponse.json(
      { error: 'Invalid start_date format. Use YYYY-MM-DD.' },
      { status: 400 }
    )
  }
  if (endDate && !dateRegex.test(endDate)) {
    return NextResponse.json(
      { error: 'Invalid end_date format. Use YYYY-MM-DD.' },
      { status: 400 }
    )
  }

  try {
    // Single day query
    if (date) {
      if (aggregate || includeUsers) {
        const records = await fetchAllPagesForDate(date)
        const response: {
          date: string
          aggregated?: AggregatedMetrics
          users?: UserMetricsSummary[]
          recordCount: number
        } = {
          date,
          recordCount: records.length,
        }

        if (aggregate) {
          response.aggregated = aggregateMetrics(records, { start: date, end: date })
        }
        if (includeUsers) {
          response.users = generateUserSummaries(records)
        }

        return NextResponse.json(response)
      }

      // Raw paginated response
      const result = await fetchAnalytics({ starting_at: date, limit, page })
      return NextResponse.json(result)
    }

    // Date range query (aggregate multiple days)
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (start > end) {
        return NextResponse.json(
          { error: 'start_date must be before or equal to end_date' },
          { status: 400 }
        )
      }

      // Limit range to 30 days to avoid excessive API calls
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 30) {
        return NextResponse.json(
          { error: 'Date range cannot exceed 30 days' },
          { status: 400 }
        )
      }

      // Fetch all days in range
      const allRecords: ClaudeCodeUsageRecord[] = []
      const currentDate = new Date(start)

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayRecords = await fetchAllPagesForDate(dateStr)
        allRecords.push(...dayRecords)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const response: {
        dateRange: { start: string; end: string }
        aggregated?: AggregatedMetrics
        users?: UserMetricsSummary[]
        recordCount: number
      } = {
        dateRange: { start: startDate, end: endDate },
        recordCount: allRecords.length,
      }

      if (aggregate) {
        response.aggregated = aggregateMetrics(allRecords, { start: startDate, end: endDate })
      }
      if (includeUsers) {
        response.users = generateUserSummaries(allRecords)
      }

      return NextResponse.json(response)
    }

    // Default to today if no date specified
    const today = new Date().toISOString().split('T')[0]
    const result = await fetchAnalytics({ starting_at: today, limit, page })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
