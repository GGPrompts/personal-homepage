import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentProfileStore } from '@/app/components/kanban/lib/agent-store'

// Reset store state before each test
beforeEach(() => {
  useAgentProfileStore.setState({
    profiles: [],
  })
})

describe('useAgentProfileStore', () => {
  describe('addAgent', () => {
    it('adds a new agent profile', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Test Agent',
        description: 'A test agent',
        baseType: 'claude-code',
        capabilities: {
          skills: ['commit', 'review-pr'],
          canCreateWorktree: true,
        },
      })

      const profiles = useAgentProfileStore.getState().profiles
      expect(profiles).toHaveLength(1)
      expect(profiles[0].id).toBe(agentId)
      expect(profiles[0].name).toBe('Test Agent')
      expect(profiles[0].baseType).toBe('claude-code')
      expect(profiles[0].capabilities?.skills).toContain('commit')
    })

    it('sets isEnabled to true by default', () => {
      const store = useAgentProfileStore.getState()
      store.addAgent({
        name: 'Enabled Agent',
        baseType: 'claude-code',
      })

      const profile = useAgentProfileStore.getState().profiles[0]
      expect(profile.isEnabled).toBe(true)
    })

    it('respects explicit isEnabled value', () => {
      const store = useAgentProfileStore.getState()
      store.addAgent({
        name: 'Disabled Agent',
        baseType: 'claude-code',
        isEnabled: false,
      })

      const profile = useAgentProfileStore.getState().profiles[0]
      expect(profile.isEnabled).toBe(false)
    })

    it('sets createdAt and updatedAt timestamps', () => {
      const store = useAgentProfileStore.getState()
      const before = new Date()
      store.addAgent({
        name: 'Timestamped Agent',
        baseType: 'claude-code',
      })
      const after = new Date()

      const profile = useAgentProfileStore.getState().profiles[0]
      expect(profile.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(profile.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(profile.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(profile.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('updateAgent', () => {
    it('updates an existing agent profile', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Original Name',
        baseType: 'claude-code',
      })

      store.updateAgent(agentId, {
        name: 'Updated Name',
        description: 'New description',
      })

      const profile = useAgentProfileStore.getState().profiles.find((p) => p.id === agentId)
      expect(profile?.name).toBe('Updated Name')
      expect(profile?.description).toBe('New description')
    })

    it('updates the updatedAt timestamp', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Agent',
        baseType: 'claude-code',
      })

      const originalTimestamp = useAgentProfileStore.getState().profiles[0].updatedAt

      // Wait a bit to ensure different timestamp
      const before = new Date()
      store.updateAgent(agentId, { name: 'Updated' })

      const profile = useAgentProfileStore.getState().profiles.find((p) => p.id === agentId)
      expect(profile?.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('can update capabilities', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Agent',
        baseType: 'claude-code',
        capabilities: {
          skills: ['commit'],
        },
      })

      store.updateAgent(agentId, {
        capabilities: {
          skills: ['commit', 'review-pr', 'test'],
          mcpServers: ['tabz'],
        },
      })

      const profile = useAgentProfileStore.getState().profiles.find((p) => p.id === agentId)
      expect(profile?.capabilities?.skills).toContain('review-pr')
      expect(profile?.capabilities?.mcpServers).toContain('tabz')
    })

    it('can update CLI config', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Agent',
        baseType: 'claude-code',
      })

      store.updateAgent(agentId, {
        cliConfig: {
          workingDir: '/path/to/project',
          permissionMode: 'bypassPermissions',
          systemPrompt: 'You are a helpful assistant.',
        },
      })

      const profile = useAgentProfileStore.getState().profiles.find((p) => p.id === agentId)
      expect(profile?.cliConfig?.workingDir).toBe('/path/to/project')
      expect(profile?.cliConfig?.permissionMode).toBe('bypassPermissions')
      expect(profile?.cliConfig?.systemPrompt).toBe('You are a helpful assistant.')
    })
  })

  describe('deleteAgent', () => {
    it('removes an agent profile', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'To Delete',
        baseType: 'claude-code',
      })

      expect(useAgentProfileStore.getState().profiles).toHaveLength(1)

      store.deleteAgent(agentId)

      expect(useAgentProfileStore.getState().profiles).toHaveLength(0)
    })

    it('does not affect other profiles', () => {
      const store = useAgentProfileStore.getState()
      const agent1Id = store.addAgent({ name: 'Agent 1', baseType: 'claude-code' })
      const agent2Id = store.addAgent({ name: 'Agent 2', baseType: 'gemini-cli' })
      store.addAgent({ name: 'Agent 3', baseType: 'codex' })

      store.deleteAgent(agent2Id)

      const profiles = useAgentProfileStore.getState().profiles
      expect(profiles).toHaveLength(2)
      expect(profiles.some((p) => p.id === agent1Id)).toBe(true)
      expect(profiles.some((p) => p.id === agent2Id)).toBe(false)
    })
  })

  describe('getAgent', () => {
    it('retrieves an agent by ID', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Findable Agent',
        baseType: 'claude-code',
      })

      const profile = store.getAgent(agentId)
      expect(profile?.name).toBe('Findable Agent')
    })

    it('returns undefined for non-existent ID', () => {
      const store = useAgentProfileStore.getState()

      const profile = store.getAgent('non-existent-id')
      expect(profile).toBeUndefined()
    })
  })

  describe('getAgentsByType', () => {
    it('filters agents by base type', () => {
      const store = useAgentProfileStore.getState()
      store.addAgent({ name: 'Claude 1', baseType: 'claude-code' })
      store.addAgent({ name: 'Claude 2', baseType: 'claude-code' })
      store.addAgent({ name: 'Gemini 1', baseType: 'gemini-cli' })
      store.addAgent({ name: 'Codex 1', baseType: 'codex' })

      const claudeAgents = store.getAgentsByType('claude-code')
      expect(claudeAgents).toHaveLength(2)
      expect(claudeAgents.every((a) => a.baseType === 'claude-code')).toBe(true)

      const geminiAgents = store.getAgentsByType('gemini-cli')
      expect(geminiAgents).toHaveLength(1)
      expect(geminiAgents[0].name).toBe('Gemini 1')
    })

    it('returns empty array when no agents match', () => {
      const store = useAgentProfileStore.getState()
      store.addAgent({ name: 'Claude 1', baseType: 'claude-code' })

      const copilotAgents = store.getAgentsByType('copilot')
      expect(copilotAgents).toHaveLength(0)
    })
  })

  describe('getEnabledAgents', () => {
    it('returns only enabled agents', () => {
      const store = useAgentProfileStore.getState()
      store.addAgent({ name: 'Enabled 1', baseType: 'claude-code', isEnabled: true })
      store.addAgent({ name: 'Disabled 1', baseType: 'claude-code', isEnabled: false })
      store.addAgent({ name: 'Default Enabled', baseType: 'gemini-cli' }) // Default true
      store.addAgent({ name: 'Disabled 2', baseType: 'codex', isEnabled: false })

      const enabledAgents = store.getEnabledAgents()
      expect(enabledAgents).toHaveLength(2)
      expect(enabledAgents.some((a) => a.name === 'Enabled 1')).toBe(true)
      expect(enabledAgents.some((a) => a.name === 'Default Enabled')).toBe(true)
      expect(enabledAgents.some((a) => a.name === 'Disabled 1')).toBe(false)
    })

    it('returns empty array when all agents are disabled', () => {
      const store = useAgentProfileStore.getState()
      store.addAgent({ name: 'Disabled 1', baseType: 'claude-code', isEnabled: false })
      store.addAgent({ name: 'Disabled 2', baseType: 'gemini-cli', isEnabled: false })

      const enabledAgents = store.getEnabledAgents()
      expect(enabledAgents).toHaveLength(0)
    })
  })

  describe('agent profile with all features', () => {
    it('creates a fully configured agent profile', () => {
      const store = useAgentProfileStore.getState()
      const agentId = store.addAgent({
        name: 'Full Featured Agent',
        description: 'An agent with all features configured',
        baseType: 'claude-code',
        avatar: 'https://example.com/avatar.png',
        capabilities: {
          skills: ['commit', 'review-pr', 'test'],
          mcpServers: ['tabz', 'shadcn'],
          subagents: ['helper'],
          slashCommands: ['/commit', '/pr'],
          canCreateWorktree: true,
          canCreatePR: true,
          canRunBash: true,
        },
        cliConfig: {
          agent: 'custom-agent',
          workingDir: '/home/user/project',
          additionalDirs: ['/home/user/shared'],
          permissionMode: 'bypassPermissions',
          allowedTools: ['Read', 'Write', 'Bash'],
          disallowedTools: ['Delete'],
          systemPrompt: 'You are a specialized coding assistant.',
          envVars: { NODE_ENV: 'development' },
          cliFlags: ['--verbose'],
        },
        isEnabled: true,
      })

      const profile = store.getAgent(agentId)

      expect(profile).toBeDefined()
      expect(profile?.name).toBe('Full Featured Agent')
      expect(profile?.avatar).toBe('https://example.com/avatar.png')
      expect(profile?.capabilities?.skills).toHaveLength(3)
      expect(profile?.capabilities?.canCreateWorktree).toBe(true)
      expect(profile?.cliConfig?.permissionMode).toBe('bypassPermissions')
      expect(profile?.cliConfig?.envVars?.NODE_ENV).toBe('development')
    })
  })
})
