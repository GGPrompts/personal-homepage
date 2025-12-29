'use client'

import React from 'react'
import { useBackground } from './BackgroundProvider'
import { usePageBackground } from '@/hooks/usePageBackground'

export function MasterBackground() {
  const { background } = useBackground()
  const {
    backgroundUrl,
    backgroundType,
    backgroundOpacity,
    showMedia,
    handleMediaError,
  } = usePageBackground()

  const mediaOpacity = backgroundOpacity / 100

  // Map background type to CSS class
  const bgClass = {
    gradient: 'bg-style-gradient',
    mesh: 'bg-style-mesh',
    textured: 'bg-style-textured',
    minimal: 'bg-style-minimal',
    none: null
  }[background]

  return (
    <>
      {/* Base gradient/mesh/textured background */}
      {bgClass && <div className={bgClass} aria-hidden="true" />}

      {/* Custom media background (image/video) */}
      {showMedia && backgroundType === 'image' && (
        <img
          className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
          style={{ opacity: mediaOpacity }}
          src={backgroundUrl}
          alt=""
          onError={handleMediaError}
        />
      )}
      {showMedia && backgroundType === 'video' && (
        <video
          className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
          style={{ opacity: mediaOpacity }}
          src={backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={handleMediaError}
        />
      )}
    </>
  )
}
