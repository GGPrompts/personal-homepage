# Claude Code Analytics API Research

> Research date: 2026-01-21

This document covers the Claude Code Analytics API integration possibilities for the personal homepage dashboard.

## Executive Summary

The Claude Code Analytics Admin API provides programmatic access to daily aggregated usage metrics. However, **it is NOT available for Personal or Pro subscriptions** - it requires an organization with Admin API access (Team or Enterprise tier).

For individual users, **OpenTelemetry (OTel)** provides an alternative for real-time monitoring by exporting metrics to your own observability infrastructure.

## Table of Contents

1. [API Documentation Review](#api-documentation-review)
2. [Subscription Compatibility](#subscription-compatibility)
3. [OpenTelemetry Integration](#opentelemetry-integration)
4. [Proof of Concept Implementation](#proof-of-concept-implementation)
5. [Sources](#sources)

---

## API Documentation Review

### Authentication

| Requirement | Details |
|-------------|---------|
| API Key Type | Admin API key (`sk-ant-admin...`) |
| Header | `x-api-key: $ADMIN_API_KEY` |
| Version Header | `anthropic-version: 2023-06-01` |
| Key Provisioning | Organization admins only via [Claude Console](https://console.anthropic.com/settings/admin-keys) |

Standard API keys (`sk-ant-api...`) will **not** work with the Analytics API.

### Endpoint

```
GET https://api.anthropic.com/v1/organizations/usage_report/claude_code
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `starting_at` | string | Yes | UTC date (YYYY-MM-DD) for single day metrics |
| `limit` | integer | No | Records per page (default: 20, max: 1000) |
| `page` | string | No | Cursor from previous `next_page` response |

### Response Schema

```typescript
interface ClaudeCodeUsageReport {
  data: ClaudeCodeUsageRecord[]
  has_more: boolean
  next_page: string | null
}

interface ClaudeCodeUsageRecord {
  date: string                    // RFC 3339 UTC timestamp
  actor: UserActor | APIActor     // User identifier
  organization_id: string         // Organization UUID
  customer_type: 'api' | 'subscription'
  terminal_type: string           // e.g., 'vscode', 'iTerm.app'
  core_metrics: {
    num_sessions: number
    lines_of_code: { added: number; removed: number }
    commits_by_claude_code: number
    pull_requests_by_claude_code: number
  }
  tool_actions: {
    edit_tool?: { accepted: number; rejected: number }
    write_tool?: { accepted: number; rejected: number }
    notebook_edit_tool?: { accepted: number; rejected: number }
    // ...additional tools
  }
  model_breakdown: Array<{
    model: string                 // e.g., 'claude-sonnet-4-5-20250929'
    tokens: {
      input: number
      output: number
      cache_read: number
      cache_creation: number
    }
    estimated_cost: {
      currency: string            // 'USD'
      amount: number              // cents
    }
  }>
  subscription_type?: 'team' | 'enterprise' | null
}
```

### Rate Limits

The API documentation does not specify explicit rate limits, but:
- Data freshness: Up to 1-hour delay for consistency
- Pagination limit: Max 1000 records per request
- This is part of the Admin API which has organization-level limits

### Example Request

```bash
curl "https://api.anthropic.com/v1/organizations/usage_report/claude_code?\
starting_at=2026-01-20&\
limit=100" \
  --header "anthropic-version: 2023-06-01" \
  --header "x-api-key: $ADMIN_API_KEY"
```

---

## Subscription Compatibility

### Availability Matrix

| Plan | Analytics Admin API | OpenTelemetry | Analytics Dashboard |
|------|---------------------|---------------|---------------------|
| Personal (Free) | No | Yes (manual) | No |
| Pro | No | Yes (manual) | No |
| Team | Yes | Yes (managed) | Yes |
| Enterprise | Yes | Yes (managed) | Yes |
| API (PAYG) | Yes* | Yes (manual) | Limited |

*API customers need to be part of an organization

### Key Restrictions

1. **Individual accounts cannot access the Admin API**
   - Must have an organization set up
   - Only org admins can provision Admin API keys
   - Personal and Pro subscriptions are individual accounts

2. **Team/Enterprise required for full access**
   - Dashboard at `console.anthropic.com/claude-code`
   - Programmatic API access
   - Managed OpenTelemetry configuration

3. **API (PAYG) customers**
   - Can access if part of an organization
   - `customer_type` will be `'api'`
   - No subscription tier shown

### Workarounds for Personal/Pro Users

1. **OpenTelemetry Export** (Recommended)
   - Export metrics to your own infrastructure
   - Full control over data
   - Real-time monitoring possible

2. **Local Metrics Collection**
   - Parse Claude Code's local logs
   - Build custom aggregation

3. **Upgrade Path**
   - Join or create a Team organization
   - Minimum seat requirements apply

---

## OpenTelemetry Integration

### Overview

Claude Code supports OpenTelemetry (OTel) for real-time monitoring. Unlike the Admin API, this is available to **all users** and provides more granular, real-time data.

### Configuration

Set environment variables to enable telemetry:

```bash
# Enable telemetry (required)
export CLAUDE_CODE_ENABLE_TELEMETRY=1

# Configure exporters
export OTEL_METRICS_EXPORTER=otlp    # Options: otlp, prometheus, console
export OTEL_LOGS_EXPORTER=otlp       # Options: otlp, console

# OTLP endpoint configuration
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc  # or http/json, http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Optional: Authentication
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-token"

# Export intervals (milliseconds)
export OTEL_METRIC_EXPORT_INTERVAL=60000   # Default: 60 seconds
export OTEL_LOGS_EXPORT_INTERVAL=5000      # Default: 5 seconds
```

### Available Metrics

| Metric Name | Description | Unit | Attributes |
|-------------|-------------|------|------------|
| `claude_code.session.count` | Sessions started | count | - |
| `claude_code.lines_of_code.count` | Lines modified | count | `type`: added/removed |
| `claude_code.pull_request.count` | PRs created | count | - |
| `claude_code.commit.count` | Commits created | count | - |
| `claude_code.cost.usage` | Session cost | USD | `model` |
| `claude_code.token.usage` | Tokens used | tokens | `type`, `model` |
| `claude_code.code_edit_tool.decision` | Tool decisions | count | `tool`, `decision`, `language` |
| `claude_code.active_time.total` | Active time | seconds | - |

### Available Events

| Event Name | Description | Key Attributes |
|------------|-------------|----------------|
| `claude_code.user_prompt` | User submitted prompt | `prompt_length`, `prompt` (if enabled) |
| `claude_code.tool_result` | Tool execution result | `tool_name`, `success`, `duration_ms`, `decision` |
| `claude_code.api_request` | API call made | `model`, `cost_usd`, `input_tokens`, `output_tokens` |
| `claude_code.api_error` | API error occurred | `model`, `error`, `status_code` |
| `claude_code.tool_decision` | Tool permission decision | `tool_name`, `decision`, `source` |

### Privacy Considerations

- Telemetry is **opt-in** only
- Sensitive data (API keys, file contents) never included
- User prompts **redacted by default**
- Enable prompt logging with `OTEL_LOG_USER_PROMPTS=1`

### Comparison: Admin API vs OpenTelemetry

| Feature | Admin API | OpenTelemetry |
|---------|-----------|---------------|
| Availability | Team/Enterprise only | All users |
| Data freshness | ~1 hour delay | Real-time |
| Aggregation | Daily, pre-aggregated | Raw events |
| Setup complexity | Simple (API key) | Medium (collector required) |
| Data ownership | Anthropic servers | Your infrastructure |
| Cost attribution | Built-in | DIY |
| Historical data | Full retention | Your retention policy |

### Real-Time vs Batch Capabilities

**Admin API (Batch)**
- Daily aggregation only
- Data available with 1-hour delay
- Best for: Reporting, dashboards, cost tracking

**OpenTelemetry (Real-Time)**
- Event-level granularity
- Sub-second latency
- Best for: Monitoring, alerting, debugging

---

## Proof of Concept Implementation

### Files Created

1. **`/lib/analytics/types.ts`**
   - Complete TypeScript types for the Admin API
   - OpenTelemetry metric/event types
   - Aggregation helper types

2. **`/app/api/analytics/route.ts`**
   - Next.js API route for proxying Admin API
   - Supports single date and date range queries
   - Aggregation and per-user summaries
   - Pagination support

### API Route Usage

```bash
# Single day (raw data)
GET /api/analytics?date=2026-01-20

# Single day (aggregated)
GET /api/analytics?date=2026-01-20&aggregate=true

# With per-user summaries
GET /api/analytics?date=2026-01-20&aggregate=true&users=true

# Date range (max 30 days)
GET /api/analytics?start_date=2026-01-01&end_date=2026-01-20&aggregate=true

# Pagination
GET /api/analytics?date=2026-01-20&limit=100&page=<cursor>
```

### Environment Setup

Add to `.env.local`:

```bash
# Admin API key (Team/Enterprise only)
ANTHROPIC_ADMIN_API_KEY=sk-ant-admin-...
```

### Future Integration Ideas

1. **Dashboard Widget**
   - Display daily/weekly productivity metrics
   - Show tool acceptance rates
   - Cost tracking visualization

2. **OpenTelemetry Collector**
   - Local Prometheus setup
   - Grafana dashboard integration
   - Alert on high costs or errors

3. **Usage Alerts**
   - Daily cost threshold warnings
   - Unusual activity detection
   - Session duration monitoring

---

## Sources

### Official Documentation
- [Claude Code Analytics API](https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api) - Main API documentation
- [Admin API Reference](https://platform.claude.com/docs/en/api/admin-api/claude-code/get-claude-code-usage-report) - Endpoint specification
- [Monitoring Usage with OpenTelemetry](https://code.claude.com/docs/en/monitoring-usage) - OTel configuration guide

### Community Resources
- [Claude Code Monitoring Guide](https://github.com/anthropics/claude-code-monitoring-guide) - ROI measurement guide
- [Claude Telemetry (Third-party)](https://github.com/TechNickAI/claude_telemetry) - OTel wrapper for Logfire/Sentry/Honeycomb/Datadog
- [Monitoring Claude Code with Datadog](https://ma.rtin.so/posts/monitoring-claude-code-with-datadog/) - Integration tutorial

### Related Documentation
- [Admin API Overview](https://platform.claude.com/docs/en/build-with-claude/administration-api)
- [Usage and Cost API](https://platform.claude.com/docs/en/build-with-claude/usage-cost-api) - General API usage tracking
- [Claude Code Docs](https://code.claude.com/docs/en/analytics) - Analytics dashboard info

---

## Conclusion

For this personal homepage project running on a Personal/Pro subscription:

1. **Admin API is not available** - Requires Team/Enterprise organization
2. **OpenTelemetry is the recommended path** for real-time monitoring
3. **The PoC implementation is ready** for when Admin API access becomes available
4. **Consider local OTel collection** as an alternative for now

The types and API route created serve as a foundation for future integration when/if the project moves to an organization context.
