/**
 * Claude Code Analytics API Types
 *
 * Based on the Admin API specification from:
 * https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api
 *
 * Note: This API requires an Admin API key (sk-ant-admin...) and is only
 * available for organizations, not individual accounts.
 */

// ============================================================================
// ACTOR TYPES
// ============================================================================

/** User authenticated via OAuth */
export interface UserActor {
  type: 'user_actor'
  email_address: string
}

/** User authenticated via API key */
export interface APIActor {
  type: 'api_actor'
  api_key_name: string
}

export type Actor = UserActor | APIActor

// ============================================================================
// METRICS TYPES
// ============================================================================

/** Lines of code statistics */
export interface LinesOfCode {
  /** Total lines added across all files by Claude Code */
  added: number
  /** Total lines removed across all files by Claude Code */
  removed: number
}

/** Core productivity metrics */
export interface CoreMetrics {
  /** Number of distinct Claude Code sessions initiated */
  num_sessions: number
  /** Statistics on code changes */
  lines_of_code: LinesOfCode
  /** Number of git commits created through Claude Code */
  commits_by_claude_code: number
  /** Number of pull requests created through Claude Code */
  pull_requests_by_claude_code: number
}

/** Tool action acceptance/rejection counts */
export interface ToolActionCounts {
  /** Number of tool proposals accepted by user */
  accepted: number
  /** Number of tool proposals rejected by user */
  rejected: number
}

/** Tool actions breakdown by tool type */
export interface ToolActions {
  edit_tool?: ToolActionCounts
  multi_edit_tool?: ToolActionCounts
  write_tool?: ToolActionCounts
  notebook_edit_tool?: ToolActionCounts
  [key: string]: ToolActionCounts | undefined
}

/** Token usage breakdown for a model */
export interface TokenUsage {
  /** Input tokens consumed */
  input: number
  /** Output tokens generated */
  output: number
  /** Cache read tokens */
  cache_read: number
  /** Cache creation tokens */
  cache_creation: number
}

/** Estimated cost for a model */
export interface EstimatedCost {
  /** Currency code (e.g., 'USD') */
  currency: string
  /** Cost in minor currency units (cents for USD) */
  amount: number
}

