import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.location for isLocalhost checks
const mockLocation = {
  hostname: 'localhost',
  href: 'http://localhost:3001',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import hooks after mocks are set up
import {
  useMediaDirectories,
  useMediaBrowser,
  getMediaUrl,
  formatFileSize,
} from '@/hooks/useMediaLibrary'

import {
  PageBackgroundProvider,
  usePageBackground,
} from '@/hooks/usePageBackground'

import {
  ThemeProvider,
  useTheme,
} from '@/components/ThemeProvider'

import { useTerminalExtension } from '@/hooks/useTerminalExtension'

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMediaLibrary', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('useMediaDirectories', () => {
    it('returns default directories initially', () => {
      const { result } = renderHook(() => useMediaDirectories())

      expect(result.current.directories).toEqual({
        photos: '~/Pictures',
        music: '~/Music',
        videos: '~/Videos',
      })
    })

    it('loads directories from localStorage', async () => {
      localStorageMock.setItem(
        'media-directories',
        JSON.stringify({ photos: '/custom/photos', music: '/custom/music' })
      )

      const { result } = renderHook(() => useMediaDirectories())

      // Wait for useEffect to run
      await waitFor(() => {
        expect(result.current.loaded).toBe(true)
      })

      expect(result.current.directories.photos).toBe('/custom/photos')
      expect(result.current.directories.music).toBe('/custom/music')
      expect(result.current.directories.videos).toBe('~/Videos') // default fallback
    })

    it('sets directories and saves to localStorage', async () => {
      const { result } = renderHook(() => useMediaDirectories())

      await waitFor(() => {
        expect(result.current.loaded).toBe(true)
      })

      act(() => {
        result.current.setDirectories({ photos: '/new/photos' })
      })

      expect(result.current.directories.photos).toBe('/new/photos')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'media-directories',
        expect.stringContaining('/new/photos')
      )
    })

    it('resets to defaults', async () => {
      const { result } = renderHook(() => useMediaDirectories())

      await waitFor(() => {
        expect(result.current.loaded).toBe(true)
      })

      act(() => {
        result.current.setDirectories({ photos: '/custom/path' })
      })

      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.directories).toEqual({
        photos: '~/Pictures',
        music: '~/Music',
        videos: '~/Videos',
      })
    })

    it('handles corrupted localStorage data gracefully', async () => {
      localStorageMock.setItem('media-directories', 'invalid-json{')

      const { result } = renderHook(() => useMediaDirectories())

      await waitFor(() => {
        expect(result.current.loaded).toBe(true)
      })

      expect(result.current.directories).toEqual({
        photos: '~/Pictures',
        music: '~/Music',
        videos: '~/Videos',
      })
    })

    it('sets loaded flag after initialization', async () => {
      const { result } = renderHook(() => useMediaDirectories())

      await waitFor(() => {
        expect(result.current.loaded).toBe(true)
      })
    })
  })

  describe('useMediaBrowser', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('initializes with provided path', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ path: '', files: [], total: 0, hasMore: false }),
      })

      const { result } = renderHook(
        () => useMediaBrowser('/home/user/Pictures'),
        { wrapper: createWrapper() }
      )

      expect(result.current.currentPath).toBe('/home/user/Pictures')
    })

    it('fetches files from API', async () => {
      const mockResponse = {
        path: '/home/user/Pictures',
        files: [
          { name: 'photo.jpg', path: '/home/user/Pictures/photo.jpg', type: 'image', size: 1024, modified: '2024-01-01', extension: 'jpg' },
        ],
        total: 1,
        hasMore: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { result } = renderHook(
        () => useMediaBrowser('/home/user/Pictures', 'image'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.files).toHaveLength(1)
      })

      expect(result.current.files[0].name).toBe('photo.jpg')
      expect(result.current.total).toBe(1)
      expect(result.current.hasMore).toBe(false)
    })

    it('navigates to new path', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ path: '', files: [], total: 0, hasMore: false }),
      })

      const { result } = renderHook(
        () => useMediaBrowser('/home/user/Pictures'),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.setCurrentPath('/home/user/Music')
      })

      expect(result.current.currentPath).toBe('/home/user/Music')
    })

    it('navigates up one directory', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ path: '', files: [], total: 0, hasMore: false }),
      })

      const { result } = renderHook(
        () => useMediaBrowser('/home/user/Pictures/vacation'),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.navigateUp()
      })

      expect(result.current.currentPath).toBe('/home/user/Pictures')
    })

    it('handles API errors', async () => {
      // Mock both initial and retry attempts (retry: 1 in hook config)
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Directory not found' }),
      })

      const { result } = renderHook(
        () => useMediaBrowser('/nonexistent'),
        { wrapper: createWrapper() }
      )

      // Wait for the query to fail after retry
      await waitFor(() => {
        expect(result.current.error).toBe('Directory not found')
      }, { timeout: 3000 })
    })

    it('toggles recursive mode', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ path: '', files: [], total: 0, hasMore: false }),
      })

      const { result } = renderHook(
        () => useMediaBrowser('/home/user/Pictures'),
        { wrapper: createWrapper() }
      )

      expect(result.current.recursive).toBe(false)

      act(() => {
        result.current.setRecursive(true)
      })

      expect(result.current.recursive).toBe(true)
    })
  })

  describe('getMediaUrl', () => {
    it('builds correct URL for file path', () => {
      const url = getMediaUrl('/home/user/Pictures/photo.jpg')
      expect(url).toBe('/api/media/serve?path=%2Fhome%2Fuser%2FPictures%2Fphoto.jpg')
    })

    it('encodes special characters', () => {
      const url = getMediaUrl('/home/user/Pictures/my photo (1).jpg')
      expect(url).toContain(encodeURIComponent('/home/user/Pictures/my photo (1).jpg'))
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(2560)).toBe('2.5 KB')
    })

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB')
      expect(formatFileSize(5242880)).toBe('5.0 MB')
    })

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB')
      expect(formatFileSize(2684354560)).toBe('2.50 GB')
    })
  })
})

