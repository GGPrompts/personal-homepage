'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  User,
  Settings,
  MessageSquare,
  Eye,
  Wand2,
  ImagePlus,
  Link2,
  Copy,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAvatarGeneration } from '@/hooks/useAvatarGeneration'
import { toast } from 'sonner'
import type {
  CreateAgentInput,
  AgentPersonalityTrait,
  MCPTool,
  AgentConfig,
} from '@/lib/agents/types'
import { AgentCard } from './AgentCard'

// ============================================================================
// Types
// ============================================================================

export interface AgentBuilderWizardProps {
  /** Whether the wizard dialog is open */
  open: boolean
  /** Callback when the dialog is closed */
  onOpenChange: (open: boolean) => void
  /** Callback when agent is created */
  onAgentCreated: (agent: CreateAgentInput) => void
  /** Available sections to assign the agent to */
  availableSections?: string[]
  /** Optional initial data for editing */
  initialData?: Partial<CreateAgentInput>
}

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
}

// ============================================================================
// Constants
// ============================================================================

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'identity',
    title: 'Identity',
    description: 'Name and personality',
    icon: User,
  },
  {
    id: 'sections',
    title: 'Sections',
    description: 'Home sections',
    icon: Settings,
  },
  {
    id: 'tools',
    title: 'Tools',
    description: 'MCP permissions',
    icon: Settings,
  },
  {
    id: 'prompts',
    title: 'Prompts',
    description: 'Suggested prompts',
    icon: MessageSquare,
  },
  {
    id: 'preview',
    title: 'Preview',
    description: 'Review & save',
    icon: Eye,
  },
]

const PERSONALITY_TRAITS: AgentPersonalityTrait[] = [
  'helpful',
  'concise',
  'detailed',
  'technical',
  'friendly',
  'formal',
  'creative',
  'analytical',
]

const PERSONALITY_DESCRIPTIONS: Record<AgentPersonalityTrait, string> = {
  helpful: 'Proactively assists with tasks',
  concise: 'Brief and to the point',
  detailed: 'Thorough explanations',
  technical: 'Technical and precise',
  friendly: 'Warm and approachable',
  formal: 'Professional tone',
  creative: 'Innovative solutions',
  analytical: 'Data-driven approach',
}

const DEFAULT_MCP_TOOLS: MCPTool[] = [
  { name: 'tabz_screenshot', description: 'Capture page screenshots', permission: 'read', server: 'tabz' },
  { name: 'tabz_click', description: 'Click on elements', permission: 'execute', server: 'tabz' },
  { name: 'tabz_fill', description: 'Fill form inputs', permission: 'write', server: 'tabz' },
  { name: 'tabz_get_page_info', description: 'Get current page info', permission: 'read', server: 'tabz' },
  { name: 'beads_list', description: 'List beads issues', permission: 'read', server: 'beads' },
  { name: 'beads_show', description: 'Show issue details', permission: 'read', server: 'beads' },
  { name: 'beads_create', description: 'Create new issues', permission: 'write', server: 'beads' },
  { name: 'codex_review', description: 'AI code review', permission: 'read', server: 'codex' },
]

const AVATAR_EMOJIS = ['🤖', '🧠', '💡', '🎯', '🚀', '⚡', '🔮', '🎨', '🔧', '📊', '🌟', '🎭']

const DEFAULT_SECTIONS = [
  'weather',
  'feed',
  'market-pulse',
  'api-playground',
  'notes',
  'bookmarks',
  'search',
  'ai-workspace',
  'stocks',
  'crypto',
  'spacex',
  'github-activity',
  'disasters',
  'tasks',
  'projects',
  'files',
  'kanban',
  'jobs',
  'music-player',
  'video-player',
  'photo-gallery',
  'profile',
]

const DEFAULT_CONFIG: AgentConfig = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  max_tokens: 4096,
  stream: true,
}

// ============================================================================
// Step Components
// ============================================================================

interface IdentityStepProps {
  name: string
  setName: (name: string) => void
  avatar: string
  setAvatar: (avatar: string) => void
  description: string
  setDescription: (description: string) => void
  personality: AgentPersonalityTrait[]
  setPersonality: (traits: AgentPersonalityTrait[]) => void
  /** Optional callback when user wants to generate an AI avatar */
  onGenerateAvatar?: (prompt: string) => void
}

