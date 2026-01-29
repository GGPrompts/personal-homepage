import { describe, it, expect } from 'vitest'
import { buildCodexArgs } from '@/lib/ai/codex'
import type { ChatSettings, CodexSettings } from '@/lib/ai/types'

// Helper to create minimal ChatSettings
function makeSettings(overrides: Partial<ChatSettings> = {}): ChatSettings {
  return {
    model: 'codex',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    ...overrides,
  }
}

describe('buildCodexArgs', () => {
  describe('default values', () => {
    it('returns default args when no settings provided', () => {
      const args = buildCodexArgs()
      expect(args).toContain('-m')
      expect(args).toContain('gpt-5')
      expect(args).toContain('-c')
      expect(args).toContain('model_reasoning_effort="high"')
      expect(args).toContain('--sandbox')
      expect(args).toContain('read-only')
    })

    it('returns default args with empty settings', () => {
      const args = buildCodexArgs({} as ChatSettings)
      expect(args).toContain('-m')
      expect(args).toContain('gpt-5')
      expect(args).toContain('-c')
      expect(args).toContain('model_reasoning_effort="high"')
      expect(args).toContain('--sandbox')
      expect(args).toContain('read-only')
    })
  })

  describe('model selection', () => {
    it('uses model from legacy codexModel', () => {
      const settings = makeSettings({ codexModel: 'gpt-4' })
      const args = buildCodexArgs(settings)
      expect(args).toContain('-m')
      expect(args).toContain('gpt-4')
    })

    it('uses model from nested codex.model', () => {
      const settings = makeSettings({
        codex: { model: 'o3' },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('-m')
      expect(args).toContain('o3')
    })

    it('prefers explicit codexSettings over chatSettings', () => {
      const chatSettings = makeSettings({ codexModel: 'gpt-4' })
      const codexSettings: CodexSettings = { model: 'o3-mini' }
      const args = buildCodexArgs(chatSettings, codexSettings)
      expect(args).toContain('-m')
      expect(args).toContain('o3-mini')
      expect(args).not.toContain('gpt-4')
    })

    it('prefers nested codex.model over legacy codexModel', () => {
      const settings = makeSettings({
        codexModel: 'legacy-model',
        codex: { model: 'nested-model' },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('nested-model')
      expect(args).not.toContain('legacy-model')
    })
  })

  describe('reasoning effort', () => {
    it('uses default high reasoning effort', () => {
      const args = buildCodexArgs()
      expect(args).toContain('-c')
      expect(args).toContain('model_reasoning_effort="high"')
    })

    it('uses reasoning effort from legacy reasoningEffort', () => {
      const settings = makeSettings({ reasoningEffort: 'low' })
      const args = buildCodexArgs(settings)
      expect(args).toContain('-c')
      expect(args).toContain('model_reasoning_effort="low"')
    })

    it('uses reasoning effort from nested codex.reasoningEffort', () => {
      const settings = makeSettings({
        codex: { reasoningEffort: 'medium' },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('-c')
      expect(args).toContain('model_reasoning_effort="medium"')
    })

    it('prefers nested codex.reasoningEffort over legacy', () => {
      const settings = makeSettings({
        reasoningEffort: 'low',
        codex: { reasoningEffort: 'high' },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('model_reasoning_effort="high"')
      expect(args).not.toContain('model_reasoning_effort="low"')
    })
  })

  describe('sandbox mode', () => {
    it('uses default read-only sandbox', () => {
      const args = buildCodexArgs()
      expect(args).toContain('--sandbox')
      expect(args).toContain('read-only')
    })

    it('uses sandbox from legacy sandbox setting', () => {
      const settings = makeSettings({ sandbox: 'full' })
      const args = buildCodexArgs(settings)
      expect(args).toContain('--sandbox')
      expect(args).toContain('full')
    })

    it('uses sandbox from nested codex.sandbox', () => {
      const settings = makeSettings({
        codex: { sandbox: 'off' },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('--sandbox')
      expect(args).toContain('off')
    })

    it('prefers nested codex.sandbox over legacy', () => {
      const settings = makeSettings({
        sandbox: 'read-only',
        codex: { sandbox: 'full' },
      })
      const args = buildCodexArgs(settings)
      const sandboxIndex = args.indexOf('--sandbox')
      expect(args[sandboxIndex + 1]).toBe('full')
    })
  })

  describe('approval mode', () => {
    it('does not include approval mode by default', () => {
      const args = buildCodexArgs()
      expect(args).not.toContain('--approval-mode')
    })

    it('adds --approval-mode when specified', () => {
      const settings = makeSettings({
        codex: { approvalMode: 'always' },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('--approval-mode')
      expect(args).toContain('always')
    })

    it('supports all approval modes', () => {
      for (const mode of ['always', 'never', 'dangerous'] as const) {
        const settings = makeSettings({
          codex: { approvalMode: mode },
        })
        const args = buildCodexArgs(settings)
        expect(args).toContain('--approval-mode')
        expect(args).toContain(mode)
      }
    })
  })

  describe('max tokens', () => {
    it('does not include max tokens by default', () => {
      const args = buildCodexArgs()
      expect(args).not.toContain('--max-tokens')
    })

    it('adds --max-tokens when specified', () => {
      const settings = makeSettings({
        codex: { maxTokens: 8192 },
      })
      const args = buildCodexArgs(settings)
      expect(args).toContain('--max-tokens')
      expect(args).toContain('8192')
    })

    it('handles zero max tokens', () => {
      const settings = makeSettings({
        codex: { maxTokens: 0 },
      })
      const args = buildCodexArgs(settings)
      // maxTokens: 0 is falsy, so it won't be added
      expect(args).not.toContain('--max-tokens')
    })
  })

  describe('explicit codexSettings parameter', () => {
    it('prefers codexSettings parameter over chatSettings', () => {
      const chatSettings = makeSettings({
        codex: { model: 'from-chat', reasoningEffort: 'low' },
      })
      const codexSettings: CodexSettings = {
        model: 'from-explicit',
        reasoningEffort: 'high',
        sandbox: 'full',
      }
      const args = buildCodexArgs(chatSettings, codexSettings)
      expect(args).toContain('from-explicit')
      expect(args).not.toContain('from-chat')
      expect(args).toContain('model_reasoning_effort="high"')
      expect(args).toContain('full')
    })
  })

  describe('combined settings', () => {
    it('builds correct args for complex configuration', () => {
      const settings = makeSettings({
        codex: {
          model: 'o3',
          reasoningEffort: 'medium',
          sandbox: 'full',
          approvalMode: 'dangerous',
          maxTokens: 16384,
        },
      })
      const args = buildCodexArgs(settings)

      expect(args).toContain('-m')
      expect(args).toContain('o3')
      expect(args).toContain('-c')
      expect(args).toContain('model_reasoning_effort="medium"')
      expect(args).toContain('--sandbox')
      expect(args).toContain('full')
      expect(args).toContain('--approval-mode')
      expect(args).toContain('dangerous')
      expect(args).toContain('--max-tokens')
      expect(args).toContain('16384')
    })
  })
})
