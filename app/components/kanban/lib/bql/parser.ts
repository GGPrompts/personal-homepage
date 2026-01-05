/**
 * BQL (Beads Query Language) Parser
 *
 * A simple query language for filtering tasks/issues with:
 * - Field filters: status:open, priority:1-2, type:feature, labels:bug, assignee:@me
 * - Boolean operators: AND, OR, NOT
 * - Parentheses for grouping
 *
 * Examples:
 * - "status:open AND priority:1-2"
 * - "type:bug OR type:feature"
 * - "NOT status:closed"
 * - "(status:open OR status:in_progress) AND priority:high"
 */

import { Task, Priority } from '../../types'
import { BeadsIssue, BeadsPriority } from '../beads/types'

// ============================================================================
// Token Types
// ============================================================================

export type BQLTokenType =
  | 'FIELD'      // field:value
  | 'AND'        // AND
  | 'OR'         // OR
  | 'NOT'        // NOT
  | 'LPAREN'     // (
  | 'RPAREN'     // )
  | 'EOF'        // end of input

export interface BQLToken {
  type: BQLTokenType
  value: string
  field?: string      // For FIELD tokens: the field name
  fieldValue?: string // For FIELD tokens: the value
  position: number    // Position in original string for error reporting
}

// ============================================================================
// AST Node Types
// ============================================================================

export type BQLNode =
  | BQLFieldNode
  | BQLAndNode
  | BQLOrNode
  | BQLNotNode

export interface BQLFieldNode {
  type: 'field'
  field: string
  value: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'range'
  rangeEnd?: string // For range queries like priority:1-3
}

export interface BQLAndNode {
  type: 'and'
  left: BQLNode
  right: BQLNode
}

export interface BQLOrNode {
  type: 'or'
  left: BQLNode
  right: BQLNode
}

export interface BQLNotNode {
  type: 'not'
  operand: BQLNode
}

// ============================================================================
// Parse Result
// ============================================================================

export interface BQLParseResult {
  success: boolean
  ast?: BQLNode
  error?: string
  errorPosition?: number
}

// ============================================================================
// Tokenizer
// ============================================================================

export function tokenize(query: string): BQLToken[] {
  const tokens: BQLToken[] = []
  let pos = 0
  const input = query.trim()

  while (pos < input.length) {
    // Skip whitespace
    while (pos < input.length && /\s/.test(input[pos])) {
      pos++
    }
    if (pos >= input.length) break

    const startPos = pos
    const char = input[pos]

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: startPos })
      pos++
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: startPos })
      pos++
      continue
    }

    // Read word or field:value
    let word = ''
    while (pos < input.length && !/[\s()]/.test(input[pos])) {
      word += input[pos]
      pos++
    }

    if (word.length === 0) continue

    // Check for operators (case-insensitive)
    const upperWord = word.toUpperCase()
    if (upperWord === 'AND') {
      tokens.push({ type: 'AND', value: 'AND', position: startPos })
    } else if (upperWord === 'OR') {
      tokens.push({ type: 'OR', value: 'OR', position: startPos })
    } else if (upperWord === 'NOT') {
      tokens.push({ type: 'NOT', value: 'NOT', position: startPos })
    } else if (word.includes(':')) {
      // Field:value pattern
      const colonIndex = word.indexOf(':')
      const field = word.substring(0, colonIndex).toLowerCase()
      const value = word.substring(colonIndex + 1)
      tokens.push({
        type: 'FIELD',
        value: word,
        field,
        fieldValue: value,
        position: startPos,
      })
    } else {
      // Treat as a simple text search on title/description
      tokens.push({
        type: 'FIELD',
        value: word,
        field: '_text',
        fieldValue: word,
        position: startPos,
      })
    }
  }

  tokens.push({ type: 'EOF', value: '', position: input.length })
  return tokens
}

// ============================================================================
// Parser (Recursive Descent)
// ============================================================================

class Parser {
  private tokens: BQLToken[]
  private pos: number = 0

  constructor(tokens: BQLToken[]) {
    this.tokens = tokens
  }

  private current(): BQLToken {
    return this.tokens[this.pos] || { type: 'EOF', value: '', position: 0 }
  }

  private advance(): BQLToken {
    const token = this.current()
    if (this.pos < this.tokens.length) this.pos++
    return token
  }

  private match(...types: BQLTokenType[]): boolean {
    return types.includes(this.current().type)
  }

  // Grammar:
  // expression := term (OR term)*
  // term := factor (AND factor)*
  // factor := NOT factor | primary
  // primary := FIELD | LPAREN expression RPAREN

