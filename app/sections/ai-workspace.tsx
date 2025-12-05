"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/AuthProvider"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  MessageSquare, Send, Bot, User, Copy, RotateCw, ThumbsUp, ThumbsDown,
  Settings, ChevronDown, Plus, X, Trash2, Code, CheckCheck,
  Sparkles, StopCircle, Clock, Cpu, FileJson, FileText, FolderOpen,
  Wrench, Loader2, ChevronRight,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAllProjectsMeta } from "@/hooks/useProjectMeta"
import type { Project, LocalProject } from "@/lib/projects"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type MessageRole = 'user' | 'assistant' | 'system'
type AIBackend = 'claude' | 'gemini' | 'codex' | 'docker' | 'mock'

// Tool use tracking
interface ToolUse {
  id: string
  name: string
  input?: string
  status: 'running' | 'complete'
}

interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  feedback?: 'up' | 'down'
  isStreaming?: boolean
  model?: AIBackend  // Which model generated this response
  toolUses?: ToolUse[]  // Tool uses in this message
}

// Claude stream event types (matching lib/ai/claude.ts)
interface ClaudeStreamEvent {
  type: 'text' | 'tool_start' | 'tool_input' | 'tool_end' | 'heartbeat' | 'error' | 'done'
  content?: string
  tool?: {
    id: string
    name: string
    input?: string
  }
  error?: string
  sessionId?: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  model?: string
  projectPath?: string | null
  settings?: ConversationSettings
  claudeSessionId?: string | null
}

// Settings stored per-conversation
interface ConversationSettings {
  systemPrompt?: string
  // Claude CLI specific options
  claudeModel?: string
  additionalDirs?: string[]
  allowedTools?: string[]
  disallowedTools?: string[]
  permissionMode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan'
  // Docker model options (only applicable for docker backend)
  temperature?: number
  maxTokens?: number
}

interface ChatSettings {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  // Claude CLI specific options
  additionalDirs?: string[]
  claudeModel?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  permissionMode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan'
}

// ============================================================================
// MOCK DATA & UTILITIES
// ============================================================================

const SUGGESTED_PROMPTS = [
  { icon: Code, text: "Help me debug this TypeScript error", category: "Debug" },
  { icon: Sparkles, text: "Explain how async/await works", category: "Learn" },
  { icon: Code, text: "Generate a React component", category: "Create" },
  { icon: CheckCheck, text: "Review my code for best practices", category: "Review" },
]

const DEFAULT_SETTINGS: ChatSettings = {
  model: 'mock', // Default to mock until we fetch real models
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful AI coding assistant. Provide clear, concise answers with code examples when relevant.',
}

interface ModelInfo {
  id: string
  name: string
  backend: AIBackend
  description?: string
}

// Model colors for badges
const MODEL_COLORS: Record<AIBackend, { bg: string; text: string; border: string }> = {
  claude: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  gemini: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  codex: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
  docker: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  mock: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' },
}

const MODEL_ICONS: Record<AIBackend, string> = {
  claude: '🧡',
  gemini: '💎',
  codex: '🤖',
  docker: '🐳',
  mock: '🎭',
}

interface BackendStatus {
  backend: string
  available: boolean
  error?: string
}

