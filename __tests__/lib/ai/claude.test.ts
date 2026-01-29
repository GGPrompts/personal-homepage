import { describe, it, expect } from 'vitest'
import { buildClaudeArgs } from '@/lib/ai/claude'
import type { ChatSettings } from '@/lib/ai/types'

// Helper to create minimal ChatSettings
function makeSettings(overrides: Partial<ChatSettings> = {}): ChatSettings {
  return {
    model: 'claude',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    ...overrides,
  }
}

describe('buildClaudeArgs', () => {
  describe('minimal settings', () => {
    it('returns empty array for minimal settings', () => {
      const settings = makeSettings()
      const args = buildClaudeArgs(settings)
      expect(args).toEqual([])
    })
  })

  describe('system prompt', () => {
    it('adds --append-system-prompt from top-level systemPrompt', () => {
      const settings = makeSettings({ systemPrompt: 'You are a helpful assistant' })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--append-system-prompt')
      expect(args).toContain('You are a helpful assistant')
    })

    it('prefers nested claude.systemPrompt over top-level', () => {
      const settings = makeSettings({
        systemPrompt: 'top-level prompt',
        claude: { systemPrompt: 'nested prompt' },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--append-system-prompt')
      expect(args).toContain('nested prompt')
      expect(args).not.toContain('top-level prompt')
    })
  })

  describe('model selection', () => {
    it('adds --model from legacy claudeModel', () => {
      const settings = makeSettings({ claudeModel: 'opus' })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--model')
      expect(args).toContain('opus')
    })

    it('prefers nested claude.model over legacy claudeModel', () => {
      const settings = makeSettings({
        claudeModel: 'sonnet',
        claude: { model: 'opus' },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--model')
      expect(args).toContain('opus')
      expect(args).not.toContain('sonnet')
    })
  })

  describe('agent selection', () => {
    it('adds --agent from legacy claudeAgent', () => {
      const settings = makeSettings({ claudeAgent: 'coder' })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--agent')
      expect(args).toContain('coder')
    })

    it('prefers nested claude.agent over legacy claudeAgent', () => {
      const settings = makeSettings({
        claudeAgent: 'legacy-agent',
        claude: { agent: 'new-agent' },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--agent')
      expect(args).toContain('new-agent')
      expect(args).not.toContain('legacy-agent')
    })
  })

  describe('additional directories', () => {
    it('adds --add-dir from legacy additionalDirs', () => {
      const settings = makeSettings({ additionalDirs: ['/path/to/dir1', '/path/to/dir2'] })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--add-dir')
      expect(args).toContain('/path/to/dir1')
      expect(args).toContain('/path/to/dir2')
    })

    it('prefers nested claude.additionalDirs over legacy', () => {
      const settings = makeSettings({
        additionalDirs: ['/legacy/dir'],
        claude: { additionalDirs: ['/nested/dir'] },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--add-dir')
      expect(args).toContain('/nested/dir')
      expect(args).not.toContain('/legacy/dir')
    })

    it('skips empty additionalDirs array', () => {
      const settings = makeSettings({ additionalDirs: [] })
      const args = buildClaudeArgs(settings)
      expect(args).not.toContain('--add-dir')
    })
  })

  describe('tool permissions', () => {
    it('adds --allowed-tools from legacy allowedTools', () => {
      const settings = makeSettings({ allowedTools: ['Read', 'Write'] })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--allowed-tools')
      expect(args).toContain('Read')
      expect(args).toContain('Write')
    })

    it('adds --disallowed-tools from legacy disallowedTools', () => {
      const settings = makeSettings({ disallowedTools: ['Bash', 'Edit'] })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--disallowed-tools')
      expect(args).toContain('Bash')
      expect(args).toContain('Edit')
    })

    it('prefers nested claude.allowedTools over legacy', () => {
      const settings = makeSettings({
        allowedTools: ['LegacyTool'],
        claude: { allowedTools: ['NewTool'] },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('NewTool')
      expect(args).not.toContain('LegacyTool')
    })
  })

  describe('permission mode', () => {
    it('adds --permission-mode from legacy permissionMode', () => {
      const settings = makeSettings({ permissionMode: 'acceptEdits' })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--permission-mode')
      expect(args).toContain('acceptEdits')
    })

    it('prefers nested claude.permissionMode over legacy', () => {
      const settings = makeSettings({
        permissionMode: 'default',
        claude: { permissionMode: 'bypassPermissions' },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--permission-mode')
      expect(args).toContain('bypassPermissions')
      expect(args).not.toContain('default')
    })
  })

  describe('MCP configuration', () => {
    it('adds --mcp-config for each config path', () => {
      const settings = makeSettings({
        claude: { mcpConfig: ['/path/to/mcp1.json', '/path/to/mcp2.json'] },
      })
      const args = buildClaudeArgs(settings)
      const mcpConfigIndices = args.reduce((acc: number[], arg, i) => {
        if (arg === '--mcp-config') acc.push(i)
        return acc
      }, [])
      expect(mcpConfigIndices).toHaveLength(2)
      expect(args[mcpConfigIndices[0] + 1]).toBe('/path/to/mcp1.json')
      expect(args[mcpConfigIndices[1] + 1]).toBe('/path/to/mcp2.json')
    })

    it('adds --strict-mcp-config flag when enabled', () => {
      const settings = makeSettings({
        claude: { strictMcpConfig: true },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--strict-mcp-config')
    })

    it('does not add --strict-mcp-config when disabled', () => {
      const settings = makeSettings({
        claude: { strictMcpConfig: false },
      })
      const args = buildClaudeArgs(settings)
      expect(args).not.toContain('--strict-mcp-config')
    })
  })

  describe('plugin directories', () => {
    it('adds --plugin-dir for each plugin directory', () => {
      const settings = makeSettings({
        claude: { pluginDirs: ['/plugins/a', '/plugins/b'] },
      })
      const args = buildClaudeArgs(settings)
      const pluginDirIndices = args.reduce((acc: number[], arg, i) => {
        if (arg === '--plugin-dir') acc.push(i)
        return acc
      }, [])
      expect(pluginDirIndices).toHaveLength(2)
      expect(args[pluginDirIndices[0] + 1]).toBe('/plugins/a')
      expect(args[pluginDirIndices[1] + 1]).toBe('/plugins/b')
    })
  })

  describe('budget limits', () => {
    it('adds --max-budget-usd when specified', () => {
      const settings = makeSettings({
        claude: { maxBudgetUsd: 5.50 },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--max-budget-usd')
      expect(args).toContain('5.5')
    })

    it('handles zero budget', () => {
      const settings = makeSettings({
        claude: { maxBudgetUsd: 0 },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--max-budget-usd')
      expect(args).toContain('0')
    })
  })

  describe('beta features', () => {
    it('adds --beta for each beta flag', () => {
      const settings = makeSettings({
        claude: { betas: ['feature-x', 'feature-y'] },
      })
      const args = buildClaudeArgs(settings)
      const betaIndices = args.reduce((acc: number[], arg, i) => {
        if (arg === '--beta') acc.push(i)
        return acc
      }, [])
      expect(betaIndices).toHaveLength(2)
      expect(args[betaIndices[0] + 1]).toBe('feature-x')
      expect(args[betaIndices[1] + 1]).toBe('feature-y')
    })
  })

  describe('verbose mode', () => {
    it('adds --verbose flag when enabled', () => {
      const settings = makeSettings({
        claude: { verbose: true },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--verbose')
    })

    it('does not add --verbose when disabled', () => {
      const settings = makeSettings({
        claude: { verbose: false },
      })
      const args = buildClaudeArgs(settings)
      expect(args).not.toContain('--verbose')
    })
  })

  describe('dangerous options', () => {
    it('adds --dangerously-skip-permissions when enabled', () => {
      const settings = makeSettings({
        claude: { dangerouslySkipPermissions: true },
      })
      const args = buildClaudeArgs(settings)
      expect(args).toContain('--dangerously-skip-permissions')
    })

    it('does not add --dangerously-skip-permissions when disabled', () => {
      const settings = makeSettings({
        claude: { dangerouslySkipPermissions: false },
      })
      const args = buildClaudeArgs(settings)
      expect(args).not.toContain('--dangerously-skip-permissions')
    })
  })

  describe('combined settings', () => {
    it('builds correct args for complex configuration', () => {
      const settings = makeSettings({
        claude: {
          model: 'opus',
          agent: 'coder',
          systemPrompt: 'You are a coding assistant',
          permissionMode: 'acceptEdits',
          additionalDirs: ['/project/src'],
          allowedTools: ['Read', 'Write', 'Bash'],
          mcpConfig: ['/mcp/config.json'],
          maxBudgetUsd: 10,
          verbose: true,
        },
      })
      const args = buildClaudeArgs(settings)

      expect(args).toContain('--model')
      expect(args).toContain('opus')
      expect(args).toContain('--agent')
      expect(args).toContain('coder')
      expect(args).toContain('--append-system-prompt')
      expect(args).toContain('You are a coding assistant')
      expect(args).toContain('--permission-mode')
      expect(args).toContain('acceptEdits')
      expect(args).toContain('--add-dir')
      expect(args).toContain('/project/src')
      expect(args).toContain('--allowed-tools')
      expect(args).toContain('Read')
      expect(args).toContain('--mcp-config')
      expect(args).toContain('/mcp/config.json')
      expect(args).toContain('--max-budget-usd')
      expect(args).toContain('10')
      expect(args).toContain('--verbose')
    })
  })
})
