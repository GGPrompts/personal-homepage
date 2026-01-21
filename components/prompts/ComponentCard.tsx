"use client"

import {
  Eye,
  Copy,
  Play,
  Trash2,
  Tag,
  Calendar,
  FileCode,
  Terminal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SavedComponent } from "@/lib/prompts-playground"
import { formatDate } from "@/lib/prompts-playground"

interface ComponentCardProps {
  component: SavedComponent
  onPreview: () => void
  onCopyFiles: () => void
  onRerunPrompt: () => void
  onDelete: () => void
}

export function ComponentCard({
  component,
  onPreview,
  onCopyFiles,
  onRerunPrompt,
  onDelete,
}: ComponentCardProps) {
  return (
    <Card className="glass hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{component.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">{formatDate(component.createdAt)}</span>
              {component.panelLabel && (
                <>
                  <span className="text-border/50">|</span>
                  <Terminal className="h-3 w-3" />
                  <span className="text-xs">{component.panelLabel}</span>
                </>
              )}
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="pb-2 space-y-3">
        {/* Agent Config */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {component.agentConfig.cli}
          </Badge>
          {component.agentConfig.model && (
            <span>{component.agentConfig.model}</span>
          )}
          {component.agentConfig.agent && (
            <>
              <span className="text-border/50">+</span>
              <span>{component.agentConfig.agent}</span>
            </>
          )}
        </div>

        {/* Prompt Preview */}
        {component.prompt && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{component.prompt}"
          </p>
        )}

        {/* Files */}
        {component.files.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileCode className="h-3 w-3" />
            <span>
              {component.files.length} file{component.files.length !== 1 && "s"}
            </span>
            <span className="text-border/50">|</span>
            <span className="truncate">
              {component.files.map((f) => f.path.split("/").pop()).join(", ")}
            </span>
          </div>
        )}

        {/* Tags */}
        {component.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {component.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onPreview}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent>View full details</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onCopyFiles}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy files to clipboard</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onRerunPrompt}>
              <Play className="h-3.5 w-3.5 mr-1" />
              Re-run
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy prompt for new session</TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  )
}
