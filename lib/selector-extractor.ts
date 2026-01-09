/**
 * Selector Extractor - Utilities for extracting data-tabz-* selectors
 *
 * Two extraction modes:
 * 1. extractFromDocs() - Parse selector tables from docs/tabz-integration.md
 * 2. extractFromDOM() - Runtime extraction from live DOM via tabz MCP
 *
 * Used by Agent Cards to auto-populate page awareness selectors.
 */

import type { SelectorDoc, SelectorActionType } from './agents/types'

// ============================================================================
// Action Type Inference
// ============================================================================

/**
 * Infer action type from a selector string
 * Analyzes data-tabz-* attributes to determine the appropriate action type
 */
export function inferActionType(selector: string): SelectorActionType {
  // Check for action attribute with specific values
  const actionMatch = selector.match(/data-tabz-action="([^"]+)"/)
  if (actionMatch) {
    const action = actionMatch[1]
    if (action === 'navigate' || action.startsWith('navigate-')) return 'navigate'
    if (action === 'submit' || action.startsWith('submit-')) return 'submit'
    if (action.startsWith('toggle-')) return 'toggle'
    if (action.startsWith('filter-') || action.startsWith('set-')) return 'click'
    // Default actions are clicks
    return 'click'
  }

  // Check for input attribute
  if (selector.includes('data-tabz-input')) return 'input'

  // Check for list/item attributes
  if (selector.includes('data-tabz-list')) return 'list'
  if (selector.includes('data-tabz-item')) return 'item'

  // Check for region attribute
  if (selector.includes('data-tabz-region')) return 'region'

  // Check for command attribute
  if (selector.includes('data-tabz-command')) return 'command'

  // Check for container attribute
  if (selector.includes('data-tabz-container')) return 'region'

  // Section by itself is a region
  if (selector.includes('data-tabz-section') && !selector.includes('data-tabz-action')) {
    return 'region'
  }

  // Default to click for interactive elements
  return 'click'
}

/**
 * Extract section from a selector string if present
 */
export function extractSection(selector: string): string | undefined {
  const sectionMatch = selector.match(/data-tabz-section="([^"]+)"/)
  return sectionMatch?.[1]
}

// ============================================================================
// Markdown Table Parsing
// ============================================================================

interface MarkdownTableRow {
  selector: string
  description: string
}

/**
 * Parse markdown table rows from content
 * Expects tables with | Selector | Purpose/Description | format
 */
function parseMarkdownTable(content: string): MarkdownTableRow[] {
  const rows: MarkdownTableRow[] = []
  const lines = content.split('\n')

  let inTable = false
  let headerSkipped = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect table start (header row with Selector)
    if (trimmed.includes('| Selector') || trimmed.includes('|Selector')) {
      inTable = true
      headerSkipped = false
      continue
    }

    // Skip separator row (|---|---|)
    if (inTable && trimmed.match(/^\|[\s-:]+\|[\s-:]+\|$/)) {
      headerSkipped = true
      continue
    }

    // End of table
    if (inTable && (!trimmed.startsWith('|') || trimmed === '')) {
      inTable = false
      headerSkipped = false
      continue
    }

    // Parse data row
    if (inTable && headerSkipped && trimmed.startsWith('|')) {
      const cells = trimmed
        .split('|')
        .map(c => c.trim())
        .filter(c => c.length > 0)

      if (cells.length >= 2) {
        // Extract selector from backticks if present
        const selectorCell = cells[0]
        const selectorMatch = selectorCell.match(/`([^`]+)`/)
        const selector = selectorMatch ? selectorMatch[1] : selectorCell

        // Only process valid data-tabz selectors
        if (selector.includes('data-tabz-')) {
          rows.push({
            selector,
            description: cells[1],
          })
        }
      }
    }
  }

  return rows
}

/**
 * Detect which section a table belongs to based on preceding headers
 */
function detectTableSection(content: string, tableStartIndex: number): string | undefined {
  // Look backwards for the nearest section header
  const beforeTable = content.substring(0, tableStartIndex)
  const lines = beforeTable.split('\n').reverse()

  for (const line of lines) {
    // Match ### Section Name or ## Section Name
    const headerMatch = line.match(/^#{2,3}\s+(.+?)\s*(?:Section)?$/i)
    if (headerMatch) {
      const sectionName = headerMatch[1]
        .toLowerCase()
        .replace(/\s+section$/i, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      return sectionName
    }
  }

  return undefined
}

/**
 * Parse all selector tables from docs/tabz-integration.md content
 *
 * @param markdownContent - Raw markdown content from tabz-integration.md
 * @returns Array of SelectorDoc objects
 */
export function parseSelectorsFromMarkdown(markdownContent: string): SelectorDoc[] {
  const selectors: SelectorDoc[] = []
  const seen = new Set<string>()

  // Find each table and parse it
  const lines = markdownContent.split('\n')
  let currentSection: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track section headers
    const headerMatch = line.match(/^#{2,3}\s+(.+)/)
    if (headerMatch) {
      const header = headerMatch[1].toLowerCase()
      // Extract section name from headers like "Weather Section" or "AI Workspace Section"
      const sectionMatch = header.match(/^(\S+(?:\s+\S+)?)\s*(?:section)?$/i)
      if (sectionMatch) {
        currentSection = sectionMatch[1]
          .toLowerCase()
          .replace(/\s+section$/i, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      }
    }

    // Parse table rows with selectors
    if (line.trim().startsWith('|') && line.includes('data-tabz-')) {
      const cells = line
        .split('|')
        .map(c => c.trim())
        .filter(c => c.length > 0)

      if (cells.length >= 2) {
        const selectorCell = cells[0]
        const selectorMatch = selectorCell.match(/`([^`]+)`/)
        const selector = selectorMatch ? selectorMatch[1] : selectorCell

        if (selector.includes('data-tabz-') && !seen.has(selector)) {
          seen.add(selector)

          // Try to extract section from selector itself first
          const selectorSection = extractSection(selector) || currentSection

          selectors.push({
            selector,
            description: cells[1],
            action_type: inferActionType(selector),
            section: selectorSection,
          })
        }
      }
    }
  }

  return selectors
}

