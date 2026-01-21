"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"
import type { AudioVisualizerData } from "@/hooks/useAudioVisualizer"
import type { VisualizerStyle } from "./AudioReactiveBackground"

// Default empty data
const defaultData: AudioVisualizerData = {
  frequencyData: new Uint8Array(0),
  timeDomainData: new Uint8Array(0),
  bass: 0,
  mid: 0,
  treble: 0,
  overall: 0,
  peak: 0,
  isActive: false,
}

export interface AudioVisualizerContextType {
  // Visualizer data
  data: AudioVisualizerData
  // Settings
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  style: VisualizerStyle
  setStyle: (style: VisualizerStyle) => void
  intensity: number
  setIntensity: (intensity: number) => void
  opacity: number
  setOpacity: (opacity: number) => void
  // Connection
  isConnected: boolean
  connectToElement: (element: HTMLAudioElement | HTMLVideoElement) => void
  disconnect: () => void
}

const AudioVisualizerContext = createContext<AudioVisualizerContextType | null>(null)

export function useAudioVisualizerContext() {
  const context = useContext(AudioVisualizerContext)
  if (!context) {
    throw new Error("useAudioVisualizerContext must be used within AudioVisualizerProvider")
  }
  return context
}

// Safe hook that returns null if outside provider
export function useAudioVisualizerSafe() {
  return useContext(AudioVisualizerContext)
}

interface AudioVisualizerProviderProps {
  children: React.ReactNode
}

// Shared singleton refs to persist across provider re-renders
let sharedAudioContext: AudioContext | null = null
const elementSourceMap = new WeakMap<HTMLAudioElement | HTMLVideoElement, MediaElementAudioSourceNode>()

