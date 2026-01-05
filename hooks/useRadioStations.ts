import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback, useEffect } from "react"

// Types
export interface RadioStation {
  stationuuid: string
  name: string
  url: string
  url_resolved: string
  favicon: string
  tags: string
  country: string
  countrycode: string
  language: string
  codec: string
  bitrate: number
  votes: number
  clickcount: number
  clicktrend: number
  homepage: string
}

export interface RadioTag {
  name: string
  stationcount: number
}

export interface RadioCountry {
  name: string
  iso_3166_1: string
  stationcount: number
}

// Local storage key for favorites
const FAVORITES_KEY = "radio-favorites"

// Get favorites from localStorage
function getFavorites(): RadioStation[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save favorites to localStorage
function saveFavorites(favorites: RadioStation[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
}

// Hook for searching radio stations
export function useRadioSearch(
  query: string,
  options: {
    tag?: string
    country?: string
    limit?: number
    enabled?: boolean
  } = {}
) {
  const { tag, country, limit = 30, enabled = true } = options

  return useQuery({
    queryKey: ["radio-search", query, tag, country, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "search",
        limit: String(limit),
      })
      if (query) params.set("q", query)
      if (tag) params.set("tag", tag)
      if (country) params.set("country", country)

      const response = await fetch(`/api/radio/search?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to search radio stations")
      }

      return response.json() as Promise<{ stations: RadioStation[]; count: number }>
    },
    enabled: enabled && (!!query || !!tag || !!country),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for getting popular stations
export function usePopularStations(limit = 30, enabled = true) {
  return useQuery({
    queryKey: ["radio-popular", limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "topclick",
        limit: String(limit),
      })

      const response = await fetch(`/api/radio/search?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch popular stations")
      }

      return response.json() as Promise<{ stations: RadioStation[]; count: number }>
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook for getting stations by tag/genre
export function useStationsByTag(tag: string, limit = 30, enabled = true) {
  return useQuery({
    queryKey: ["radio-bytag", tag, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "bytag",
        tag,
        limit: String(limit),
      })

      const response = await fetch(`/api/radio/search?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch stations by tag")
      }

      return response.json() as Promise<{ stations: RadioStation[]; count: number }>
    },
    enabled: enabled && !!tag,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for getting available tags/genres
export function useRadioTags(enabled = true) {
  return useQuery({
    queryKey: ["radio-tags"],
    queryFn: async () => {
      const params = new URLSearchParams({ action: "tags" })
      const response = await fetch(`/api/radio/search?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch radio tags")
      }

      return response.json() as Promise<{ items: RadioTag[] }>
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour (tags don't change often)
  })
}

// Hook for getting available countries
export function useRadioCountries(enabled = true) {
  return useQuery({
    queryKey: ["radio-countries"],
    queryFn: async () => {
      const params = new URLSearchParams({ action: "countries" })
      const response = await fetch(`/api/radio/search?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch radio countries")
      }

      return response.json() as Promise<{ items: RadioCountry[] }>
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// Hook for recording station clicks (for popularity tracking)
export function useRecordStationClick() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (stationuuid: string) => {
      const response = await fetch("/api/radio/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationuuid }),
      })

      if (!response.ok) {
        throw new Error("Failed to record station click")
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate popular stations to reflect click
      queryClient.invalidateQueries({ queryKey: ["radio-popular"] })
    },
  })
}

// Hook for managing favorite stations
export function useRadioFavorites() {
  const [favorites, setFavorites] = useState<RadioStation[]>([])

  // Load favorites on mount
  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  const addFavorite = useCallback((station: RadioStation) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.stationuuid === station.stationuuid)
      if (exists) return prev
      const updated = [...prev, station]
      saveFavorites(updated)
      return updated
    })
  }, [])

  const removeFavorite = useCallback((stationuuid: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((s) => s.stationuuid !== stationuuid)
      saveFavorites(updated)
      return updated
    })
  }, [])

  const toggleFavorite = useCallback((station: RadioStation) => {
    const isFavorite = favorites.some((s) => s.stationuuid === station.stationuuid)
    if (isFavorite) {
      removeFavorite(station.stationuuid)
    } else {
      addFavorite(station)
    }
  }, [favorites, addFavorite, removeFavorite])

  const isFavorite = useCallback(
    (stationuuid: string) => {
      return favorites.some((s) => s.stationuuid === stationuuid)
    },
    [favorites]
  )

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  }
}

// Popular genre tags for quick access
export const POPULAR_GENRES = [
  { name: "pop", label: "Pop" },
  { name: "rock", label: "Rock" },
  { name: "jazz", label: "Jazz" },
  { name: "classical", label: "Classical" },
  { name: "electronic", label: "Electronic" },
  { name: "hip hop", label: "Hip Hop" },
  { name: "country", label: "Country" },
  { name: "r&b", label: "R&B" },
  { name: "latin", label: "Latin" },
  { name: "news", label: "News" },
  { name: "talk", label: "Talk" },
  { name: "sports", label: "Sports" },
] as const

// Popular countries for quick access
export const POPULAR_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
] as const
