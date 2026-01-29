"use client"

import { useState, useEffect, useCallback } from "react"

export interface FileViewerSettings {
  fontSize: number
  fontFamily: string
  maxDepth: number
}

const STORAGE_KEY = "file-viewer-settings"

const DEFAULT_SETTINGS: FileViewerSettings = {
  fontSize: 16,
  fontFamily: "JetBrains Mono",
  maxDepth: 5,
}

export function useFileViewerSettings() {
  const [settings, setSettings] = useState<FileViewerSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<FileViewerSettings>
        setSettings({
          fontSize: parsed.fontSize ?? DEFAULT_SETTINGS.fontSize,
          fontFamily: parsed.fontFamily ?? DEFAULT_SETTINGS.fontFamily,
          maxDepth: parsed.maxDepth ?? DEFAULT_SETTINGS.maxDepth,
        })
      }
    } catch (error) {
      console.error("Failed to load file viewer settings:", error)
    }
    setLoaded(true)
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error("Failed to save file viewer settings:", error)
      }
    }
  }, [settings, loaded])

  const setFontSize = useCallback((fontSize: number) => {
    setSettings(prev => ({ ...prev, fontSize }))
  }, [])

  const setFontFamily = useCallback((fontFamily: string) => {
    setSettings(prev => ({ ...prev, fontFamily }))
  }, [])

  const setMaxDepth = useCallback((maxDepth: number) => {
    setSettings(prev => ({ ...prev, maxDepth }))
  }, [])

  return {
    settings,
    loaded,
    setFontSize,
    setFontFamily,
    setMaxDepth,
  }
}
