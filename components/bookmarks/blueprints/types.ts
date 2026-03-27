// ============================================================================
// Workspace Blueprint Types
// ============================================================================

export interface BlueprintWindow {
  id: string
  type: "browser" | "terminal"
  url?: string
  command?: string
  workingDir?: string
  label: string
  /** Percentage-based position: x, y, w, h all 0-100 */
  position: { x: number; y: number; w: number; h: number }
}

export interface WorkspaceBlueprint {
  id: string
  name: string
  icon?: string
  windows: BlueprintWindow[]
  createdAt: string
}

// ============================================================================
// Preset Layouts
// ============================================================================

export interface LayoutPreset {
  name: string
  description: string
  positions: Array<{ x: number; y: number; w: number; h: number }>
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: "Split Vertical",
    description: "Two windows side by side",
    positions: [
      { x: 0, y: 0, w: 50, h: 100 },
      { x: 50, y: 0, w: 50, h: 100 },
    ],
  },
  {
    name: "Split Horizontal",
    description: "Two windows stacked",
    positions: [
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 50, w: 100, h: 50 },
    ],
  },
  {
    name: "Quarters",
    description: "Four equal quadrants",
    positions: [
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 50, y: 0, w: 50, h: 50 },
      { x: 0, y: 50, w: 50, h: 50 },
      { x: 50, y: 50, w: 50, h: 50 },
    ],
  },
  {
    name: "Main + Sidebar",
    description: "Large main area with side panel",
    positions: [
      { x: 0, y: 0, w: 65, h: 100 },
      { x: 65, y: 0, w: 35, h: 100 },
    ],
  },
  {
    name: "Main + Bottom",
    description: "Large main area with bottom panel",
    positions: [
      { x: 0, y: 0, w: 100, h: 65 },
      { x: 0, y: 65, w: 100, h: 35 },
    ],
  },
  {
    name: "Main + 2 Side",
    description: "Main area with two stacked side panels",
    positions: [
      { x: 0, y: 0, w: 60, h: 100 },
      { x: 60, y: 0, w: 40, h: 50 },
      { x: 60, y: 50, w: 40, h: 50 },
    ],
  },
]

// ============================================================================
// localStorage Persistence
// ============================================================================

const STORAGE_KEY = "workspace-blueprints"

export function loadBlueprints(): WorkspaceBlueprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function saveBlueprints(blueprints: WorkspaceBlueprint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blueprints))
  } catch {
    // localStorage may be unavailable or quota exceeded
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
