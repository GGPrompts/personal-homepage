"use client"

import { useEffect } from "react"

/**
 * Redirects localhost to 127.0.0.1 for Spotify OAuth compatibility
 * Spotify requires 127.0.0.1 for loopback redirect URIs
 */
export function LocalhostRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      const newUrl = window.location.href.replace("localhost", "127.0.0.1")
      window.location.replace(newUrl)
    }
  }, [])

  return null
}