describe('usePageBackground', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(PageBackgroundProvider, null, children)

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => usePageBackground())
    }).toThrow('usePageBackground must be used within a PageBackgroundProvider')
  })

  it('returns default settings', () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    expect(result.current.backgroundUrl).toBe('')
    expect(result.current.backgroundType).toBe('none')
    expect(result.current.backgroundOpacity).toBe(20)
    expect(result.current.backgroundStyleOpacity).toBe(100)
  })

  it('loads settings from localStorage', async () => {
    localStorageMock.setItem(
      'page-background',
      JSON.stringify({
        backgroundUrl: 'https://example.com/bg.jpg',
        backgroundType: 'image',
        backgroundOpacity: 50,
        backgroundStyleOpacity: 80,
      })
    )

    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.backgroundUrl).toBe('https://example.com/bg.jpg')
    expect(result.current.backgroundType).toBe('image')
    expect(result.current.backgroundOpacity).toBe(50)
    expect(result.current.backgroundStyleOpacity).toBe(80)
  })

  it('sets background URL', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundUrl('https://example.com/new-bg.jpg')
    })

    expect(result.current.backgroundUrl).toBe('https://example.com/new-bg.jpg')
  })

  it('sets background type', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundType('video')
    })

    expect(result.current.backgroundType).toBe('video')
  })

  it('clamps opacity values to 0-100 range', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundOpacity(150)
    })
    expect(result.current.backgroundOpacity).toBe(100)

    act(() => {
      result.current.setBackgroundOpacity(-10)
    })
    expect(result.current.backgroundOpacity).toBe(0)
  })

  it('clamps style opacity values to 0-100 range', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundStyleOpacity(200)
    })
    expect(result.current.backgroundStyleOpacity).toBe(100)

    act(() => {
      result.current.setBackgroundStyleOpacity(-50)
    })
    expect(result.current.backgroundStyleOpacity).toBe(0)
  })

  it('resets to defaults', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundUrl('https://example.com/bg.jpg')
      result.current.setBackgroundType('image')
      result.current.setBackgroundOpacity(50)
    })

    act(() => {
      result.current.resetToDefaults()
    })

    expect(result.current.backgroundUrl).toBe('')
    expect(result.current.backgroundType).toBe('none')
    expect(result.current.backgroundOpacity).toBe(20)
    expect(result.current.backgroundStyleOpacity).toBe(100)
  })

  it('handles media error', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundUrl('https://example.com/bg.jpg')
      result.current.setBackgroundType('image')
    })

    expect(result.current.mediaError).toBe(false)
    expect(result.current.showMedia).toBe(true)

    act(() => {
      result.current.handleMediaError()
    })

    expect(result.current.mediaError).toBe(true)
    expect(result.current.showMedia).toBe(false)
  })

  it('resets media error when URL changes', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // First set URL and type
    act(() => {
      result.current.setBackgroundUrl('https://example.com/bg.jpg')
      result.current.setBackgroundType('image')
    })

    // Then trigger error
    act(() => {
      result.current.handleMediaError()
    })

    // Verify error is set
    expect(result.current.mediaError).toBe(true)

    // Now change URL - this should reset error via useEffect
    act(() => {
      result.current.setBackgroundUrl('https://example.com/new-bg.jpg')
    })

    // Wait for useEffect to run
    await waitFor(() => {
      expect(result.current.mediaError).toBe(false)
    })
  })

  it('showMedia is false when type is none', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundUrl('https://example.com/bg.jpg')
      result.current.setBackgroundType('none')
    })

    expect(result.current.showMedia).toBe(false)
  })

  it('showMedia is false when URL is empty', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundUrl('')
      result.current.setBackgroundType('image')
    })

    expect(result.current.showMedia).toBe(false)
  })

  it('saves settings to localStorage when changed', async () => {
    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setBackgroundUrl('https://example.com/bg.jpg')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'page-background',
      expect.stringContaining('https://example.com/bg.jpg')
    )
  })

  it('handles invalid localStorage data gracefully', async () => {
    localStorageMock.setItem('page-background', 'not valid json{{{')

    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Should fall back to defaults
    expect(result.current.backgroundUrl).toBe('')
    expect(result.current.backgroundType).toBe('none')
  })

  it('handles partial localStorage data', async () => {
    localStorageMock.setItem(
      'page-background',
      JSON.stringify({
        backgroundUrl: 'https://example.com/bg.jpg',
        // Missing other fields
      })
    )

    const { result } = renderHook(() => usePageBackground(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.backgroundUrl).toBe('https://example.com/bg.jpg')
    expect(result.current.backgroundType).toBe('none') // default
    expect(result.current.backgroundOpacity).toBe(20) // default
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-theme')
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, null, children)

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider')
  })

  it('returns default theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('terminal')
  })

  it('returns all available themes', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.themes).toEqual([
      'terminal', 'amber', 'carbon', 'light', 'ocean',
      'sunset', 'forest', 'midnight', 'neon', 'slate'
    ])
  })

  it('loads theme from localStorage', async () => {
    localStorageMock.setItem('portfolio-theme', 'ocean')

    const { result } = renderHook(() => useTheme(), { wrapper })

    await waitFor(() => {
      expect(result.current.theme).toBe('ocean')
    })
  })

  it('sets theme and saves to localStorage', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    // Wait for mount
    await waitFor(() => {
      expect(result.current.theme).toBe('terminal')
    })

    act(() => {
      result.current.setTheme('midnight')
    })

    expect(result.current.theme).toBe('midnight')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('portfolio-theme', 'midnight')
  })

  it('updates document data-theme attribute', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    // Wait for mount
    await waitFor(() => {
      expect(result.current.theme).toBeDefined()
    })

    act(() => {
      result.current.setTheme('neon')
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('neon')
  })

  it('ignores invalid theme from localStorage', async () => {
    localStorageMock.setItem('portfolio-theme', 'invalid-theme')

    const { result } = renderHook(() => useTheme(), { wrapper })

    await waitFor(() => {
      // Should stay at default since 'invalid-theme' is not in themes array
      expect(result.current.theme).toBe('terminal')
    })
  })
})