/** Usage breakdown by AI model */
export interface ModelBreakdown {
  /** Model identifier (e.g., 'claude-sonnet-4-5-20250929') */
  model: string
  /** Token usage for this model */
  tokens: TokenUsage
  /** Estimated cost for this model */
  estimated_cost: EstimatedCost
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/** Customer type for the usage */
export type CustomerType = 'api' | 'subscription'

/** Subscription tier (only for subscription customers) */
export type SubscriptionType = 'team' | 'enterprise'

/** Single usage record for a user on a specific day */
export interface ClaudeCodeUsageRecord {
  /** UTC date for the metrics (YYYY-MM-DD format) */
  date: string
  /** The user or API key that performed actions */
  actor: Actor
  /** Organization UUID */
  organization_id: string
  /** Customer account type */
  customer_type: CustomerType
  /** Terminal type where Claude Code was used (e.g., 'vscode', 'iTerm.app') */
  terminal_type: string
  /** Core productivity metrics */
  core_metrics: CoreMetrics
  /** Tool acceptance/rejection breakdown */
  tool_actions: ToolActions
  /** Token and cost breakdown by model */
  model_breakdown: ModelBreakdown[]
  /** Subscription tier (null for API customers) */
  subscription_type?: SubscriptionType | null
}

/** Paginated response from the Analytics API */
export interface ClaudeCodeUsageReport {
  /** List of usage records for the requested date */
  data: ClaudeCodeUsageRecord[]
  /** True if more records available beyond this page */
  has_more: boolean
  /** Cursor token for fetching next page (null if no more pages) */
  next_page: string | null
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/** Request parameters for the Analytics API */
export interface AnalyticsRequestParams {
  /** UTC date (YYYY-MM-DD) - returns metrics for this single day */
  starting_at: string
  /** Number of records per page (default: 20, max: 1000) */
  limit?: number
  /** Cursor token from previous response's next_page field */
  page?: string
}

// ============================================================================
// OPENTELEMETRY TYPES (for real-time monitoring)
// ============================================================================

/** OpenTelemetry metric names exported by Claude Code */
export type OTelMetricName =
  | 'claude_code.session.count'
  | 'claude_code.lines_of_code.count'
  | 'claude_code.pull_request.count'
  | 'claude_code.commit.count'
  | 'claude_code.cost.usage'
  | 'claude_code.token.usage'
  | 'claude_code.code_edit_tool.decision'
  | 'claude_code.active_time.total'

/** OpenTelemetry event names */
export type OTelEventName =
  | 'claude_code.user_prompt'
  | 'claude_code.tool_result'
  | 'claude_code.api_request'
  | 'claude_code.api_error'
  | 'claude_code.tool_decision'

/** Lines of code metric type attribute */
export type LinesOfCodeType = 'added' | 'removed'

/** Token usage type attribute */
export type TokenType = 'input' | 'output' | 'cacheRead' | 'cacheCreation'

/** Tool decision attribute */
export type ToolDecision = 'accept' | 'reject'

/** Tool decision source */
export type ToolDecisionSource =
  | 'config'
  | 'user_permanent'
  | 'user_temporary'
  | 'user_abort'
  | 'user_reject'

/** OpenTelemetry configuration */
export interface OTelConfig {
  /** Enable telemetry export */
  enabled: boolean
  /** Metrics exporter type(s): 'console', 'otlp', 'prometheus' */
  metricsExporter?: string
  /** Logs exporter type: 'console', 'otlp' */
  logsExporter?: string
  /** OTLP protocol: 'grpc', 'http/json', 'http/protobuf' */
  protocol?: string
  /** OTLP endpoint URL */
  endpoint?: string
  /** Export interval in milliseconds (default: 60000) */
  exportInterval?: number
  /** Whether to log user prompts (default: false for privacy) */
  logUserPrompts?: boolean
}

// ============================================================================
// AGGREGATED ANALYTICS TYPES (for dashboard display)
// ============================================================================

/** Aggregated metrics for a time period */
export interface AggregatedMetrics {
  /** Total sessions across all users */
  totalSessions: number
  /** Total lines added */
  totalLinesAdded: number
  /** Total lines removed */
  totalLinesRemoved: number
  /** Total commits created */
  totalCommits: number
  /** Total pull requests created */
  totalPullRequests: number
  /** Tool acceptance rates by tool */
  toolAcceptanceRates: Record<string, number>
  /** Total cost in USD cents */
  totalCostCents: number
  /** Total tokens by type */
  totalTokens: {
    input: number
    output: number
    cacheRead: number
    cacheCreation: number
  }
  /** Unique active users */
  activeUsers: number
  /** Date range covered */
  dateRange: {
    start: string
    end: string
  }
}

/** Per-user metrics summary */
export interface UserMetricsSummary {
  /** User identifier (email or API key name) */
  identifier: string
  /** Actor type */
  actorType: 'user_actor' | 'api_actor'
  /** Number of sessions */
  sessions: number
  /** Lines of code net change (added - removed) */
  netLinesChanged: number
  /** Commits created */
  commits: number
  /** Pull requests created */
  pullRequests: number
  /** Overall tool acceptance rate */
  acceptanceRate: number
  /** Estimated cost in USD cents */
  costCents: number
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/** API error response */
export interface AnalyticsAPIError {
  error: {
    type: string
    message: string
  }
}

/** Subscription compatibility info */
export interface SubscriptionCompatibility {
  /** Whether the API is available */
  available: boolean
  /** Subscription types that have access */
  supportedTypes: ('api' | 'team' | 'enterprise')[]
  /** Restrictions for the subscription type */
  restrictions: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base URL for the Admin API */
export const ANTHROPIC_ADMIN_API_BASE = 'https://api.anthropic.com'

/** Analytics endpoint path */
export const ANALYTICS_ENDPOINT = '/v1/organizations/usage_report/claude_code'

/** Required API version header */
export const ANTHROPIC_VERSION = '2023-06-01'

/** Default pagination limit */
export const DEFAULT_LIMIT = 20

/** Maximum pagination limit */
export const MAX_LIMIT = 1000

/** Data freshness delay (metrics available with up to 1 hour delay) */
export const DATA_FRESHNESS_DELAY_MS = 60 * 60 * 1000
