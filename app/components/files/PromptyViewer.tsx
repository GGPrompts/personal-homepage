'use client'

import React, { useMemo, useState } from 'react'
import { Copy, Check, FileText, Sparkles, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================================================
// Prompty Parsing Utilities
// ============================================================================

interface PromptyFrontmatter {
  name?: string
  description?: string
  model?: string
  url?: string
  [key: string]: string | undefined
}

interface ParsedPrompty {
  frontmatter: PromptyFrontmatter
  content: string
  variables: string[]
}

function parsePrompty(raw: string): ParsedPrompty {
  const frontmatter: PromptyFrontmatter = {}
  let content = raw

  // Extract YAML frontmatter between --- delimiters
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1]
    content = frontmatterMatch[2]

    // Simple YAML parsing (key: value pairs)
    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.*)$/)
      if (match) {
        frontmatter[match[1]] = match[2].trim()
      }
    })
  }

  // Detect {{variables}} and {{variable:hint}} in content
  const variableMatches = content.match(/\{\{([^:}]+)(?::[^}]+)?\}\}/g) || []
  const variables = [...new Set(variableMatches.map(v => {
    const match = v.match(/\{\{([^:}]+)/)
    return match ? match[1].trim() : ''
  }).filter(Boolean))]

  return { frontmatter, content, variables }
}

// ============================================================================
// Content Renderer with Variable Highlighting
// ============================================================================

interface ContentWithVariablesProps {
  content: string
}

function ContentWithVariables({ content }: ContentWithVariablesProps) {
  // Split content into lines and process each
  const lines = content.split('\n')

  return (
    <div className="font-mono text-sm leading-relaxed">
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} className="min-h-[1.5em]">
          <LineWithVariables line={line} />
        </div>
      ))}
    </div>
  )
}

function LineWithVariables({ line }: { line: string }) {
  // Match {{variable}} or {{variable:hint}} patterns
  const fieldRegex = /\{\{([^:}]+)(?::([^}]+))?\}\}/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = fieldRegex.exec(line)) !== null) {
    // Add text before this field
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`} className="text-foreground/90">
          {line.slice(lastIndex, match.index)}
        </span>
      )
    }

    const fieldName = match[1].trim()
    const hint = match[2]?.trim()

    // Render the variable as a highlighted badge
    parts.push(
      <TooltipProvider key={`field-${key++}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-medium cursor-help">
              <Sparkles className="h-3 w-3" />
              {fieldName}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">
              {hint ? `${fieldName}: ${hint}` : `Variable: ${fieldName}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    lastIndex = fieldRegex.lastIndex
  }

  // Add remaining text after last field
  if (lastIndex < line.length) {
    parts.push(
      <span key={`text-${key++}`} className="text-foreground/90">
        {line.slice(lastIndex)}
      </span>
    )
  }

  // If no parts, return the line as-is (or empty space for blank lines)
  if (parts.length === 0) {
    return <span className="text-foreground/90">{line || ' '}</span>
  }

  return <>{parts}</>
}

// ============================================================================
// Main PromptyViewer Component
// ============================================================================

interface PromptyViewerProps {
  content: string
  fileName?: string
}

export function PromptyViewer({ content, fileName }: PromptyViewerProps) {
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => parsePrompty(content), [content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.content)
      setCopied(true)
      toast.success('Prompt content copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // Get known frontmatter fields
  const { name, description, model, url, ...otherFields } = parsed.frontmatter
  const hasOtherFields = Object.keys(otherFields).length > 0

  return (
    <div className="h-full flex flex-col" data-tabz-region="prompty-viewer">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-pink-400" />
          <span className="text-sm font-medium text-muted-foreground">
            {fileName || 'Prompty File'}
          </span>
          <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-400 border-pink-500/30">
            .prompty
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {parsed.variables.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {parsed.variables.length} variable{parsed.variables.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy prompt content</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Frontmatter Header */}
      {(name || description || model || hasOtherFields) && (
        <div className="px-4 py-3 border-b border-border bg-pink-500/5">
          {name && (
            <h2 className="text-lg font-semibold text-pink-400 flex items-center gap-2">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-flex items-center gap-1.5"
                >
                  {name}
                  <ExternalLink className="h-4 w-4 opacity-60" />
                </a>
              ) : (
                name
              )}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          {(model || hasOtherFields) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {model && (
                <Badge variant="outline" className="text-xs">
                  Model: {model}
                </Badge>
              )}
              {Object.entries(otherFields).map(([key, value]) => (
                value && (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {value}
                  </Badge>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* Variables Summary */}
      {parsed.variables.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/20">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Variables:</span>
            {parsed.variables.map(variable => (
              <Badge
                key={variable}
                variant="outline"
                className="text-xs bg-pink-500/10 text-pink-400 border-pink-500/30"
              >
                {`{{${variable}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <ContentWithVariables content={parsed.content} />
        </div>
      </ScrollArea>
    </div>
  )
}

export default PromptyViewer
