"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2, Cpu, FolderOpen, Loader2, Save, Circle, Bot } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { isEmoji, isAvatarUrl } from "@/lib/ai/utils"
import { BackendIcon } from "@/lib/ai/backend-icons"
import type { Conversation, ModelInfo, GeneratingConversations } from "@/lib/ai-workspace"
import type { AgentCard } from "@/lib/agents/types"

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationSidebarProps {
  /** List of all conversations */
  conversations: Conversation[]
  /** ID of the currently active conversation */
  activeConvId: string
  /** Called when a conversation is selected */
  onSelectConversation: (id: string) => void
  /** Called when the "New Conversation" button is clicked */
  onCreateNew: () => void
  /** Called when a conversation is deleted */
  onDeleteConversation: (id: string) => void
  /** Map of conversation IDs that are currently generating */
  generatingConvs: GeneratingConversations
  /** Available models for display */
  availableModels: ModelInfo[]
  /** Function to get an agent by ID */
  getAgentById: (id: string | null | undefined) => AgentCard | null
  /** Function to check if a conversation is persistent (JSONL saved) */
  isConversationPersistent: (conv: Conversation) => boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConversationSidebar({
  conversations,
  activeConvId,
  onSelectConversation,
  onCreateNew,
  onDeleteConversation,
  generatingConvs,
  availableModels,
  getAgentById,
  isConversationPersistent,
}: ConversationSidebarProps) {
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="w-full lg:w-80 lg:min-w-80 lg:max-w-80 glass-dark border-r border-border/40 flex flex-col lg:relative absolute inset-y-0 left-0 z-10 overflow-hidden"
    >
      <div className="p-4 border-b border-border/40">
        <Button
          onClick={onCreateNew}
          className="w-full border-glow"
          data-tabz-action="new-conversation"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-2" data-tabz-list="conversations">
          {conversations.map(conv => {
            const convAgent = getAgentById(conv.agentId)
            const isPersistent = isConversationPersistent(conv)

            return (
              <Card
                key={conv.id}
                className={`glass cursor-pointer transition-all group max-w-full ${
                  conv.id === activeConvId ? 'border-primary/60 border-glow' : ''
                }`}
                onClick={() => onSelectConversation(conv.id)}
                data-tabz-item={`conversation-${conv.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {/* Agent Avatar */}
                    {convAgent && (
                      <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10">
                        {isAvatarUrl(convAgent.avatar) ? (
                          <AvatarImage src={convAgent.avatar} alt={convAgent.name} />
                        ) : null}
                        <AvatarFallback className="text-sm bg-primary/20">
                          {isEmoji(convAgent.avatar)
                            ? convAgent.avatar
                            : <BackendIcon agent={convAgent} className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate terminal-glow">
                          {conv.title}
                        </h4>
                        {generatingConvs[conv.id] && (
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="flex items-center gap-1 shrink-0"
                          >
                            <Loader2 className="h-3 w-3 text-primary animate-spin" />
                          </motion.div>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {/* Agent name if available */}
                        {convAgent && (
                          <p className="text-xs text-primary/80 font-medium">
                            {convAgent.name}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {conv.messages.length} messages
                            {generatingConvs[conv.id] && (
                              <span className="text-primary ml-1">generating</span>
                            )}
                          </p>
                          {/* Persistence indicator */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`flex items-center ${
                                  isPersistent ? 'text-emerald-400' : 'text-muted-foreground'
                                }`}>
                                  {isPersistent ? (
                                    <Save className="h-3 w-3" />
                                  ) : (
                                    <Circle className="h-3 w-3" />
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {isPersistent
                                  ? 'Persistent (JSONL saved)'
                                  : 'Session only (localStorage)'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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
                        onDeleteConversation(conv.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default ConversationSidebar
