'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { Copy, Check, FileText, ExternalLink, CheckCircle2, AlertCircle, Send, Terminal, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { parsePrompty, getFieldProgress, getPromptForSending, getFieldOrder } from '@/lib/promptyUtils'
import { InlineField } from './InlineField'

// ============================================================================
// Content Renderer with Editable Inline Fields
// ============================================================================

interface ContentWithFieldsProps {
  content: string
  variableValues: Record<string, string>
  onFieldChange: (fieldId: string, value: string) => void
  fieldOrder: string[]
  activeFieldIndex: number | null
  onNavigate: (fieldId: string, direction: 'next' | 'prev') => void
}

function ContentWithFields({
  content,
  variableValues,
  onFieldChange,
  fieldOrder,
  activeFieldIndex,
  onNavigate,
}: ContentWithFieldsProps) {
  // Split content into lines and process each
  const lines = content.split('\n')

  return (
    <div className="font-mono text-sm leading-relaxed">
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} className="min-h-[1.5em]">
          <LineWithFields
            line={line}
            variableValues={variableValues}
            onFieldChange={onFieldChange}
            fieldOrder={fieldOrder}
            activeFieldIndex={activeFieldIndex}
            onNavigate={onNavigate}
          />
        </div>
      ))}
    </div>
  )
}

interface LineWithFieldsProps {
  line: string
  variableValues: Record<string, string>
  onFieldChange: (fieldId: string, value: string) => void
  fieldOrder: string[]
  activeFieldIndex: number | null
  onNavigate: (fieldId: string, direction: 'next' | 'prev') => void
}

