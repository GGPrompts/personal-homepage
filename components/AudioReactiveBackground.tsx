"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import type { AudioVisualizerData } from "@/hooks/useAudioVisualizer"

export type VisualizerStyle =
  | "pulse"           // Glassmorphism blur/glow pulses with bass
  | "gradient-shift"  // Background gradient hue shifts with frequency
  | "particles"       // Particles react to beats
  | "waveform"        // Waveform overlay
  | "bars"            // Classic frequency bars
  | "radial"          // Circular visualizer
  | "none"            // Disabled

export interface AudioReactiveBackgroundProps {
  data: AudioVisualizerData
  style?: VisualizerStyle
  intensity?: number    // 0-1, how reactive the visualization is
  opacity?: number      // 0-1, base opacity of the visualization
  className?: string
}

export function AudioReactiveBackground({
  data,
  style = "pulse",
  intensity = 0.7,
  opacity = 0.5,
  className = "",
}: AudioReactiveBackgroundProps) {
  // Extract computed values from data
  const { bass, mid, treble, overall, peak, frequencyData, timeDomainData, isActive } = data

  // Render different visualization styles
  if (style === "none") return null

  if (style === "pulse") {
    return (
      <PulseVisualization
        bass={bass}
        mid={mid}
        treble={treble}
        overall={overall}
        intensity={intensity}
        opacity={opacity}
        isActive={isActive}
        className={className}
      />
    )
  }

  if (style === "gradient-shift") {
    return (
      <GradientShiftVisualization
        bass={bass}
        mid={mid}
        treble={treble}
        intensity={intensity}
        opacity={opacity}
        isActive={isActive}
        className={className}
      />
    )
  }

  if (style === "bars") {
    return (
      <BarsVisualization
        frequencyData={frequencyData}
        intensity={intensity}
        opacity={opacity}
        isActive={isActive}
        className={className}
      />
    )
  }

  if (style === "waveform") {
    return (
      <WaveformVisualization
        timeDomainData={timeDomainData}
        intensity={intensity}
        opacity={opacity}
        isActive={isActive}
        className={className}
      />
    )
  }

  if (style === "radial") {
    return (
      <RadialVisualization
        frequencyData={frequencyData}
        bass={bass}
        intensity={intensity}
        opacity={opacity}
        isActive={isActive}
        className={className}
      />
    )
  }

  if (style === "particles") {
    return (
      <ParticlesVisualization
        bass={bass}
        mid={mid}
        treble={treble}
        peak={peak}
        intensity={intensity}
        opacity={opacity}
        isActive={isActive}
        className={className}
      />
    )
  }

  return null
}

// Pulse visualization - glassmorphism effects react to audio
function PulseVisualization({
  bass,
  mid,
  treble,
  overall,
  intensity,
  opacity,
  isActive,
  className,
}: {
  bass: number
  mid: number
  treble: number
  overall: number
  intensity: number
  opacity: number
  isActive: boolean
  className: string
}) {
  const baseBlur = 100
  const blurAmount = baseBlur + bass * intensity * 50

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-300 ${className}`}
      style={{ opacity: isActive ? opacity : 0 }}
    >
      {/* Bass-reactive glow orb - bottom left */}
      <motion.div
        className="absolute w-96 h-96 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / ${0.3 + bass * intensity * 0.4}) 0%, transparent 70%)`,
          filter: `blur(${blurAmount}px)`,
          left: "10%",
          bottom: "20%",
        }}
        animate={{
          scale: 1 + bass * intensity * 0.3,
          opacity: 0.3 + bass * intensity * 0.5,
        }}
        transition={{ type: "spring", damping: 10, stiffness: 100 }}
      />

      {/* Mid-reactive glow orb - top right */}
      <motion.div
        className="absolute w-80 h-80 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(280 70% 50% / ${0.2 + mid * intensity * 0.3}) 0%, transparent 70%)`,
          filter: `blur(${baseBlur + mid * intensity * 40}px)`,
          right: "15%",
          top: "15%",
        }}
        animate={{
          scale: 1 + mid * intensity * 0.25,
          opacity: 0.2 + mid * intensity * 0.4,
        }}
        transition={{ type: "spring", damping: 12, stiffness: 80 }}
      />

      {/* Treble-reactive glow orb - center */}
      <motion.div
        className="absolute w-64 h-64 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(200 70% 50% / ${0.15 + treble * intensity * 0.25}) 0%, transparent 70%)`,
          filter: `blur(${baseBlur + treble * intensity * 30}px)`,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: 1 + treble * intensity * 0.2,
          opacity: 0.15 + treble * intensity * 0.3,
        }}
        transition={{ type: "spring", damping: 15, stiffness: 120 }}
      />

      {/* Overall vignette pulse */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, transparent 30%, hsl(var(--background) / ${0.3 + overall * intensity * 0.2}) 100%)`,
          transition: "background 0.1s ease-out",
        }}
      />
    </div>
  )
}

// Gradient shift visualization - hue shifts with frequency
function GradientShiftVisualization({
  bass,
  mid,
  treble,
  intensity,
  opacity,
  isActive,
  className,
}: {
  bass: number
  mid: number
  treble: number
  intensity: number
  opacity: number
  isActive: boolean
  className: string
}) {
  // Map frequencies to hue shifts
  const hueShift = bass * intensity * 30 + mid * intensity * 20
  const saturation = 50 + treble * intensity * 30
  const lightness = 40 + mid * intensity * 15

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-300 ${className}`}
      style={{ opacity: isActive ? opacity : 0 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            ${135 + hueShift}deg,
            hsl(${160 + hueShift} ${saturation}% ${lightness}% / 0.3) 0%,
            hsl(${220 + hueShift} ${saturation}% ${lightness - 10}% / 0.2) 50%,
            hsl(${280 + hueShift} ${saturation}% ${lightness}% / 0.3) 100%
          )`,
          transition: "background 0.15s ease-out",
        }}
      />
    </div>
  )
}

// Bars visualization - classic frequency bars
function BarsVisualization({
  frequencyData,
  intensity,
  opacity,
  isActive,
  className,
}: {
  frequencyData: Uint8Array
  intensity: number
  opacity: number
  isActive: boolean
  className: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw bars
    const barCount = Math.min(64, frequencyData.length)
    const barWidth = rect.width / barCount
    const gap = 2

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] / 255
      const barHeight = value * rect.height * intensity * 0.8

      // Gradient color based on frequency
      const hue = 160 + (i / barCount) * 80 // Cyan to purple
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${0.4 + value * 0.4})`

      ctx.fillRect(
        i * barWidth + gap / 2,
        rect.height - barHeight,
        barWidth - gap,
        barHeight
      )
    }
  }, [frequencyData, intensity, isActive])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-300 ${className}`}
      style={{
        opacity: isActive ? opacity : 0,
        width: "100%",
        height: "100%",
      }}
    />
  )
}

// Waveform visualization - oscilloscope-style display
function WaveformVisualization({
  timeDomainData,
  intensity,
  opacity,
  isActive,
  className,
}: {
  timeDomainData: Uint8Array
  intensity: number
  opacity: number
  isActive: boolean
  className: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw waveform
    ctx.strokeStyle = `hsla(var(--primary), ${0.5 + intensity * 0.3})`
    ctx.lineWidth = 2 * intensity
    ctx.beginPath()

    const sliceWidth = rect.width / timeDomainData.length

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i] / 128.0
      const y = (v * rect.height) / 2

      if (i === 0) {
        ctx.moveTo(0, y)
      } else {
        ctx.lineTo(i * sliceWidth, y)
      }
    }

    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = "hsl(var(--primary))"
    ctx.shadowBlur = 10 * intensity
    ctx.stroke()
  }, [timeDomainData, intensity, isActive])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-300 ${className}`}
      style={{
        opacity: isActive ? opacity : 0,
        width: "100%",
        height: "100%",
      }}
    />
  )
}

