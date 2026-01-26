"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Bot,
  Folder,
  Cpu,
  Thermometer,
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { type Project } from "@/lib/projects"
import type { ProjectAgent, AgentConfig } from "@/app/api/projects/agents/route"

interface ProjectAgentsProps {
  project: Project
}

interface AgentsResponse {
  agents: ProjectAgent[]
  count: number
  hasAgentsDir: boolean
  projectPath: string
  error?: string
}

function AgentCard({ agent }: { agent: ProjectAgent }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const config = agent.config

  return (
    <Card className="glass group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="h-10 w-10 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">
                {config?.name || agent.folder}
              </h3>
              {config?.enabled === false && (
                <Badge variant="secondary" className="text-xs">
                  Disabled
                </Badge>
              )}
            </div>

            {config?.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {config.description}
              </p>
            )}

            {/* Config badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {config?.config?.model && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Cpu className="h-3 w-3" />
                        {config.config.model.replace(/^claude-/, "").split("-").slice(0, 2).join("-")}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{config.config.model}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {config?.config?.temperature !== undefined && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Thermometer className="h-3 w-3" />
                  {config.config.temperature}
                </Badge>
              )}
              {config?.personality && config.personality.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {config.personality.slice(0, 2).join(", ")}
                  {config.personality.length > 2 && ` +${config.personality.length - 2}`}
                </Badge>
              )}
            </div>

            {/* Expandable CLAUDE.md preview */}
            {agent.claudePreview && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <FileText className="h-3 w-3" />
                    System Prompt
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                    {agent.claudePreview}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* MCP Tools summary */}
            {config?.mcp_tools && config.mcp_tools.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {config.mcp_tools.length} MCP tool{config.mcp_tools.length !== 1 ? "s" : ""} configured
              </div>
            )}

            {/* Error indicator */}
            {agent.error && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {agent.error}
              </div>
            )}
          </div>

          {/* Folder indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-muted-foreground">
                  <Folder className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <code className="text-xs">agents/{agent.folder}/</code>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProjectAgents({ project }: ProjectAgentsProps) {
  const projectPath = project.local?.path

  const { data, isLoading, error } = useQuery<AgentsResponse>({
    queryKey: ["project-agents", projectPath],
    queryFn: async () => {
      if (!projectPath) {
        return { agents: [], count: 0, hasAgentsDir: false, projectPath: "" }
      }
      const res = await fetch(`/api/projects/agents?project=${encodeURIComponent(projectPath)}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to fetch agents")
      }
      return res.json()
    },
    enabled: !!projectPath,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Not a local project
  if (!projectPath) {
    return (
      <div className="glass rounded-lg p-8 text-center text-muted-foreground">
        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Agents are only available for local projects</p>
        <p className="text-sm mt-1">
          Clone this repository to configure project-specific agents
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass rounded-lg p-8 text-center text-destructive">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Failed to load agents</p>
        <p className="text-sm mt-1 text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  const agents = data?.agents || []
  const hasAgentsDir = data?.hasAgentsDir || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="text-sm text-muted-foreground">
            AI agent configurations for this project
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Agents Grid */}
      {agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.folder} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-lg p-8 text-center text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No agents configured</p>
          <p className="text-sm mt-1">
            {hasAgentsDir
              ? "The agents/ directory exists but contains no agent configurations"
              : "Create an agents/ directory with agent configurations"}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="mt-4" disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first agent
                </Button>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Path info */}
      {agents.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Agents loaded from <code className="bg-muted px-1 rounded">{projectPath}/agents/</code>
        </div>
      )}
    </div>
  )
}