  parse(): BQLParseResult {
    try {
      if (this.current().type === 'EOF') {
        // Empty query matches everything
        return { success: true, ast: undefined }
      }
      const ast = this.parseExpression()
      if (this.current().type !== 'EOF') {
        return {
          success: false,
          error: `Unexpected token: ${this.current().value}`,
          errorPosition: this.current().position,
        }
      }
      return { success: true, ast }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Parse error',
        errorPosition: this.current().position,
      }
    }
  }

  private parseExpression(): BQLNode {
    let left = this.parseTerm()

    while (this.match('OR')) {
      this.advance() // consume OR
      const right = this.parseTerm()
      left = { type: 'or', left, right }
    }

    return left
  }

  private parseTerm(): BQLNode {
    let left = this.parseFactor()

    while (this.match('AND')) {
      this.advance() // consume AND
      const right = this.parseFactor()
      left = { type: 'and', left, right }
    }

    return left
  }

  private parseFactor(): BQLNode {
    if (this.match('NOT')) {
      this.advance() // consume NOT
      const operand = this.parseFactor()
      return { type: 'not', operand }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): BQLNode {
    if (this.match('LPAREN')) {
      this.advance() // consume (
      const expr = this.parseExpression()
      if (!this.match('RPAREN')) {
        throw new Error('Expected closing parenthesis')
      }
      this.advance() // consume )
      return expr
    }

    if (this.match('FIELD')) {
      const token = this.advance()
      return this.parseFieldNode(token)
    }

    throw new Error(`Unexpected token: ${this.current().value || 'end of input'}`)
  }

  private parseFieldNode(token: BQLToken): BQLFieldNode {
    const field = token.field || '_text'
    let value = token.fieldValue || ''
    let operator: BQLFieldNode['operator'] = '='
    let rangeEnd: string | undefined

    // Check for operators in value
    if (value.startsWith('!')) {
      operator = '!='
      value = value.substring(1)
    } else if (value.startsWith('>=')) {
      operator = '>='
      value = value.substring(2)
    } else if (value.startsWith('<=')) {
      operator = '<='
      value = value.substring(2)
    } else if (value.startsWith('>')) {
      operator = '>'
      value = value.substring(1)
    } else if (value.startsWith('<')) {
      operator = '<'
      value = value.substring(1)
    } else if (value.includes('-') && /^\d+-\d+$/.test(value)) {
      // Range: priority:1-3
      operator = 'range'
      const [start, end] = value.split('-')
      value = start
      rangeEnd = end
    } else if (value.startsWith('*') || value.endsWith('*')) {
      operator = 'contains'
      value = value.replace(/\*/g, '')
    }

    return { type: 'field', field, value, operator, rangeEnd }
  }
}

export function parse(query: string): BQLParseResult {
  const tokens = tokenize(query)
  const parser = new Parser(tokens)
  return parser.parse()
}

// ============================================================================
// Evaluator
// ============================================================================

type FilterableItem = Task | BeadsIssue

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(',').toLowerCase()
  return String(value).toLowerCase()
}

function normalizePriority(priority: Priority | BeadsPriority | undefined): number {
  if (priority === undefined) return 4
  // Handle numeric priorities
  if (typeof priority === 'number') return priority
  // Handle string priorities
  const priorityMap: Record<string, number> = {
    'critical': 1,
    'urgent': 1,
    'high': 2,
    'medium': 3,
    'low': 4,
  }
  return priorityMap[priority] ?? 4
}

function getFieldValue(item: FilterableItem, field: string): unknown {
  // Handle special fields
  switch (field) {
    case '_text':
      // Search in title and description
      return `${(item as Task).title || ''} ${(item as Task).description || ''}`
    case 'status':
      // For Task, derive status from columnId or agent status
      if ('columnId' in item) {
        const task = item as Task
        if (task.agent?.status === 'running') return 'in_progress'
        if (task.blockedBy?.length) return 'blocked'
        return 'open' // Default
      }
      return (item as BeadsIssue).status
    case 'priority':
      return normalizePriority(item.priority as Priority | BeadsPriority)
    case 'type':
      return (item as BeadsIssue).type
    case 'labels':
      return item.labels || []
    case 'assignee':
      return item.assignee
    case 'blocked':
      if ('blockedBy' in item) {
        return (item as Task).blockedBy?.length ? 'true' : 'false'
      }
      return (item as BeadsIssue).blockedBy?.length ? 'true' : 'false'
    case 'ready':
      if ('isReady' in item) {
        return (item as Task).isReady ? 'true' : 'false'
      }
      return 'true' // BeadsIssue doesn't have isReady, assume ready if no blockers
    case 'agent':
      if ('agent' in item) {
        return (item as Task).agent?.type
      }
      return undefined
    case 'branch':
      if ('git' in item) {
        return (item as Task).git?.branch
      }
      return (item as BeadsIssue).branch
    case 'pr':
      if ('git' in item) {
        return (item as Task).git?.prNumber
      }
      return (item as BeadsIssue).pr
    default:
      // Direct property access
      return (item as unknown as Record<string, unknown>)[field]
  }
}