function IdentityStep({
  name,
  setName,
  avatar,
  setAvatar,
  description,
  setDescription,
  personality,
  setPersonality,
  onGenerateAvatar,
}: IdentityStepProps) {
  const [showUrlInput, setShowUrlInput] = React.useState(false)
  const [customUrl, setCustomUrl] = React.useState('')
  const [generatedPrompt, setGeneratedPrompt] = React.useState<string | null>(null)
  const { generatePrompt, isValidAvatarUrl } = useAvatarGeneration()

  const toggleTrait = (trait: AgentPersonalityTrait) => {
    if (personality.includes(trait)) {
      setPersonality(personality.filter(t => t !== trait))
    } else {
      setPersonality([...personality, trait])
    }
  }

  // Check if avatar is a URL (not an emoji)
  const isAvatarUrl = avatar && (
    avatar.startsWith('http') ||
    avatar.startsWith('data:') ||
    avatar.startsWith('/') ||
    avatar.includes('/ai-images/')
  )

  const handleGeneratePrompt = () => {
    if (!name && personality.length === 0) {
      toast.error('Add a name or personality first')
      return
    }
    const prompt = generatePrompt(name || 'AI Assistant', personality, description)
    setGeneratedPrompt(prompt)
    onGenerateAvatar?.(prompt)
  }

  const copyPrompt = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt)
      toast.success('Prompt copied to clipboard')
    }
  }

  const handleUrlSubmit = () => {
    if (customUrl && isValidAvatarUrl(customUrl)) {
      setAvatar(customUrl)
      setShowUrlInput(false)
      setCustomUrl('')
      toast.success('Avatar updated')
    } else {
      toast.error('Please enter a valid image URL')
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar Selection */}
      <div className="space-y-3">
        <Label>Avatar</Label>
        <div className="flex items-start gap-4">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20 text-3xl ring-2 ring-border">
              {isAvatarUrl && <AvatarImage src={avatar} alt="Agent avatar" />}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-3xl">
                {!isAvatarUrl ? (avatar || '🤖') : '🤖'}
              </AvatarFallback>
            </Avatar>
            {isAvatarUrl && (
              <button
                type="button"
                onClick={() => setAvatar('🤖')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {/* Emoji Selection */}
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    'h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all',
                    avatar === emoji
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Avatar Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="gap-1.5"
              >
                <Link2 className="h-3.5 w-3.5" />
                URL
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePrompt}
                className="gap-1.5"
                data-tabz-action="generate-avatar"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Generate with AI
              </Button>
            </div>

            {/* Custom URL Input */}
            {showUrlInput && (
              <div className="flex gap-2">
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://... or /path/to/image.png"
                  className="glass text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlSubmit()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUrlSubmit}
                  disabled={!customUrl}
                >
                  Set
                </Button>
              </div>
            )}

            {/* Generated Prompt Display */}
            {generatedPrompt && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    DALL-E Prompt
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyPrompt}
                    className="h-6 px-2 gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {generatedPrompt}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ask Claude to generate this avatar, or paste the prompt into ChatGPT/DALL-E
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="agent-name">Name</Label>
        <Input
          id="agent-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Dashboard Helper"
          className="glass"
          data-tabz-input="agent-name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="agent-description">Description</Label>
        <Textarea
          id="agent-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do? e.g., Helps manage your daily tasks and provides weather updates"
          className="glass min-h-[80px]"
          data-tabz-input="agent-description"
        />
      </div>

      {/* Personality Traits */}
      <div className="space-y-2">
        <Label>Personality Traits</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Select traits that define how the agent communicates
        </p>
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TRAITS.map((trait) => (
            <button
              key={trait}
              type="button"
              onClick={() => toggleTrait(trait)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm capitalize transition-all',
                personality.includes(trait)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
              title={PERSONALITY_DESCRIPTIONS[trait]}
            >
              {trait}
            </button>
          ))}
        </div>
        {personality.length === 0 && (
          <p className="text-xs text-amber-500 mt-1">
            Select at least one personality trait
          </p>
        )}
      </div>
    </div>
  )
}

interface SectionsStepProps {
  sections: string[]
  setSections: (sections: string[]) => void
  availableSections: string[]
}

function SectionsStep({ sections, setSections, availableSections }: SectionsStepProps) {
  const toggleSection = (section: string) => {
    if (sections.includes(section)) {
      setSections(sections.filter(s => s !== section))
    } else {
      setSections([...sections, section])
    }
  }

  const selectAll = () => setSections([...availableSections])
  const clearAll = () => setSections([])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select which sections this agent can assist with
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[280px] pr-4">
        <div className="grid grid-cols-2 gap-2">
          {availableSections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => toggleSection(section)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all',
                sections.includes(section)
                  ? 'bg-primary/20 border border-primary/50'
                  : 'bg-muted hover:bg-muted/80 border border-transparent'
              )}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center transition-all',
                  sections.includes(section)
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30'
                )}
              >
                {sections.includes(section) && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              <span className="capitalize">{section.replace(/-/g, ' ')}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {sections.length > 0 && (
        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            {sections.length} section{sections.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  )
}

interface ToolsStepProps {
  selectedTools: MCPTool[]
  setSelectedTools: (tools: MCPTool[]) => void
}

function ToolsStep({ selectedTools, setSelectedTools }: ToolsStepProps) {
  const isToolSelected = (tool: MCPTool) =>
    selectedTools.some(t => t.name === tool.name)

  const toggleTool = (tool: MCPTool) => {
    if (isToolSelected(tool)) {
      setSelectedTools(selectedTools.filter(t => t.name !== tool.name))
    } else {
      setSelectedTools([...selectedTools, tool])
    }
  }

  const getPermissionColor = (permission: MCPTool['permission']) => {
    switch (permission) {
      case 'read':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'write':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'execute':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select MCP tools the agent can use to interact with the page
      </p>

      <ScrollArea className="h-[280px] pr-4">
        <div className="space-y-2">
          {DEFAULT_MCP_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer',
                isToolSelected(tool)
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-muted hover:bg-muted/80 border border-transparent'
              )}
              onClick={() => toggleTool(tool)}
            >
              <Switch
                checked={isToolSelected(tool)}
                onCheckedChange={() => toggleTool(tool)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{tool.name}</span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', getPermissionColor(tool.permission))}
                  >
                    {tool.permission}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {selectedTools.length > 0 && (
        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} enabled
          </p>
        </div>
      )}
    </div>
  )
}

interface PromptsStepProps {
  systemPrompt: string
  setSystemPrompt: (prompt: string) => void
  suggestedPrompts: string[]
  setSuggestedPrompts: (prompts: string[]) => void
}

function PromptsStep({
  systemPrompt,
  setSystemPrompt,
  suggestedPrompts,
  setSuggestedPrompts,
}: PromptsStepProps) {
  const [newPrompt, setNewPrompt] = React.useState('')

  const addPrompt = () => {
    if (newPrompt.trim() && !suggestedPrompts.includes(newPrompt.trim())) {
      setSuggestedPrompts([...suggestedPrompts, newPrompt.trim()])
      setNewPrompt('')
    }
  }

  const removePrompt = (prompt: string) => {
    setSuggestedPrompts(suggestedPrompts.filter(p => p !== prompt))
  }

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="system-prompt">System Prompt</Label>
        <p className="text-xs text-muted-foreground">
          Instructions that define the agent&apos;s behavior and knowledge
        </p>
        <Textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful assistant that specializes in..."
          className="glass min-h-[100px] font-mono text-sm"
          data-tabz-input="system-prompt"
        />
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-2">
        <Label>Suggested Prompts</Label>
        <p className="text-xs text-muted-foreground">
          Pre-defined prompts users can quickly select
        </p>

        <div className="flex gap-2">
          <Input
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Add a suggested prompt..."
            className="glass"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addPrompt()
              }
            }}
          />
          <Button variant="secondary" onClick={addPrompt} disabled={!newPrompt.trim()}>
            Add
          </Button>
        </div>

        {suggestedPrompts.length > 0 && (
          <ScrollArea className="h-[120px]">
            <div className="space-y-2 pr-4">
              {suggestedPrompts.map((prompt, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{prompt}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removePrompt(prompt)}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

interface PreviewStepProps {
  agentData: CreateAgentInput
}

function PreviewStep({ agentData }: PreviewStepProps) {
  const previewAgent = {
    ...agentData,
    id: 'preview',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Preview how your agent will appear. Click Save to create it.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Preview */}
        <div>
          <Label className="mb-2 block">Card View</Label>
          <AgentCard
            agent={previewAgent}
            variant="card"
          />
        </div>

        {/* Compact Preview */}
        <div>
          <Label className="mb-2 block">Compact View</Label>
          <AgentCard
            agent={previewAgent}
            variant="compact"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="glass-dark p-4 rounded-lg space-y-2">
        <h4 className="font-medium">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Sections:</span>{' '}
            <span>{agentData.sections?.length || 0}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tools:</span>{' '}
            <span>{agentData.mcp_tools.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Personality:</span>{' '}
            <span>{agentData.personality.length} traits</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className={agentData.enabled ? 'text-green-400' : 'text-muted-foreground'}>
              {agentData.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentBuilderWizard({
  open,
  onOpenChange,
  onAgentCreated,
  availableSections = DEFAULT_SECTIONS,
  initialData,
}: AgentBuilderWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0)

  // Form state
  const [name, setName] = React.useState(initialData?.name || '')
  const [avatar, setAvatar] = React.useState(initialData?.avatar || '🤖')
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [personality, setPersonality] = React.useState<AgentPersonalityTrait[]>(
    initialData?.personality || ['helpful']
  )
  const [sections, setSections] = React.useState<string[]>(initialData?.sections || [])
  const [selectedTools, setSelectedTools] = React.useState<MCPTool[]>(initialData?.mcp_tools || [])
  const [systemPrompt, setSystemPrompt] = React.useState(
    initialData?.system_prompt || 'You are a helpful AI assistant.'
  )
  const [suggestedPrompts, setSuggestedPrompts] = React.useState<string[]>([])
  const [enabled, setEnabled] = React.useState(initialData?.enabled ?? true)

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setCurrentStep(0)
      setName(initialData?.name || '')
      setAvatar(initialData?.avatar || '🤖')
      setDescription(initialData?.description || '')
      setPersonality(initialData?.personality || ['helpful'])
      setSections(initialData?.sections || [])
      setSelectedTools(initialData?.mcp_tools || [])
      setSystemPrompt(initialData?.system_prompt || 'You are a helpful AI assistant.')
      setSuggestedPrompts([])
      setEnabled(initialData?.enabled ?? true)
    }
  }, [open, initialData])

  // Build agent data
  const agentData: CreateAgentInput = {
    name,
    avatar,
    description,
    personality,
    system_prompt: systemPrompt,
    mcp_tools: selectedTools,
    selectors: [],
    config: DEFAULT_CONFIG,
    sections,
    enabled,
  }

  // Validation
  const isStep1Valid = name.trim().length > 0 && description.trim().length > 0 && personality.length > 0
  const isStep2Valid = true // Sections are optional
  const isStep3Valid = true // Tools are optional
  const isStep4Valid = systemPrompt.trim().length > 0

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return isStep1Valid
      case 1:
        return isStep2Valid
      case 2:
        return isStep3Valid
      case 3:
        return isStep4Valid
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = () => {
    onAgentCreated(agentData)
    onOpenChange(false)
  }

  const currentStepData = WIZARD_STEPS[currentStep]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        data-tabz-region="agent-builder-wizard"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <span>Create Agent</span>
          </DialogTitle>
          <DialogDescription>
            Build a custom AI agent with specialized knowledge and capabilities
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-4 px-2">
          {WIZARD_STEPS.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  disabled={index > currentStep && !canProceed()}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-primary/20 text-primary',
                    !isActive && !isCompleted && 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-xs',
                      isActive && 'bg-primary-foreground/20',
                      isCompleted && 'bg-primary text-primary-foreground',
                      !isActive && !isCompleted && 'bg-muted'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <StepIcon className="h-3 w-3" />
                    )}
                  </div>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-px',
                      index < currentStep ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 px-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="py-2"
            >
              {currentStep === 0 && (
                <IdentityStep
                  name={name}
                  setName={setName}
                  avatar={avatar}
                  setAvatar={setAvatar}
                  description={description}
                  setDescription={setDescription}
                  personality={personality}
                  setPersonality={setPersonality}
                />
              )}
              {currentStep === 1 && (
                <SectionsStep
                  sections={sections}
                  setSections={setSections}
                  availableSections={availableSections}
                />
              )}
              {currentStep === 2 && (
                <ToolsStep
                  selectedTools={selectedTools}
                  setSelectedTools={setSelectedTools}
                />
              )}
              {currentStep === 3 && (
                <PromptsStep
                  systemPrompt={systemPrompt}
                  setSystemPrompt={setSystemPrompt}
                  suggestedPrompts={suggestedPrompts}
                  setSuggestedPrompts={setSuggestedPrompts}
                />
              )}
              {currentStep === 4 && <PreviewStep agentData={agentData} />}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            {currentStep === 4 && (
              <div className="flex items-center gap-2">
                <Switch
                  id="agent-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <Label htmlFor="agent-enabled" className="text-sm">
                  Enable agent
                </Label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create Agent
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AgentBuilderWizard
