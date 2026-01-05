"use client"

import { motion } from "framer-motion"
import { Bot, User, Wrench, AlertCircle } from "lucide-react"
import type { Message } from "../types"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: Message
  isTyping?: boolean
  isStreaming?: boolean
  toolUse?: { name: string; input: string } | null
}

export function ChatMessage({
  message,
  isTyping = false,
  isStreaming = false,
  toolUse
}: ChatMessageProps) {
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  // System messages (errors, notifications)
  if (isSystem) {
    const isError = message.content.startsWith("Error:")
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <div className={cn(
          "text-xs px-3 py-1 rounded-full flex items-center gap-2",
          isError
            ? "text-red-400 bg-red-900/30"
            : "text-zinc-500 bg-zinc-800/50"
        )}>
          {isError && <AlertCircle className="h-3 w-3" />}
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 mb-4",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isStreaming ? "bg-emerald-500/30 animate-pulse" : "bg-emerald-500/20"
        )}>
          <Bot className="h-4 w-4 text-emerald-400" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isAssistant
            ? "glass border-emerald-500/20"
            : "glass-dark border-cyan-500/20",
          isTyping && "animate-pulse"
        )}
      >
        {/* Main content */}
        <div className="text-sm text-zinc-200 whitespace-pre-wrap">
          {message.content}
          {isTyping && (
            <span className="inline-flex ml-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          )}
          {isStreaming && !isTyping && (
            <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
          )}
        </div>

        {/* Tool use indicator (streaming) */}
        {toolUse && (
          <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <Wrench className="h-3 w-3 animate-spin" />
              <span>{toolUse.name}</span>
            </div>
            {toolUse.input && (
              <pre className="mt-1 text-[10px] text-zinc-400 overflow-x-auto max-h-20">
                {toolUse.input.length > 200
                  ? toolUse.input.substring(0, 200) + "..."
                  : toolUse.input}
              </pre>
            )}
          </div>
        )}

        {/* Completed tool uses from message */}
        {message.toolUses && message.toolUses.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolUses.map((tool, index) => (
              <div
                key={index}
                className="p-2 rounded bg-zinc-800/50 border border-zinc-700/50"
              >
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Wrench className="h-3 w-3" />
                  <span>{tool.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Model indicator */}
        {message.model && !isStreaming && (
          <div className="text-[10px] text-zinc-500 mt-1">
            {message.model}
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <User className="h-4 w-4 text-cyan-400" />
        </div>
      )}
    </motion.div>
  )
}
