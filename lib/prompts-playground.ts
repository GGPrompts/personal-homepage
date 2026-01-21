// Types and localStorage helpers for Prompts Playground

export interface PanelConfig {
  url: string
  label: string
  key: number
  prompt?: string
  agentConfig?: AgentConfig
}

export interface AgentConfig {
  cli: "claude" | "codex" | "gemini"
  model: string
  systemPrompt?: string
  agent?: string
  flags?: Record<string, unknown>
}

export interface SavedComponent {
  id: string
  name: string
  createdAt: string
  prompt: string
  agentConfig: AgentConfig
  files: ComponentFile[]
  screenshot?: string
  tags: string[]
  notes?: string
  panelLabel?: string
}

export interface ComponentFile {
  path: string
  content: string
  language: string
}

export interface PlaygroundState {
  panels: [PanelConfig, PanelConfig, PanelConfig, PanelConfig]
  currentPrompt: string
  savedComponents: SavedComponent[]
}

export interface SavedComparison {
  id: string
  name: string
  createdAt: string
  panels: [PanelConfig, PanelConfig, PanelConfig, PanelConfig]
}

const STORAGE_KEYS = {
  panels: "prompts-playground-panels",
  components: "prompts-playground-components",
  comparisons: "prompts-playground-comparisons",
}

const DEFAULT_PANELS: [PanelConfig, PanelConfig, PanelConfig, PanelConfig] = [
  { url: "http://localhost:3001", label: "Agent 1", key: 1 },
  { url: "http://localhost:3002", label: "Agent 2", key: 2 },
  { url: "http://localhost:3003", label: "Agent 3", key: 3 },
  { url: "http://localhost:3004", label: "Agent 4", key: 4 },
]

export function loadPanelConfigs(): [PanelConfig, PanelConfig, PanelConfig, PanelConfig] {
  if (typeof window === "undefined") {
    return DEFAULT_PANELS
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.panels)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed as [PanelConfig, PanelConfig, PanelConfig, PanelConfig]
      }
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return DEFAULT_PANELS
}

export function savePanelConfigs(panels: [PanelConfig, PanelConfig, PanelConfig, PanelConfig]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.panels, JSON.stringify(panels))
}

export function loadSavedComponents(): SavedComponent[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.components)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }

  return []
}

export function saveSavedComponents(components: SavedComponent[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.components, JSON.stringify(components))
}

export function loadSavedComparisons(): SavedComparison[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.comparisons)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }

  return []
}

export function saveSavedComparisons(comparisons: SavedComparison[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.comparisons, JSON.stringify(comparisons))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || ""
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    md: "markdown",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    rb: "ruby",
  }
  return languageMap[ext] || "plaintext"
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