export function AudioVisualizerProvider({ children }: AudioVisualizerProviderProps) {
  // Settings state (persisted to localStorage)
  const [enabled, setEnabledState] = useState(false)
  const [style, setStyleState] = useState<VisualizerStyle>("pulse")
  const [intensity, setIntensityState] = useState(0.7)
  const [opacity, setOpacityState] = useState(0.5)

  // Visualizer state
  const [data, setData] = useState<AudioVisualizerData>(defaultData)
  const [isConnected, setIsConnected] = useState(false)

  // Refs
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const frequencyDataRef = useRef<Uint8Array | null>(null)
  const timeDomainDataRef = useRef<Uint8Array | null>(null)
  const connectedElementRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedEnabled = localStorage.getItem("audio-visualizer-enabled")
    const savedStyle = localStorage.getItem("audio-visualizer-style")
    const savedIntensity = localStorage.getItem("audio-visualizer-intensity")
    const savedOpacity = localStorage.getItem("audio-visualizer-opacity")

    if (savedEnabled !== null) setEnabledState(savedEnabled === "true")
    if (savedStyle) setStyleState(savedStyle as VisualizerStyle)
    if (savedIntensity) setIntensityState(parseFloat(savedIntensity))
    if (savedOpacity) setOpacityState(parseFloat(savedOpacity))
  }, [])

  // Save settings to localStorage
  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    localStorage.setItem("audio-visualizer-enabled", String(value))
  }, [])

  const setStyle = useCallback((value: VisualizerStyle) => {
    setStyleState(value)
    localStorage.setItem("audio-visualizer-style", value)
  }, [])

  const setIntensity = useCallback((value: number) => {
    setIntensityState(value)
    localStorage.setItem("audio-visualizer-intensity", String(value))
  }, [])

  const setOpacity = useCallback((value: number) => {
    setOpacityState(value)
    localStorage.setItem("audio-visualizer-opacity", String(value))
  }, [])

  // Calculate frequency band averages
  const calculateBandAverage = useCallback((
    freqData: Uint8Array,
    sampleRate: number,
    lowFreq: number,
    highFreq: number
  ): number => {
    const binCount = freqData.length
    const nyquist = sampleRate / 2
    const binWidth = nyquist / binCount
    const lowBin = Math.floor(lowFreq / binWidth)
    const highBin = Math.min(Math.ceil(highFreq / binWidth), binCount - 1)
    if (lowBin >= highBin) return 0
    let sum = 0
    for (let i = lowBin; i <= highBin; i++) {
      sum += freqData[i]
    }
    return (sum / (highBin - lowBin + 1)) / 255
  }, [])

  // Animation loop
  const updateVisualization = useCallback(() => {
    if (!analyserRef.current || !frequencyDataRef.current || !timeDomainDataRef.current) {
      return
    }

    const analyser = analyserRef.current
    const frequencyData = frequencyDataRef.current
    const timeDomainData = timeDomainDataRef.current

    analyser.getByteFrequencyData(frequencyData as Uint8Array<ArrayBuffer>)
    analyser.getByteTimeDomainData(timeDomainData as Uint8Array<ArrayBuffer>)

    const sampleRate = sharedAudioContext?.sampleRate ?? 44100
    const bass = calculateBandAverage(frequencyData, sampleRate, 20, 250)
    const mid = calculateBandAverage(frequencyData, sampleRate, 250, 4000)
    const treble = calculateBandAverage(frequencyData, sampleRate, 4000, 20000)

    let sum = 0
    let peak = 0
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i]
      if (frequencyData[i] > peak) peak = frequencyData[i]
    }
    const overall = (sum / frequencyData.length) / 255
    const normalizedPeak = peak / 255

    setData({
      frequencyData: new Uint8Array([...frequencyData]),
      timeDomainData: new Uint8Array([...timeDomainData]),
      bass,
      mid,
      treble,
      overall,
      peak: normalizedPeak,
      isActive: overall > 0.01,
    })

    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    }
  }, [calculateBandAverage, enabled])

  // Connect to audio/video element
  const connectToElement = useCallback((element: HTMLAudioElement | HTMLVideoElement) => {
    // Skip if already connected to same element
    if (connectedElementRef.current === element && isConnected) {
      return
    }

    try {
      // Create or get shared audio context
      if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }

      if (sharedAudioContext.state === "suspended") {
        sharedAudioContext.resume()
      }

      // Create analyser if needed
      if (!analyserRef.current) {
        analyserRef.current = sharedAudioContext.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8
        analyserRef.current.minDecibels = -90
        analyserRef.current.maxDecibels = -10

        const binCount = analyserRef.current.frequencyBinCount
        frequencyDataRef.current = new Uint8Array(binCount)
        timeDomainDataRef.current = new Uint8Array(binCount)
      }

      // Get or create media element source (reuse if exists for this element)
      let source = elementSourceMap.get(element)
      if (!source) {
        source = sharedAudioContext.createMediaElementSource(element)
        elementSourceMap.set(element, source)
        // Connect source to destination so audio still plays
        source.connect(sharedAudioContext.destination)
      }

      // Connect source to our analyser (if not already connected)
      try {
        source.connect(analyserRef.current)
      } catch {
        // May already be connected
      }

      connectedElementRef.current = element
      setIsConnected(true)

      // Start animation loop if enabled
      if (enabled && !animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateVisualization)
      }
    } catch (err) {
      console.error("Failed to connect audio visualizer:", err)
      setIsConnected(false)
    }
  }, [enabled, isConnected, updateVisualization])

  // Disconnect from audio element
  const disconnect = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    connectedElementRef.current = null
    setIsConnected(false)
    setData(defaultData)
  }, [])

  // Start/stop animation based on enabled state
  useEffect(() => {
    if (enabled && isConnected && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    } else if (!enabled && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      setData(defaultData)
    }
  }, [enabled, isConnected, updateVisualization])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const value: AudioVisualizerContextType = {
    data,
    enabled,
    setEnabled,
    style,
    setStyle,
    intensity,
    setIntensity,
    opacity,
    setOpacity,
    isConnected,
    connectToElement,
    disconnect,
  }

  return (
    <AudioVisualizerContext.Provider value={value}>
      {children}
    </AudioVisualizerContext.Provider>
  )
}