describe('useTerminalExtension', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockFetch.mockReset()
    vi.clearAllMocks()
    // Reset to localhost
    mockLocation.hostname = 'localhost'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state before loading', () => {
    // Don't resolve fetch so we can check initial state
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useTerminalExtension())

    expect(result.current.available).toBe(false)
    expect(result.current.authenticated).toBe(false)
    expect(result.current.hasToken).toBe(false)
    expect(result.current.isLoaded).toBe(false)
  })

  it('loads default working directory from localStorage', async () => {
    localStorageMock.setItem('global-working-directory', '/home/user/projects')
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    expect(result.current.defaultWorkDir).toBe('/home/user/projects')
  })

  it('returns ~ as default working directory when not set', () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    expect(result.current.defaultWorkDir).toBe('~')
  })

  it('updates default working directory', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.updateDefaultWorkDir('/home/user/new-projects')
    })

    expect(result.current.defaultWorkDir).toBe('/home/user/new-projects')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'global-working-directory',
      '/home/user/new-projects'
    )
  })

  it('clears API token', async () => {
    localStorageMock.setItem('tabz-api-token', 'test-token')
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.clearApiToken()
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('tabz-api-token')
    expect(result.current.authenticated).toBe(false)
  })

  it('runCommand returns error when no token', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    const spawnResult = await result.current.runCommand('echo test')

    expect(spawnResult.success).toBe(false)
    expect(spawnResult.error).toContain('API token required')
  })

  it('runCommand calls API with token and succeeds', async () => {
    localStorageMock.setItem('tabz-api-token', 'valid-token')

    // Mock init sequence
    mockFetch
      .mockResolvedValueOnce({ // token fetch during init
        ok: true,
        json: () => Promise.resolve({ token: 'valid-token' }),
      })
      .mockResolvedValueOnce({ ok: true }) // health check during init
      .mockResolvedValueOnce({ // token validation during init
        ok: true,
        json: () => Promise.resolve({ token: 'valid-token' }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock spawn call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, terminal: { id: '1', name: 'Terminal' } }),
    })

    const spawnResult = await result.current.runCommand('echo hello')

    expect(spawnResult.success).toBe(true)
    expect(spawnResult.terminal?.id).toBe('1')
  })

  it('handles 401 authentication failure in runCommand', async () => {
    localStorageMock.setItem('tabz-api-token', 'invalid-token')

    // Mock init - fails to get token from backend, uses stored
    mockFetch
      .mockRejectedValueOnce(new Error('Network error')) // token fetch
      .mockResolvedValueOnce({ ok: true }) // health check
      .mockResolvedValueOnce({ // token validation - mismatch
        ok: true,
        json: () => Promise.resolve({ token: 'different-token' }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock spawn - returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    const spawnResult = await result.current.runCommand('echo test')

    expect(spawnResult.success).toBe(false)
    expect(spawnResult.error).toContain('Authentication failed')
  })

  it('handles network errors in runCommand', async () => {
    localStorageMock.setItem('tabz-api-token', 'valid-token')

    // Mock init
    mockFetch
      .mockRejectedValueOnce(new Error('Network error')) // token fetch
      .mockResolvedValueOnce({ ok: true }) // health
      .mockResolvedValueOnce({ // token validation
        ok: true,
        json: () => Promise.resolve({ token: 'valid-token' }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock spawn - network failure
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const spawnResult = await result.current.runCommand('echo test')

    expect(spawnResult.success).toBe(false)
    expect(spawnResult.error).toContain('Cannot connect to TabzChrome')
  })

  it('pasteToTerminal sets autoExecute to false', async () => {
    localStorageMock.setItem('tabz-api-token', 'valid-token')

    // Mock init
    mockFetch
      .mockRejectedValueOnce(new Error('Network error')) // token fetch
      .mockResolvedValueOnce({ ok: true }) // health
      .mockResolvedValueOnce({ // token validation
        ok: true,
        json: () => Promise.resolve({ token: 'valid-token' }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock spawn
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, terminal: { id: '1', name: 'Terminal' } }),
    })

    await result.current.pasteToTerminal('echo hello')

    // Check the last call had autoExecute: false
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
    expect(lastCall[1].body).toContain('"autoExecute":false')
  })

  it('setApiToken validates and stores token on success', async () => {
    // Mock init - no token initially
    mockFetch
      .mockRejectedValueOnce(new Error('Network error')) // token fetch
      .mockResolvedValueOnce({ ok: true }) // health check
      .mockResolvedValueOnce({ // token validation - no token
        ok: true,
        json: () => Promise.resolve({ token: null }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock setApiToken validation - create proper mock responses
    const healthResponse = { ok: true }
    const tokenResponse = {
      ok: true,
      json: () => Promise.resolve({ token: 'new-valid-token' }),
    }

    mockFetch
      .mockResolvedValueOnce(healthResponse) // health during setApiToken
      .mockResolvedValueOnce(tokenResponse) // token validation during setApiToken

    let success: boolean
    await act(async () => {
      success = await result.current.setApiToken('new-valid-token')
    })

    expect(success!).toBe(true)
    expect(result.current.authenticated).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('tabz-api-token', 'new-valid-token')
  })

  it('setApiToken rejects empty token', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    const success = await result.current.setApiToken('')

    expect(success).toBe(false)
  })

  it('setApiToken sanitizes non-ASCII characters', async () => {
    // Mock init
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: null }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock setApiToken validation
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'cleantoken' }),
      })

    // Token with unicode characters that should be stripped
    await result.current.setApiToken('cleantoken\u2019')

    // Should store sanitized version
    expect(localStorageMock.setItem).toHaveBeenCalledWith('tabz-api-token', 'cleantoken')
  })

  it('skips probe from non-localhost sites during init', async () => {
    mockLocation.hostname = 'example.com'
    localStorageMock.setItem('tabz-api-token', 'stored-token')

    mockFetch.mockClear()

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Should not have made any fetch calls from remote site during init
    // (isLocalhost returns false, so fetchTokenFromBackend returns null immediately)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refreshStatus probes backend and returns availability', async () => {
    localStorageMock.setItem('tabz-api-token', 'test-token')

    // Mock init
    mockFetch
      .mockResolvedValueOnce({ // token fetch
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })
      .mockResolvedValueOnce({ ok: true }) // health
      .mockResolvedValueOnce({ // token validation
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Mock refresh
    mockFetch
      .mockResolvedValueOnce({ // token fetch during refresh
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })
      .mockResolvedValueOnce({ ok: true }) // health during refresh
      .mockResolvedValueOnce({ // token validation during refresh
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })

    const available = await result.current.refreshStatus()

    expect(available).toBe(true)
    expect(result.current.authenticated).toBe(true)
  })

  it('detects when backend is not running', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.backendRunning).toBe(false)
    expect(result.current.available).toBe(false)
  })

  it('hasToken reflects token presence', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result: result1 } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result1.current.isLoaded).toBe(true)
    })

    expect(result1.current.hasToken).toBe(false)

    // Now with token
    localStorageMock.setItem('tabz-api-token', 'test-token')

    const { result: result2 } = renderHook(() => useTerminalExtension())

    await waitFor(() => {
      expect(result2.current.isLoaded).toBe(true)
    })

    // hasToken should be true after init loads the stored token
    expect(result2.current.hasToken).toBe(true)
  })
})
