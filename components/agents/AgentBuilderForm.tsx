'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  Terminal,
  Gem,
  Plane,
  Code,
  FolderOpen,
  Plug,
  Play,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  BookOpen,
  MessageSquare,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { CreateAgentInput, AgentCategory } from '@/lib/agents/types'
import {
  type AIBackend,
  getFlagsByCategory,
  CATEGORY_LABELS,
  getExecutableName,
  type CLIFlag,
} from '@/lib/ai/cli-flags'

// ============================================================================
// Types
// ============================================================================

export interface AgentBuilderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated: (agent: CreateAgentInput) => void
  availableSections?: string[]
  initialData?: Partial<CreateAgentInput>
}

interface CommandFlag {
  id: string
  name: string
  value?: string
}

// ============================================================================
// Constants
// ============================================================================

const BACKEND_CONFIG: Record<AIBackend, { icon: React.ElementType; color: string; label: string }> = {
  claude: { icon: Bot, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30', label: 'Claude' },
  codex: { icon: Code, color: 'text-green-400 bg-green-500/15 border-green-500/30', label: 'Codex' },
  gemini: { icon: Gem, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30', label: 'Gemini' },
  copilot: { icon: Plane, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30', label: 'Copilot' },
}

const DEFAULT_SECTIONS = [
  'weather', 'feed', 'market-pulse', 'api-playground', 'notes', 'bookmarks',
  'search', 'ai-workspace', 'stocks', 'crypto', 'spacex', 'github-activity',
  'disasters', 'tasks', 'projects', 'files', 'kanban', 'jobs', 'music-player',
  'video-player', 'photo-gallery', 'profile',
]

// ============================================================================
// CLI Flag Reference Component
// ============================================================================

function CLIFlagReference({
  backend,
  onAddFlag,
  existingFlags,
}: {
  backend: AIBackend
  onAddFlag: (flag: CLIFlag, value?: string) => void
  existingFlags: CommandFlag[]
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [pendingFlag, setPendingFlag] = React.useState<CLIFlag | null>(null)
  const [pendingValue, setPendingValue] = React.useState('')
  const flagsByCategory = React.useMemo(() => getFlagsByCategory(backend), [backend])

  const handleFlagClick = (flag: CLIFlag) => {
    if (flag.type === 'boolean') {
      onAddFlag(flag)
      toast.success(`Added --${flag.name}`)
      return
    }
    setPendingFlag(flag)
    setPendingValue(flag.defaultValue?.toString() || '')
  }

  const handleAddPendingFlag = () => {
    if (pendingFlag && pendingValue.trim()) {
      onAddFlag(pendingFlag, pendingValue.trim())
      toast.success(`Added --${pendingFlag.name} ${pendingValue.trim()}`)
      setPendingFlag(null)
      setPendingValue('')
    }
  }

  const isFlagAlreadyAdded = (flagName: string) =>
    existingFlags.some(f => f.name === flagName)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Add CLI Flags
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {pendingFlag && (
          <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-primary">--{pendingFlag.name}</code>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPendingFlag(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{pendingFlag.description}</p>
            {pendingFlag.type === 'enum' && pendingFlag.values ? (
              <Select value={pendingValue} onValueChange={setPendingValue}>
                <SelectTrigger className="glass text-sm">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {pendingFlag.values.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={pendingValue}
                onChange={(e) => setPendingValue(e.target.value)}
                placeholder={pendingFlag.example?.replace(`--${pendingFlag.name} `, '') || 'Enter value'}
                className="glass text-sm font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddPendingFlag() }
                  else if (e.key === 'Escape') { setPendingFlag(null) }
                }}
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPendingFlag(null)}>Cancel</Button>
              <Button size="sm" onClick={handleAddPendingFlag} disabled={!pendingValue.trim()}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[200px] rounded-lg border border-border/50 bg-muted/30 p-3">
          <div className="space-y-4">
            {Object.entries(flagsByCategory).map(([category, flags]) => (
              <div key={category}>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h5>
                <div className="space-y-1.5">
                  {flags.map((flag) => {
                    const isAdded = isFlagAlreadyAdded(flag.name)
                    return (
                      <div
                        key={flag.name}
                        className={cn(
                          'group flex items-start gap-2 p-1.5 rounded transition-colors',
                          isAdded ? 'bg-primary/10 opacity-60' : 'hover:bg-muted/50 cursor-pointer'
                        )}
                        onClick={() => !isAdded && handleFlagClick(flag)}
                      >
                        <code className="text-xs font-mono text-primary shrink-0">--{flag.name}</code>
                        <span className="text-[10px] text-muted-foreground flex-1">{flag.description}</span>
                        {isAdded ? (
                          <Check className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <Plus className="h-3 w-3 opacity-0 group-hover:opacity-70 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// Main Form Component
// ============================================================================

export function AgentBuilderForm({
  open,
  onOpenChange,
  onAgentCreated,
  availableSections = DEFAULT_SECTIONS,
  initialData,
}: AgentBuilderFormProps) {
  // Form state
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [backend, setBackend] = React.useState<AIBackend>('claude')
  const [category, setCategory] = React.useState<AgentCategory | ''>('')
  const [workingDir, setWorkingDir] = React.useState('')
  const [pluginPath, setPluginPath] = React.useState('')
  const [sections, setSections] = React.useState<string[]>([])
  const [suggestedPrompts, setSuggestedPrompts] = React.useState<string[]>([])
  const [newPrompt, setNewPrompt] = React.useState('')
  const [customAvatar, setCustomAvatar] = React.useState('')

  // Command builder state
  const [commandFlags, setCommandFlags] = React.useState<CommandFlag[]>([])
  const [useRawMode, setUseRawMode] = React.useState(false)
  const [rawCommand, setRawCommand] = React.useState('')

  // UI state
  const [showFlagBuilder, setShowFlagBuilder] = React.useState(false)
  const [showSections, setShowSections] = React.useState(false)

  // Sync form state when initialData changes (for edit mode)
  React.useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setWorkingDir(initialData.workingDir || '')
      setPluginPath(initialData.pluginPath || '')
      setSections(initialData.sections || [])
      setSuggestedPrompts(initialData.suggestedPrompts || [])
      setCustomAvatar(initialData.avatar || '')
      setBackend((initialData.backend as AIBackend) || 'claude')
      setCategory(initialData.category || '')
      // Parse flags to command flags for editing
      if (initialData.flags?.length) {
        const parsedFlags: CommandFlag[] = []
        for (let i = 0; i < initialData.flags.length; i++) {
          const arg = initialData.flags[i]
          if (arg.startsWith('--')) {
            const flagName = arg.slice(2)
            const nextArg = initialData.flags[i + 1]
            if (nextArg && !nextArg.startsWith('--')) {
              parsedFlags.push({ id: `${flagName}-${Date.now()}-${i}`, name: flagName, value: nextArg })
              i++ // Skip the value
            } else {
              parsedFlags.push({ id: `${flagName}-${Date.now()}-${i}`, name: flagName })
            }
          }
        }
        setCommandFlags(parsedFlags)
      } else {
        setCommandFlags([])
      }
    } else if (open && !initialData) {
      // Reset form for new agent
      setName('')
      setDescription('')
      setBackend('claude')
      setCategory('')
      setWorkingDir('')
      setPluginPath('')
      setSections([])
      setSuggestedPrompts([])
      setCommandFlags([])
      setCustomAvatar('')
    }
  }, [open, initialData])

  // Get backend config for avatar
  const backendConfig = BACKEND_CONFIG[backend]
  const BackendIcon = backendConfig.icon

  // Build command preview
  const buildCommandPreview = () => {
    const parts = [getExecutableName(backend)]
    if (pluginPath) parts.push(`--plugin-dir "${pluginPath}"`)
    for (const flag of commandFlags) {
      if (flag.value !== undefined) {
        const quotedValue = flag.value.includes(' ') ? `"${flag.value}"` : flag.value
        parts.push(`--${flag.name} ${quotedValue}`)
      } else {
        parts.push(`--${flag.name}`)
      }
    }
    return parts.join(' ')
  }

  // Sync command flags to array
  React.useEffect(() => {
    if (!useRawMode) {
      const args: string[] = []
      for (const flag of commandFlags) {
        args.push(`--${flag.name}`)
        if (flag.value !== undefined) args.push(flag.value)
      }
    }
  }, [commandFlags, useRawMode])

  const handleAddFlag = (flag: CLIFlag, value?: string) => {
    setCommandFlags([...commandFlags, { id: `${flag.name}-${Date.now()}`, name: flag.name, value }])
  }

  const handleRemoveFlag = (flagId: string) => {
    setCommandFlags(commandFlags.filter(f => f.id !== flagId))
  }

  const handleAddPrompt = () => {
    if (newPrompt.trim() && !suggestedPrompts.includes(newPrompt.trim())) {
      setSuggestedPrompts([...suggestedPrompts, newPrompt.trim()])
      setNewPrompt('')
    }
  }

  const handleRemovePrompt = (prompt: string) => {
    setSuggestedPrompts(suggestedPrompts.filter(p => p !== prompt))
  }

  const toggleSection = (section: string) => {
    if (sections.includes(section)) {
      setSections(sections.filter(s => s !== section))
    } else {
      setSections([...sections, section])
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    // Build flags array from command flags
    const flags: string[] = []
    for (const flag of commandFlags) {
      flags.push(`--${flag.name}`)
      if (flag.value !== undefined) flags.push(flag.value)
    }

    const agent: CreateAgentInput = {
      name: name.trim(),
      avatar: customAvatar || '',
      description: description.trim(),
      backend,
      flags,
      workingDir: workingDir.trim() || null,
      pluginPath: pluginPath.trim() || undefined,
      sections,
      enabled: true,
      mode: undefined, // Let it be inferred from workingDir
      category: category || undefined,
      suggestedPrompts,
    }

    onAgentCreated(agent)
    onOpenChange(false)
    toast.success(initialData ? `Agent "${name}" updated` : `Agent "${name}" created`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-zinc-900 border-white/10 sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-semibold">
            {initialData ? 'Edit Agent' : 'Create Agent'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 p-6"
          >
            {/* Name (Required) */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Agent"
                className="glass"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do?"
                className="glass"
              />
            </div>

            {/* Backend Selection with Auto-Avatar Preview */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Backend
              </Label>
              <div className="flex items-center gap-4">
                <Select value={backend} onValueChange={(v) => setBackend(v as AIBackend)}>
                  <SelectTrigger className="glass flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BACKEND_CONFIG).map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.color.split(' ')[0])} />
                            {config.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {/* Auto-avatar preview */}
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center border",
                  backendConfig.color
                )}>
                  <BackendIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Avatar auto-set based on backend. Override below if desired.
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Category
                <Badge variant="outline" className="text-[9px] ml-1">Optional</Badge>
              </Label>
              <Select
                value={category || 'auto'}
                onValueChange={(v) => setCategory(v === 'auto' ? '' : v as AgentCategory)}
              >
                <SelectTrigger className="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="page-assistant">Page Assistant</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Leave as auto to categorize by sections or backend. Set explicitly to override.
              </p>
            </div>

            {/* Working Directory */}
            <div className="space-y-2">
              <Label htmlFor="working-dir" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Working Directory
                <Badge variant="outline" className="text-[9px] ml-1">Optional</Badge>
              </Label>
              <Input
                id="working-dir"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                placeholder="~/projects/my-app"
                className="glass font-mono text-sm"
              />
            </div>

            {/* Command Builder (Collapsible) */}
            <Collapsible open={showFlagBuilder} onOpenChange={setShowFlagBuilder}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between glass">
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    CLI Flags
                    {commandFlags.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{commandFlags.length}</Badge>
                    )}
                  </span>
                  {showFlagBuilder ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-3">
                {/* Active flags */}
                {commandFlags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {commandFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-sm"
                      >
                        <code className="font-mono text-primary">--{flag.name}</code>
                        {flag.value && <span className="text-muted-foreground">{flag.value}</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveFlag(flag.id)}
                          className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Command preview */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <code className="text-xs font-mono text-foreground/80 break-all">
                      {buildCommandPreview()}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(buildCommandPreview())
                        toast.success('Command copied')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Flag reference */}
                <CLIFlagReference
                  backend={backend}
                  onAddFlag={handleAddFlag}
                  existingFlags={commandFlags}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Page Sections (Collapsible) */}
            <Collapsible open={showSections} onOpenChange={setShowSections}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between glass">
                  <span className="flex items-center gap-2">
                    Page Sections
                    {sections.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{sections.length}</Badge>
                    )}
                  </span>
                  {showSections ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Select which pages will auto-select this agent
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSections.map((section) => (
                    <Badge
                      key={section}
                      variant={sections.includes(section) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        sections.includes(section) ? 'bg-primary' : 'hover:bg-muted'
                      )}
                      onClick={() => toggleSection(section)}
                    >
                      {section}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Suggested Prompts */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Quick Start Prompts
                <Badge variant="outline" className="text-[9px] ml-1">Optional</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                Clickable buttons shown in new conversations
              </p>
              <div className="flex gap-2">
                <Input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="/brainstorm or 'Help me plan...'"
                  className="glass flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddPrompt() }
                  }}
                />
                <Button size="sm" onClick={handleAddPrompt} disabled={!newPrompt.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {suggestedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <div
                      key={prompt}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50 text-sm"
                    >
                      <span className="truncate max-w-[200px]">{prompt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrompt(prompt)}
                        className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Avatar Override */}
            <div className="space-y-2">
              <Label htmlFor="avatar">Custom Avatar Override</Label>
              <Input
                id="avatar"
                value={customAvatar}
                onChange={(e) => setCustomAvatar(e.target.value)}
                placeholder="Emoji or URL (leave empty for auto)"
                className="glass"
              />
            </div>
          </motion.div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {initialData ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
