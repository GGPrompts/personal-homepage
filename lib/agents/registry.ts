"use client"

import { useState, useEffect, useCallback } from "react"
import {
  AgentCard,
  AgentCardSchema,
  AgentRegistryData,
  AgentRegistryDataSchema,
  CreateAgentInput,
  UpdateAgentInput,
  AgentCardSummary,
} from "./types"

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "agent-registry"
const CURRENT_VERSION = 1

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Load registry data from localStorage
 */
function loadRegistryData(): AgentRegistryData {
  if (typeof window === "undefined") {
    return { agents: [], version: CURRENT_VERSION }
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const result = AgentRegistryDataSchema.safeParse(parsed)
      if (result.success) {
        return result.data
      }
      console.warn("Invalid agent registry data, resetting to empty:", result.error)
    }
  } catch (error) {
    console.error("Error loading agent registry:", error)
  }

  return { agents: [], version: CURRENT_VERSION }
}

/**
 * Save registry data to localStorage
 */
function saveRegistryData(data: AgentRegistryData): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving agent registry:", error)
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate agent input for creation
 */
function validateCreateInput(input: CreateAgentInput): { success: true } | { success: false; error: string } {
  // Create a complete agent object with generated fields for validation
  const now = new Date().toISOString()
  const testAgent = {
    ...input,
    id: "test-id",
    created_at: now,
    updated_at: now,
  }

  const result = AgentCardSchema.safeParse(testAgent)
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i: { message: string }) => i.message).join(", ") }
  }
  return { success: true }
}

/**
 * Validate agent input for update
 */
function validateUpdateInput(
  existingAgent: AgentCard,
  updates: UpdateAgentInput
): { success: true } | { success: false; error: string } {
  const now = new Date().toISOString()
  const testAgent = {
    ...existingAgent,
    ...updates,
    updated_at: now,
  }

  const result = AgentCardSchema.safeParse(testAgent)
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i: { message: string }) => i.message).join(", ") }
  }
  return { success: true }
}

// ============================================================================
// Hook Types
// ============================================================================

export interface AgentRegistryResult {
  /** All agents in the registry */
  agents: AgentCard[]
  /** Whether the registry has been loaded from storage */
  isLoaded: boolean
  /** Whether seed agents have been initialized */
  isInitialized: boolean

  // CRUD Operations
  /** Create a new agent */
  createAgent: (input: CreateAgentInput) => { success: true; agent: AgentCard } | { success: false; error: string }
  /** Get an agent by ID */
  getAgent: (id: string) => AgentCard | undefined
  /** Update an existing agent */
  updateAgent: (id: string, updates: UpdateAgentInput) => { success: true; agent: AgentCard } | { success: false; error: string }
  /** Delete an agent by ID */
  deleteAgent: (id: string) => boolean

  // Query Operations
  /** List all agents (optionally filtered) */
  listAgents: (filter?: { enabled?: boolean; section?: string }) => AgentCard[]
  /** Get agents by section */
  getAgentsBySection: (section: string) => AgentCard[]
  /** Get agent summaries for list views */
  getAgentSummaries: () => AgentCardSummary[]

  // Bulk Operations
  /** Import agents from JSON data */
  importAgents: (data: unknown) => { success: true; count: number } | { success: false; error: string }
  /** Export agents as JSON data */
  exportAgents: () => AgentRegistryData

  // Utility
  /** Reset registry to empty state */
  clearRegistry: () => void
  /** Initialize with seed agents (only if empty) */
  initializeWithSeeds: (seedAgents: CreateAgentInput[]) => void
}

// ============================================================================
// useAgentRegistry Hook
// ============================================================================

/**
 * React hook for managing the agent registry
 * Provides CRUD operations with Zod validation and localStorage persistence
 */
