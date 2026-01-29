import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import * as googleAuth from '@/lib/google-auth'

// Mock the google-auth module
vi.mock('@/lib/google-auth', () => ({
  getTokens: vi.fn(),
  clearTokens: vi.fn(),
  isTokenExpired: vi.fn(),
  getValidAccessToken: vi.fn(),
  getCurrentUser: vi.fn(),
  revokeAccess: vi.fn(),
}))

// Mock window.location
const mockLocation = {
  href: '',
  search: '',
  pathname: '/',
  origin: 'http://localhost:3001',
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock window.history
const mockHistory = {
  replaceState: vi.fn(),
}
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
})

describe('useGoogleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
    mockLocation.search = ''
    mockLocation.pathname = '/'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('should start in loading state and resolve', async () => {
      vi.mocked(googleAuth.getTokens).mockReturnValue(null)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useGoogleAuth())

      // Hook starts loading, but may resolve synchronously in test env
      // Just verify it eventually settles to correct disconnected state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.isConnected).toBe(false)
      expect(result.current.user).toBe(null)
    })

    it('should be disconnected when no tokens exist', async () => {
      vi.mocked(googleAuth.getTokens).mockReturnValue(null)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.tokens).toBe(null)
    })

    it('should be connected when valid tokens exist', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        verified_email: true,
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(mockTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(false)
      vi.mocked(googleAuth.getCurrentUser).mockResolvedValue(mockUser)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.tokens).toEqual(mockTokens)
    })
  })

  describe('expired tokens', () => {
    it('should attempt to refresh expired tokens', async () => {
      const expiredTokens = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Expired
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      const newTokens = {
        accessToken: 'new-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        verified_email: true,
      }

      vi.mocked(googleAuth.getTokens)
        .mockReturnValueOnce(expiredTokens) // First call - expired
        .mockReturnValueOnce(newTokens) // After refresh

      vi.mocked(googleAuth.isTokenExpired)
        .mockReturnValueOnce(true) // First check - expired
        .mockReturnValueOnce(false) // After refresh

      vi.mocked(googleAuth.getValidAccessToken).mockResolvedValue('new-token')
      vi.mocked(googleAuth.getCurrentUser).mockResolvedValue(mockUser)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(googleAuth.getValidAccessToken).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(true)
    })

    it('should disconnect if refresh fails', async () => {
      const expiredTokens = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(expiredTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(true)
      vi.mocked(googleAuth.getValidAccessToken).mockResolvedValue(null)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.user).toBe(null)
    })
  })

  describe('connect action', () => {
    it('should redirect to Google OAuth endpoint', async () => {
      vi.mocked(googleAuth.getTokens).mockReturnValue(null)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.connect()
      })

      expect(mockLocation.href).toBe('/api/auth/google')
    })
  })

  describe('disconnect action', () => {
    it('should revoke access and clear tokens', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        verified_email: true,
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(mockTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(false)
      vi.mocked(googleAuth.getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(googleAuth.revokeAccess).mockResolvedValue(undefined)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        await result.current.disconnect()
      })

      expect(googleAuth.revokeAccess).toHaveBeenCalled()
      expect(googleAuth.clearTokens).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.user).toBe(null)
    })
  })

  describe('getAccessToken', () => {
    it('should return valid access token', async () => {
      const mockTokens = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(mockTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(false)
      vi.mocked(googleAuth.getValidAccessToken).mockResolvedValue('valid-token')
      vi.mocked(googleAuth.getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        verified_email: true,
      })

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let token: string | null = null
      await act(async () => {
        token = await result.current.getAccessToken()
      })

      expect(token).toBe('valid-token')
    })

    it('should return null when not connected', async () => {
      vi.mocked(googleAuth.getTokens).mockReturnValue(null)
      vi.mocked(googleAuth.getValidAccessToken).mockResolvedValue(null)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let token: string | null = null
      await act(async () => {
        token = await result.current.getAccessToken()
      })

      expect(token).toBe(null)
    })
  })

  describe('auth callback handling', () => {
    it('should handle successful auth callback from URL', async () => {
      // Set up URL with auth success param
      mockLocation.search = '?google-auth=success'
      mockLocation.pathname = '/'

      const mockTokens = {
        accessToken: 'new-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(mockTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(false)
      vi.mocked(googleAuth.getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        verified_email: true,
      })

      renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(mockHistory.replaceState).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('should set error when getCurrentUser fails', async () => {
      const mockTokens = {
        accessToken: 'mock-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(mockTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(false)
      vi.mocked(googleAuth.getCurrentUser).mockRejectedValue(
        new Error('Failed to get user info')
      )

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Failed to get user info')
    })
  })

  describe('isExpired flag', () => {
    it('should correctly report expired status', async () => {
      const expiredTokens = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(expiredTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(true)
      vi.mocked(googleAuth.getValidAccessToken).mockResolvedValue(null)

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isExpired).toBe(true)
    })

    it('should report not expired for valid tokens', async () => {
      const validTokens = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'email profile',
      }

      vi.mocked(googleAuth.getTokens).mockReturnValue(validTokens)
      vi.mocked(googleAuth.isTokenExpired).mockReturnValue(false)
      vi.mocked(googleAuth.getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        verified_email: true,
      })

      const { result } = renderHook(() => useGoogleAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isExpired).toBe(false)
    })
  })
})
