import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateState,
  getClientId,
  setClientId,
  getRedirectUri,
  saveTokens,
  getTokens,
  clearTokens,
  isTokenExpired,
  getConnectionStatus,
  isConnected,
  GOOGLE_SCOPES,
  type GoogleTokens,
} from '@/lib/google-auth'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3001',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('google-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GOOGLE_SCOPES', () => {
    it('should include Gmail scopes', () => {
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/gmail.readonly')
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/gmail.send')
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/gmail.modify')
    })

    it('should include Calendar scopes', () => {
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.readonly')
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events')
    })

    it('should include user profile scopes', () => {
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/userinfo.email')
      expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/userinfo.profile')
    })
  })

  describe('generateState', () => {
    it('should generate a 64-character hex string', () => {
      const state = generateState()
      expect(state).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should generate unique states', () => {
      const state1 = generateState()
      const state2 = generateState()
      expect(state1).not.toBe(state2)
    })
  })

  describe('getClientId / setClientId', () => {
    it('should return null when no client ID is set', () => {
      expect(getClientId()).toBe(null)
    })

    it('should store and retrieve client ID from localStorage', () => {
      setClientId('test-client-id')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('google-client-id', 'test-client-id')
    })
  })

  describe('getRedirectUri', () => {
    it('should construct redirect URI from window.location.origin', () => {
      const uri = getRedirectUri()
      expect(uri).toBe('http://localhost:3001/api/auth/google/callback')
    })
  })

  describe('Token Management', () => {
    const mockTokens: GoogleTokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
      scope: 'email profile',
    }

    describe('saveTokens / getTokens', () => {
      it('should save tokens to localStorage', () => {
        saveTokens(mockTokens)
        expect(localStorageMock.setItem).toHaveBeenCalled()

        // The first argument should be the storage key
        const callArgs = localStorageMock.setItem.mock.calls[0]
        expect(callArgs[0]).toBe('google-tokens')

        // The value should be encoded
        expect(callArgs[1]).toMatch(/^enc:/)
      })

      it('should retrieve null when no tokens exist', () => {
        expect(getTokens()).toBe(null)
      })

      it('should encode tokens for storage', () => {
        saveTokens(mockTokens)
        const storedValue = localStorageMock.setItem.mock.calls[0][1]
        expect(storedValue.startsWith('enc:')).toBe(true)
      })
    })

    describe('clearTokens', () => {
      it('should remove tokens from localStorage', () => {
        clearTokens()
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('google-tokens')
      })
    })
  })

  describe('isTokenExpired', () => {
    it('should return true for null tokens', () => {
      expect(isTokenExpired(null)).toBe(true)
    })

    it('should return true for expired tokens', () => {
      const expiredTokens: GoogleTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        tokenType: 'Bearer',
        scope: 'email',
      }
      expect(isTokenExpired(expiredTokens)).toBe(true)
    })

    it('should return true for tokens expiring within 5 minutes', () => {
      const soonExpiring: GoogleTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + (4 * 60 * 1000), // Expires in 4 minutes
        tokenType: 'Bearer',
        scope: 'email',
      }
      expect(isTokenExpired(soonExpiring)).toBe(true)
    })

    it('should return false for valid tokens with more than 5 minutes remaining', () => {
      const validTokens: GoogleTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + (10 * 60 * 1000), // Expires in 10 minutes
        tokenType: 'Bearer',
        scope: 'email',
      }
      expect(isTokenExpired(validTokens)).toBe(false)
    })
  })

  describe('getConnectionStatus', () => {
    it('should return disconnected status when no tokens', () => {
      const status = getConnectionStatus()
      expect(status).toEqual({
        connected: false,
        hasTokens: false,
        expired: false,
      })
    })
  })

  describe('isConnected', () => {
    it('should return false when no tokens exist', () => {
      expect(isConnected()).toBe(false)
    })
  })
})
