"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo, useCallback } from "react"
import type { ModelInfo, BackendStatus } from "@/lib/ai-workspace"

// ============================================================================
// TYPES
// ============================================================================

export interface UseModelsReturn {
  /** All available models */
  models: ModelInfo[]
  /** Backend status information */
  backends: BackendStatus[]
  /** Whether models are loading */
  isLoading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Get a model by ID */
  getById: (modelId: string | null | undefined) => ModelInfo | null
  /** Get models for a specific backend */
  getForBackend: (backend: string) => ModelInfo[]
  /** Get the default model (first non-mock model, or first model) */
  defaultModel: ModelInfo | null
  /** Refetch models */
  refetch: () => void
}

// ============================================================================
// QUERY KEY
// ============================================================================

export const MODELS_QUERY_KEY = ['ai-models']

// ============================================================================
// FALLBACK
// ============================================================================

const MOCK_MODEL: ModelInfo = {
  id: 'mock',
  name: 'Mock AI (Demo)',
  backend: 'mock',
  description: 'Simulated responses',
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for fetching and working with AI models
 *
 * Uses React Query for caching - models are fetched once and shared
 * across all components using this hook (AI Workspace, AI Drawer, etc.)
 *
 * @example
 * ```tsx
 * const { models, isLoading, getById, defaultModel } = useModels()
 *
 * // Get a specific model
 * const model = getById('claude-opus-4-5-20251101')
 *
 * // Get all models for a backend
 * const claudeModels = getForBackend('claude')
 * ```
 */
export function useModels(): UseModelsReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{ models: ModelInfo[]; backends: BackendStatus[] }>({
    queryKey: MODELS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/ai/models')
      if (!res.ok) {
        throw new Error('Failed to fetch models')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  })

  // Extract models with fallback
  const models = useMemo(() => {
    return data?.models ?? [MOCK_MODEL]
  }, [data?.models])

  // Extract backends
  const backends = useMemo(() => {
    return data?.backends ?? []
  }, [data?.backends])

  // Get default model (first non-mock, or first available)
  const defaultModel = useMemo(() => {
    const nonMock = models.find(m => m.backend !== 'mock')
    return nonMock ?? models[0] ?? null
  }, [models])

  // Get model by ID
  const getById = useCallback(
    (modelId: string | null | undefined): ModelInfo | null => {
      if (!modelId) return null
      return models.find(m => m.id === modelId) ?? null
    },
    [models]
  )

  // Get models for a backend
  const getForBackend = useCallback(
    (backend: string): ModelInfo[] => {
      return models.filter(m => m.backend === backend)
    },
    [models]
  )

  return {
    models,
    backends,
    isLoading,
    error: error as Error | null,
    getById,
    getForBackend,
    defaultModel,
    refetch,
  }
}