/**
 * Extract selectors from the docs/tabz-integration.md file
 *
 * This function reads the markdown file and parses all selector tables.
 * Intended for server-side or build-time use.
 *
 * @returns Promise resolving to array of SelectorDoc objects
 */
export async function extractFromDocs(): Promise<SelectorDoc[]> {
  // Dynamic import for fs to support both Node.js and edge environments
  const fs = await import('fs/promises')
  const path = await import('path')

  // Find the docs file relative to project root
  const docsPath = path.join(process.cwd(), 'docs', 'tabz-integration.md')

  try {
    const content = await fs.readFile(docsPath, 'utf-8')
    return parseSelectorsFromMarkdown(content)
  } catch (error) {
    console.error('Failed to read tabz-integration.md:', error)
    return []
  }
}

// ============================================================================
// Runtime DOM Extraction
// ============================================================================

/**
 * Build CSS selector for a data-tabz attribute
 */
function buildSelector(attr: string, value: string): string {
  // Handle prefix matching for items (e.g., data-tabz-item^="feed-")
  if (attr === 'data-tabz-item' && value.includes('-')) {
    const prefix = value.split('-')[0]
    return `[${attr}^="${prefix}-"]`
  }
  return `[${attr}="${value}"]`
}

/**
 * Describe an element based on its attributes
 */
function describeElement(attr: string, value: string, tagName: string): string {
  const tag = tagName.toLowerCase()
  const isButton = tag === 'button' || tag === 'a'
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'

  switch (attr) {
    case 'data-tabz-section':
      return `${value} section container`
    case 'data-tabz-action':
      return `${value.replace(/-/g, ' ')} ${isButton ? 'button' : 'action'}`
    case 'data-tabz-input':
      return `${value.replace(/-/g, ' ')} ${isInput ? 'input field' : 'input'}`
    case 'data-tabz-list':
      return `${value.replace(/-/g, ' ')} list container`
    case 'data-tabz-item':
      return `${value.replace(/-/g, ' ')} list item`
    case 'data-tabz-region':
      return `${value.replace(/-/g, ' ')} region`
    case 'data-tabz-container':
      return `${value.replace(/-/g, ' ')} container`
    case 'data-tabz-command':
      return `terminal command: ${value}`
    case 'data-tabz-project':
      return `working directory: ${value}`
    default:
      return `${attr}: ${value}`
  }
}

/**
 * Extract element info for SelectorDoc from DOM element attributes
 * This is the shape returned by the runtime extraction
 */
export interface DOMElementInfo {
  selector: string
  description: string
  action_type: SelectorActionType
  section?: string
  tagName: string
  attributes: Record<string, string>
}

/**
 * Process a DOM element's tabz attributes into SelectorDoc format
 *
 * @param attributes - Object with attribute name-value pairs
 * @param tagName - Element tag name (e.g., 'button', 'input')
 * @returns DOMElementInfo or null if not a tabz element
 */
