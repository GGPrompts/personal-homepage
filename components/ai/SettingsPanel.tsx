"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Bot, Plus, X, Pencil, Settings, ChevronDown } from "lucide-react"
import type { LaunchProfile } from "@/lib/agents/types"
import { DEFAULT_SUGGESTED_PROMPTS, DEFAULT_SETTINGS, type ChatSettings } from "@/lib/ai-workspace"

// ============================================================================
// TYPES
// ============================================================================

export interface SettingsPanelProps {
  /** Current settings */
  settings: ChatSettings
  /** Called when settings change */
  onSettingsChange: (settings: ChatSettings) => void
  /** Currently selected agent */
  selectedAgent: LaunchProfile | null
  /** List of all available agents */
  registryAgents: LaunchProfile[]
  /** Called when close button is clicked */
  onClose: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SettingsPanel({
  settings,
  onSettingsChange,
  selectedAgent,
  registryAgents,
  onClose,
}: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-full lg:w-80 glass-dark border-l border-border/40 overflow-y-auto lg:relative absolute inset-y-0 right-0 z-10"
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold terminal-glow flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Current Profile */}
        <Collapsible className="space-y-3" defaultOpen={!!selectedAgent}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <Label className="flex items-center gap-2">
              <Bot className="h-3 w-3" />
              Current Profile
            </Label>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {selectedAgent ? (
              <div className="p-3 glass rounded-lg space-y-1">
                <div className="flex items-center gap-2">
                  <span>{selectedAgent.avatar}</span>
                  <span className="font-medium text-sm">{selectedAgent.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedAgent.description}</p>
                {selectedAgent.flags.length > 0 && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Flags: {selectedAgent.flags.join(" ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No profile selected</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{registryAgents.length} profiles available</span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Suggested Prompts */}
        <Collapsible className="space-y-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <Label className="flex items-center gap-2">
              <Pencil className="h-3 w-3" />
              Quick Prompts
            </Label>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Edit the prompts shown on new conversations. Categories: Explore, Learn, Search, Info, Debug, Create, Review
            </p>
            {(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS).map((prompt, idx) => (
              <div key={idx} className="space-y-2 p-3 glass rounded-lg">
                <div className="flex items-center gap-2">
                  <Input
                    value={prompt.category}
                    onChange={(e) => {
                      const newPrompts = [...(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS)]
                      newPrompts[idx] = { ...newPrompts[idx], category: e.target.value }
                      onSettingsChange({ ...settings, suggestedPrompts: newPrompts })
                    }}
                    className="glass w-24 text-xs"
                    placeholder="Category"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => {
                      const newPrompts = (settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS).filter((_, i) => i !== idx)
                      onSettingsChange({ ...settings, suggestedPrompts: newPrompts.length > 0 ? newPrompts : undefined })
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={prompt.text}
                  onChange={(e) => {
                    const newPrompts = [...(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS)]
                    newPrompts[idx] = { ...newPrompts[idx], text: e.target.value }
                    onSettingsChange({ ...settings, suggestedPrompts: newPrompts })
                  }}
                  className="glass text-xs"
                  placeholder="Prompt text..."
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 glass"
                onClick={() => {
                  const newPrompts = [...(settings.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS), { text: '', category: 'Info' }]
                  onSettingsChange({ ...settings, suggestedPrompts: newPrompts })
                }}
              >
                <Plus className="h-3 w-3 mr-2" />
                Add Prompt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="glass"
                onClick={() => onSettingsChange({ ...settings, suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS })}
              >
                Reset
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        <Button
          variant="outline"
          className="w-full glass"
          onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
        >
          Reset to Defaults
        </Button>
      </div>
    </motion.div>
  )
}

export default SettingsPanel
