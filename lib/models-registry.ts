// Model registry for Prompts Playground
// Based on ~/projects/model-arena/models.json structure

export interface ModelDefinition {
  id: string
  name: string
  family: ModelFamily
  company: string
  version: string
  color: string
  icon: string
  traits: string[]
  cli: string
  reasoningLevels?: number[]
  pricing: number
  note?: string
}

export type ModelFamily = "Claude" | "GPT" | "Gemini"

export const MODEL_FAMILY_COLORS: Record<ModelFamily, string> = {
  Claude: "#f97316", // orange-500
  GPT: "#10a37f", // green (OpenAI brand)
  Gemini: "#6366f1", // indigo-500
}

export const MODEL_FAMILY_BG_COLORS: Record<ModelFamily, string> = {
  Claude: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20",
  GPT: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
  Gemini: "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20",
}

export const MODEL_FAMILY_TEXT_COLORS: Record<ModelFamily, string> = {
  Claude: "text-orange-400",
  GPT: "text-emerald-400",
  Gemini: "text-indigo-400",
}

export const MODELS_REGISTRY: ModelDefinition[] = [
  // Claude Models
  {
    id: "claude-opus-4.5",
    name: "Opus 4.5",
    family: "Claude",
    company: "Anthropic",
    version: "4.5",
    color: "#dc2626",
    icon: "opus",
    traits: ["Powerful", "Creative"],
    cli: "claude --model opus",
    pricing: 3,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Sonnet 4.5",
    family: "Claude",
    company: "Anthropic",
    version: "4.5",
    color: "#f97316",
    icon: "sonnet",
    traits: ["Balanced", "Default"],
    cli: "claude --model sonnet",
    pricing: 1,
  },
  {
    id: "claude-haiku-4.5",
    name: "Haiku 4.5",
    family: "Claude",
    company: "Anthropic",
    version: "4.5",
    color: "#fb923c",
    icon: "haiku",
    traits: ["Fast", "Cheap"],
    cli: "claude --model haiku",
    pricing: 0.33,
  },
  {
    id: "claude-sonnet-4",
    name: "Sonnet 4",
    family: "Claude",
    company: "Anthropic",
    version: "4",
    color: "#ea580c",
    icon: "sonnet",
    traits: ["Previous Gen"],
    cli: "claude --model sonnet-4",
    pricing: 1,
  },

  // GPT / Codex Models
  {
    id: "gpt-5.2-codex",
    name: "GPT-5.2 Codex",
    family: "GPT",
    company: "OpenAI",
    version: "5.2-codex",
    color: "#059669",
    icon: "codex",
    traits: ["Latest", "Agentic"],
    cli: "codex",
    reasoningLevels: [1, 2, 3, 4],
    pricing: 1,
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    family: "GPT",
    company: "OpenAI",
    version: "5.2",
    color: "#10a37f",
    icon: "gpt",
    traits: ["Frontier", "General"],
    cli: "codex --model gpt-5.2",
    reasoningLevels: [1, 2, 3, 4],
    pricing: 1,
  },
  {
    id: "gpt-5.1-codex-max",
    name: "GPT-5.1 Codex Max",
    family: "GPT",
    company: "OpenAI",
    version: "5.1-codex-max",
    color: "#047857",
    icon: "codex",
    traits: ["Deep Reasoning", "Fast"],
    cli: "codex --model gpt-5.1-codex-max",
    reasoningLevels: [1, 2, 3, 4],
    pricing: 1,
  },
  {
    id: "gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex Mini",
    family: "GPT",
    company: "OpenAI",
    version: "5.1-codex-mini",
    color: "#34d399",
    icon: "codex",
    traits: ["Fast", "Cheap"],
    cli: "codex --model gpt-5.1-codex-mini",
    reasoningLevels: [1, 2],
    pricing: 0.33,
  },

  // Gemini Models
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    family: "Gemini",
    company: "Google",
    version: "3-pro-preview",
    color: "#6366f1",
    icon: "gemini",
    traits: ["Preview", "Multimodal"],
    cli: "copilot",
    note: "Via GitHub Copilot - may be limited",
    pricing: 1,
  },
  {
    id: "gemini-native",
    name: "Gemini (Native)",
    family: "Gemini",
    company: "Google",
    version: "2.5-pro",
    color: "#8b5cf6",
    icon: "gemini",
    traits: ["Full Power", "Limited Free"],
    cli: "gemini",
    pricing: 1,
  },

  // Swarm Configurations
  {
    id: "opus-swarm",
    name: "Opus Swarm",
    family: "Claude",
    company: "Anthropic",
    version: "3x Opus 4.5",
    color: "#dc2626",
    icon: "swarm",
    traits: ["3 Subagents", "Premium Swarm"],
    cli: "claude --model opus (x3)",
    pricing: 9,
  },
  {
    id: "sonnet-swarm",
    name: "Sonnet Swarm",
    family: "Claude",
    company: "Anthropic",
    version: "3x Sonnet 4.5",
    color: "#f97316",
    icon: "swarm",
    traits: ["3 Subagents", "Balanced Swarm"],
    cli: "claude --model sonnet (x3)",
    pricing: 3,
  },
  {
    id: "haiku-swarm",
    name: "Haiku Swarm",
    family: "Claude",
    company: "Anthropic",
    version: "3x Haiku 4.5",
    color: "#fb923c",
    icon: "swarm",
    traits: ["3 Subagents", "Budget Swarm"],
    cli: "claude --model haiku (x3)",
    pricing: 1,
  },
]

// Helper functions
export function getModelById(id: string): ModelDefinition | undefined {
  return MODELS_REGISTRY.find((m) => m.id === id)
}

export function getModelsByFamily(family: ModelFamily): ModelDefinition[] {
  return MODELS_REGISTRY.filter((m) => m.family === family)
}

export function getModelFamilies(): ModelFamily[] {
  return Array.from(new Set(MODELS_REGISTRY.map((m) => m.family)))
}

export function getModelPricingLabel(pricing: number): string {
  if (pricing === 0) return "Free"
  if (pricing <= 0.33) return "$"
  if (pricing <= 1) return "$$"
  if (pricing <= 3) return "$$$"
  return "$$$$"
}

export function getModelIcon(icon: string): string {
  const icons: Record<string, string> = {
    opus: "O",
    sonnet: "S",
    haiku: "H",
    codex: "C",
    gpt: "G",
    gemini: "Ge",
    swarm: "Sw",
  }
  return icons[icon] || "?"
}
