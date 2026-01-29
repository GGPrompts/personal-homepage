import '@testing-library/dom'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock ResizeObserver for components that use it (e.g., Radix ScrollArea)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Cleanup after each test case
afterEach(() => {
  cleanup()
})