function LineWithFields({
  line,
  variableValues,
  onFieldChange,
  fieldOrder,
  activeFieldIndex,
  onNavigate,
}: LineWithFieldsProps) {
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
    const fieldIdx = fieldOrder.indexOf(fieldName)

    // Render editable inline field
    parts.push(
      <InlineField
        key={`field-${fieldName}-${key++}`}
        fieldId={fieldName}
        hint={hint}
        value={variableValues[fieldName] || ''}
        onChange={onFieldChange}
        onNavigate={(direction) => onNavigate(fieldName, direction)}
        isActive={activeFieldIndex === fieldIdx}
      />
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
// Terminal Selection Dropdown
// ============================================================================

interface TerminalInfo {
  id: string
  name: string
  sessionName?: string
  isClaudeSession?: boolean
}

interface TerminalDropdownProps {
  processedContent: string
  terminals: TerminalInfo[]
  onFetchTerminals: () => void
}

function TerminalDropdown({ processedContent, terminals, onFetchTerminals }: TerminalDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const sendToTerminal = async (terminal: TerminalInfo, sendEnter: boolean = false) => {
    setSendStatus('sending')
    try {
      // Try to send via local API
      const response = await fetch('/api/tabz/terminal-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: terminal.id,
          sessionName: terminal.sessionName,
          text: processedContent,
          sendEnter,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send to terminal')
      }

      setSendStatus('sent')
      setShowDropdown(false)
      toast.success('Sent to terminal')
      setTimeout(() => setSendStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to send to terminal:', err)
      toast.error('Failed to send to terminal')
      setSendStatus('idle')
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1"
        onClick={() => {
          if (!showDropdown) onFetchTerminals()
          setShowDropdown(!showDropdown)
        }}
      >
        <Send className={`h-4 w-4 ${sendStatus === 'sent' ? 'text-green-400' : ''}`} />
        {sendStatus === 'sent' ? 'Sent!' : 'Send'}
        <ChevronDown className="h-3 w-3" />
      </Button>
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
          {terminals.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No terminals found</div>
          ) : (
            <>
              <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border mb-1">
                Send to terminal
              </div>
              {terminals.map(t => (
                <div key={t.id} className="px-2">
                  <button
                    onClick={() => sendToTerminal(t, false)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded text-left"
                  >
                    <Terminal className={`h-4 w-4 ${t.isClaudeSession ? 'text-orange-400' : ''}`} />
                    <span className="truncate flex-1">{t.name}</span>
                    {t.isClaudeSession && <span className="text-xs text-orange-400">AI</span>}
                  </button>
                  {t.isClaudeSession && (
                    <button
                      onClick={() => sendToTerminal(t, true)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted rounded text-left text-muted-foreground ml-6"
                      title="Send and press Enter to submit"
                    >
                      <Send className="h-3 w-3" /> Send + Enter (submit)
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
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
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null)
  const [terminals, setTerminals] = useState<TerminalInfo[]>([])

  const parsed = useMemo(() => parsePrompty(content), [content])

  // Get ordered list of field names for tab navigation
  const fieldOrder = useMemo(() => getFieldOrder(parsed.content), [parsed.content])

  // Progress tracking
  const progress = useMemo(
    () => getFieldProgress(parsed.variables, variableValues),
    [parsed.variables, variableValues]
  )

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [fieldId]: value }))
  }, [])

  // Tab navigation between fields
  const handleNavigate = useCallback((currentFieldId: string, direction: 'next' | 'prev') => {
    const currentIndex = fieldOrder.indexOf(currentFieldId)
    let nextIndex: number

    if (direction === 'next') {
      if (currentIndex >= fieldOrder.length - 1) {
        // Last field, clear active
        setActiveFieldIndex(null)
        return
      }
      nextIndex = currentIndex + 1
    } else {
      if (currentIndex <= 0) {
        setActiveFieldIndex(null)
        return
      }
      nextIndex = currentIndex - 1
    }

    setActiveFieldIndex(nextIndex)
    // Clear after a moment to allow the field to activate
    setTimeout(() => setActiveFieldIndex(null), 100)
  }, [fieldOrder])

  // Get processed content with variables substituted
  const processedContent = useMemo(() => {
    return getPromptForSending(content, variableValues)
  }, [content, variableValues])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(processedContent)
      setCopied(true)
      toast.success('Prompt content copied (with filled values)')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const fetchTerminals = useCallback(async () => {
    try {
      const response = await fetch('/api/tabz/agents')
      if (!response.ok) return
      const data = await response.json()
      const terminalList: TerminalInfo[] = (data.data || []).map((t: { id: string; name?: string; sessionName?: string }) => ({
        id: t.id,
        name: t.name || t.id,
        sessionName: t.sessionName,
        isClaudeSession: t.name?.toLowerCase().includes('claude') || t.id?.includes('claude')
      }))
      setTerminals(terminalList)
    } catch (err) {
      console.error('Failed to fetch terminals:', err)
    }
  }, [])

  // Get known frontmatter fields
  const { name, description, model, url, ...otherFields } = parsed.frontmatter
  const hasOtherFields = Object.keys(otherFields).length > 0

  return (
    <div className="h-full flex flex-col" data-tabz-region="prompty-viewer">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 flex-wrap gap-2">
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
          {/* Progress indicator */}
          {progress.total > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
              {progress.filled === progress.total ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-pink-400/60" />
              )}
              <span>
                {progress.filled}/{progress.total} filled
              </span>
            </div>
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
              <TooltipContent>Copy prompt (with filled values)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Send to Terminal dropdown */}
          <TerminalDropdown
            processedContent={processedContent}
            terminals={terminals}
            onFetchTerminals={fetchTerminals}
          />
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
                className={`text-xs cursor-pointer transition-colors ${
                  variableValues[variable]?.trim()
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                }`}
                onClick={() => {
                  // Find and activate this field
                  const idx = fieldOrder.indexOf(variable)
                  if (idx >= 0) {
                    setActiveFieldIndex(idx)
                    setTimeout(() => setActiveFieldIndex(null), 100)
                  }
                }}
              >
                {`{{${variable}}}`}
                {variableValues[variable]?.trim() && (
                  <span className="ml-1 opacity-60">= {variableValues[variable].slice(0, 15)}{variableValues[variable].length > 15 ? '...' : ''}</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Content with Editable Fields */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <ContentWithFields
            content={parsed.content}
            variableValues={variableValues}
            onFieldChange={handleFieldChange}
            fieldOrder={fieldOrder}
            activeFieldIndex={activeFieldIndex}
            onNavigate={handleNavigate}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

export default PromptyViewer
