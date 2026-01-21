"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface AudioVisualizerData {
  // Frequency data (0-255 for each band)
  frequencyData: Uint8Array
  // Time domain data for waveform (0-255)
  timeDomainData: Uint8Array
  // Computed values for easier use
  bass: number        // 0-1, average of low frequencies (20-250Hz)
  mid: number         // 0-1, average of mid frequencies (250-4000Hz)
  treble: number      // 0-1, average of high frequencies (4000-20000Hz)
  overall: number     // 0-1, overall volume level
  peak: number        // 0-1, max frequency value
  isActive: boolean   // Whether audio is being analyzed
}

export interface UseAudioVisualizerOptions {
  fftSize?: number           // FFT size (power of 2, 32-32768), default 256
  smoothingTimeConstant?: number  // 0-1, how smooth the visualization (0 = no smoothing)
  minDecibels?: number       // Minimum decibel value for range
  maxDecibels?: number       // Maximum decibel value for range
  enabled?: boolean          // Whether to run the analyzer
}

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

export function useAudioVisualizer(options: UseAudioVisualizerOptions = {}) {
  const {
    fftSize = 256,
    smoothingTimeConstant = 0.8,
    minDecibels = -90,
    maxDecibels = -10,
    enabled = true,
  } = options

  const [data, setData] = useState<AudioVisualizerData>(defaultData)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs to persist across renders
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const connectedElementRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)

  // Frequency data buffers (reused for performance)
  const frequencyDataRef = useRef<Uint8Array | null>(null)
  const timeDomainDataRef = useRef<Uint8Array | null>(null)

  // Calculate frequency band averages
  const calculateBandAverage = useCallback((
    data: Uint8Array,
    sampleRate: number,
    lowFreq: number,
    highFreq: number
  ): number => {
    const binCount = data.length
    const nyquist = sampleRate / 2
    const binWidth = nyquist / binCount

    const lowBin = Math.floor(lowFreq / binWidth)
    const highBin = Math.min(Math.ceil(highFreq / binWidth), binCount - 1)

    if (lowBin >= highBin) return 0

    let sum = 0
    for (let i = lowBin; i <= highBin; i++) {
      sum += data[i]
    }

    return (sum / (highBin - lowBin + 1)) / 255
  }, [])

  // Animation loop for continuous visualization
  const updateVisualization = useCallback(() => {
    if (!analyserRef.current || !frequencyDataRef.current || !timeDomainDataRef.current) {
      return
    }

    const analyser = analyserRef.current
    const frequencyData = frequencyDataRef.current
    const timeDomainData = timeDomainDataRef.current

    // Get frequency and time domain data
    analyser.getByteFrequencyData(frequencyData as Uint8Array<ArrayBuffer>)
    analyser.getByteTimeDomainData(timeDomainData as Uint8Array<ArrayBuffer>)

    // Calculate band averages (assuming 44100Hz sample rate as default)
    const sampleRate = audioContextRef.current?.sampleRate ?? 44100
    const bass = calculateBandAverage(frequencyData, sampleRate, 20, 250)
    const mid = calculateBandAverage(frequencyData, sampleRate, 250, 4000)
    const treble = calculateBandAverage(frequencyData, sampleRate, 4000, 20000)

    // Calculate overall volume and peak
    let sum = 0
    let peak = 0
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i]
      if (frequencyData[i] > peak) {
        peak = frequencyData[i]
      }
    }
    const overall = (sum / frequencyData.length) / 255
    const normalizedPeak = peak / 255

    setData({
      frequencyData: new Uint8Array([...frequencyData]), // Clone for React state
      timeDomainData: new Uint8Array([...timeDomainData]),
      bass,
      mid,
      treble,
      overall,
      peak: normalizedPeak,
      isActive: overall > 0.01, // Consider active if there's some sound
    })

    // Continue the animation loop
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    }
  }, [calculateBandAverage, enabled])

  // Connect to an audio/video element
  const connectToElement = useCallback((element: HTMLAudioElement | HTMLVideoElement) => {
    // Don't reconnect to the same element
    if (connectedElementRef.current === element && isConnected) {
      return
    }

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current

      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === "suspended") {
        audioContext.resume()
      }

      // Create analyser if needed
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser()
        analyserRef.current.fftSize = fftSize
        analyserRef.current.smoothingTimeConstant = smoothingTimeConstant
        analyserRef.current.minDecibels = minDecibels
        analyserRef.current.maxDecibels = maxDecibels

        // Initialize data buffers
        const binCount = analyserRef.current.frequencyBinCount
        frequencyDataRef.current = new Uint8Array(binCount)
        timeDomainDataRef.current = new Uint8Array(binCount)
      }

      // Disconnect previous source if exists
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch {
          // Ignore disconnect errors
        }
      }

      // Create new media element source
      // Note: Each element can only have one source node, so we check if already created
      try {
        sourceRef.current = audioContext.createMediaElementSource(element)
      } catch {
        // Element might already have a source node from a previous connection
        // In this case, we need to reuse the existing connection
        console.warn("Audio element already has a source node")
        setError("Audio element already connected to another visualizer")
        return
      }

      // Connect: source -> analyser -> destination
      sourceRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioContext.destination)

      connectedElementRef.current = element
      setIsConnected(true)
      setError(null)

      // Start visualization loop
      if (enabled) {
        animationFrameRef.current = requestAnimationFrame(updateVisualization)
      }
    } catch (err) {
      console.error("Failed to connect audio visualizer:", err)
      setError(err instanceof Error ? err.message : "Failed to connect")
      setIsConnected(false)
    }
  }, [enabled, fftSize, maxDecibels, minDecibels, smoothingTimeConstant, updateVisualization, isConnected])

  // Disconnect from audio element
  const disconnect = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch {
        // Ignore
      }
      sourceRef.current = null
    }

    connectedElementRef.current = null
    setIsConnected(false)
    setData(defaultData)
  }, [])

  // Start/stop visualization based on enabled state
  useEffect(() => {
    if (enabled && isConnected && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    } else if (!enabled && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [enabled, isConnected, updateVisualization])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      // Don't close the audio context - it might be shared
      // and the audio element needs to keep playing
    }
  }, [])

  return {
    data,
    isConnected,
    error,
    connectToElement,
    disconnect,
    // Expose refs for advanced usage
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
  }
}

