import { useState, useRef, useEffect, useCallback } from 'react'
import { Container, Graphics } from 'pixi.js'
import { useEditorStore } from '../../../store/editorStore'
import { useTheme } from '../../../contexts/ThemeContext'
import { getTimelineWidth } from '../../../utils/timelineUtils'
import { WebGLManager } from '../utils/webglManager'
import { ThemeColors, DrawingContext } from '../utils/timelineDrawing'

export const useTimeline = () => {
  const { theme } = useTheme()
  const {
    objects,
    currentTime,
    duration,
    selectedObjectId,
    bpm,
    beatsPerMeasure,
    setCurrentTime,
    audioBuffer
  } = useEditorStore()

  // Refs
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const webglManagerRef = useRef<WebGLManager>(new WebGLManager())
  const timelineContainerRef = useRef<Container | null>(null)
  const backgroundContainerRef = useRef<Container | null>(null)
  const gridContainerRef = useRef<Container | null>(null)
  const headersContainerRef = useRef<Container | null>(null)
  const objectTracksContainerRef = useRef<Container | null>(null)
  const playheadRef = useRef<Container | null>(null)
  const waveformRef = useRef<Graphics | null>(null)

  // State
  const [pixiSize, setPixiSize] = useState({ width: 800, height: 300 })
  const [pixiLoading, setPixiLoading] = useState(true)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [immutableChannelData, setImmutableChannelData] = useState<Float32Array | null>(null)
  const [globalMaxAmplitude, setGlobalMaxAmplitude] = useState<number>(0)

  const totalTimelineWidth = getTimelineWidth(duration, pixiSize.width)
  const maxScrollOffset = Math.max(0, totalTimelineWidth - (pixiSize.width - 120)) // 120 is HEADER_WIDTH

  // Reset scroll when no audio
  useEffect(() => {
    if (duration === 0) {
      setScrollOffset(0)
    }
  }, [duration])

  // Calculate dynamic height based on number of tracks
  const calculateTimelineHeight = useCallback(() => {
    const HEADER_HEIGHT = 30
    const WAVEFORM_TRACK_HEIGHT = 60
    const TRACK_HEIGHT = 60
    return HEADER_HEIGHT + WAVEFORM_TRACK_HEIGHT + (objects.length * TRACK_HEIGHT) + 40
  }, [objects.length])

  // Theme color conversion utility
  const hexToPixi = useCallback((hexColor: string) => {
    if (!hexColor || typeof hexColor !== 'string') {
      return 0x000000
    }
    const cleanHex = hexColor.replace('#', '')
    const result = parseInt(cleanHex, 16)
    return isNaN(result) ? 0x000000 : result
  }, [])

  // Generate darker version of accent color
  const getDarkerAccent = useCallback((accentColor: string) => {
    try {
      const hex = accentColor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      
      const darkerR = Math.floor(r * 0.7)
      const darkerG = Math.floor(g * 0.7)
      const darkerB = Math.floor(b * 0.7)
      
      const pad = (num: number) => {
        const hex = num.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      
      const darkerHex = `#${pad(darkerR)}${pad(darkerG)}${pad(darkerB)}`
      return hexToPixi(darkerHex)
    } catch (error) {
      return hexToPixi(theme.accent)
    }
  }, [hexToPixi, theme.accent])

  // Get theme colors
  const getThemeColors = useCallback((): ThemeColors => ({
    background: hexToPixi(theme.background),
    backgroundSecondary: hexToPixi(theme.backgroundSecondary),
    backgroundTertiary: hexToPixi(theme.backgroundTertiary),
    border: hexToPixi(theme.border),
    text: hexToPixi(theme.text),
    textSecondary: hexToPixi(theme.textSecondary),
    accent: hexToPixi(theme.accent),
    waveform: hexToPixi(theme.accent),
    waveformNegative: getDarkerAccent(theme.accent)
  }), [hexToPixi, getDarkerAccent, theme])

  // Get drawing context
  const getDrawingContext = useCallback((): DrawingContext => ({
    pixiSize,
    scrollOffset,
    totalTimelineWidth,
    duration,
    currentTime,
    bpm,
    beatsPerMeasure,
    objects,
    selectedObjectId
  }), [pixiSize, scrollOffset, totalTimelineWidth, duration, currentTime, bpm, beatsPerMeasure, objects, selectedObjectId])

  return {
    // Refs
    pixiContainerRef,
    webglManagerRef,
    timelineContainerRef,
    backgroundContainerRef,
    gridContainerRef,
    headersContainerRef,
    objectTracksContainerRef,
    playheadRef,
    waveformRef,
    
    // State
    pixiSize,
    setPixiSize,
    pixiLoading,
    setPixiLoading,
    scrollOffset,
    setScrollOffset,
    isDraggingPlayhead,
    setIsDraggingPlayhead,
    immutableChannelData,
    setImmutableChannelData,
    globalMaxAmplitude,
    setGlobalMaxAmplitude,
    
    // Computed values
    totalTimelineWidth,
    maxScrollOffset,
    calculateTimelineHeight,
    
    // Functions
    hexToPixi,
    getDarkerAccent,
    getThemeColors,
    getDrawingContext,
    
    // Store values
    theme,
    objects,
    currentTime,
    duration,
    selectedObjectId,
    bpm,
    beatsPerMeasure,
    setCurrentTime,
    audioBuffer
  }
}