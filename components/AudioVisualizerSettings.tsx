"use client"

import { useAudioVisualizerSafe } from "./AudioVisualizerProvider"
import type { VisualizerStyle } from "./AudioReactiveBackground"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Activity, Sparkles, BarChart3, AudioWaveform, CircleDot, Zap, EyeOff } from "lucide-react"

const VISUALIZER_STYLES: { value: VisualizerStyle; label: string; icon: React.ElementType; description: string }[] = [
  { value: "pulse", label: "Pulse", icon: Sparkles, description: "Glassmorphism glow pulses with bass" },
  { value: "gradient-shift", label: "Gradient Shift", icon: Zap, description: "Background gradient hue shifts with frequency" },
  { value: "bars", label: "Frequency Bars", icon: BarChart3, description: "Classic frequency bar visualization" },
  { value: "waveform", label: "Waveform", icon: AudioWaveform, description: "Oscilloscope-style waveform display" },
  { value: "radial", label: "Radial", icon: CircleDot, description: "Circular frequency visualization" },
  { value: "particles", label: "Particles", icon: Activity, description: "Particles react to beats" },
  { value: "none", label: "None", icon: EyeOff, description: "Disable visualizer" },
]

export function AudioVisualizerSettings() {
  const visualizer = useAudioVisualizerSafe()

  if (!visualizer) {
    return (
      <div className="text-sm text-muted-foreground">
        Audio visualizer not available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="visualizer-enabled" className="text-base">Audio Visualizer</Label>
          <p className="text-sm text-muted-foreground">
            React background to music playing in the music player
          </p>
        </div>
        <Switch
          id="visualizer-enabled"
          checked={visualizer.enabled}
          onCheckedChange={visualizer.setEnabled}
        />
      </div>

      {visualizer.enabled && (
        <>
          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Visualization Style</Label>
            <Select value={visualizer.style} onValueChange={(v) => visualizer.setStyle(v as VisualizerStyle)}>
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                {VISUALIZER_STYLES.map(({ value, label, icon: Icon, description }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Intensity</Label>
              <span className="text-sm text-muted-foreground">{Math.round(visualizer.intensity * 100)}%</span>
            </div>
            <Slider
              value={[visualizer.intensity * 100]}
              onValueChange={([v]) => visualizer.setIntensity(v / 100)}
              min={10}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              How strongly the visualization reacts to audio
            </p>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opacity</Label>
              <span className="text-sm text-muted-foreground">{Math.round(visualizer.opacity * 100)}%</span>
            </div>
            <Slider
              value={[visualizer.opacity * 100]}
              onValueChange={([v]) => visualizer.setOpacity(v / 100)}
              min={10}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Visibility of the visualization effect
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${visualizer.isConnected ? "bg-green-500" : "bg-muted"}`} />
            <span className="text-muted-foreground">
              {visualizer.isConnected ? "Connected to audio" : "Waiting for audio playback"}
            </span>
          </div>

          {visualizer.data.isActive && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="glass rounded p-2 text-center">
                <div className="text-primary font-mono">{Math.round(visualizer.data.bass * 100)}%</div>
                <div className="text-muted-foreground">Bass</div>
              </div>
              <div className="glass rounded p-2 text-center">
                <div className="text-primary font-mono">{Math.round(visualizer.data.mid * 100)}%</div>
                <div className="text-muted-foreground">Mid</div>
              </div>
              <div className="glass rounded p-2 text-center">
                <div className="text-primary font-mono">{Math.round(visualizer.data.treble * 100)}%</div>
                <div className="text-muted-foreground">Treble</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