// Mock responses for demonstration
const MOCK_RESPONSES: Record<string, string> = {
  debug: "I'd be happy to help debug your TypeScript error! Here's a systematic approach:\n\n```typescript\n// Common TypeScript errors and fixes:\n\n// 1. Type mismatch\nconst value: string = 42; // ❌ Error\nconst value: string = \"42\"; // ✅ Fixed\n\n// 2. Property doesn't exist\ninterface User {\n  name: string;\n}\nconst user: User = { name: \"John\", age: 30 }; // ❌\n\n// Fix: Extend interface\ninterface User {\n  name: string;\n  age?: number; // Optional property\n}\n```\n\nCould you share the specific error message you're seeing?",

  async: "Great question! `async/await` is syntactic sugar for working with Promises in JavaScript:\n\n```javascript\n// Traditional Promise chain\nfetchUser(id)\n  .then(user => fetchPosts(user.id))\n  .then(posts => console.log(posts))\n  .catch(error => console.error(error));\n\n// Same with async/await\nasync function getUserPosts(id) {\n  try {\n    const user = await fetchUser(id);\n    const posts = await fetchPosts(user.id);\n    console.log(posts);\n  } catch (error) {\n    console.error(error);\n  }\n}\n```\n\n**Key concepts:**\n- `async` makes a function return a Promise\n- `await` pauses execution until Promise resolves\n- Makes asynchronous code look synchronous",

  component: "Here's a modern React component with TypeScript:\n\n```tsx\nimport React, { useState } from 'react';\n\ninterface UserCardProps {\n  name: string;\n  role: string;\n  avatarUrl?: string;\n  onContact?: () => void;\n}\n\nexport function UserCard({ \n  name, \n  role, \n  avatarUrl, \n  onContact \n}: UserCardProps) {\n  const [isHovered, setIsHovered] = useState(false);\n\n  return (\n    <div \n      className=\"glass rounded-lg p-6\"\n      onMouseEnter={() => setIsHovered(true)}\n      onMouseLeave={() => setIsHovered(false)}\n    >\n      <div className=\"flex items-center gap-4\">\n        <img \n          src={avatarUrl || '/default-avatar.png'} \n          alt={name}\n          className=\"w-16 h-16 rounded-full\"\n        />\n        \n        <div className=\"flex-1\">\n          <h3 className=\"text-lg font-semibold terminal-glow\">{name}</h3>\n          <p className=\"text-sm text-muted-foreground\">{role}</p>\n        </div>\n        \n        {onContact && (\n          <button\n            onClick={onContact}\n            className=\"px-4 py-2 bg-primary text-primary-foreground rounded-md\"\n          >\n            Contact\n          </button>\n        )}\n      </div>\n    </div>\n  );\n}\n```",

  review: "I'll review your code for best practices. Here are key areas I look for:\n\n**✅ Good Practices:**\n```typescript\n// 1. Descriptive naming\nconst calculateUserAge = (birthDate: Date) => {...}\n\n// 2. Single responsibility\nfunction validateEmail(email: string): boolean {...}\nfunction sendEmail(to: string, subject: string) {...}\n\n// 3. Early returns\nfunction processUser(user: User | null) {\n  if (!user) return null;\n  if (!user.isActive) return null;\n  \n  return processActiveUser(user);\n}\n\n// 4. Type safety\ninterface Config {\n  apiKey: string;\n  timeout: number;\n}\n```\n\nShare your code and I'll provide specific feedback!",

  default: "I'm here to help! I can assist with:\n\n🐛 **Debugging** - Fix errors and issues in your code\n📚 **Learning** - Explain concepts and best practices\n⚡ **Coding** - Generate components and functions\n✅ **Review** - Analyze code quality\n\nNote: This is a mock response. In Phase 2, I'll connect to real AI backends.\n\nWhat would you like to work on?"
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Parse Claude events from content that may contain __CLAUDE_EVENT__<JSON>__END_EVENT__ markers
function parseClaudeEvents(content: string): { text: string; events: ClaudeStreamEvent[] } {
  const events: ClaudeStreamEvent[] = []
  const eventRegex = /__CLAUDE_EVENT__(.*?)__END_EVENT__/g
  let text = content

  let match
  while ((match = eventRegex.exec(content)) !== null) {
    try {
      const event = JSON.parse(match[1]) as ClaudeStreamEvent
      events.push(event)
    } catch {
      // Invalid JSON, skip
    }
  }

  // Remove event markers from text
  text = content.replace(/__CLAUDE_EVENT__.*?__END_EVENT__/g, '').replace(/\n{3,}/g, '\n\n')

  return { text, events }
}

// Helper to render text with clickable links
function renderTextWithLinks(text: string, keyPrefix: string): React.ReactNode[] {
  // Combined regex: matches markdown links OR plain URLs
  // Markdown links: [text](url) - captured in groups 1 and 2
  // Plain URLs: https?://... - captured in group 3
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>\[\]]+)/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1] && match[2]) {
      // Markdown-style link: [text](url)
      parts.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {match[1]}
        </a>
      )
    } else if (match[3]) {
      // Plain URL
      parts.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {match[3]}
        </a>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

function getResponseForPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('debug') || lowerPrompt.includes('error')) return MOCK_RESPONSES.debug
  if (lowerPrompt.includes('async') || lowerPrompt.includes('await')) return MOCK_RESPONSES.async
  if (lowerPrompt.includes('component') || lowerPrompt.includes('react')) return MOCK_RESPONSES.component
  if (lowerPrompt.includes('review') || lowerPrompt.includes('best practice')) return MOCK_RESPONSES.review

  return MOCK_RESPONSES.default
}

// Load conversations from localStorage
function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return []

  try {
    const saved = localStorage.getItem("ai-workspace-conversations")
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convert date strings back to Date objects
      return parsed.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }))
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return [{
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }]
}

