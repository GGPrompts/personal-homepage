"use client"

import * as React from "react"
import { useAIDrawerSafe, DRAWER_WIDTH_VALUES, MINIMIZED_WIDTH } from "./AIDrawerProvider"

interface AILayoutWrapperProps {
  children: React.ReactNode
}

// Breakpoint for lg screens (1024px) - matches Tailwind's default
const LG_BREAKPOINT = 1024

/**
 * Wrapper component that handles the push layout for the AI Drawer.
 * On desktop (lg+), the main content area shrinks to make room for the drawer.
 * On mobile (<lg), the drawer overlays the content as before.
 */
export function AILayoutWrapper({ children }: AILayoutWrapperProps) {
  const context = useAIDrawerSafe()

  // Track whether component has mounted (for hydration-safe rendering)
  const [mounted, setMounted] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)

  // Track screen size for responsive behavior
  React.useEffect(() => {
    setMounted(true)

    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= LG_BREAKPOINT)
    }

    // Check on mount
    checkScreenSize()

    // Listen for resize events
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // Calculate drawer width based on state
  const drawerWidth = React.useMemo(() => {
    if (!context) return 0
    if (context.state === "collapsed") return 0
    if (context.state === "minimized") return MINIMIZED_WIDTH
    return DRAWER_WIDTH_VALUES[context.drawerWidth]
  }, [context])

  // CSS variable for the drawer width - used by other components if needed
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--ai-drawer-width',
      `${drawerWidth}px`
    )
  }, [drawerWidth])

  // Only apply margin on desktop after mount; on mobile or during SSR, no margin
  // This prevents hydration mismatch
  const marginRight = mounted && isDesktop ? drawerWidth : 0

  return (
    <div
      className="ai-layout-wrapper min-h-screen"
      data-drawer-open={context?.isOpen ? "true" : "false"}
      data-drawer-state={context?.state || "collapsed"}
    >
      {/* Main content area that responds to drawer state on desktop */}
      <div
        className="ai-layout-content transition-[margin-right] duration-300 ease-out"
        style={{ marginRight }}
      >
        {children}
      </div>
    </div>
  )
}

export default AILayoutWrapper
