"use client"

import { useEffect, useRef, useCallback } from "react"
import { Bot, Sparkles } from "lucide-react"
import type { Task, Message, AgentInfo } from "../types"
import type { ClaudeSettings } from "../lib/ai/types"
import { useBoardStore } from "../lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { AgentSelector } from "../shared/AgentSelector"
import { AgentBadge } from "../shared/AgentBadge"
import { ContextIndicator } from "../shared/ContextIndicator"
import { useClaudeChat } from "../hooks/useClaudeChat"

interface TaskChatProps {
  task: Task
}

export function TaskChat({ task }: TaskChatProps) {
  const addMessage = useBoardStore((state) => state.addMessage)
  const updateTaskAgent = useBoardStore((state) => state.updateTaskAgent)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const messages = task.messages || []

  // Handle new assistant message
  const handleMessage = useCallback((message: Omit<Message, 'id'>) => {
    addMessage(task.id, message)
    // Set agent back to idle
    if (task.agent) {
      updateTaskAgent(task.id, { ...task.agent, status: "idle" })
    }
  }, [task.id, task.agent, addMessage, updateTaskAgent])

  // Handle session ID from Claude
  const handleSessionId = useCallback((sessionId: string) => {
    if (task.agent) {
      updateTaskAgent(task.id, { ...task.agent, sessionId })
    }
  }, [task.id, task.agent, updateTaskAgent])

  // Handle errors
  const handleError = useCallback((error: string) => {
    console.error('Claude chat error:', error)
    // Add error as system message
    addMessage(task.id, {
      role: 'system',
      content: `Error: ${error}`,
      timestamp: new Date()
    })
    // Set agent to failed
    if (task.agent) {
      updateTaskAgent(task.id, { ...task.agent, status: "failed" })
    }
  }, [task.id, task.agent, addMessage, updateTaskAgent])

  const {
    isStreaming,
    streamingContent,
    currentToolUse,
    usage,
    sendMessage,
    cancel
  } = useClaudeChat({
    onMessage: handleMessage,
    onSessionId: handleSessionId,
    onError: handleError
  })

  // Scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages.length, streamingContent, currentToolUse])

  const handleSend = async (content: string) => {
    // Add user message
    const userMessage: Omit<Message, "id"> = {
      role: "user",
      content,
      timestamp: new Date(),
    }
    addMessage(task.id, userMessage)

    // Set agent to running if assigned
    if (task.agent) {
      updateTaskAgent(task.id, { ...task.agent, status: "running" })
    }

    // Build Claude settings from task configuration
    const settings: ClaudeSettings = {
      systemPrompt: buildSystemPrompt(task),
      ...task.claudeSettings
    }

    // Send to Claude with session for multi-turn
    await sendMessage(content, settings, task.agent?.sessionId)
  }

  const handleAgentChange = (agentType: string) => {
    updateTaskAgent(task.id, {
      type: agentType as AgentInfo["type"],
      status: "idle",
    })
  }

  return (
    <div className="flex flex-col w-full">
      {/* Agent Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {task.agent ? (
            <AgentBadge agent={task.agent} />
          ) : (
            <div className="flex items-center gap-2 text-zinc-500">
              <Bot className="h-4 w-4" />
              <span className="text-sm">No agent assigned</span>
            </div>
          )}
          {/* Show context usage indicator */}
          <ContextIndicator usage={usage} />
        </div>
        <AgentSelector
          value={task.agent?.type}
          onValueChange={handleAgentChange}
        />
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="h-[280px] p-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-300">
              Start a conversation
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Chat with Claude about this task. Ask questions, give instructions, or request changes.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Streaming content */}
            {isStreaming && (streamingContent || currentToolUse) && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent || "",
                  timestamp: new Date(),
                }}
                toolUse={currentToolUse}
                isStreaming
              />
            )}

            {/* Loading indicator when waiting for first response */}
            {isStreaming && !streamingContent && !currentToolUse && (
              <ChatMessage
                message={{
                  id: "typing",
                  role: "assistant",
                  content: "Thinking",
                  timestamp: new Date(),
                }}
                isTyping
              />
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onCancel={isStreaming ? cancel : undefined}
        disabled={!task.agent}
        isStreaming={isStreaming}
        placeholder={
          task.agent
            ? `Message ${task.agent.type}...`
            : "Assign an agent to start chatting..."
        }
      />
    </div>
  )
}

/**
 * Build a system prompt based on task context
 */
function buildSystemPrompt(task: Task): string {
  const parts: string[] = []

  parts.push(`You are helping with a task titled: "${task.title}"`)

  if (task.description) {
    parts.push(`\nTask description:\n${task.description}`)
  }

  if (task.git?.branch) {
    parts.push(`\nGit context:`)
    parts.push(`- Branch: ${task.git.branch}`)
    if (task.git.baseBranch) {
      parts.push(`- Base branch: ${task.git.baseBranch}`)
    }
    if (task.git.worktree) {
      parts.push(`- Worktree: ${task.git.worktree}`)
    }
  }

  if (task.labels.length > 0) {
    parts.push(`\nLabels: ${task.labels.join(', ')}`)
  }

  parts.push(`\nPriority: ${task.priority}`)

  return parts.join('\n')
}