function evaluateField(node: BQLFieldNode, item: FilterableItem): boolean {
  const fieldValue = getFieldValue(item, node.field)
  const normalizedFieldValue = normalizeValue(fieldValue)
  const queryValue = node.value.toLowerCase()

  switch (node.operator) {
    case '=':
      // Check for array membership or exact match
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => normalizeValue(v) === queryValue)
      }
      // Handle @me for assignee
      if (node.field === 'assignee' && queryValue === '@me') {
        // In a real implementation, this would check against current user
        return !!fieldValue
      }
      return normalizedFieldValue === queryValue || normalizedFieldValue.includes(queryValue)

    case '!=':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => normalizeValue(v) === queryValue)
      }
      return normalizedFieldValue !== queryValue

    case '>':
      return parseFloat(normalizedFieldValue) > parseFloat(queryValue)

    case '<':
      return parseFloat(normalizedFieldValue) < parseFloat(queryValue)

    case '>=':
      return parseFloat(normalizedFieldValue) >= parseFloat(queryValue)

    case '<=':
      return parseFloat(normalizedFieldValue) <= parseFloat(queryValue)

    case 'contains':
      return normalizedFieldValue.includes(queryValue)

    case 'range':
      const numValue = parseFloat(normalizedFieldValue)
      const rangeStart = parseFloat(queryValue)
      const rangeEnd = parseFloat(node.rangeEnd || queryValue)
      return numValue >= rangeStart && numValue <= rangeEnd

    default:
      return false
  }
}

function evaluate(node: BQLNode, item: FilterableItem): boolean {
  switch (node.type) {
    case 'field':
      return evaluateField(node, item)
    case 'and':
      return evaluate(node.left, item) && evaluate(node.right, item)
    case 'or':
      return evaluate(node.left, item) || evaluate(node.right, item)
    case 'not':
      return !evaluate(node.operand, item)
    default:
      return false
  }
}

// ============================================================================
// Public API
// ============================================================================

export interface BQLFilter {
  query: string
  ast: BQLNode | undefined
  isValid: boolean
  error?: string
}

/**
 * Compile a BQL query string into a filter object
 */
export function compileQuery(query: string): BQLFilter {
  const trimmed = query.trim()
  if (!trimmed) {
    return { query: '', ast: undefined, isValid: true }
  }

  const result = parse(trimmed)
  if (result.success) {
    return { query: trimmed, ast: result.ast, isValid: true }
  }
  return {
    query: trimmed,
    ast: undefined,
    isValid: false,
    error: result.error,
  }
}

/**
 * Filter an array of items using a compiled BQL filter
 */
export function filterItems<T extends FilterableItem>(
  items: T[],
  filter: BQLFilter
): T[] {
  if (!filter.isValid || !filter.ast) {
    return items // Return all if no valid filter
  }
  return items.filter(item => evaluate(filter.ast!, item))
}

/**
 * Check if a single item matches a compiled BQL filter
 */
export function matchesFilter<T extends FilterableItem>(
  item: T,
  filter: BQLFilter
): boolean {
  if (!filter.isValid || !filter.ast) {
    return true // Match all if no valid filter
  }
  return evaluate(filter.ast, item)
}

/**
 * Validate a BQL query string
 */
export function validateQuery(query: string): { valid: boolean; error?: string } {
  const result = parse(query.trim())
  return { valid: result.success, error: result.error }
}

// ============================================================================
// Column Presets with BQL Queries
// ============================================================================

export const BQL_COLUMN_PRESETS: Record<string, {
  name: string
  query: string
  description: string
  color: string
}> = {
  'high-priority': {
    name: 'High Priority',
    query: 'priority:1-2',
    description: 'Critical and high priority tasks',
    color: 'border-t-red-500',
  },
  'ready': {
    name: 'Ready',
    query: 'status:ready OR (status:open AND NOT blocked:true)',
    description: 'Tasks ready to be worked on',
    color: 'border-t-cyan-500',
  },
  'blocked': {
    name: 'Blocked',
    query: 'blocked:true',
    description: 'Tasks blocked by dependencies',
    color: 'border-t-orange-500',
  },
  'in-progress': {
    name: 'In Progress',
    query: 'status:in_progress OR status:in-progress',
    description: 'Tasks currently being worked on',
    color: 'border-t-yellow-500',
  },
  'bugs': {
    name: 'Bugs',
    query: 'type:bug AND NOT status:closed',
    description: 'Open bug reports',
    color: 'border-t-red-500',
  },
  'features': {
    name: 'Features',
    query: 'type:feature AND NOT status:closed',
    description: 'Feature requests',
    color: 'border-t-purple-500',
  },
  'my-tasks': {
    name: 'My Tasks',
    query: 'assignee:@me',
    description: 'Tasks assigned to you',
    color: 'border-t-blue-500',
  },
  'with-pr': {
    name: 'Has PR',
    query: 'pr:>0',
    description: 'Tasks with pull requests',
    color: 'border-t-green-500',
  },
  'done': {
    name: 'Done',
    query: 'status:closed OR status:done',
    description: 'Completed tasks',
    color: 'border-t-green-500',
  },
}
