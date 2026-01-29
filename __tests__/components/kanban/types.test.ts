import { describe, it, expect } from 'vitest'
import {
  PRIORITY_COLORS,
  AGENT_META,
  AGENT_STATUS_META,
  COLUMN_PRESETS,
  COLUMN_COLORS,
  WORKFLOW_STEP_PRESETS,
} from '@/app/components/kanban/types'
import { BOARD_TEMPLATES } from '@/app/components/kanban/lib/constants'

describe('Kanban Types and Constants', () => {
  describe('PRIORITY_COLORS', () => {
    it('has colors for all priority levels', () => {
      expect(PRIORITY_COLORS).toHaveProperty('low')
      expect(PRIORITY_COLORS).toHaveProperty('medium')
      expect(PRIORITY_COLORS).toHaveProperty('high')
      expect(PRIORITY_COLORS).toHaveProperty('urgent')
    })

    it('all colors are valid Tailwind bg classes', () => {
      Object.values(PRIORITY_COLORS).forEach((color) => {
        expect(color).toMatch(/^bg-[a-z]+-\d+$/)
      })
    })

    it('uses appropriate severity colors', () => {
      expect(PRIORITY_COLORS.low).toBe('bg-slate-500')
      expect(PRIORITY_COLORS.medium).toBe('bg-blue-500')
      expect(PRIORITY_COLORS.high).toBe('bg-orange-500')
      expect(PRIORITY_COLORS.urgent).toBe('bg-red-500')
    })
  })

  describe('AGENT_META', () => {
    const agentTypes = ['claude-code', 'gemini-cli', 'codex', 'copilot', 'amp', 'cursor', 'custom']

    it('has metadata for all agent types', () => {
      agentTypes.forEach((type) => {
        expect(AGENT_META).toHaveProperty(type)
      })
    })

    it('each agent has required display properties', () => {
      Object.values(AGENT_META).forEach((meta) => {
        expect(meta).toHaveProperty('label')
        expect(meta).toHaveProperty('shortLabel')
        expect(meta).toHaveProperty('color')
        expect(meta).toHaveProperty('bgColor')
        expect(meta).toHaveProperty('borderColor')
        expect(meta).toHaveProperty('icon')
      })
    })

    it('claude-code has correct metadata', () => {
      expect(AGENT_META['claude-code'].label).toBe('Claude Code')
      expect(AGENT_META['claude-code'].shortLabel).toBe('Claude')
      expect(AGENT_META['claude-code'].icon).toBe('Sparkles')
    })

    it('colors are Tailwind classes', () => {
      Object.values(AGENT_META).forEach((meta) => {
        expect(meta.color).toMatch(/^text-[a-z]+-\d+$/)
        expect(meta.bgColor).toMatch(/^bg-[a-z]+-\d+\/\d+$/)
        expect(meta.borderColor).toMatch(/^border-[a-z]+-\d+\/\d+$/)
      })
    })
  })

  describe('AGENT_STATUS_META', () => {
    const statusTypes = ['idle', 'running', 'paused', 'completed', 'failed']

    it('has metadata for all status types', () => {
      statusTypes.forEach((status) => {
        expect(AGENT_STATUS_META).toHaveProperty(status)
      })
    })

    it('each status has label and colors', () => {
      Object.values(AGENT_STATUS_META).forEach((meta) => {
        expect(meta).toHaveProperty('label')
        expect(meta).toHaveProperty('color')
        expect(meta).toHaveProperty('bgColor')
      })
    })

    it('has appropriate labels', () => {
      expect(AGENT_STATUS_META.idle.label).toBe('Idle')
      expect(AGENT_STATUS_META.running.label).toBe('Running')
      expect(AGENT_STATUS_META.completed.label).toBe('Completed')
      expect(AGENT_STATUS_META.failed.label).toBe('Failed')
    })
  })

  describe('COLUMN_PRESETS', () => {
    const presetKeys = [
      'ideas',
      'triage',
      'backlog',
      'spec',
      'ready',
      'inProgress',
      'aiWorking',
      'review',
      'qa',
      'done',
      'deployed',
      'blocked',
    ]

    it('has all expected presets', () => {
      presetKeys.forEach((key) => {
        expect(COLUMN_PRESETS).toHaveProperty(key)
      })
    })

    it('each preset has title and color', () => {
      Object.values(COLUMN_PRESETS).forEach((preset) => {
        expect(preset).toHaveProperty('title')
        expect(preset).toHaveProperty('color')
        expect(typeof preset.title).toBe('string')
        expect(preset.color).toMatch(/^border-t-[a-z]+-\d+$/)
      })
    })

    it('common presets have expected titles', () => {
      expect(COLUMN_PRESETS.backlog.title).toBe('Backlog')
      expect(COLUMN_PRESETS.inProgress.title).toBe('In Progress')
      expect(COLUMN_PRESETS.done.title).toBe('Done')
      expect(COLUMN_PRESETS.blocked.title).toBe('Blocked')
    })
  })

  describe('COLUMN_COLORS', () => {
    it('is an array of border-t color classes', () => {
      expect(Array.isArray(COLUMN_COLORS)).toBe(true)
      expect(COLUMN_COLORS.length).toBeGreaterThan(0)
    })

    it('all colors are valid Tailwind border-t classes', () => {
      COLUMN_COLORS.forEach((color) => {
        expect(color).toMatch(/^border-t-[a-z]+-\d+$/)
      })
    })

    it('has a variety of colors', () => {
      const uniqueColors = new Set(COLUMN_COLORS)
      expect(uniqueColors.size).toBe(COLUMN_COLORS.length)
    })
  })

  describe('WORKFLOW_STEP_PRESETS', () => {
    const expectedPresets = ['backlog', 'refine', 'skills', 'worktree', 'code', 'test', 'docs', 'pr', 'done']

    it('has expected workflow step presets', () => {
      expectedPresets.forEach((preset) => {
        expect(WORKFLOW_STEP_PRESETS).toHaveProperty(preset)
      })
    })

    it('each preset has required properties', () => {
      Object.values(WORKFLOW_STEP_PRESETS).forEach((preset) => {
        expect(preset).toHaveProperty('title')
        expect(preset).toHaveProperty('description')
        expect(preset).toHaveProperty('color')
        expect(preset).toHaveProperty('icon')
      })
    })

    it('AI-powered presets have agent and prompt', () => {
      const aiPresets = ['refine', 'skills', 'worktree', 'code', 'test', 'docs', 'pr']
      aiPresets.forEach((presetKey) => {
        const preset = WORKFLOW_STEP_PRESETS[presetKey]
        expect(preset.agent).toBe('claude-code')
        expect(typeof preset.prompt).toBe('string')
        expect(preset.prompt!.length).toBeGreaterThan(0)
      })
    })

    it('non-AI presets do not have agent or prompt', () => {
      const nonAiPresets = ['backlog', 'done']
      nonAiPresets.forEach((presetKey) => {
        const preset = WORKFLOW_STEP_PRESETS[presetKey]
        expect(preset.agent).toBeUndefined()
        expect(preset.prompt).toBeUndefined()
      })
    })
  })

  describe('BOARD_TEMPLATES', () => {
    const templateKeys = ['simple', 'standard', 'feature', 'bugfix', 'fullPipeline', 'docs']

    it('has all expected templates', () => {
      templateKeys.forEach((key) => {
        expect(BOARD_TEMPLATES).toHaveProperty(key)
      })
    })

    it('each template has required properties', () => {
      Object.values(BOARD_TEMPLATES).forEach((template) => {
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('icon')
        expect(template).toHaveProperty('columns')
        expect(Array.isArray(template.columns)).toBe(true)
        expect(template.columns.length).toBeGreaterThan(0)
      })
    })

    it('simple template has 3 columns', () => {
      expect(BOARD_TEMPLATES.simple.columns).toHaveLength(3)
      const titles = BOARD_TEMPLATES.simple.columns.map((c) => c.title)
      expect(titles).toContain('Backlog')
      expect(titles).toContain('In Progress')
      expect(titles).toContain('Done')
    })

    it('standard template has 5 columns with review', () => {
      expect(BOARD_TEMPLATES.standard.columns).toHaveLength(5)
      const titles = BOARD_TEMPLATES.standard.columns.map((c) => c.title)
      expect(titles).toContain('Review')
    })

    it('feature template has AI-powered columns', () => {
      const aiColumns = BOARD_TEMPLATES.feature.columns.filter((c) => c.agent)
      expect(aiColumns.length).toBeGreaterThan(0)
      expect(aiColumns.every((c) => c.agent === 'claude-code')).toBe(true)
    })

    it('columns with agents have agentConfig', () => {
      BOARD_TEMPLATES.feature.columns
        .filter((c) => c.agent)
        .forEach((column) => {
          expect(column.agentConfig).toBeDefined()
          expect(column.agentConfig?.systemPrompt).toBeDefined()
        })
    })

    it('all template columns have title and color', () => {
      Object.values(BOARD_TEMPLATES).forEach((template) => {
        template.columns.forEach((column) => {
          expect(column.title).toBeDefined()
          expect(typeof column.title).toBe('string')
          expect(column.color).toBeDefined()
          expect(column.color).toMatch(/^border-t-[a-z]+-\d+$/)
        })
      })
    })
  })
})
