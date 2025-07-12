import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Application, Graphics, Container, Text } from 'pixi.js'
import { useEditorStore } from '../../store/editorStore'
import { useTheme } from '../../contexts/ThemeContext'
import { getTimelineWidth } from '../../utils/timelineUtils'

interface PixiTimelineProps {
  height?: number
}

const TRACK_HEIGHT = 60
const HEADER_WIDTH = 120

function PixiTimeline({ height = 300 }: PixiTimelineProps) {
  const { theme } = useTheme()
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const pixiAppRef = useRef<Application | null>(null)
  const [pixiSize, setPixiSize] = useState({ width: 800, height: 300 })
  const [pixiLoading, setPixiLoading] = useState(true)
  
  // Store immutable channel data for waveform rendering
  const [immutableChannelData, setImmutableChannelData] = useState<Float32Array | null>(null)
  const [globalMaxAmplitude, setGlobalMaxAmplitude] = useState<number>(0)
  
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
  

  const totalTimelineWidth = getTimelineWidth(duration, pixiSize.width)
  const [scrollOffset, setScrollOffset] = useState(0)
  const maxScrollOffset = Math.max(0, totalTimelineWidth - (pixiSize.width - HEADER_WIDTH))
  
  // Calculate dynamic height based on number of tracks
  const HEADER_HEIGHT = 30 // Height for time display area
  const WAVEFORM_TRACK_HEIGHT = TRACK_HEIGHT // Waveform track
  const calculateTimelineHeight = useCallback(() => {
    return HEADER_HEIGHT + WAVEFORM_TRACK_HEIGHT + (objects.length * TRACK_HEIGHT) + 40 // Add padding
  }, [objects.length])

  // Create immutable copy of channel data when audio buffer changes
  useEffect(() => {
    if (audioBuffer) {
      const originalChannelData = audioBuffer.getChannelData(0)
      
      // Create an immutable copy of the channel data
      const immutableCopy = new Float32Array(originalChannelData.length)
      for (let i = 0; i < originalChannelData.length; i++) {
        immutableCopy[i] = originalChannelData[i]
      }
      
      // Clear existing data first to force re-render
      setImmutableChannelData(null)
      setGlobalMaxAmplitude(0)
      
      // Use setTimeout to ensure state update is processed
      setTimeout(() => {
        setImmutableChannelData(immutableCopy)
        
        // Calculate max amplitude from the immutable copy
        let maxAmplitude = 0
        for (let i = 0; i < immutableCopy.length; i++) {
          const abs = Math.abs(immutableCopy[i])
          if (abs > maxAmplitude) maxAmplitude = abs
        }
        
        const finalMaxAmplitude = maxAmplitude > 0 ? maxAmplitude : 0.1
        setGlobalMaxAmplitude(finalMaxAmplitude)
      }, 0)
    } else {
      setGlobalMaxAmplitude(0)
      setImmutableChannelData(null)
    }
  }, [audioBuffer, duration])

  // Initialize PixiJS application
  useEffect(() => {
    if (!pixiContainerRef.current) return

    const app = new Application()
    
    const initializePixi = async () => {
      try {
        await app.init({
          width: Math.min(pixiSize.width, 1920), // Limit canvas width
          height: Math.min(pixiSize.height, 600), // Limit canvas height
          backgroundColor: 0x000000, // Start with black background
          antialias: false, // Disable for better compatibility
          resolution: 1, // Force 1x resolution
          hello: false, // Disable PixiJS hello message
          preference: 'webgl', // Prefer WebGL over WebGL2
          powerPreference: 'low-power' // Use low-power GPU
        })
        
      } catch (error) {
        console.error('Failed to initialize PixiJS:', error)
        return
      }
      
      if (pixiContainerRef.current) {
        pixiContainerRef.current.appendChild(app.canvas)
        pixiAppRef.current = app
        
        // Set initial background color after theme is available
        app.renderer.background.color = hexToPixi(theme.background)
        
        // Add WebGL context recovery
        const canvas = app.canvas as HTMLCanvasElement
        canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          console.warn('PixiJS WebGL context lost')
          setPixiLoading(true)
        })
        
        canvas.addEventListener('webglcontextrestored', () => {
          console.log('PixiJS WebGL context restored')
          // Reinitialize timeline
          setTimeout(() => {
            if (pixiAppRef.current) {
              renderTimeline()
              setPixiLoading(false)
            }
          }, 100)
        })
        
        
        // Initial render
        renderTimeline()
        
        // Mark as loaded
        setPixiLoading(false)
      }
    }

    initializePixi()

    return () => {
      if (pixiAppRef.current) {
        try {
          
          // Clear all references first
          timelineContainerRef.current = null
          gridContainerRef.current = null
          headersContainerRef.current = null
          objectTracksContainerRef.current = null
          playheadRef.current = null
          backgroundContainerRef.current = null
          
          // Remove canvas from DOM
          if (pixiContainerRef.current && pixiAppRef.current.canvas) {
            pixiContainerRef.current.removeChild(pixiAppRef.current.canvas)
          }
          
          // Destroy PixiJS app
          pixiAppRef.current.destroy(true)
          
          pixiAppRef.current = null
        } catch (error) {
          console.warn('Error destroying PixiJS application:', error)
          pixiAppRef.current = null
        }
      }
    }
  }, [pixiSize])
  
  // Handle theme changes separately without recreating the app
  useEffect(() => {
    if (pixiAppRef.current && timelineContainerRef.current) {
      // Clear existing containers
      timelineContainerRef.current.removeChildren()
      timelineContainerRef.current = null
      gridContainerRef.current = null
      headersContainerRef.current = null
      objectTracksContainerRef.current = null
      playheadRef.current = null
      backgroundContainerRef.current = null
      
      // Force re-render with new theme (call directly after renderTimeline is defined)
      setTimeout(() => {
        if (pixiAppRef.current) {
          // Will be called by the main renderTimeline effect
        }
      }, 0)
    }
  }, [theme])

  // Resize observer
  useEffect(() => {
    const updatePixiSize = () => {
      if (pixiContainerRef.current) {
        const rect = pixiContainerRef.current.getBoundingClientRect()
        const width = Math.max(400, rect.width)
        const dynamicHeight = calculateTimelineHeight()
        const newHeight = Math.max(dynamicHeight, Math.min(rect.height, height))
        setPixiSize({ width, height: newHeight })
      }
    }

    updatePixiSize()
    window.addEventListener('resize', updatePixiSize)
    
    return () => {
      window.removeEventListener('resize', updatePixiSize)
    }
  }, [objects.length, height, calculateTimelineHeight])


  // Store persistent containers for efficient updates
  const timelineContainerRef = useRef<Container | null>(null)
  const playheadRef = useRef<Container | null>(null)
  const waveformRef = useRef<Graphics | null>(null)
  const backgroundContainerRef = useRef<Container | null>(null)

  // Theme color conversion utility
  const hexToPixi = useCallback((hexColor: string) => {
    if (!hexColor || typeof hexColor !== 'string') {
      return 0x000000 // Default to black
    }
    
    // Remove # if present and convert to number
    const cleanHex = hexColor.replace('#', '')
    const result = parseInt(cleanHex, 16)
    
    if (isNaN(result)) {
      return 0x000000 // Default to black
    }
    
    return result
  }, [])

  // Generate darker version of accent color for negative waveform
  const getDarkerAccent = useCallback((accentColor: string) => {
    try {
      const hex = accentColor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      
      // Make it 30% darker
      const darkerR = Math.floor(r * 0.7)
      const darkerG = Math.floor(g * 0.7)
      const darkerB = Math.floor(b * 0.7)
      
      // Manual padding for compatibility (instead of padStart)
      const pad = (num: number) => {
        const hex = num.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      
      const darkerHex = `#${pad(darkerR)}${pad(darkerG)}${pad(darkerB)}`
      return hexToPixi(darkerHex)
    } catch (error) {
      return hexToPixi(theme.accent) // Fallback to original accent color
    }
  }, [hexToPixi, theme.accent])

  // Helper function to get theme colors
  const getThemeColors = useCallback(() => ({
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

  // Store containers for elements that need to be redrawn when BPM/time signature changes
  const gridContainerRef = useRef<Container | null>(null)
  const headersContainerRef = useRef<Container | null>(null)
  const objectTracksContainerRef = useRef<Container | null>(null)

  const renderTimeline = useCallback(() => {
    const app = pixiAppRef.current
    if (!app) {
      console.warn('PixiJS app not available for renderTimeline')
      return
    }
    

    // Calculate theme colors locally to avoid dependency issues
    const localThemeColors = getThemeColors()

    // Initialize containers if needed
    if (!timelineContainerRef.current) {
      const timelineContainer = new Container()
      app.stage.addChild(timelineContainer)
      timelineContainerRef.current = timelineContainer

      // Create background container (first layer)
      const backgroundContainer = new Container()
      timelineContainer.addChild(backgroundContainer)

      // Create containers for elements that may need updates
      const gridContainer = new Container()
      const headersContainer = new Container()
      const objectTracksContainer = new Container()
      
      timelineContainer.addChild(gridContainer)
      timelineContainer.addChild(headersContainer)
      timelineContainer.addChild(objectTracksContainer)
      
      gridContainerRef.current = gridContainer
      headersContainerRef.current = headersContainer
      objectTracksContainerRef.current = objectTracksContainer
      
      // Create persistent playhead container (top layer)
      const playheadContainer = new Container()
      timelineContainer.addChild(playheadContainer)
      playheadRef.current = playheadContainer
      
      // Store background container for separate background management
      backgroundContainerRef.current = backgroundContainer
    }

    // Always redraw background to handle theme changes
    if (backgroundContainerRef.current) {
      drawBackground(backgroundContainerRef.current, localThemeColors)
      drawWaveformTrackBackground(backgroundContainerRef.current, localThemeColors)
    }

    // Update elements that depend on BPM/time signature
    updateGrid(localThemeColors)
    updateHeaders(localThemeColors)
    updateObjectTracks(localThemeColors)
    
    // Update dynamic elements
    updateWaveform(localThemeColors)
    updatePlayhead()
    
  }, [pixiSize.width, pixiSize.height, duration, totalTimelineWidth, currentTime, bpm, beatsPerMeasure, theme])

  // Efficient update functions for dynamic elements
  const updatePlayhead = useCallback(() => {
    if (!playheadRef.current || duration === 0) return
    
    playheadRef.current.removeChildren()
    
    const playheadX = HEADER_WIDTH + ((currentTime / duration) * totalTimelineWidth) - scrollOffset
    
    if (playheadX >= HEADER_WIDTH && playheadX <= pixiSize.width) {
      // Playhead line
      const playheadLine = new Graphics()
      playheadLine
        .moveTo(playheadX, 0)
        .lineTo(playheadX, pixiSize.height)
        .stroke({ width: 2, color: 0xff4444, pixelLine: true }) // Keep red for playhead visibility
      
      // Playhead handle (draggable)
      const playheadHandle = new Graphics()
      playheadHandle
        .rect(playheadX - 5, 0, 10, 20)
        .fill(0xff4444)
      
      // Make handle interactive with better cursor
      playheadHandle.eventMode = 'static'
      playheadHandle.cursor = 'grab'
      
      playheadRef.current.addChild(playheadLine)
      playheadRef.current.addChild(playheadHandle)
    }
  }, [currentTime, duration, totalTimelineWidth, scrollOffset, pixiSize])

  const updateWaveform = useCallback((colors?: any) => {
    if (!timelineContainerRef.current) return
    
    const colorsToUse = colors || getThemeColors()
    
    // Remove existing waveform if any
    if (waveformRef.current) {
      timelineContainerRef.current.removeChild(waveformRef.current)
      waveformRef.current = null
    }
    
    if (immutableChannelData && immutableChannelData.length > 0 && duration > 0) {
      
      const waveformGraphics = new Graphics()
      const waveformTrackY = 30
      const waveformTrackHeight = TRACK_HEIGHT - 2
      const waveformCenterY = waveformTrackY + waveformTrackHeight / 2
      const contentWidth = pixiSize.width - HEADER_WIDTH
      
      // Calculate amplitude scale with better visibility
      let maxAmplitude = 0
      let rmsAmplitude = 0
      let sampleCount = 0
      
      // Calculate both max and RMS for better scaling
      for (let i = 0; i < immutableChannelData.length; i++) {
        const abs = Math.abs(immutableChannelData[i])
        if (abs > maxAmplitude) maxAmplitude = abs
        rmsAmplitude += abs * abs
        sampleCount++
      }
      
      rmsAmplitude = Math.sqrt(rmsAmplitude / sampleCount)
      
      // Use RMS for more balanced visualization, with max as fallback
      const effectiveAmplitude = rmsAmplitude > 0 ? rmsAmplitude : (maxAmplitude > 0 ? maxAmplitude : 0.1)
      
      // Scale to use only half the track height (since we draw positive and negative separately)
      const amplitudeScale = (waveformTrackHeight * 0.4) / effectiveAmplitude
      
      
      // Calculate visible time range based on scroll offset
      const visibleStartTime = (scrollOffset / totalTimelineWidth) * duration
      const visibleEndTime = ((scrollOffset + contentWidth) / totalTimelineWidth) * duration
      
      
      // Draw waveform with improved sampling and scaling
      for (let x = 0; x < contentWidth; x += 1) { // Every pixel for maximum detail
        // Calculate the actual time this pixel represents
        const timeAtPixel = visibleStartTime + (x / contentWidth) * (visibleEndTime - visibleStartTime)
        
        // Convert time to sample index
        const exactSampleIndex = (timeAtPixel / duration) * immutableChannelData.length
        const sampleIndex = Math.floor(exactSampleIndex)
        
        if (sampleIndex >= 0 && sampleIndex < immutableChannelData.length) {
          // Sample multiple points around the target for better representation
          let maxSampleInRange = 0
          const sampleRange = Math.max(1, Math.floor(immutableChannelData.length / contentWidth))
          
          // Get peak value in sample range for this pixel
          for (let s = 0; s < sampleRange && (sampleIndex + s) < immutableChannelData.length; s++) {
            const sample = Math.abs(immutableChannelData[sampleIndex + s])
            if (sample > maxSampleInRange) {
              maxSampleInRange = sample
            }
          }
          
          // Apply scaling with proper height limits for positive/negative display
          let barHeight = maxSampleInRange * amplitudeScale
          // Limit to half track height since we draw positive and negative separately
          const maxHalfHeight = (waveformTrackHeight * 0.45) // 45% of track height for each direction
          barHeight = Math.max(1, Math.min(maxHalfHeight, barHeight))
          
          // Use original sample for positive/negative detection
          const originalSample = immutableChannelData[sampleIndex]
          const isPositive = originalSample >= 0
          
          // Draw waveform bar (positive up, negative down from center)
          if (isPositive) {
            waveformGraphics
              .rect(HEADER_WIDTH + x, waveformCenterY - barHeight, 1, barHeight)
              .fill(colorsToUse.waveform)
          } else {
            waveformGraphics
              .rect(HEADER_WIDTH + x, waveformCenterY, 1, barHeight)
              .fill(colorsToUse.waveformNegative)
          }
        }
      }
      
      timelineContainerRef.current.addChild(waveformGraphics)
      waveformRef.current = waveformGraphics
    }
  }, [immutableChannelData, pixiSize, scrollOffset, totalTimelineWidth, duration, getThemeColors])

  // Update functions for elements that change with BPM/time signature or scroll
  const updateGrid = useCallback((colors?: any) => {
    if (!gridContainerRef.current) return
    
    const colorsToUse = colors || getThemeColors()
    gridContainerRef.current.removeChildren()
    drawTimeGrid(gridContainerRef.current, colorsToUse)
  }, [duration, bpm, beatsPerMeasure, pixiSize, scrollOffset, totalTimelineWidth, getThemeColors])

  const updateHeaders = useCallback((colors?: any) => {
    if (!headersContainerRef.current) return
    
    const colorsToUse = colors || getThemeColors()
    headersContainerRef.current.removeChildren()
    drawTrackHeaders(headersContainerRef.current, colorsToUse)
  }, [currentTime, bpm, beatsPerMeasure, pixiSize, objects, selectedObjectId, getThemeColors])

  const updateObjectTracks = useCallback((colors?: any) => {
    if (!objectTracksContainerRef.current) return
    
    const colorsToUse = colors || getThemeColors()
    objectTracksContainerRef.current.removeChildren()
    drawObjectTracks(objectTracksContainerRef.current, colorsToUse)
  }, [objects, selectedObjectId, duration, totalTimelineWidth, scrollOffset, pixiSize, getThemeColors])


  // Render timeline when data changes
  useEffect(() => {
    if (pixiAppRef.current) {
      renderTimeline()
    }
  }, [renderTimeline])

  // Force re-render when waveform data changes
  useEffect(() => {
    updateWaveform(getThemeColors())
  }, [immutableChannelData, updateWaveform, getThemeColors])

  // Update playhead when currentTime changes
  useEffect(() => {
    updatePlayhead()
  }, [currentTime, updatePlayhead])

  // Update grid and headers when BPM or time signature changes
  useEffect(() => {
    updateGrid(getThemeColors())
    updateHeaders(getThemeColors())
  }, [bpm, beatsPerMeasure, updateGrid, updateHeaders, getThemeColors])

  // Update waveform and objects when scrolling
  useEffect(() => {
    updateWaveform(getThemeColors())
    updateObjectTracks(getThemeColors())
  }, [scrollOffset, updateWaveform, updateObjectTracks, getThemeColors])

  // Force re-render when theme changes
  useEffect(() => {
    if (pixiAppRef.current) {
      // Update canvas background color
      pixiAppRef.current.renderer.background.color = hexToPixi(theme.background)
      renderTimeline()
    }
  }, [theme, renderTimeline])

  // Background drawing functions (re-drawn on theme changes)  
  const backgroundElementsRef = useRef<(Graphics)[]>([])

  const drawBackground = (container: Container, colors: any) => {
    // Remove existing background elements
    backgroundElementsRef.current.forEach(element => {
      if (element.parent) {
        element.parent.removeChild(element)
      }
    })
    backgroundElementsRef.current = []

    const background = new Graphics()
      .rect(0, 0, pixiSize.width, pixiSize.height)
      .fill(colors.background)
    container.addChild(background)
    backgroundElementsRef.current.push(background)
  }

  const drawWaveformTrackBackground = (container: Container, colors: any) => {
    const waveformTrackY = 30
    const waveformTrackHeight = TRACK_HEIGHT - 2
    const contentWidth = pixiSize.width - HEADER_WIDTH
    
    // Waveform track background
    const waveformBg = new Graphics()
    waveformBg.rect(HEADER_WIDTH, waveformTrackY, contentWidth, waveformTrackHeight)
    waveformBg.fill(colors.backgroundSecondary)
    waveformBg.stroke({ width: 1, color: colors.border })
    container.addChild(waveformBg)
    backgroundElementsRef.current.push(waveformBg)

    // Center line for reference
    const waveformCenterY = waveformTrackY + waveformTrackHeight / 2
    const centerLine = new Graphics()
    centerLine
      .moveTo(HEADER_WIDTH, waveformCenterY)
      .lineTo(HEADER_WIDTH + contentWidth, waveformCenterY)
      .stroke({ width: 1, color: colors.textSecondary, alpha: 0.5, pixelLine: true })
    container.addChild(centerLine)
    backgroundElementsRef.current.push(centerLine)
  }


  const drawTimeGrid = (container: Container, colors: any) => {
    if (duration === 0) return

    const gridGraphics = new Graphics()
    const contentWidth = pixiSize.width - HEADER_WIDTH
    
    const measureDuration = getMeasureDuration(bpm)
    const subdivisionDuration = getSubdivisionDuration(bpm)
    
    // Calculate visible range in measures
    const visibleStartTime = Math.max(0, (scrollOffset / totalTimelineWidth) * duration)
    const visibleEndTime = Math.min(duration, ((scrollOffset + contentWidth) / totalTimelineWidth) * duration)
    
    const startMeasure = Math.floor(visibleStartTime / measureDuration)
    const endMeasure = Math.ceil(visibleEndTime / measureDuration)
    
    // Draw measure lines (major grid)
    for (let measure = startMeasure; measure <= endMeasure; measure++) {
      const measureTime = measure * measureDuration
      const x = HEADER_WIDTH + ((measureTime / duration) * totalTimelineWidth) - scrollOffset
      
      if (x >= HEADER_WIDTH && x <= pixiSize.width) {
        gridGraphics
          .moveTo(x, 30)
          .lineTo(x, pixiSize.height)
          .stroke({ width: 2, color: colors.border, alpha: 0.8 })
        
        // Measure label
        const measureLabel = new Text({
          text: `M${measure + 1}`,
          style: {
            fontFamily: 'Arial',
            fontSize: 10,
            fill: colors.text,
            fontWeight: 'bold'
          }
        })
        measureLabel.x = x + 3
        measureLabel.y = 15
        container.addChild(measureLabel)
      }
      
      // Draw beat lines within measure
      for (let beat = 1; beat < beatsPerMeasure; beat++) {
        const beatTime = measureTime + (beat * getBeatDuration(bpm))
        const beatX = HEADER_WIDTH + ((beatTime / duration) * totalTimelineWidth) - scrollOffset
        
        if (beatX >= HEADER_WIDTH && beatX <= pixiSize.width) {
          gridGraphics
            .moveTo(beatX, 30)
            .lineTo(beatX, pixiSize.height)
            .stroke({ width: 1, color: colors.textSecondary, alpha: 0.6 })
        }
      }
      
      // Draw subdivision lines (16 per measure)
      for (let sub = 1; sub < 16; sub++) {
        const subTime = measureTime + (sub * subdivisionDuration)
        const subX = HEADER_WIDTH + ((subTime / duration) * totalTimelineWidth) - scrollOffset
        
        if (subX >= HEADER_WIDTH && subX <= pixiSize.width) {
          gridGraphics
            .moveTo(subX, 30)
            .lineTo(subX, pixiSize.height)
            .stroke({ width: 1, color: colors.border, alpha: 0.3 })
        }
      }
    }

    container.addChild(gridGraphics)
  }

  const drawObjectTracks = (container: Container, colors: any) => {
    if (duration === 0) return
    
    const contentWidth = pixiSize.width - HEADER_WIDTH
    const objectTracksStartY = 30 + TRACK_HEIGHT // Start after waveform track

    objects.forEach((obj, index) => {
      const trackY = objectTracksStartY + index * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      // Track background
      const trackBg = new Graphics()
        .rect(HEADER_WIDTH, trackY, contentWidth, trackHeight)
        .fill(selectedObjectId === obj.id ? colors.backgroundTertiary : colors.backgroundSecondary)
        .stroke({ width: 1, color: colors.border })
      
      container.addChild(trackBg)

      // Calculate visible time range
      const visibleStartTime = (scrollOffset / totalTimelineWidth) * duration
      const visibleEndTime = ((scrollOffset + contentWidth) / totalTimelineWidth) * duration

      // Draw keyframes only if they're in the visible range
      obj.keyframes.forEach((keyframe) => {
        if (keyframe.time >= visibleStartTime && keyframe.time <= visibleEndTime) {
          const x = HEADER_WIDTH + ((keyframe.time / duration) * totalTimelineWidth) - scrollOffset
          
          // Double check bounds (should always be true now)
          if (x >= HEADER_WIDTH && x <= pixiSize.width) {
            const keyframeCircle = new Graphics()
              .circle(x, trackY + trackHeight / 2, 5)
              .fill(colors.accent)
              .stroke({ width: 1, color: colors.text })
            
            container.addChild(keyframeCircle)
          }
        }
      })
    })
  }

  const drawTrackHeaders = (container: Container, colors: any) => {
    // Header background
    const headerBg = new Graphics()
      .rect(0, 0, HEADER_WIDTH, pixiSize.height)
      .fill(colors.backgroundTertiary)
      .stroke({ width: 1, color: colors.border })
    container.addChild(headerBg)
    
    // Time display
    const beatInfo = getBeatInfo(currentTime, bpm, beatsPerMeasure)
    const timeText = new Text({
      text: `${currentTime.toFixed(3)}s`,
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: colors.text,
        fontWeight: 'bold'
      }
    })
    timeText.x = 10
    timeText.y = 5
    container.addChild(timeText)
    
    // Beat position display
    const beatText = new Text({
      text: `M${beatInfo.measure + 1}:${beatInfo.beatInMeasure + 1}:${beatInfo.subdivision + 1}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: colors.accent,
        fontWeight: 'bold'
      }
    })
    beatText.x = 10
    beatText.y = 18
    container.addChild(beatText)
    
    // Waveform track header
    const waveformTrackY = 30
    const waveformTrackHeight = TRACK_HEIGHT - 2
    
    const waveformHeaderBg = new Graphics()
      .rect(0, waveformTrackY, HEADER_WIDTH, waveformTrackHeight)
      .fill(colors.backgroundTertiary)
      .stroke({ width: 1, color: colors.border })
    container.addChild(waveformHeaderBg)
    
    const waveformText = new Text({
      text: 'Waveform',
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: colors.text
      }
    })
    waveformText.x = 10
    waveformText.y = waveformTrackY + 10
    container.addChild(waveformText)
    
    // Object track headers (start after waveform track)
    const objectTracksStartY = waveformTrackY + TRACK_HEIGHT
    objects.forEach((obj, index) => {
      const trackY = objectTracksStartY + index * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      // Track header background
      const trackHeaderBg = new Graphics()
        .rect(0, trackY, HEADER_WIDTH, trackHeight)
        .fill(selectedObjectId === obj.id ? colors.backgroundSecondary : colors.backgroundTertiary)
        .stroke({ width: 1, color: colors.border })
      container.addChild(trackHeaderBg)
      
      // Object type text
      const objText = new Text({
        text: obj.type,
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: colors.text
        }
      })
      objText.x = 10
      objText.y = trackY + 5
      container.addChild(objText)
      
      // Color indicator
      const colorMap: Record<string, number> = {
        red: 0xff4444,
        blue: 0x4444ff,
        black: 0x666666,
        white: 0xffffff
      }
      const colorCircle = new Graphics()
        .circle(15, trackY + 25, 4)
        .fill(colorMap[obj.color] || 0xffffff)
      container.addChild(colorCircle)
      
      // Cut direction text for blocks
      if (obj.type === 'block' && obj.cutDirection) {
        const cutText = new Text({
          text: obj.cutDirection,
          style: {
            fontFamily: 'Arial',
            fontSize: 8,
            fill: colors.textSecondary
          }
        })
        cutText.x = 25
        cutText.y = trackY + 20
        container.addChild(cutText)
      }
    })
  }


  // Global drag state
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  
  // BPM-based timing utilities
  const getBeatDuration = (bpm: number) => 60 / bpm // seconds per beat
  const getMeasureDuration = (bpm: number) => getBeatDuration(bpm) * beatsPerMeasure // seconds per measure
  const getSubdivisionDuration = (bpm: number) => getMeasureDuration(bpm) / 16 // 16 subdivisions per measure
  
  // Convert time to BPM-based position
  const timeToBeatPosition = (time: number, bpm: number) => {
    const beatDuration = getBeatDuration(bpm)
    return time / beatDuration
  }
  
  
  // Snap to subdivision (1/16 of a measure)
  const snapToSubdivision = (time: number, bpm: number) => {
    const subdivisionDuration = getSubdivisionDuration(bpm)
    return Math.round(time / subdivisionDuration) * subdivisionDuration
  }
  
  // Get current beat and subdivision info
  const getBeatInfo = (time: number, bpm: number, beatsPerMeasure: number) => {
    const beatPosition = timeToBeatPosition(time, bpm)
    const measure = Math.floor(beatPosition / beatsPerMeasure)
    const beatInMeasure = Math.floor(beatPosition % beatsPerMeasure)
    const subdivision = Math.floor((time / getSubdivisionDuration(bpm)) % 16)
    
    return { measure, beatInMeasure, subdivision, totalBeats: beatPosition }
  }

  // Mouse event handlers for timeline interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = pixiContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicking on playhead area for dragging
    if (duration > 0) {
      const playheadX = HEADER_WIDTH + ((currentTime / duration) * totalTimelineWidth) - scrollOffset
      if (x >= playheadX - 10 && x <= playheadX + 10 && y >= 0 && y <= pixiSize.height) {
        setIsDraggingPlayhead(true)
        return
      }
    }
    
    // Set timeline position for clicks outside playhead
    if (x >= HEADER_WIDTH && duration > 0) {
      const timelineX = x - HEADER_WIDTH + scrollOffset
      const rawTime = (timelineX / totalTimelineWidth) * duration
      const snappedTime = snapToSubdivision(rawTime, bpm)
      setCurrentTime(Math.max(0, Math.min(duration, snappedTime)))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPlayhead || duration === 0) return
    
    const rect = pixiContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const timelineX = x - HEADER_WIDTH + scrollOffset
    const rawTime = (timelineX / totalTimelineWidth) * duration
    const snappedTime = snapToSubdivision(rawTime, bpm)
    setCurrentTime(Math.max(0, Math.min(duration, snappedTime)))
  }

  const handleMouseUp = () => {
    setIsDraggingPlayhead(false)
  }

  // Add global mouse events for dragging
  useEffect(() => {
    if (isDraggingPlayhead) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const rect = pixiContainerRef.current?.getBoundingClientRect()
        if (!rect || duration === 0) return
        
        const x = e.clientX - rect.left
        const timelineX = x - HEADER_WIDTH + scrollOffset
        const rawTime = (timelineX / totalTimelineWidth) * duration
        const snappedTime = snapToSubdivision(rawTime, bpm)
        setCurrentTime(Math.max(0, Math.min(duration, snappedTime)))
      }

      const handleGlobalMouseUp = () => {
        setIsDraggingPlayhead(false)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDraggingPlayhead, duration, totalTimelineWidth, scrollOffset, setCurrentTime])

  // Wheel scroll handler for horizontal scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const scrollSpeed = 50
    const deltaX = e.deltaX !== 0 ? e.deltaX : e.deltaY
    const newScrollOffset = Math.max(0, Math.min(maxScrollOffset, scrollOffset + deltaX * scrollSpeed / 100))
    setScrollOffset(newScrollOffset)
  }, [scrollOffset, maxScrollOffset])

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (duration > 0) {
      const playheadPosition = (currentTime / duration) * totalTimelineWidth
      const viewportWidth = pixiSize.width - HEADER_WIDTH
      const viewportStart = scrollOffset
      const viewportEnd = scrollOffset + viewportWidth
      
      // Auto-scroll if playhead is outside visible area
      if (playheadPosition < viewportStart) {
        setScrollOffset(Math.max(0, playheadPosition - viewportWidth * 0.2))
      } else if (playheadPosition > viewportEnd) {
        setScrollOffset(Math.min(maxScrollOffset, playheadPosition - viewportWidth * 0.8))
      }
    }
  }, [currentTime, duration, totalTimelineWidth, pixiSize.width, maxScrollOffset])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return // Only handle when timeline is focused
      
      const scrollSpeed = 100
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setScrollOffset(prev => Math.max(0, prev - scrollSpeed))
          break
        case 'ArrowRight':
          e.preventDefault()
          setScrollOffset(prev => Math.min(maxScrollOffset, prev + scrollSpeed))
          break
        case 'Home':
          e.preventDefault()
          setScrollOffset(0)
          break
        case 'End':
          e.preventDefault()
          setScrollOffset(maxScrollOffset)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [maxScrollOffset])

  const dynamicHeight = calculateTimelineHeight()
  
  return (
    <div style={{ position: 'relative', width: '100%', height: Math.max(dynamicHeight + 40, height) }}>
      {/* Main Timeline Canvas */}
      <div 
        ref={pixiContainerRef}
        style={{ 
          width: '100%',
          height: Math.max(dynamicHeight, height - 20), // Use dynamic height or leave space for scrollbar
          overflow: 'hidden',
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          cursor: isDraggingPlayhead ? 'grabbing' : 'default',
          background: theme.backgroundSecondary, // Fallback background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        tabIndex={0} // Make focusable for keyboard events
      >
        {pixiLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: theme.text,
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Timeline Loading...
          </div>
        )}
      </div>
      
      {/* Horizontal Scrollbar */}
      {totalTimelineWidth > (pixiSize.width - HEADER_WIDTH) && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: HEADER_WIDTH,
          right: 0,
          height: '20px',
          background: theme.backgroundTertiary,
          border: `1px solid ${theme.border}`,
          borderTop: 'none',
          borderRadius: '0 0 4px 4px'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%'
          }}>
            {/* Scrollbar Track */}
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              right: '4px',
              height: '12px',
              background: theme.background,
              borderRadius: '6px'
            }}>
              {/* Scrollbar Thumb */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${(scrollOffset / maxScrollOffset) * 100}%`,
                  width: `${Math.max(20, ((pixiSize.width - HEADER_WIDTH) / totalTimelineWidth) * 100)}%`,
                  height: '100%',
                  background: theme.accent,
                  borderRadius: '6px',
                  cursor: 'grab'
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  const startX = e.clientX
                  const startOffset = scrollOffset
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaX = e.clientX - startX
                    const trackWidth = (pixiSize.width - HEADER_WIDTH - 8) // Account for padding
                    const scrollDelta = (deltaX / trackWidth) * totalTimelineWidth
                    const newOffset = Math.max(0, Math.min(maxScrollOffset, startOffset + scrollDelta))
                    setScrollOffset(newOffset)
                  }
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              />
            </div>
            
            {/* Scroll Position Indicator */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: '8px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              fontSize: '10px',
              color: theme.textSecondary
            }}>
              {Math.round((scrollOffset / totalTimelineWidth) * duration * 10) / 10}s
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PixiTimeline