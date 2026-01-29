import { describe, it, expect } from 'vitest'
import { buildGeminiArgs } from '@/lib/ai/gemini'
import type { ChatSettings } from '@/lib/ai/types'

// Helper to create minimal ChatSettings
function makeSettings(overrides: Partial<ChatSettings> = {}): ChatSettings {
  return {
    model: 'gemini',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    ...overrides,
  }
}

describe('buildGeminiArgs', () => {
  describe('minimal settings', () => {
    it('returns empty array when no settings provided', () => {
      const args = buildGeminiArgs()
      expect(args).toEqual([])
    })

    it('returns empty array for minimal settings', () => {
      const settings = makeSettings()
      const args = buildGeminiArgs(settings)
      expect(args).toEqual([])
    })
  })

  describe('model selection', () => {
    it('adds --model from legacy geminiModel', () => {
      const settings = makeSettings({ geminiModel: 'pro-2.5' })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--model')
      expect(args).toContain('pro-2.5')
    })

    it('adds --model from nested gemini.model', () => {
      const settings = makeSettings({
        gemini: { model: 'flash-2.5' },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--model')
      expect(args).toContain('flash-2.5')
    })

    it('prefers nested gemini.model over legacy geminiModel', () => {
      const settings = makeSettings({
        geminiModel: 'legacy-model',
        gemini: { model: 'nested-model' },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--model')
      expect(args).toContain('nested-model')
      expect(args).not.toContain('legacy-model')
    })
  })

  describe('temperature', () => {
    it('does not include temperature by default', () => {
      const args = buildGeminiArgs()
      expect(args).not.toContain('--temperature')
    })

    it('adds --temperature when specified', () => {
      const settings = makeSettings({
        gemini: { temperature: 0.5 },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--temperature')
      expect(args).toContain('0.5')
    })

    it('handles zero temperature', () => {
      const settings = makeSettings({
        gemini: { temperature: 0 },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--temperature')
      expect(args).toContain('0')
    })

    it('handles max temperature (2.0)', () => {
      const settings = makeSettings({
        gemini: { temperature: 2.0 },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--temperature')
      expect(args).toContain('2')
    })
  })

  describe('max output tokens', () => {
    it('does not include max output tokens by default', () => {
      const args = buildGeminiArgs()
      expect(args).not.toContain('--max-output-tokens')
    })

    it('adds --max-output-tokens when specified', () => {
      const settings = makeSettings({
        gemini: { maxOutputTokens: 8192 },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--max-output-tokens')
      expect(args).toContain('8192')
    })

    it('handles zero max output tokens', () => {
      const settings = makeSettings({
        gemini: { maxOutputTokens: 0 },
      })
      const args = buildGeminiArgs(settings)
      // maxOutputTokens: 0 is still a valid value (!== undefined)
      expect(args).toContain('--max-output-tokens')
      expect(args).toContain('0')
    })
  })

  describe('system instruction', () => {
    it('adds --system-instruction from top-level systemPrompt', () => {
      const settings = makeSettings({ systemPrompt: 'You are a helpful assistant' })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--system-instruction')
      expect(args).toContain('You are a helpful assistant')
    })

    it('adds --system-instruction from nested gemini.systemInstruction', () => {
      const settings = makeSettings({
        gemini: { systemInstruction: 'You are a coding assistant' },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--system-instruction')
      expect(args).toContain('You are a coding assistant')
    })

    it('prefers nested gemini.systemInstruction over top-level systemPrompt', () => {
      const settings = makeSettings({
        systemPrompt: 'top-level instruction',
        gemini: { systemInstruction: 'nested instruction' },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--system-instruction')
      expect(args).toContain('nested instruction')
      expect(args).not.toContain('top-level instruction')
    })
  })

  describe('harm block threshold', () => {
    it('does not include harm block threshold by default', () => {
      const args = buildGeminiArgs()
      expect(args).not.toContain('--harm-block-threshold')
    })

    it('adds --harm-block-threshold when specified', () => {
      const settings = makeSettings({
        gemini: { harmBlockThreshold: 'BLOCK_NONE' },
      })
      const args = buildGeminiArgs(settings)
      expect(args).toContain('--harm-block-threshold')
      expect(args).toContain('BLOCK_NONE')
    })

    it('supports all harm block threshold values', () => {
      const thresholds = [
        'BLOCK_NONE',
        'BLOCK_LOW_AND_ABOVE',
        'BLOCK_MEDIUM_AND_ABOVE',
        'BLOCK_HIGH_AND_ABOVE',
      ] as const

      for (const threshold of thresholds) {
        const settings = makeSettings({
          gemini: { harmBlockThreshold: threshold },
        })
        const args = buildGeminiArgs(settings)
        expect(args).toContain('--harm-block-threshold')
        expect(args).toContain(threshold)
      }
    })
  })

  describe('combined settings', () => {
    it('builds correct args for complex configuration', () => {
      const settings = makeSettings({
        gemini: {
          model: 'pro-2.5',
          temperature: 0.8,
          maxOutputTokens: 4096,
          systemInstruction: 'You are an expert programmer',
          harmBlockThreshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      })
      const args = buildGeminiArgs(settings)

      expect(args).toContain('--model')
      expect(args).toContain('pro-2.5')
      expect(args).toContain('--temperature')
      expect(args).toContain('0.8')
      expect(args).toContain('--max-output-tokens')
      expect(args).toContain('4096')
      expect(args).toContain('--system-instruction')
      expect(args).toContain('You are an expert programmer')
      expect(args).toContain('--harm-block-threshold')
      expect(args).toContain('BLOCK_MEDIUM_AND_ABOVE')
    })

    it('maintains correct argument order for flag-value pairs', () => {
      const settings = makeSettings({
        gemini: {
          model: 'flash-2.5',
          temperature: 1.0,
        },
      })
      const args = buildGeminiArgs(settings)

      const modelIndex = args.indexOf('--model')
      expect(modelIndex).toBeGreaterThanOrEqual(0)
      expect(args[modelIndex + 1]).toBe('flash-2.5')

      const tempIndex = args.indexOf('--temperature')
      expect(tempIndex).toBeGreaterThanOrEqual(0)
      expect(args[tempIndex + 1]).toBe('1')
    })
  })

  describe('edge cases', () => {
    it('handles empty gemini settings object', () => {
      const settings = makeSettings({
        gemini: {},
      })
      const args = buildGeminiArgs(settings)
      expect(args).toEqual([])
    })

    it('handles undefined nested settings', () => {
      const settings = makeSettings({
        gemini: undefined,
      })
      const args = buildGeminiArgs(settings)
      expect(args).toEqual([])
    })
  })
})
