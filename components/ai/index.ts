// AI Chat Components
// Centralized exports for AI drawer and chat functionality

// Main drawer component
export { AIDrawer, AIDrawerToggle } from "./AIDrawer"

// Chat components
export { Conversation } from "./Conversation"
export { ChatMessage, TypingIndicator, ToolUseDisplay } from "./ChatMessage"
export { ChatInput } from "./ChatInput"
export { MiniChat, type MiniChatHandle, type MiniChatProps } from "./MiniChat"

// Legacy provider (simple drawer state only - prefer contexts/AIDrawerContext)
export {
  AIDrawerProvider as LegacyAIDrawerProvider,
  useAIDrawer as useLegacyAIDrawer,
  useAIDrawerSafe as useLegacyAIDrawerSafe,
  type AIDrawerState,
  type AIDrawerContextType,
} from "./AIDrawerProvider"

// Re-export types from context
export type {
  AIDrawerContextValue,
  AIDrawerProviderProps,
  DrawerSize,
} from "@/contexts/AIDrawerContext"

// Re-export hooks from context
export {
  useAIDrawer,
  useAIDrawerControls,
  useAIDrawerOptional,
  AIDrawerProvider,
} from "@/contexts/AIDrawerContext"

// Re-export enhanced hooks
export {
  useAIDrawerChat,
  useAIDrawerTrigger,
  type UseAIDrawerChatOptions,
  type UseAIDrawerChatReturn,
} from "@/hooks/useAIDrawerChat"