// Radial visualization - circular frequency display
function RadialVisualization({
  frequencyData,
  bass,
  intensity,
  opacity,
  isActive,
  className,
}: {
  frequencyData: Uint8Array
  bass: number
  intensity: number
  opacity: number
  isActive: boolean
  className: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.clearRect(0, 0, rect.width, rect.height)

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const baseRadius = Math.min(centerX, centerY) * 0.3
    const maxRadius = baseRadius + bass * intensity * 100

    // Draw radial bars
    const barCount = Math.min(64, frequencyData.length)
    const angleStep = (Math.PI * 2) / barCount

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] / 255
      const angle = i * angleStep - Math.PI / 2
      const barLength = value * baseRadius * intensity * 1.5

      const x1 = centerX + Math.cos(angle) * maxRadius
      const y1 = centerY + Math.sin(angle) * maxRadius
      const x2 = centerX + Math.cos(angle) * (maxRadius + barLength)
      const y2 = centerY + Math.sin(angle) * (maxRadius + barLength)

      const hue = 160 + (i / barCount) * 80
      ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${0.4 + value * 0.5})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    // Center glow circle
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    )
    gradient.addColorStop(0, `hsla(var(--primary), ${0.2 + bass * intensity * 0.3})`)
    gradient.addColorStop(1, "transparent")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2)
    ctx.fill()
  }, [frequencyData, bass, intensity, isActive])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-300 ${className}`}
      style={{
        opacity: isActive ? opacity : 0,
        width: "100%",
        height: "100%",
      }}
    />
  )
}

// Particle type for particles visualization
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  life: number
  maxLife: number
}

// Particles visualization - particles react to beats
function ParticlesVisualization({
  bass,
  mid,
  treble,
  peak,
  intensity,
  opacity,
  isActive,
  className,
}: {
  bass: number
  mid: number
  treble: number
  peak: number
  intensity: number
  opacity: number
  isActive: boolean
  className: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const lastBassRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Spawn particles on bass hits
    if (bass > 0.6 && bass > lastBassRef.current + 0.1) {
      const count = Math.floor(bass * intensity * 15)
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: rect.width / 2 + (Math.random() - 0.5) * 200,
          y: rect.height / 2 + (Math.random() - 0.5) * 200,
          vx: (Math.random() - 0.5) * 10 * bass,
          vy: (Math.random() - 0.5) * 10 * bass,
          size: Math.random() * 4 + 2,
          hue: 160 + Math.random() * 80,
          life: 1,
          maxLife: 60 + Math.random() * 60,
        })
      }
    }
    lastBassRef.current = bass

    // Clear and draw
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= 1 / p.maxLife

      if (p.life <= 0) return false

      ctx.globalAlpha = p.life * opacity
      ctx.fillStyle = `hsl(${p.hue}, 70%, 50%)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 + mid * 0.5), 0, Math.PI * 2)
      ctx.fill()

      return true
    })

    ctx.globalAlpha = 1
  }, [bass, mid, treble, peak, intensity, opacity, isActive])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-300 ${className}`}
      style={{
        opacity: isActive ? 1 : 0,
        width: "100%",
        height: "100%",
      }}
    />
  )
}

export default AudioReactiveBackground
