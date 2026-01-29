"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MODELS_REGISTRY,
  getModelById,
  getModelFamilies,
  getModelsByFamily,
  getModelPricingLabel,
  getModelIcon,
  MODEL_FAMILY_TEXT_COLORS,
  MODEL_FAMILY_BG_COLORS,
  type ModelDefinition,
  type ModelFamily,
} from "@/lib/models-registry"

interface ModelSelectorProps {
  value?: string
  onValueChange: (modelId: string) => void
  className?: string
  compact?: boolean
}

export function ModelSelector({
  value,
  onValueChange,
  className = "",
  compact = false,
}: ModelSelectorProps) {
  const selectedModel = value ? getModelById(value) : undefined
  const families = getModelFamilies()

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={`${compact ? "h-7 text-xs" : "h-9"} ${className} ${
          selectedModel
            ? MODEL_FAMILY_BG_COLORS[selectedModel.family]
            : ""
        }`}
      >
        <SelectValue placeholder="Select model...">
          {selectedModel && (
            <div className="flex items-center gap-2">
              <ModelIcon model={selectedModel} size={compact ? "sm" : "md"} />
              <span className={compact ? "" : "font-medium"}>
                {selectedModel.name}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {families.map((family) => (
          <SelectGroup key={family}>
            <SelectLabel
              className={`${MODEL_FAMILY_TEXT_COLORS[family]} font-semibold`}
            >
              {family}
            </SelectLabel>
            {getModelsByFamily(family).map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <ModelIcon model={model} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {getModelPricingLabel(model.pricing)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {model.traits.map((trait) => (
                        <span
                          key={trait}
                          className="px-1 py-0.5 rounded bg-muted/50"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

interface ModelIconProps {
  model: ModelDefinition
  size?: "sm" | "md" | "lg"
}

function ModelIcon({ model, size = "md" }: ModelIconProps) {
  const sizeClasses = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm",
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${sizeClasses[size]} rounded flex items-center justify-center font-bold shrink-0`}
          style={{ backgroundColor: `${model.color}20`, color: model.color }}
        >
          {getModelIcon(model.icon)}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold">
            {model.name} <span className="font-normal text-muted-foreground">v{model.version}</span>
          </div>
          <div className="text-xs text-muted-foreground">{model.company}</div>
          <div className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">
            {model.cli}
          </div>
          {model.note && (
            <div className="text-xs text-muted-foreground italic">
              {model.note}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Export for use in panel headers as a compact badge
interface ModelBadgeProps {
  modelId?: string
  onClick?: () => void
}

export function ModelBadge({ modelId, onClick }: ModelBadgeProps) {
  const model = modelId ? getModelById(modelId) : undefined

  if (!model) {
    return (
      <button
        onClick={onClick}
        className="h-6 px-2 text-xs rounded border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        Select Model
      </button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`h-6 px-2 text-xs rounded border flex items-center gap-1.5 transition-colors ${MODEL_FAMILY_BG_COLORS[model.family]}`}
        >
          <span
            className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: `${model.color}30`, color: model.color }}
          >
            {getModelIcon(model.icon)}
          </span>
          <span className={MODEL_FAMILY_TEXT_COLORS[model.family]}>
            {model.name}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs font-mono">{model.cli}</div>
      </TooltipContent>
    </Tooltip>
  )
}
