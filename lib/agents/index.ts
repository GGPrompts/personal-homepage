/**
 * Agent configuration module with MCP tool access control.
 *
 * @example
 * ```ts
 * import {
 *   AgentCard,
 *   AgentRegistry,
 *   getDefaultRegistry,
 *   matchesMCPTool,
 * } from '@/lib/agents'
 *
 * // Create an agent with specific MCP tool access
 * const agent: AgentCard = {
 *   id: 'browser-agent',
 *   name: 'Browser Agent',
 *   baseType: 'claude-code',
 *   mcpTools: ['tabz/*', 'beads/show'],
 * }
 *
 * // Register and query
 * const registry = getDefaultRegistry()
 * await registry.register(agent)
 *
 * // Check access
 * registry.hasToolAccess('browser-agent', 'tabz/tabz_screenshot') // true
 * registry.hasToolAccess('browser-agent', 'codex/review') // false
 * ```
 */

export * from './types'
export * from './registry'