export function processElementAttributes(
  attributes: Record<string, string>,
  tagName: string
): DOMElementInfo | null {
  // Find the primary tabz attribute
  const tabzAttrs = Object.entries(attributes).filter(([k]) => k.startsWith('data-tabz-'))

  if (tabzAttrs.length === 0) return null

  // Build a composite selector from all tabz attributes
  const selectorParts = tabzAttrs.map(([attr, value]) => `[${attr}="${value}"]`)
  const selector = selectorParts.join('')

  // Get section if present
  const section = attributes['data-tabz-section']

  // Find the primary attribute for description (priority order)
  const priorityOrder = [
    'data-tabz-action',
    'data-tabz-input',
    'data-tabz-section',
    'data-tabz-list',
    'data-tabz-item',
    'data-tabz-region',
    'data-tabz-command',
  ]

  let primaryAttr = tabzAttrs[0]
  for (const attrName of priorityOrder) {
    const found = tabzAttrs.find(([k]) => k === attrName)
    if (found) {
      primaryAttr = found
      break
    }
  }

  return {
    selector,
    description: describeElement(primaryAttr[0], primaryAttr[1], tagName),
    action_type: inferActionType(selector),
    section,
    tagName,
    attributes,
  }
}

/**
 * Extract selectors from the live DOM for a specific section
 *
 * This function is designed to be called with DOM data retrieved via tabz MCP tools.
 * It processes the raw DOM element data and returns SelectorDoc objects.
 *
 * Usage with tabz MCP:
 * 1. Use tabz_get_dom_tree or tabz_execute_script to get elements with data-tabz-* attrs
 * 2. Pass the element data to this function
 *
 * @param elements - Array of element info objects from DOM
 * @param sectionId - Optional section ID to filter by
 * @returns Array of SelectorDoc objects
 *
 * @example
 * ```typescript
 * // Elements retrieved via tabz_execute_script
 * const elements = [
 *   { tagName: 'button', attributes: { 'data-tabz-action': 'submit', 'data-tabz-section': 'weather' } },
 *   { tagName: 'input', attributes: { 'data-tabz-input': 'search-query' } }
 * ]
 * const selectors = extractFromDOM(elements, 'weather')
 * ```
 */
export function extractFromDOM(
  elements: Array<{ tagName: string; attributes: Record<string, string> }>,
  sectionId?: string
): SelectorDoc[] {
  const selectors: SelectorDoc[] = []
  const seen = new Set<string>()

  for (const element of elements) {
    const info = processElementAttributes(element.attributes, element.tagName)
    if (!info) continue

    // Filter by section if specified
    if (sectionId && info.section !== sectionId) continue

    // Deduplicate by selector
    if (seen.has(info.selector)) continue
    seen.add(info.selector)

    selectors.push({
      selector: info.selector,
      description: info.description,
      action_type: info.action_type,
      section: info.section,
    })
  }

  return selectors
}

/**
 * JavaScript code to extract tabz elements from the DOM
 * Execute this via tabz_execute_script to get element data for extractFromDOM()
 */
export const DOM_EXTRACTION_SCRIPT = `
(function() {
  const elements = [];
  document.querySelectorAll('[data-tabz-section], [data-tabz-action], [data-tabz-input], [data-tabz-list], [data-tabz-item], [data-tabz-region], [data-tabz-command], [data-tabz-container]').forEach(el => {
    const attributes = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-tabz-')) {
        attributes[attr.name] = attr.value;
      }
    }
    if (Object.keys(attributes).length > 0) {
      elements.push({
        tagName: el.tagName,
        attributes: attributes
      });
    }
  });
  return elements;
})()
`

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get selectors for a specific section from an array
 */
export function filterBySection(selectors: SelectorDoc[], sectionId: string): SelectorDoc[] {
  return selectors.filter(s => s.section === sectionId)
}

/**
 * Get selectors by action type
 */
export function filterByActionType(
  selectors: SelectorDoc[],
  actionType: SelectorActionType
): SelectorDoc[] {
  return selectors.filter(s => s.action_type === actionType)
}

/**
 * Merge selectors from multiple sources, deduplicating by selector string
 * Later sources override earlier ones
 */
export function mergeSelectors(...sources: SelectorDoc[][]): SelectorDoc[] {
  const merged = new Map<string, SelectorDoc>()

  for (const source of sources) {
    for (const selector of source) {
      merged.set(selector.selector, selector)
    }
  }

  return Array.from(merged.values())
}

/**
 * Get all unique sections from a selector array
 */
export function getUniqueSections(selectors: SelectorDoc[]): string[] {
  const sections = new Set<string>()
  for (const selector of selectors) {
    if (selector.section) {
      sections.add(selector.section)
    }
  }
  return Array.from(sections).sort()
}
