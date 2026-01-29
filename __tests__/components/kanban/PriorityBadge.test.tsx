import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '@/app/components/kanban/shared/PriorityBadge'

describe('PriorityBadge', () => {
  describe('rendering', () => {
    it('renders the priority text', () => {
      render(<PriorityBadge priority="medium" />)
      expect(screen.getByText('medium')).toBeInTheDocument()
    })

    it('renders all priority levels', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'] as const

      priorities.forEach((priority) => {
        const { unmount } = render(<PriorityBadge priority={priority} />)
        expect(screen.getByText(priority)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('color classes', () => {
    it('applies correct color for low priority', () => {
      render(<PriorityBadge priority="low" />)
      const badge = screen.getByText('low')
      expect(badge).toHaveClass('bg-slate-500')
    })

    it('applies correct color for medium priority', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('bg-blue-500')
    })

    it('applies correct color for high priority', () => {
      render(<PriorityBadge priority="high" />)
      const badge = screen.getByText('high')
      expect(badge).toHaveClass('bg-orange-500')
    })

    it('applies correct color for urgent priority', () => {
      render(<PriorityBadge priority="urgent" />)
      const badge = screen.getByText('urgent')
      expect(badge).toHaveClass('bg-red-500')
    })
  })

  describe('size variants', () => {
    it('applies small size classes by default', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('px-1.5')
      expect(badge).toHaveClass('py-0.5')
      expect(badge).toHaveClass('text-[10px]')
    })

    it('applies small size classes when size="sm"', () => {
      render(<PriorityBadge priority="medium" size="sm" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('px-1.5')
      expect(badge).toHaveClass('py-0.5')
      expect(badge).toHaveClass('text-[10px]')
    })

    it('applies medium size classes when size="md"', () => {
      render(<PriorityBadge priority="medium" size="md" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-1')
      expect(badge).toHaveClass('text-xs')
    })
  })

  describe('base styling', () => {
    it('has white text color', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('text-white')
    })

    it('has uppercase text', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('uppercase')
    })

    it('is an inline-flex element', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('inline-flex')
    })

    it('has rounded corners', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('rounded')
    })
  })

  describe('custom className', () => {
    it('accepts additional className', () => {
      render(<PriorityBadge priority="medium" className="custom-class" />)
      const badge = screen.getByText('medium')
      expect(badge).toHaveClass('custom-class')
    })

    it('merges custom className with base classes', () => {
      render(<PriorityBadge priority="high" className="ml-2" />)
      const badge = screen.getByText('high')
      expect(badge).toHaveClass('ml-2')
      expect(badge).toHaveClass('bg-orange-500')
      expect(badge).toHaveClass('uppercase')
    })
  })

  describe('accessibility', () => {
    it('renders as a span element', () => {
      render(<PriorityBadge priority="medium" />)
      const badge = screen.getByText('medium')
      expect(badge.tagName).toBe('SPAN')
    })
  })
})
