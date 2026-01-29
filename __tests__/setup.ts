import '@testing-library/dom'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock ResizeObserver for components that use it (e.g., Radix ScrollArea)
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as any

// Cleanup after each test case
afterEach(() => {
  cleanup()
})