export function useAgentRegistry(): AgentRegistryResult {
  const [registryData, setRegistryData] = useState<AgentRegistryData>({ agents: [], version: CURRENT_VERSION })
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const data = loadRegistryData()
    setRegistryData(data)
    setIsLoaded(true)
    setIsInitialized(data.agents.length > 0)
  }, [])

  // Save to localStorage when data changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveRegistryData(registryData)
    }
  }, [registryData, isLoaded])

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  const createAgent = useCallback((input: CreateAgentInput): { success: true; agent: AgentCard } | { success: false; error: string } => {
    const validation = validateCreateInput(input)
    if (!validation.success) {
      return validation
    }

    const now = new Date().toISOString()
    const newAgent: AgentCard = {
      ...input,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }

    setRegistryData(prev => ({
      ...prev,
      agents: [...prev.agents, newAgent],
    }))

    return { success: true, agent: newAgent }
  }, [])

  const getAgent = useCallback((id: string): AgentCard | undefined => {
    return registryData.agents.find(agent => agent.id === id)
  }, [registryData.agents])

  const updateAgent = useCallback((id: string, updates: UpdateAgentInput): { success: true; agent: AgentCard } | { success: false; error: string } => {
    const existingAgent = registryData.agents.find(agent => agent.id === id)
    if (!existingAgent) {
      return { success: false, error: `Agent with id "${id}" not found` }
    }

    const validation = validateUpdateInput(existingAgent, updates)
    if (!validation.success) {
      return validation
    }

    const now = new Date().toISOString()
    const updatedAgent: AgentCard = {
      ...existingAgent,
      ...updates,
      updated_at: now,
    }

    setRegistryData(prev => ({
      ...prev,
      agents: prev.agents.map(agent => agent.id === id ? updatedAgent : agent),
    }))

    return { success: true, agent: updatedAgent }
  }, [registryData.agents])

  const deleteAgent = useCallback((id: string): boolean => {
    const exists = registryData.agents.some(agent => agent.id === id)
    if (!exists) {
      return false
    }

    setRegistryData(prev => ({
      ...prev,
      agents: prev.agents.filter(agent => agent.id !== id),
    }))

    return true
  }, [registryData.agents])

  // ============================================================================
  // Query Operations
  // ============================================================================

  const listAgents = useCallback((filter?: { enabled?: boolean; section?: string }): AgentCard[] => {
    let result = registryData.agents

    if (filter?.enabled !== undefined) {
      result = result.filter(agent => agent.enabled === filter.enabled)
    }

    if (filter?.section !== undefined) {
      result = result.filter(agent => agent.sections?.includes(filter.section!))
    }

    return result
  }, [registryData.agents])

  const getAgentsBySection = useCallback((section: string): AgentCard[] => {
    return registryData.agents.filter(agent =>
      agent.enabled && agent.sections?.includes(section)
    )
  }, [registryData.agents])

  const getAgentSummaries = useCallback((): AgentCardSummary[] => {
    return registryData.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      description: agent.description,
      enabled: agent.enabled,
      sections: agent.sections,
    }))
  }, [registryData.agents])

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  const importAgents = useCallback((data: unknown): { success: true; count: number } | { success: false; error: string } => {
    // Validate the entire import data structure
    const result = AgentRegistryDataSchema.safeParse(data)
    if (!result.success) {
      return { success: false, error: `Invalid import data: ${result.error.issues.map((i: { message: string }) => i.message).join(", ")}` }
    }

    const importedData = result.data
    const now = new Date().toISOString()

    // Re-generate IDs and timestamps to prevent conflicts
    const newAgents: AgentCard[] = importedData.agents.map((agent: AgentCard) => ({
      ...agent,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }))

    setRegistryData(prev => ({
      ...prev,
      agents: [...prev.agents, ...newAgents],
    }))

    return { success: true, count: newAgents.length }
  }, [])

  const exportAgents = useCallback((): AgentRegistryData => {
    return {
      agents: registryData.agents,
      version: CURRENT_VERSION,
    }
  }, [registryData.agents])

  // ============================================================================
  // Utility Operations
  // ============================================================================

  const clearRegistry = useCallback(() => {
    setRegistryData({ agents: [], version: CURRENT_VERSION })
    setIsInitialized(false)
  }, [])

  const initializeWithSeeds = useCallback((seedAgents: CreateAgentInput[]) => {
    // Only initialize if registry is empty
    if (registryData.agents.length > 0) {
      return
    }

    const now = new Date().toISOString()
    const agents: AgentCard[] = seedAgents.map(input => ({
      ...input,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }))

    setRegistryData(prev => ({
      ...prev,
      agents,
    }))
    setIsInitialized(true)
  }, [registryData.agents.length])

  return {
    agents: registryData.agents,
    isLoaded,
    isInitialized,
    createAgent,
    getAgent,
    updateAgent,
    deleteAgent,
    listAgents,
    getAgentsBySection,
    getAgentSummaries,
    importAgents,
    exportAgents,
    clearRegistry,
    initializeWithSeeds,
  }
}
