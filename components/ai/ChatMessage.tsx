"use client"

import * as React from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Bot, User, Copy, RotateCw, ThumbsUp, ThumbsDown,
  CheckCheck, Clock, Wrench, Loader2, ChevronRight,
  Terminal, ExternalLink,
} from "lucide-react"
import {
  type Message,
  type ToolUse,
  type ModelInfo,
  MODEL_COLORS,
  MODEL_ICONS,
} from "@/lib/ai-workspace"

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
}

const toolUseVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
      opacity: { duration: 0.15 },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Render text with clickable links (markdown and plain URLs) */
function renderTextWithLinks(text: string, keyPrefix: string): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>\[\]]+)/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
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

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// ============================================================================
// TOOL USE DISPLAY
// ============================================================================

interface ToolUseDisplayProps {
  tool: ToolUse
}

export function ToolUseDisplay({ tool }: ToolUseDisplayProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const collapseTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const manuallyToggledRef = React.useRef(false)
  const shouldReduceMotion = useReducedMotion()

  React.useEffect(() => {
    if (tool.status === 'complete' && isOpen && !manuallyToggledRef.current) {
      collapseTimerRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 4000)
    }

    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [tool.status, isOpen])

  React.useEffect(() => {
    if (tool.status === 'running') {
      setIsOpen(true)
      manuallyToggledRef.current = false
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [tool.status])

  const handleOpenChange = (open: boolean) => {
    manuallyToggledRef.current = true
    setIsOpen(open)
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring" as const, stiffness: 500, damping: 35 }}
    >
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
          <motion.div
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
              tool.status === 'running'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          >
            {tool.status === 'running' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Wrench className="h-3 w-3" />
              </motion.div>
            )}
            <span className="font-mono">{tool.name}</span>
            {tool.status === 'running' && (
              <span className="text-[10px] opacity-70">running...</span>
            )}
          </motion.div>
          {tool.input && (
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </motion.div>
          )}
        </CollapsibleTrigger>
        <AnimatePresence>
          {tool.input && isOpen && (
            <motion.div
              variants={toolUseVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              <div className="mt-1 ml-2 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap break-all">{tool.input}</pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  )
}

// ============================================================================
// TYPING INDICATOR
// ============================================================================

export function TypingIndicator() {
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

// ============================================================================
// CHAT MESSAGE
// ============================================================================

export interface ChatMessageProps {
  message: Message
  onCopy?: () => void
  onRegenerate?: () => void
  onFeedback?: (type: 'up' | 'down') => void
  onSendToTerminal?: (code: string, language: string) => void
  onSendToChat?: (code: string) => void
  tabzConnected?: boolean
  userAvatarUrl?: string | null
  availableModels?: ModelInfo[]
  /** Whether to show action buttons (copy, regenerate, feedback) */
  showActions?: boolean
  /** Whether to hide the avatar */
  hideAvatar?: boolean
  /** Custom class name for the container */
  className?: string
}

export function ChatMessage({
  message,
  onCopy,
  onRegenerate,
  onFeedback,
  onSendToTerminal,
  onSendToChat,
  tabzConnected,
  userAvatarUrl,
  availableModels,
  showActions = true,
  hideAvatar = false,
  className = '',
}: ChatMessageProps) {
  const [showActionButtons, setShowActionButtons] = React.useState(false)
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
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  // Render content with code blocks and links
  const renderContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index)
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {renderTextWithLinks(textBefore, `msg-${lastIndex}`)}
          </p>
        )
      }

      const language = match[1] || 'text'
      const code = match[2]
      const isTerminalCode = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'console'].includes(language.toLowerCase()) ||
        (language === 'text' && code.trim().split('\n').length <= 3 && !code.includes('{'))

      parts.push(
        <div key={`code-${match.index}`} className="my-3 rounded-lg overflow-hidden border border-border/40 max-w-full" data-tabz-bridge="true">
          <div className="bg-muted/30 px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-mono">{language}</span>
            <div className="flex items-center gap-1">
              {isTerminalCode && onSendToTerminal && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSendToTerminal(code.trim(), language)}
                        className={`h-6 px-2 shrink-0 ${tabzConnected ? 'text-emerald-500 hover:text-emerald-400' : 'text-muted-foreground'}`}
                        data-tabz-action="spawn-terminal"
                      >
                        <Terminal className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {tabzConnected ? 'Run in terminal' : 'TabzChrome not connected'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {onSendToChat && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSendToChat(code.trim())}
                        className={`h-6 px-2 shrink-0 ${tabzConnected ? 'text-blue-500 hover:text-blue-400' : 'text-muted-foreground'}`}
                        data-tabz-action="send-chat"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {tabzConnected ? 'Send to TabzChrome chat' : 'TabzChrome not connected'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(code)}
                className="h-6 px-2 shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <pre className="p-3 sm:p-4 overflow-x-auto bg-muted/20 max-w-full">
            <code className="text-xs sm:text-sm font-mono">{code}</code>
          </pre>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

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
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${className}`}
      onHoverStart={() => !isUser && setShowActionButtons(true)}
      onHoverEnd={() => !isUser && setShowActionButtons(false)}
    >
      {!hideAvatar && (
        <Avatar className="h-8 w-8 border-2 border-primary/20 hidden sm:flex">
          {isUser && userAvatarUrl && <AvatarImage src={userAvatarUrl} alt="You" />}
          <AvatarFallback className={isUser ? 'bg-primary/20' : 'bg-secondary/20'}>
            {isUser ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-secondary" />}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex-1 min-w-0 max-w-[calc(100%-2rem)] sm:max-w-[85%] ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-lg px-3 sm:px-4 py-3 overflow-hidden ${
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

          <div className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden">
            {renderContent(message.content)}
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs opacity-60" suppressHydrationWarning>
            <Clock className="h-3 w-3" />
            <span suppressHydrationWarning>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {!isUser && modelColors && modelName && (
              <>
                <span className="opacity-50">&middot;</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${modelColors.bg} ${modelColors.text} border ${modelColors.border}`}>
                  <span>{modelIcon}</span>
                  <span className="capitalize text-[10px]">{modelName}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {showActions && !isUser && (
          <div
            className={`flex items-center gap-1 mt-2 transition-opacity duration-200 ${
              showActionButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'
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

              {onRegenerate && (
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
              )}

              {onFeedback && (
                <>
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
                </>
              )}
            </TooltipProvider>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ChatMessage
