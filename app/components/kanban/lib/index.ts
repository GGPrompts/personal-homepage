// Kanban library exports

export { useBoardStore } from './store'
export { useAgentProfileStore } from './agent-store'

// Agent prompt builder
export {
  buildSelectorPrompt,
  buildAgentSystemPrompt,
  buildQuickReference,
  getSectionSelectors,
  ALL_SECTION_SELECTORS,
  KANBAN_SELECTORS,
  AI_WORKSPACE_SELECTORS,
  BOOKMARKS_SELECTORS,
  NAVIGATION_SELECTORS,
} from './agent-prompt-builder'

export type {
  SelectorEntry,
  SelectorCategory,
  AutomationPattern,
  SectionSelectorKnowledge,
} from './agent-prompt-builder'
