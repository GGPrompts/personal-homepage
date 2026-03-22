"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  User, Bot, ChevronRight, Copy, Brain, Wrench, CheckCircle, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ParsedMessage, ParsedBlock } from "@/lib/ai/jsonl-parser"

interface ConversationViewerProps {
  messages: ParsedMessage[]
  isStreaming: boolean
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border/40">
      <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2">
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto bg-muted/20">
        <code className="text-xs font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

function renderMarkdownText(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index)
      parts.push(
        <p key={`${keyPrefix}-t-${lastIndex}`} className="whitespace-pre-wrap break-words">
          {renderInlineElements(before)}
        </p>
      )
    }
    parts.push(
      <CodeBlock
        key={`${keyPrefix}-c-${match.index}`}
        code={match[2]}
        language={match[1] || 'text'}
      />
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    parts.push(
      <p key={`${keyPrefix}-t-${lastIndex}`} className="whitespace-pre-wrap break-words">
        {renderInlineElements(remaining)}
      </p>
    )
  }

  return parts
}

function renderInlineElements(text: string): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>\[\]]+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderBoldItalic(text.slice(lastIndex, match.index), `il-${lastIndex}`))
    }
    if (match[1] && match[2]) {
      parts.push(
        <a key={`link-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80">{match[1]}</a>
      )
    } else if (match[3]) {
      parts.push(
        <a key={`link-${match.index}`} href={match[3]} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80">{match[3]}</a>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(renderBoldItalic(text.slice(lastIndex), `il-${lastIndex}`))
  }

  return parts.length > 0 ? parts : [text]
}

function renderBoldItalic(text: string, key: string): React.ReactNode {
  const boldRegex = /\*\*(.+?)\*\*/g
  const inlineCodeRegex = /`([^`]+)`/g

  const segments: React.ReactNode[] = []
  let lastIdx = 0

  const allMatches: { index: number; length: number; node: React.ReactNode }[] = []

  let m: RegExpExecArray | null
  while ((m = boldRegex.exec(text)) !== null) {
    allMatches.push({
      index: m.index,
      length: m[0].length,
      node: <strong key={`${key}-b-${m.index}`}>{m[1]}</strong>,
    })
  }
  while ((m = inlineCodeRegex.exec(text)) !== null) {
    allMatches.push({
      index: m.index,
      length: m[0].length,
      node: <code key={`${key}-ic-${m.index}`} className="px-1 py-0.5 rounded bg-muted/50 text-xs font-mono">{m[1]}</code>,
    })
  }

  allMatches.sort((a, b) => a.index - b.index)

  for (const match of allMatches) {
    if (match.index < lastIdx) continue
    if (match.index > lastIdx) {
      segments.push(text.slice(lastIdx, match.index))
    }
    segments.push(match.node)
    lastIdx = match.index + match.length
  }

  if (lastIdx < text.length) {
    segments.push(text.slice(lastIdx))
  }

  return segments.length === 1 && typeof segments[0] === 'string'
    ? segments[0]
    : <React.Fragment key={key}>{segments}</React.Fragment>
}

function ThinkingBlock({ text }: { text: string }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text

  return (
    <details
      className="my-2 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 text-purple-400 hover:bg-purple-500/10 select-none">
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span>Thinking</span>
        <ChevronRight className={`h-3 w-3 ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </summary>
      <div className="px-3 pb-3 text-xs text-muted-foreground whitespace-pre-wrap">
        {isOpen ? text : truncated}
      </div>
    </details>
  )
}

function getToolSummary(toolName: string, input: unknown): string | null {
  if (!input || typeof input !== 'object') return null
  const inp = input as Record<string, unknown>
  switch (toolName) {
    case 'Read':
    case 'Write':
    case 'Edit':
      return typeof inp.file_path === 'string' ? inp.file_path.split('/').pop() || null : null
    case 'Glob':
      return typeof inp.pattern === 'string' ? inp.pattern : null
    case 'Grep':
      return typeof inp.pattern === 'string' ? inp.pattern : null
    case 'Bash': {
      const c = inp.command
      return typeof c === 'string' ? (c.length > 50 ? c.slice(0, 50) + '…' : c) : null
    }
    case 'Agent':
      return typeof inp.description === 'string' ? inp.description : null
    case 'ToolSearch':
      return typeof inp.query === 'string' ? inp.query : null
    default:
      return null
  }
}

function ToolUseBlockView({ toolName, input }: { toolName: string; input: unknown }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  const truncated = inputStr.length > 300 ? inputStr.slice(0, 300) + '...' : inputStr
  const summary = getToolSummary(toolName, input)

  return (
    <details
      className="my-2 rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 text-blue-400 hover:bg-blue-500/10 select-none">
        <Wrench className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono text-xs">{toolName}</span>
        {summary && <span className="text-xs text-muted-foreground/60 truncate font-mono">{summary}</span>}
        <ChevronRight className={`h-3 w-3 ml-auto shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </summary>
      <pre className="px-3 pb-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono">
        {isOpen ? inputStr : truncated}
      </pre>
    </details>
  )
}

function ToolResultBlockView({ text, isError }: { text: string; isError: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const maxLen = 2000
  const displayText = text.length > maxLen ? text.slice(0, maxLen) + '\n... (truncated)' : text
  const truncated = displayText.length > 200 ? displayText.slice(0, 200) + '...' : displayText

  return (
    <details
      className={`my-2 rounded-lg border overflow-hidden ${
        isError ? 'border-red-500/20 bg-red-500/5' : 'border-border/30 bg-muted/5'
      }`}
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 select-none ${
        isError ? 'text-red-400 hover:bg-red-500/10' : 'text-muted-foreground hover:bg-muted/10'
      }`}>
        {isError ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
        <span>Result</span>
        <ChevronRight className={`h-3 w-3 ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </summary>
      <pre className="px-3 pb-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono">
        {isOpen ? displayText : truncated}
      </pre>
    </details>
  )
}

function BlockRenderer({ block, keyPrefix }: { block: ParsedBlock; keyPrefix: string }) {
  switch (block.kind) {
    case 'text':
      return <div key={keyPrefix}>{renderMarkdownText(block.text, keyPrefix)}</div>
    case 'thinking':
      return <ThinkingBlock key={keyPrefix} text={block.text} />
    case 'tool_use':
      return <ToolUseBlockView key={keyPrefix} toolName={block.toolName} input={block.input} />
    case 'tool_result':
      return <ToolResultBlockView key={keyPrefix} text={block.text} isError={block.isError} />
    default:
      return null
  }
}

function MessageView({ message }: { message: ParsedMessage }) {
  if (message.role === 'summary') {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-xs text-muted-foreground italic">
          {message.blocks[0]?.kind === 'text' ? message.blocks[0].text : 'Summary'}
        </span>
        <div className="h-px flex-1 bg-border/40" />
      </div>
    )
  }

  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary/10 border border-primary/20' : 'bg-orange-500/10 border border-orange-500/20'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-orange-400" />
        )}
      </div>

      <div className={`flex-1 min-w-0 space-y-1 ${isUser ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${isUser ? 'ml-auto text-primary' : 'text-orange-400'}`}>
            {isUser ? 'You' : 'Claude'}
          </span>
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground/60" suppressHydrationWarning>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className={`inline-block max-w-full rounded-xl px-4 py-3 text-sm ${
          isUser
            ? 'glass border border-primary/20 text-left'
            : 'text-left'
        }`}>
          {message.blocks.map((block, i) => (
            <BlockRenderer key={`${message.id}-b-${i}`} block={block} keyPrefix={`${message.id}-b-${i}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function isToolOnlyMessage(msg: ParsedMessage): boolean {
  return msg.role === 'assistant' && msg.blocks.length > 0 &&
    msg.blocks.every(b => b.kind === 'tool_use' || b.kind === 'tool_result' || b.kind === 'thinking')
}

type RenderItem =
  | { type: 'single'; message: ParsedMessage }
  | { type: 'group'; messages: ParsedMessage[] }

function groupConsecutiveToolMessages(messages: ParsedMessage[]): RenderItem[] {
  const items: RenderItem[] = []
  let toolGroup: ParsedMessage[] = []

  const flushGroup = () => {
    if (toolGroup.length === 0) return
    if (toolGroup.length === 1) {
      items.push({ type: 'single', message: toolGroup[0] })
    } else {
      items.push({ type: 'group', messages: [...toolGroup] })
    }
    toolGroup = []
  }

  for (const msg of messages) {
    if (isToolOnlyMessage(msg)) {
      toolGroup.push(msg)
    } else {
      flushGroup()
      items.push({ type: 'single', message: msg })
    }
  }
  flushGroup()

  return items
}

function ToolGroupView({ messages }: { messages: ParsedMessage[] }) {
  const timestamp = messages[0]?.timestamp

  return (
    <div className="flex gap-3">
      <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
        <Bot className="h-4 w-4 text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-orange-400">Claude</span>
          {timestamp && (
            <span className="text-[10px] text-muted-foreground/60" suppressHydrationWarning>
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/40">{messages.length} tool calls</span>
        </div>
        <div className="space-y-1">
          {messages.map((msg) =>
            msg.blocks.map((block, i) => (
              <BlockRenderer key={`${msg.id}-b-${i}`} block={block} keyPrefix={`${msg.id}-b-${i}`} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function ConversationViewer({ messages, isStreaming }: ConversationViewerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const isFollowingRef = React.useRef(true)

  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      isFollowingRef.current = scrollHeight - scrollTop - clientHeight < 150
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  React.useEffect(() => {
    if (isFollowingRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (messages.length === 0) {
    return null
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
        {groupConsecutiveToolMessages(messages).map((item, idx) =>
          item.type === 'single' ? (
            <MessageView key={item.message.id} message={item.message} />
          ) : (
            <ToolGroupView key={`group-${idx}`} messages={item.messages} />
          )
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground pl-11">
            <motion.div
              className="flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-orange-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
            <span className="text-xs">Claude is working...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