// Singleton for sharing audio context across components
let sharedAudioContext: AudioContext | null = null
const elementSourceMap = new WeakMap<HTMLAudioElement | HTMLVideoElement, MediaElementAudioSourceNode>()

export function useSharedAudioVisualizer(options: UseAudioVisualizerOptions = {}) {
  const {
    fftSize = 256,
    smoothingTimeConstant = 0.8,
    minDecibels = -90,
    maxDecibels = -10,
    enabled = true,
  } = options

  const [data, setData] = useState<AudioVisualizerData>(defaultData)
  const [isConnected, setIsConnected] = useState(false)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const frequencyDataRef = useRef<Uint8Array | null>(null)
  const timeDomainDataRef = useRef<Uint8Array | null>(null)

  const calculateBandAverage = useCallback((
    data: Uint8Array,
    sampleRate: number,
    lowFreq: number,
    highFreq: number
  ): number => {
    const binCount = data.length
    const nyquist = sampleRate / 2
    const binWidth = nyquist / binCount
    const lowBin = Math.floor(lowFreq / binWidth)
    const highBin = Math.min(Math.ceil(highFreq / binWidth), binCount - 1)
    if (lowBin >= highBin) return 0
    let sum = 0
    for (let i = lowBin; i <= highBin; i++) {
      sum += data[i]
    }
    return (sum / (highBin - lowBin + 1)) / 255
  }, [])

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

  const connectToElement = useCallback((element: HTMLAudioElement | HTMLVideoElement) => {
    try {
      // Create or get shared audio context
      if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }

      if (sharedAudioContext.state === "suspended") {
        sharedAudioContext.resume()
      }

      // Create analyser
      if (!analyserRef.current) {
        analyserRef.current = sharedAudioContext.createAnalyser()
        analyserRef.current.fftSize = fftSize
        analyserRef.current.smoothingTimeConstant = smoothingTimeConstant
        analyserRef.current.minDecibels = minDecibels
        analyserRef.current.maxDecibels = maxDecibels

        const binCount = analyserRef.current.frequencyBinCount
        frequencyDataRef.current = new Uint8Array(binCount)
        timeDomainDataRef.current = new Uint8Array(binCount)
      }

      // Get or create media element source (reuse if exists)
      let source = elementSourceMap.get(element)
      if (!source) {
        source = sharedAudioContext.createMediaElementSource(element)
        elementSourceMap.set(element, source)
        // Connect source to destination so audio still plays
        source.connect(sharedAudioContext.destination)
      }

      // Connect source to our analyser
      source.connect(analyserRef.current)

      setIsConnected(true)

      if (enabled) {
        animationFrameRef.current = requestAnimationFrame(updateVisualization)
      }
    } catch (err) {
      console.error("Failed to connect shared audio visualizer:", err)
      setIsConnected(false)
    }
  }, [enabled, fftSize, maxDecibels, minDecibels, smoothingTimeConstant, updateVisualization])

  const disconnect = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsConnected(false)
    setData(defaultData)
  }, [])

  useEffect(() => {
    if (enabled && isConnected && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    } else if (!enabled && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [enabled, isConnected, updateVisualization])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    data,
    isConnected,
    connectToElement,
    disconnect,
  }
}