// Load settings from localStorage
function loadSettings(): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS

  try {
    const saved = localStorage.getItem("ai-workspace-settings")
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return DEFAULT_SETTINGS
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Tool use display with auto-expand and auto-collapse
function ToolUseDisplay({ tool }: { tool: ToolUse }) {
  const [isOpen, setIsOpen] = React.useState(true) // Start expanded
  const collapseTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const manuallyToggledRef = React.useRef(false) // Track if user manually toggled

  React.useEffect(() => {
    // Auto-collapse after 4 seconds when tool completes (unless manually toggled)
    if (tool.status === 'complete' && isOpen && !manuallyToggledRef.current) {
      collapseTimerRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 4000)
    }

    // Clear timer on cleanup or if tool starts running again
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [tool.status, isOpen])

  // Keep expanded while running
  React.useEffect(() => {
    if (tool.status === 'running') {
      setIsOpen(true)
      manuallyToggledRef.current = false // Reset manual toggle when tool starts
      // Clear any pending collapse timer
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [tool.status])

  // Handle manual toggle
  const handleOpenChange = (open: boolean) => {
    manuallyToggledRef.current = true // User manually toggled
    setIsOpen(open)
    // Clear any pending auto-collapse
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
          tool.status === 'running'
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}>
          {tool.status === 'running' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wrench className="h-3 w-3" />
          )}
          <span className="font-mono">{tool.name}</span>
          {tool.status === 'running' && (
            <span className="text-[10px] opacity-70">running...</span>
          )}
        </div>
        {tool.input && (
          <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform data-[state=open]:rotate-90" />
        )}
      </CollapsibleTrigger>
      {tool.input && (
        <CollapsibleContent>
          <div className="mt-1 ml-2 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-all">{tool.input}</pre>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3 glass rounded-lg w-fit border border-primary/20"
    >
      <Bot className="h-4 w-4 text-primary terminal-glow" />
      <span className="text-sm text-muted-foreground">Thinking</span>
      <div className="flex gap-1">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-primary rounded-full terminal-glow"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-primary rounded-full terminal-glow"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-primary rounded-full terminal-glow"
        />
      </div>
    </motion.div>
  )
}

interface MessageBubbleProps {
  message: Message
  onCopy: () => void
  onRegenerate: () => void
  onFeedback: (type: 'up' | 'down') => void
  userAvatarUrl?: string | null
  availableModels?: ModelInfo[]
}

function MessageBubble({ message, onCopy, onRegenerate, onFeedback, userAvatarUrl, availableModels }: MessageBubbleProps) {
  const [showActions, setShowActions] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const isUser = message.role === 'user'
  const modelColors = message.model ? MODEL_COLORS[message.model] : null
  const modelIcon = message.model ? MODEL_ICONS[message.model] : null
  const modelName = message.model
    ? availableModels?.find(m => m.backend === message.model)?.name || message.model
    : null

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple markdown rendering for code blocks and links
  const renderContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block (with link rendering)
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index)
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {renderTextWithLinks(textBefore, `msg-${lastIndex}`)}
          </p>
        )
      }

      // Add code block
      const language = match[1] || 'text'
      const code = match[2]
      parts.push(
        <div key={`code-${match.index}`} className="my-3 rounded-lg overflow-hidden border border-border/40">
          <div className="bg-muted/30 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">{language}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(code)}
              className="h-6 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="p-4 overflow-x-auto bg-muted/20">
            <code className="text-sm font-mono">{code}</code>
          </pre>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text (with link rendering)
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex)
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {renderTextWithLinks(remainingText, `msg-${lastIndex}`)}
        </p>
      )
    }

    return parts.length > 0 ? parts : (
      <p className="whitespace-pre-wrap">
        {renderTextWithLinks(content, 'msg-full')}
      </p>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      onHoverStart={() => !isUser && setShowActions(true)}
      onHoverEnd={() => !isUser && setShowActions(false)}
    >
      {/* Hide avatars on mobile */}
      <Avatar className="h-8 w-8 border-2 border-primary/20 hidden sm:flex">
        {isUser && userAvatarUrl && <AvatarImage src={userAvatarUrl} alt="You" />}
        <AvatarFallback className={isUser ? 'bg-primary/20' : 'bg-secondary/20'}>
          {isUser ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-secondary" />}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-full sm:max-w-[85%] ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'glass'
          }`}
        >
          {/* Tool uses display */}
          {!isUser && message.toolUses && message.toolUses.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.toolUses.map((tool) => (
                <ToolUseDisplay key={tool.id} tool={tool} />
              ))}
            </div>
          )}

          <div className="prose prose-sm max-w-none dark:prose-invert">
            {renderContent(message.content)}
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
            <Clock className="h-3 w-3" />
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {!isUser && modelColors && modelName && (
              <>
                <span className="opacity-50">•</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${modelColors.bg} ${modelColors.text} border ${modelColors.border}`}>
                  <span>{modelIcon}</span>
                  <span className="capitalize text-[10px]">{modelName}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {!isUser && (
          <div
            className={`flex items-center gap-1 mt-2 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2"
                  >
                    {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy message</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRegenerate}
                    className="h-7 px-2"
                  >
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate response</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-4" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFeedback('up')}
                    className={`h-7 px-2 ${message.feedback === 'up' ? 'text-green-500' : ''}`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Good response</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFeedback('down')}
                    className={`h-7 px-2 ${message.feedback === 'down' ? 'text-red-500' : ''}`}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Poor response</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIWorkspaceSection({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  // Auth for user avatar
  const { user } = useAuth()
  const userAvatarUrl = user?.user_metadata?.avatar_url || null

  // State management
  const [conversations, setConversations] = React.useState<Conversation[]>(loadConversations)
  const [activeConvId, setActiveConvId] = React.useState(() => {
    const loaded = loadConversations()
    return loaded[0]?.id || generateId()
  })
  const [inputValue, setInputValue] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [settings, setSettings] = React.useState<ChatSettings>(loadSettings)
  const [showSettings, setShowSettings] = React.useState(false)
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [availableModels, setAvailableModels] = React.useState<ModelInfo[]>([])
  const [backends, setBackends] = React.useState<BackendStatus[]>([])
  const [modelsLoading, setModelsLoading] = React.useState(true)
  const [selectedProjectPath, setSelectedProjectPath] = React.useState<string | null>(null)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0]

  // Note: We intentionally do NOT abort streaming on unmount
  // The server-side request continues and writes to JSONL
  // When user returns, we sync from server to get any missed messages

  // Sync from server-side JSONL on mount and when active conversation changes
  // This catches any responses that completed while user was away
  React.useEffect(() => {
    async function syncFromServer() {
      if (!activeConv?.id) return

      try {
        // Check if server has messages for this conversation
        const response = await fetch(`/api/ai/conversations?id=${activeConv.id}`)
        if (!response.ok) return

        const data = await response.json()
        if (!data.messages || data.messages.length === 0) return

        // Find the last assistant message from server
        const serverMessages = data.messages.filter((m: any) => m.role !== 'system')
        const lastServerAssistant = [...serverMessages].reverse().find((m: any) => m.role === 'assistant')

        if (!lastServerAssistant) return

        // Check if we're missing this message locally
        const localMessages = activeConv.messages
        const lastLocalAssistant = [...localMessages].reverse().find(m => m.role === 'assistant')

        // If server has a newer assistant message than local, sync it
        if (lastServerAssistant.ts > (lastLocalAssistant?.timestamp?.getTime() || 0)) {
          console.log('Syncing missed response from server')

          // Add the missing assistant message
          const syncedMessage: Message = {
            id: lastServerAssistant.id,
            role: 'assistant',
            content: lastServerAssistant.content,
            timestamp: new Date(lastServerAssistant.ts),
            model: lastServerAssistant.model as AIBackend,
            isStreaming: false,
          }

          setConversations(prev => prev.map(conv => {
            if (conv.id !== activeConvId) return conv
            // Only add if we don't already have it
            if (conv.messages.find(m => m.id === syncedMessage.id)) return conv
            return {
              ...conv,
              messages: [...conv.messages, syncedMessage],
              updatedAt: new Date(),
            }
          }))
        }
      } catch (error) {
        // Silent fail - sync is best-effort
        console.debug('Server sync failed:', error)
      }
    }

    // Sync when component mounts or conversation changes
    syncFromServer()
  }, [activeConvId])

  const selectedModel = availableModels.find(m => m.id === settings.model)

  // Fetch local projects and pinned status
  const { getPinnedSlugs, isConfigured: projectsConfigured } = useAllProjectsMeta()
  const { data: localProjects } = useQuery({
    queryKey: ['local-projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects/local')
      if (!res.ok) return []
      const data = await res.json()
      return (data.projects || []) as LocalProject[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get pinned projects with their paths
  const pinnedProjects = React.useMemo(() => {
    if (!localProjects || !Array.isArray(localProjects) || !projectsConfigured) return []
    const pinnedSlugs = getPinnedSlugs()
    return localProjects.filter(p => {
      const slug = `local-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      return pinnedSlugs.includes(slug)
    })
  }, [localProjects, getPinnedSlugs, projectsConfigured])

  const selectedProject = pinnedProjects.find(p => p.path === selectedProjectPath)

  // Fetch available models on mount
  React.useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/ai/models')
        const data = await response.json()

        if (data.models) {
          setAvailableModels(data.models)

          // Set default model to first available (preferring non-mock)
          const defaultModel = data.models.find((m: ModelInfo) => m.backend !== 'mock') || data.models[0]
          if (defaultModel && !data.models.find((m: ModelInfo) => m.id === settings.model)) {
            setSettings(prev => ({ ...prev, model: defaultModel.id }))
          }
        }

        if (data.backends) {
          setBackends(data.backends)
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
        // Fallback to mock
        setAvailableModels([{
          id: 'mock',
          name: 'Mock AI (Demo)',
          backend: 'mock',
          description: 'Simulated responses'
        }])
      } finally {
        setModelsLoading(false)
      }
    }

    fetchModels()
  }, [])

  // Save conversations to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem("ai-workspace-conversations", JSON.stringify(conversations))
  }, [conversations])

  // Save settings to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem("ai-workspace-settings", JSON.stringify(settings))
  }, [settings])

  // Restore model and project context when switching conversations
  React.useEffect(() => {
    if (activeConv.model && activeConv.model !== settings.model) {
      setSettings(prev => ({ ...prev, model: activeConv.model! }))
    }
    if (activeConv.projectPath !== undefined && activeConv.projectPath !== selectedProjectPath) {
      setSelectedProjectPath(activeConv.projectPath)
    }
  }, [activeConvId])

  // Responsive sidebar - hide on mobile by default
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowSidebar(false)
      } else {
        setShowSidebar(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv.messages, isTyping])

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv

      const newMessages = [...conv.messages, userMessage]
      const newTitle = conv.messages.length === 0
        ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
        : conv.title

      // Save model and project context on first message
      const shouldSaveContext = conv.messages.length === 0

      return {
        ...conv,
        title: newTitle,
        messages: newMessages,
        updatedAt: new Date(),
        ...(shouldSaveContext && {
          model: settings.model,
          projectPath: selectedProjectPath,
        }),
      }
    }))

    setInputValue('')
    setIsTyping(true)

    // Prepare messages for API
    const allMessages = activeConv.messages
      .concat(userMessage)
      .map(m => ({ role: m.role, content: m.content }))

    // Add system prompt if set
    if (settings.systemPrompt) {
      allMessages.unshift({
        role: 'system',
        content: settings.systemPrompt
      })
    }

    // Determine backend from selected model
    const selectedModel = availableModels.find(m => m.id === settings.model)
    const backend = selectedModel?.backend || 'mock'

    // Use conversation settings if available, fall back to global
    const convSettings = activeConv.settings || {}
    const effectiveProjectPath = activeConv.projectPath ?? selectedProjectPath

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()

      // Call API with streaming
      // Include conversationId so server writes to JSONL (enables background processing)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          backend,
          model: activeConv.model || settings.model,
          conversationId: activeConvId, // Server writes to JSONL for persistence
          settings: {
            temperature: convSettings.temperature ?? settings.temperature,
            maxTokens: convSettings.maxTokens ?? settings.maxTokens,
            systemPrompt: convSettings.systemPrompt ?? settings.systemPrompt,
            additionalDirs: convSettings.additionalDirs ?? settings.additionalDirs,
            claudeModel: convSettings.claudeModel ?? settings.claudeModel,
            allowedTools: convSettings.allowedTools ?? settings.allowedTools,
            disallowedTools: convSettings.disallowedTools ?? settings.disallowedTools,
            permissionMode: convSettings.permissionMode ?? settings.permissionMode,
          },
          cwd: effectiveProjectPath || undefined,
          claudeSessionId: activeConv.claudeSessionId || undefined
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      setIsTyping(false)

      // Create assistant message with model info
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        model: backend as AIBackend,
      }

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv
        return {
          ...conv,
          messages: [...conv.messages, assistantMessage],
          updatedAt: new Date(),
        }
      }))

      setIsStreaming(true)

      // Parse SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          const data = line.slice(6)

          if (data === '[DONE]') {
            setIsStreaming(false)
            setConversations(prev => prev.map(conv => {
              if (conv.id !== activeConvId) return conv
              return {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, isStreaming: false }
                    : msg
                ),
              }
            }))
            break
          }

          try {
            const chunk = JSON.parse(data)

            if (chunk.error) {
              console.error('Stream error:', chunk.error)
              setIsStreaming(false)
              break
            }

            // Capture claudeSessionId from done event
            if (chunk.done && chunk.claudeSessionId) {
              setConversations(prev => prev.map(conv => {
                if (conv.id !== activeConvId) return conv
                return {
                  ...conv,
                  claudeSessionId: chunk.claudeSessionId,
                }
              }))
            }

            if (chunk.content) {
              // Parse for Claude events (tool use, heartbeat, etc.)
              const { text, events } = parseClaudeEvents(chunk.content)

              // Process events
              for (const event of events) {
                if (event.type === 'tool_start' && event.tool) {
                  // Add new tool use
                  setConversations(prev => prev.map(conv => {
                    if (conv.id !== activeConvId) return conv
                    return {
                      ...conv,
                      messages: conv.messages.map(msg => {
                        if (msg.id !== assistantMessage.id) return msg
                        const existingTools = msg.toolUses || []
                        // Don't add if already exists
                        if (existingTools.find(t => t.id === event.tool!.id)) return msg
                        return {
                          ...msg,
                          toolUses: [...existingTools, {
                            id: event.tool!.id,
                            name: event.tool!.name,
                            input: event.tool!.input,
                            status: 'running' as const
                          }]
                        }
                      }),
                    }
                  }))
                } else if (event.type === 'tool_end' && event.tool) {
                  // Mark tool as complete
                  setConversations(prev => prev.map(conv => {
                    if (conv.id !== activeConvId) return conv
                    return {
                      ...conv,
                      messages: conv.messages.map(msg => {
                        if (msg.id !== assistantMessage.id) return msg
                        return {
                          ...msg,
                          toolUses: (msg.toolUses || []).map(t =>
                            t.id === event.tool!.id
                              ? { ...t, status: 'complete' as const, input: event.tool!.input || t.input }
                              : t
                          )
                        }
                      }),
                    }
                  }))
                }
                // Heartbeat events are just for keeping connection alive, no action needed
              }

              // Add text content (if any after removing events)
              if (text.trim()) {
                setConversations(prev => prev.map(conv => {
                  if (conv.id !== activeConvId) return conv
                  return {
                    ...conv,
                    messages: conv.messages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: msg.content + text }
                        : msg
                    ),
                    updatedAt: new Date(),
                  }
                }))
              }
            }
          } catch (error) {
            console.error('Failed to parse SSE chunk:', data, error)
          }
        }
      }

      setIsStreaming(false)
      abortControllerRef.current = null
    } catch (error) {
      // Don't show error for intentional abort (navigation away)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat request aborted (user navigated away or new request started)')
        setIsTyping(false)
        setIsStreaming(false)
        return
      }

      console.error('Chat error:', error)
      setIsTyping(false)
      setIsStreaming(false)
      abortControllerRef.current = null

      // Show error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to mock responses.`,
        timestamp: new Date(),
      }

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv
        return {
          ...conv,
          messages: [...conv.messages, errorMessage],
          updatedAt: new Date(),
        }
      }))
    }
  }

  const handleSend = () => {
    sendMessage(inputValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleRegenerate = () => {
    const lastUserMessage = [...activeConv.messages]
      .reverse()
      .find(m => m.role === 'user')

    if (lastUserMessage) {
      // Remove last assistant message
      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv
        return {
          ...conv,
          messages: conv.messages.slice(0, -1),
        }
      }))

      // Regenerate response
      setTimeout(() => sendMessage(lastUserMessage.content), 100)
    }
  }

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv
      return {
        ...conv,
        messages: conv.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, feedback: msg.feedback === type ? undefined : type }
            : msg
        ),
      }
    }))
  }

  const createNewConversation = () => {
    // Copy current settings to the new conversation
    const newConv: Conversation = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: settings.model,
      projectPath: selectedProjectPath,
      settings: {
        systemPrompt: settings.systemPrompt,
        claudeModel: settings.claudeModel,
        additionalDirs: settings.additionalDirs,
        allowedTools: settings.allowedTools,
        disallowedTools: settings.disallowedTools,
        permissionMode: settings.permissionMode,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      },
      claudeSessionId: null,
    }

    setConversations(prev => [newConv, ...prev])
    setActiveConvId(newConv.id)
  }

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id)
      if (filtered.length === 0) {
        const newConv: Conversation = {
          id: generateId(),
          title: 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          model: settings.model,
          projectPath: selectedProjectPath,
        }
        setActiveConvId(newConv.id)
        return [newConv]
      }
      if (id === activeConvId) {
        setActiveConvId(filtered[0].id)
      }
      return filtered
    })
  }

  const clearConversation = () => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv
      return {
        ...conv,
        messages: [],
        title: 'New Conversation',
        updatedAt: new Date(),
      }
    }))
  }

  // Calculate token usage (mock)
  const totalTokens = activeConv.messages.reduce((sum, msg) =>
    sum + Math.ceil(msg.content.length / 4), 0
  )

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Conversations Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-full lg:w-80 lg:min-w-80 lg:max-w-80 glass-dark border-r border-border/40 flex flex-col lg:relative absolute inset-y-0 left-0 z-10 overflow-hidden"
          >
            <div className="p-4 border-b border-border/40">
              <Button
                onClick={createNewConversation}
                className="w-full border-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4 space-y-2">
                {conversations.map(conv => (
                  <Card
                    key={conv.id}
                    className={`glass cursor-pointer transition-all group max-w-full ${
                      conv.id === activeConvId ? 'border-primary/60 border-glow' : ''
                    }`}
                    onClick={() => setActiveConvId(conv.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate terminal-glow">
                            {conv.title}
                          </h4>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-muted-foreground">
                              {conv.messages.length} messages
                            </p>
                            {conv.model && (
                              <div className="flex items-center gap-1 overflow-hidden">
                                <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">
                                  {availableModels.find(m => m.id === conv.model)?.name || conv.model}
                                </p>
                              </div>
                            )}
                            {conv.projectPath && (
                              <div className="flex items-center gap-1 overflow-hidden">
                                <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">
                                  {conv.projectPath.split('/').pop()}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {conv.updatedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteConversation(conv.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-dark border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="shrink-0 lg:hidden"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0 hidden sm:flex">
                <Bot className="h-5 w-5 text-primary terminal-glow" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold terminal-glow truncate">{activeConv.title}</h2>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {availableModels.find(m => m.id === (activeConv.model || settings.model))?.name || 'Loading...'}
                    </span>
                  </span>
                  {(isTyping || isStreaming) && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-primary text-xs"
                    >
                      • Generating
                    </motion.span>
                  )}
                  {activeConv.claudeSessionId && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 cursor-help">
                            <span className="text-[10px]">Session:</span>
                            <code className="text-[10px] font-mono">{activeConv.claudeSessionId.slice(0, 8)}...</code>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-mono text-xs break-all">{activeConv.claudeSessionId}</p>
                          <p className="text-muted-foreground text-xs mt-1">Claude will remember conversation context</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Project Selector */}
            {pinnedProjects.length > 0 && (
              <Select
                value={selectedProjectPath || "none"}
                onValueChange={(value) => setSelectedProjectPath(value === "none" ? null : value)}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-9 glass text-xs">
                  <FolderOpen className="h-3 w-3 mr-1 shrink-0" />
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No project context</span>
                  </SelectItem>
                  {pinnedProjects.map(project => (
                    <SelectItem key={project.path} value={project.path}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearConversation}
                    disabled={activeConv.messages.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <Button
              variant={showSettings ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
              {activeConv.messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-6 sm:py-12 space-y-6 sm:space-y-8"
                >
                  <div className="space-y-3 sm:space-y-4">
                    <div className="inline-flex p-3 sm:p-4 rounded-full glass border-glow">
                      <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-primary terminal-glow" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold terminal-glow">
                      How can I help you today?
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-2">
                      Choose a suggested prompt below or ask me anything about coding.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 max-w-2xl mx-auto">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => {
                      const Icon = prompt.icon
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <Card
                            className="glass hover:border-glow cursor-pointer transition-all group"
                            onClick={() => handleSuggestedPrompt(prompt.text)}
                          >
                            <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <Badge variant="secondary" className="mb-2 text-xs">
                                  {prompt.category}
                                </Badge>
                                <p className="text-sm">{prompt.text}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              ) : (
                <>
                  {activeConv.messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onCopy={() => {}}
                      onRegenerate={handleRegenerate}
                      onFeedback={(type) => handleFeedback(message.id, type)}
                      userAvatarUrl={userAvatarUrl}
                      availableModels={availableModels}
                    />
                  ))}

                  {isTyping && <TypingIndicator />}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="glass-dark border-t border-border/40 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? "Wait for response..." : "Ask me anything..."}
                  disabled={isStreaming}
                  className="resize-none min-h-[48px] sm:min-h-[52px] max-h-[120px] glass text-sm sm:text-base"
                  rows={1}
                />
              </div>

              {isStreaming ? (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] shrink-0"
                    onClick={() => setIsStreaming(false)}
                  >
                    <StopCircle className="h-5 w-5" />
                  </Button>
                </motion.div>
              ) : (
                <Button
                  size="icon"
                  className="h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] border-glow shrink-0"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming || isTyping}
                >
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-full lg:w-80 glass-dark border-l border-border/40 overflow-y-auto lg:relative absolute inset-y-0 right-0 z-10"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold terminal-glow flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {/* Note about settings scope */}
              <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                Settings apply to <strong>new conversations</strong>. Each conversation keeps its own settings.
              </p>

              {/* Model Selection */}
              <div className="space-y-3">
                <Label>Model</Label>
                {modelsLoading ? (
                  <div className="glass px-3 py-2 text-sm text-muted-foreground">
                    Loading models...
                  </div>
                ) : (
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setSettings({ ...settings, model: value })}
                  >
                    <SelectTrigger className="glass">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Backend Status */}
                {backends.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">Backend Status:</p>
                    {backends.map(backend => (
                      <div key={backend.backend} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{backend.backend}</span>
                        <Badge variant={backend.available ? 'default' : 'secondary'} className="text-xs">
                          {backend.available ? '✓ Available' : '✗ Unavailable'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-muted-foreground">{settings.temperature.toFixed(1)}</span>
                </div>
                <Slider
                  value={[settings.temperature]}
                  onValueChange={([value]) => setSettings({ ...settings, temperature: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="glass"
                  disabled={selectedModel?.backend === 'claude' || selectedModel?.backend === 'mock'}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values make output more random
                  {(selectedModel?.backend === 'claude' || selectedModel?.backend === 'mock') &&
                    ' (only applies to Docker models)'}
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-3">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 2048 })}
                  min={256}
                  max={8192}
                  step={256}
                  className="glass"
                  disabled={selectedModel?.backend === 'claude' || selectedModel?.backend === 'mock'}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length of the response
                  {(selectedModel?.backend === 'claude' || selectedModel?.backend === 'mock') &&
                    ' (only applies to Docker models)'}
                </p>
              </div>

              {/* System Prompt */}
              <Collapsible className="space-y-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <Label>System Prompt</Label>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                    className="glass min-h-[120px]"
                    placeholder="Customize the AI's behavior..."
                    disabled={selectedModel?.backend === 'mock'}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedModel?.backend === 'claude' && 'Appends to Claude\'s default system prompt'}
                    {selectedModel?.backend === 'docker' && 'Define how the AI should respond'}
                    {selectedModel?.backend === 'mock' && 'Not used for mock responses'}
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Claude-specific settings */}
              {selectedModel?.backend === 'claude' && (
                <>
                  <Separator />

                  {/* Claude Model */}
                  <div className="space-y-3">
                    <Label>Claude Model</Label>
                    <Select
                      value={settings.claudeModel || 'default'}
                      onValueChange={(value) => setSettings({ ...settings, claudeModel: value === 'default' ? undefined : value })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (from config)</SelectItem>
                        <SelectItem value="sonnet">Sonnet 4.5</SelectItem>
                        <SelectItem value="opus">Opus 4</SelectItem>
                        <SelectItem value="haiku">Haiku 3.5</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Override the default model for this conversation
                    </p>
                  </div>

                  {/* Permission Mode */}
                  <div className="space-y-3">
                    <Label>Permission Mode</Label>
                    <Select
                      value={settings.permissionMode || 'default'}
                      onValueChange={(value) => setSettings({ ...settings, permissionMode: value === 'default' ? undefined : value as any })}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (ask)</SelectItem>
                        <SelectItem value="acceptEdits">Accept Edits</SelectItem>
                        <SelectItem value="bypassPermissions">Bypass All</SelectItem>
                        <SelectItem value="plan">Plan Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Control how Claude asks for permissions
                    </p>
                  </div>

                  {/* Additional Directories */}
                  <Collapsible className="space-y-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <Label>Additional Directories</Label>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {settings.additionalDirs?.map((dir, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={dir}
                            onChange={(e) => {
                              const newDirs = [...(settings.additionalDirs || [])]
                              newDirs[idx] = e.target.value
                              setSettings({ ...settings, additionalDirs: newDirs })
                            }}
                            className="glass flex-1 text-xs"
                            placeholder="/path/to/directory"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newDirs = settings.additionalDirs?.filter((_, i) => i !== idx)
                              setSettings({ ...settings, additionalDirs: newDirs?.length ? newDirs : undefined })
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full glass"
                        onClick={() => {
                          const newDirs = [...(settings.additionalDirs || []), '']
                          setSettings({ ...settings, additionalDirs: newDirs })
                        }}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Add Directory
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Grant Claude access to additional project directories
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              <Separator />

              {/* Reset */}
              <Button
                variant="outline"
                className="w-full glass"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
              >
                Reset to Defaults
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
