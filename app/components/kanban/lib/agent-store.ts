import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AgentProfile, AgentType } from '../types'

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

interface AgentProfileState {
  profiles: AgentProfile[]

  // Profile actions
  addAgent: (profile: Omit<AgentProfile, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateAgent: (id: string, updates: Partial<Omit<AgentProfile, 'id' | 'createdAt'>>) => void
  deleteAgent: (id: string) => void
  getAgent: (id: string) => AgentProfile | undefined

  // Query helpers
  getAgentsByType: (baseType: AgentType) => AgentProfile[]
  getEnabledAgents: () => AgentProfile[]
}

export const useAgentProfileStore = create<AgentProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],

      addAgent: (profileData) => {
        const id = generateId()
        const now = new Date()
        const newProfile: AgentProfile = {
          ...profileData,
          id,
          isEnabled: profileData.isEnabled ?? true,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }))
        return id
      },

      updateAgent: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }))
      },

      deleteAgent: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        }))
      },

      getAgent: (id) => {
        return get().profiles.find((p) => p.id === id)
      },

      getAgentsByType: (baseType) => {
        return get().profiles.filter((p) => p.baseType === baseType)
      },

      getEnabledAgents: () => {
        return get().profiles.filter((p) => p.isEnabled !== false)
      },
    }),
    {
      name: 'ai-kanban-agent-profiles',
      skipHydration: true,
    }
  )
)
