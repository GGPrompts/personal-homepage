// Types and localStorage helpers for Prompts Playground

export interface PanelConfig {
  id: string // Unique identifier for the panel
  url: string
  label: string
  key: number
  prompt?: string
  modelId?: string // Reference to model in models-registry
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
  modelId?: string
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
  panels: PanelConfig[]
  currentPrompt: string
  savedComponents: SavedComponent[]
}

export interface SavedComparison {
  id: string
  name: string
  createdAt: string
  panels: PanelConfig[]
}

// Legacy type for backward compatibility
export type FixedPanelArray = [PanelConfig, PanelConfig, PanelConfig, PanelConfig]

const STORAGE_KEYS = {
  panels: "prompts-playground-panels",
  components: "prompts-playground-components",
  comparisons: "prompts-playground-comparisons",
}

// Create a default panel with a unique ID
export function createDefaultPanel(index: number): PanelConfig {
  return {
    id: generateId(),
    url: `http://localhost:${3001 + index}`,
    label: `Agent ${index + 1}`,
    key: Date.now() + index,
  }
}

const DEFAULT_PANELS: PanelConfig[] = [
  createDefaultPanel(0),
  createDefaultPanel(1),
  createDefaultPanel(2),
  createDefaultPanel(3),
]

// Migrate old panel format (without id) to new format
function migratePanels(panels: unknown[]): PanelConfig[] {
  return panels.map((panel, index) => {
    const p = panel as Partial<PanelConfig>
    return {
      id: p.id || generateId(),
      url: p.url || `http://localhost:${3001 + index}`,
      label: p.label || `Agent ${index + 1}`,
      key: p.key || Date.now() + index,
      prompt: p.prompt,
      modelId: p.modelId,
      agentConfig: p.agentConfig,
    }
  })
}

export function loadPanelConfigs(): PanelConfig[] {
  if (typeof window === "undefined") {
    return DEFAULT_PANELS.map((p, i) => createDefaultPanel(i))
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.panels)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return migratePanels(parsed)
      }
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return DEFAULT_PANELS.map((p, i) => createDefaultPanel(i))
}

export function savePanelConfigs(panels: PanelConfig[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.panels, JSON.stringify(panels))
}

// Add a new panel
export function addPanel(panels: PanelConfig[]): PanelConfig[] {
  const newPanel = createDefaultPanel(panels.length)
  return [...panels, newPanel]
}

// Remove a panel by ID (minimum 1 panel)
export function removePanel(panels: PanelConfig[], panelId: string): PanelConfig[] {
  if (panels.length <= 1) return panels
  return panels.filter((p) => p.id !== panelId)
}

// Update a specific panel
export function updatePanel(
  panels: PanelConfig[],
  panelId: string,
  updates: Partial<PanelConfig>
): PanelConfig[] {
  return panels.map((p) =>
    p.id === panelId ? { ...p, ...updates } : p
  )
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
      const parsed = JSON.parse(saved)
      // Migrate old comparisons to new format
      return parsed.map((comp: SavedComparison) => ({
        ...comp,
        panels: migratePanels(comp.panels),
      }))
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
