'use client'

import { useState, useEffect, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'

interface ScrollbarMarkersProps {
  scrollContainerRef: React.RefObject<HTMLElement>
  changes: Map<number, 'added' | 'modified' | 'deleted'>
  totalLines: number
}

const MARKER_COLORS: Record<string, string> = {
  added: 'rgba(34, 197, 94, 0.75)',
  modified: 'rgba(250, 204, 21, 0.75)',
  deleted: 'rgba(239, 68, 68, 0.75)',
}

const MARKER_WIDTH = 8
const MARKER_HEIGHT = 3

/**
 * Portal-based overlay that renders colored markers on the right edge of a scroll
 * container, providing at-a-glance navigation for diffs and code changes.
 *
 * Renders via createPortal to document.body with fixed positioning derived from
 * the scroll container's bounding rect. A ResizeObserver keeps the overlay
 * aligned when the container resizes. Clicking a marker smooth-scrolls the
 * corresponding line into view.
 *
 * Works with any scrollable container that has `data-line` attributes on its
 * line elements (DiffViewer, CodeViewer, etc.).
 */
export function ScrollbarMarkers({
  scrollContainerRef,
  changes,
  totalLines,
}: ScrollbarMarkersProps) {
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  // Track the scroll container's bounding rect for fixed positioning
  useEffect(() => {
    const el = scrollContainerRef?.current
    if (!el) return

    const updateRect = () => {
      setContainerRect(el.getBoundingClientRect())
    }

    updateRect()

    // Re-measure on resize (handles CSS zoom, window resize, layout shifts)
    const observer = new ResizeObserver(updateRect)
    observer.observe(el)

    // Also re-measure on scroll so markers track during scrolling
    el.addEventListener('scroll', updateRect, { passive: true })

    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', updateRect)
    }
  }, [scrollContainerRef])

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const lineNum = e.currentTarget.dataset.markerLine
      if (!lineNum) return
      const container = scrollContainerRef?.current
      if (!container) return
      const target = container.querySelector(`[data-line="${lineNum}"]`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
    [scrollContainerRef],
  )

  // Build sorted marker entries from the changes map
  const markers = useMemo(() => {
    const result: Array<{ line: number; type: 'added' | 'modified' | 'deleted' }> = []
    for (const [lineNum, changeType] of changes) {
      result.push({ line: lineNum, type: changeType })
    }
    return result
  }, [changes])

  if (
    !containerRect ||
    markers.length === 0 ||
    totalLines === 0 ||
    containerRect.height === 0
  ) {
    return null
  }

  return createPortal(
    <div
      className="scrollbar-diff-markers"
      style={{
        position: 'fixed',
        top: containerRect.top,
        left: containerRect.right - MARKER_WIDTH,
        width: MARKER_WIDTH,
        height: containerRect.height,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {markers.map((marker, idx) => {
        const topPx = ((marker.line - 1) / totalLines) * containerRect.height

        return (
          <div
            key={`${marker.type}-${marker.line}-${idx}`}
            data-marker-line={marker.line}
            onClick={handleClick}
            style={{
              position: 'absolute',
              top: topPx,
              left: 0,
              width: MARKER_WIDTH,
              height: MARKER_HEIGHT,
              backgroundColor: MARKER_COLORS[marker.type],
              borderRadius: 1,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            title={`Line ${marker.line} (${marker.type})`}
          />
        )
      })}
    </div>,
    document.body,
  )
}
