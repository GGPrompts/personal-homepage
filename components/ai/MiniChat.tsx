"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot, Maximize2, X, Sparkles } from "lucide-react"
import { useAIChat, type UseAIChatReturn } from "@/hooks/useAIChat"
import { ChatMessage, TypingIndicator } from "@/components/ai/ChatMessage"
import { ChatInput } from "@/components/ai/ChatInput"
import { type AgentProfile, AGENT_META } from "@/app/components/kanban/shared/types"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface MiniChatProps {
  /** Agent profile for customizing the chat */
  agent?: AgentProfile
  /** Conversation ID to share with main AI Workspace */
  conversationId?: string
  /** Called when user clicks "Expand to AI Workspace" */
  onExpand?: () => void
  /** Custom trigger element (defaults to agent avatar button) */
  trigger?: React.ReactNode
  /** Custom class name for the trigger */
  triggerClassName?: string
  /** Whether the popover is open (controlled mode) */
  open?: boolean
  /** Called when popover open state changes (controlled mode) */
  onOpenChange?: (open: boolean) => void
  /** Side of the trigger to show popover */
  side?: "top" | "right" | "bottom" | "left"
  /** Alignment of popover relative to trigger */
  align?: "start" | "center" | "end"
  /** Offset from the trigger */
  sideOffset?: number
}

export interface MiniChatHandle {
  /** Focus the input */
  focus: () => void
  /** Send a message programmatically */
  sendMessage: (content: string) => Promise<void>
  /** Get the chat state */
  getChatState: () => UseAIChatReturn
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MiniChat = React.forwardRef<MiniChatHandle, MiniChatProps>(
  function MiniChat(
    {
      agent,
      conversationId,
      onExpand,
      trigger,
      triggerClassName,
      open: controlledOpen,
      onOpenChange,
      side = "top",
      align = "end",
      sideOffset = 8,
    },
    ref
  ) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    // Use controlled or uncontrolled open state
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : internalOpen
    const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

    // Initialize chat hook with optional conversation ID
    const chat = useAIChat({
      initialConversationId: conversationId,
    })

    // Apply agent system prompt to settings when agent changes
    React.useEffect(() => {
      if (agent?.cliConfig?.systemPrompt) {
        chat.setSettings((prev) => ({
          ...prev,
          systemPrompt: agent.cliConfig!.systemPrompt!,
        }))
      }
    }, [agent?.cliConfig?.systemPrompt])

    // Scroll to bottom when messages change
    React.useEffect(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        )
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, [chat.activeConv.messages, chat.isTyping])

    // Handle sending messages
    const handleSend = React.useCallback(async () => {
      if (!inputValue.trim()) return
      const content = inputValue
      setInputValue("")
      await chat.sendMessage(content)
    }, [inputValue, chat])

    // Expose imperative handle
    React.useImperativeHandle(ref, () => ({
      focus: () => chat.textareaRef.current?.focus(),
      sendMessage: chat.sendMessage,
      getChatState: () => chat,
    }))

    // Get agent styling
    const agentMeta = agent?.baseType ? AGENT_META[agent.baseType] : null
    const agentName = agent?.name || "AI Assistant"
    const agentAvatar = agent?.avatar

    // Default trigger button
    const defaultTrigger = (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full",
          agentMeta?.bgColor || "bg-primary/20",
          agentMeta?.borderColor ? `border ${agentMeta.borderColor}` : "border border-primary/30",
          triggerClassName
        )}
        data-tabz-action="open-mini-chat"
      >
        {agentAvatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={agentAvatar} alt={agentName} />
            <AvatarFallback>
              <Bot className={cn("h-4 w-4", agentMeta?.color || "text-primary")} />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Sparkles className={cn("h-5 w-5", agentMeta?.color || "text-primary")} />
        )}
      </Button>
    )

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>

        <PopoverContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="w-[380px] p-0 glass-dark border-primary/20"
          data-tabz-region="mini-chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-primary/20">
                {agentAvatar && <AvatarImage src={agentAvatar} alt={agentName} />}
                <AvatarFallback
                  className={cn(agentMeta?.bgColor || "bg-primary/20")}
                >
                  <Bot className={cn("h-4 w-4", agentMeta?.color || "text-primary")} />
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="text-sm font-medium terminal-glow">{agentName}</h4>
                {agent?.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {agent.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onExpand && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setIsOpen(false)
                    onExpand()
                  }}
                  title="Expand to AI Workspace"
                  data-tabz-action="expand-chat"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
                data-tabz-action="close-mini-chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Message List */}
          <ScrollArea ref={scrollAreaRef} className="h-[300px]">
            <div className="p-4 space-y-4">
              {chat.activeConv.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-center">
                  <Bot
                    className={cn(
                      "h-12 w-12 mb-3",
                      agentMeta?.color || "text-primary",
                      "opacity-50"
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with {agentName}
                  </p>
                  {agent?.description && (
                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-[280px]">
                      {agent.description}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {chat.activeConv.messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      showActions={false}
                      hideAvatar={true}
                      className="text-sm"
                      availableModels={chat.availableModels}
                    />
                  ))}
                  {chat.isTyping && <TypingIndicator />}
                </>
              )}
              <div ref={chat.messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border/40">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              onStop={chat.stopStreaming}
              isStreaming={chat.isStreaming}
              isTyping={chat.isTyping}
              placeholder={`Ask ${agentName}...`}
              textareaRef={chat.textareaRef}
              showHint={false}
              minHeight="36px"
              maxHeight="80px"
              dataTabzInput="mini-chat-message"
              dataTabzAction="submit-mini-chat"
            />
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

export default MiniChat
