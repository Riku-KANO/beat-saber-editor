import React, { useRef, useEffect, useState } from 'react'
import { Application, Graphics, Container } from 'pixi.js'
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
  
  // Store immutable channel data for waveform rendering
  const [immutableChannelData, setImmutableChannelData] = useState<Float32Array | null>(null)
  const [globalMaxAmplitude, setGlobalMaxAmplitude] = useState<number>(0)
  
  const { 
    objects, 
    currentTime, 
    duration, 
    selectedObjectId,
    isEditorPlaying,
    bpm,
    beatsPerMeasure,
    setCurrentTime, 
    setSelectedObject,
    audioBuffer,
    setIsEditorPlaying,
    pauseAudio
  } = useEditorStore()

  const totalTimelineWidth = getTimelineWidth(duration)
  const scrollOffset = 0 // Start with no scrolling for simplicity

  // Create immutable copy of channel data when audio buffer changes
  useEffect(() => {
    if (audioBuffer) {
      const originalChannelData = audioBuffer.getChannelData(0)
      
      // Create an immutable copy of the channel data
      const immutableCopy = new Float32Array(originalChannelData.length)
      for (let i = 0; i < originalChannelData.length; i++) {
        immutableCopy[i] = originalChannelData[i]
      }
      
      setImmutableChannelData(immutableCopy)
      
      // Calculate max amplitude from the immutable copy
      let maxAmplitude = 0
      for (let i = 0; i < immutableCopy.length; i++) {
        const abs = Math.abs(immutableCopy[i])
        if (abs > maxAmplitude) maxAmplitude = abs
      }
      
      const finalMaxAmplitude = maxAmplitude > 0 ? maxAmplitude : 0.1
      setGlobalMaxAmplitude(finalMaxAmplitude)
    } else {
      setGlobalMaxAmplitude(0)
      setImmutableChannelData(null)
    }
  }, [audioBuffer])

  // Initialize PixiJS application
  useEffect(() => {
    if (!pixiContainerRef.current) return

    const app = new Application()
    
    const initializePixi = async () => {
      await app.init({
        width: pixiSize.width,
        height: pixiSize.height,
        backgroundColor: 0x1a1a1a, // Dark background
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      })
      
      pixiContainerRef.current?.appendChild(app.canvas)
      pixiAppRef.current = app
      
      // Initial render
      renderTimeline()
    }

    initializePixi()

    return () => {
      if (pixiAppRef.current) {
        try {
          pixiAppRef.current.destroy(true, true)
        } catch (error) {
          console.warn('Error destroying PixiJS application:', error)
        }
        pixiAppRef.current = null
      }
    }
  }, [pixiSize])

  // Resize observer
  useEffect(() => {
    const updatePixiSize = () => {
      if (pixiContainerRef.current) {
        const rect = pixiContainerRef.current.getBoundingClientRect()
        const width = Math.max(400, rect.width)
        const newHeight = Math.max(200, rect.height)
        setPixiSize({ width, height: newHeight })
      }
    }

    updatePixiSize()
    window.addEventListener('resize', updatePixiSize)
    
    return () => {
      window.removeEventListener('resize', updatePixiSize)
    }
  }, [])

  // Render timeline when data changes
  useEffect(() => {
    if (pixiAppRef.current) {
      renderTimeline()
    }
  }, [
    pixiSize.width, pixiSize.height, duration, totalTimelineWidth, 
    currentTime, objects, selectedObjectId, immutableChannelData, 
    globalMaxAmplitude, isEditorPlaying, theme
  ])

  const renderTimeline = () => {
    const app = pixiAppRef.current
    if (!app) return

    // Clear the stage
    app.stage.removeChildren()

    // Create main container
    const timelineContainer = new Container()
    app.stage.addChild(timelineContainer)

    // Draw background
    const background = new Graphics()
      .rect(0, 0, pixiSize.width, pixiSize.height)
      .fill(0x1a1a1a)
    timelineContainer.addChild(background)

    // Draw waveform if available
    if (immutableChannelData && duration > 0 && globalMaxAmplitude > 0) {
      drawWaveform(timelineContainer)
    }

    // Draw time grid
    drawTimeGrid(timelineContainer)

    // Draw object tracks
    drawObjectTracks(timelineContainer)

    // Draw playhead
    drawPlayhead(timelineContainer)
  }

  const drawWaveform = (container: Container) => {
    if (!immutableChannelData || duration === 0 || globalMaxAmplitude === 0) return

    const waveformHeight = 100
    const waveformCenterY = 60

    const channelData = immutableChannelData
    const totalSamples = channelData.length

    // Calculate FIXED time-to-pixel ratio
    const PIXELS_PER_SECOND = totalTimelineWidth / duration
    const FIXED_AMPLITUDE_SCALE = (waveformHeight * 1.5) / (2 * globalMaxAmplitude)

    // Calculate visible range
    const contentWidth = pixiSize.width - HEADER_WIDTH
    const visibleStartTime = Math.max(0, (scrollOffset / totalTimelineWidth) * duration)

    const waveformGraphics = new Graphics()
    
    // Draw waveform
    let isFirstPoint = true
    const startPixelInTimeline = visibleStartTime * PIXELS_PER_SECOND

    for (let x = 0; x < contentWidth; x++) {
      const absoluteTime = (startPixelInTimeline + x) / PIXELS_PER_SECOND
      
      if (absoluteTime >= duration || absoluteTime < 0) continue
      
      const exactSampleIndex = (absoluteTime / duration) * totalSamples
      const sampleIndex = Math.floor(exactSampleIndex)
      
      if (sampleIndex >= 0 && sampleIndex < totalSamples) {
        const sample = channelData[sampleIndex]
        const y = waveformCenterY - (sample * FIXED_AMPLITUDE_SCALE)
        const canvasX = HEADER_WIDTH + x
        
        if (isFirstPoint) {
          waveformGraphics.moveTo(canvasX, y)
          isFirstPoint = false
        } else {
          waveformGraphics.lineTo(canvasX, y)
        }
      }
    }
    
    waveformGraphics.stroke({ width: 1, color: 0x4CAF50 }) // Green waveform

    // Draw center line
    waveformGraphics
      .moveTo(HEADER_WIDTH, waveformCenterY)
      .lineTo(HEADER_WIDTH + contentWidth, waveformCenterY)
      .stroke({ width: 0.5, color: 0x666666, alpha: 0.5 })

    container.addChild(waveformGraphics)
  }

  const drawTimeGrid = (container: Container) => {
    if (duration === 0) return

    const gridGraphics = new Graphics()
    const contentWidth = pixiSize.width - HEADER_WIDTH
    
    // Main time markers (seconds)
    const visibleStartTime = Math.max(0, (scrollOffset / totalTimelineWidth) * duration)
    const visibleEndTime = Math.min(duration, ((scrollOffset + contentWidth) / totalTimelineWidth) * duration)
    
    const startSecond = Math.floor(visibleStartTime)
    const endSecond = Math.ceil(visibleEndTime)
    
    for (let i = startSecond; i <= endSecond; i++) {
      const x = HEADER_WIDTH + ((i / duration) * totalTimelineWidth) - scrollOffset
      if (x >= HEADER_WIDTH && x <= pixiSize.width) {
        gridGraphics
          .moveTo(x, 30)
          .lineTo(x, pixiSize.height)
          .stroke({ width: 1, color: 0x333333, alpha: 0.5 })
      }
    }

    container.addChild(gridGraphics)
  }

  const drawObjectTracks = (container: Container) => {
    const contentWidth = pixiSize.width - HEADER_WIDTH

    objects.forEach((obj, index) => {
      const trackY = 120 + index * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      // Track background
      const trackBg = new Graphics()
        .rect(HEADER_WIDTH, trackY, contentWidth, trackHeight)
        .fill(selectedObjectId === obj.id ? 0x2a2a2a : 0x1f1f1f)
        .stroke({ width: 1, color: 0x333333 })
      
      container.addChild(trackBg)

      // Draw keyframes
      obj.keyframes.forEach((keyframe) => {
        const x = HEADER_WIDTH + ((keyframe.time / duration) * totalTimelineWidth) - scrollOffset
        if (x >= HEADER_WIDTH && x <= pixiSize.width) {
          const keyframeCircle = new Graphics()
            .circle(x, trackY + trackHeight / 2, 5)
            .fill(0x4CAF50)
            .stroke({ width: 1, color: 0xffffff })
          
          container.addChild(keyframeCircle)
        }
      })
    })
  }

  const drawPlayhead = (container: Container) => {
    if (duration === 0) return
    
    const playheadX = HEADER_WIDTH + ((currentTime / duration) * totalTimelineWidth) - scrollOffset
    
    if (playheadX >= HEADER_WIDTH && playheadX <= pixiSize.width) {
      const playheadGraphics = new Graphics()
        .moveTo(playheadX, 0)
        .lineTo(playheadX, pixiSize.height)
        .stroke({ width: 2, color: 0xff4444 })
      
      // Playhead handle
      playheadGraphics
        .rect(playheadX - 5, 0, 10, 20)
        .fill(0xff4444)
      
      container.addChild(playheadGraphics)
    }
  }

  return (
    <div 
      ref={pixiContainerRef}
      style={{ 
        width: '100%',
        height: height,
        overflow: 'hidden',
        border: '1px solid #333',
        borderRadius: '4px'
      }}
    />
  )
}

export default PixiTimeline