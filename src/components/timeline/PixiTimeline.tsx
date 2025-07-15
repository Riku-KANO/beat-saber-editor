import { useEffect, useCallback } from 'react'
import { Container, Graphics } from 'pixi.js'
import { useTimeline } from './hooks/useTimeline'
import { 
  drawBackground,
  drawWaveformTrackBackground,
  drawTimeGrid,
  drawTrackHeaders,
  drawObjectTracks
} from './utils/timelineDrawing'
import { createMouseEventHandlers, createKeyboardEventHandlers } from './utils/timelineEvents'

interface PixiTimelineProps {
  height?: number
}

const TRACK_HEIGHT = 60
const HEADER_WIDTH = 120

function PixiTimeline({ height = 300 }: PixiTimelineProps) {
  const timeline = useTimeline()
  
  // Create immutable copy of channel data when audio buffer changes
  useEffect(() => {
    if (timeline.audioBuffer) {
      const originalChannelData = timeline.audioBuffer.getChannelData(0)
      
      const immutableCopy = new Float32Array(originalChannelData.length)
      for (let i = 0; i < originalChannelData.length; i++) {
        immutableCopy[i] = originalChannelData[i]
      }
      
      timeline.setImmutableChannelData(null)
      timeline.setGlobalMaxAmplitude(0)
      
      setTimeout(() => {
        timeline.setImmutableChannelData(immutableCopy)
        
        let maxAmplitude = 0
        for (let i = 0; i < immutableCopy.length; i++) {
          const abs = Math.abs(immutableCopy[i])
          if (abs > maxAmplitude) maxAmplitude = abs
        }
        
        const finalMaxAmplitude = maxAmplitude > 0 ? maxAmplitude : 0.1
        timeline.setGlobalMaxAmplitude(finalMaxAmplitude)
      }, 0)
    } else {
      timeline.setGlobalMaxAmplitude(0)
      timeline.setImmutableChannelData(null)
    }
  }, [timeline.audioBuffer, timeline.duration])

  // Initialize PixiJS application
  useEffect(() => {
    if (!timeline.pixiContainerRef.current) return
    
    // Prevent multiple initializations
    const webglManager = timeline.webglManagerRef.current
    if (webglManager.getApp()) {
      console.warn('PixiJS app already initialized, skipping')
      return
    }

    const initializePixi = async () => {
      // Clear any existing canvas elements in the container
      const existingCanvases = timeline.pixiContainerRef.current?.querySelectorAll('canvas')
      existingCanvases?.forEach(canvas => {
        if (canvas.parentElement === timeline.pixiContainerRef.current) {
          timeline.pixiContainerRef.current?.removeChild(canvas)
        }
      })
      
      const app = await webglManager.initializePixiApp({
        width: timeline.pixiSize.width,
        height: timeline.pixiSize.height,
        hexToPixi: timeline.hexToPixi,
        themeBackground: timeline.theme.background,
        onContextLost: () => timeline.setPixiLoading(true),
        onContextRestored: () => {
          setTimeout(() => {
            if (webglManager.isValid()) {
              renderTimeline()
              timeline.setPixiLoading(false)
            }
          }, 200)
        }
      })

      if (!app || !timeline.pixiContainerRef.current) {
        console.error('Failed to initialize PixiJS or container not available')
        return
      }

      // Configure and add canvas only if not already added
      const canvas = app.canvas as HTMLCanvasElement
      webglManager.configureCanvas(canvas)
      
      // Check if canvas is already in the container to prevent duplicates
      if (!timeline.pixiContainerRef.current.contains(canvas)) {
        timeline.pixiContainerRef.current.appendChild(canvas)
      }
      
      // Resize to match container
      webglManager.resizeApp(timeline.pixiSize.width, timeline.pixiSize.height)
      
      // Set initial background color
      app.renderer.background.color = timeline.hexToPixi(timeline.theme.background)
      
      // Initial render
      renderTimeline()
      timeline.setPixiLoading(false)
    }

    initializePixi()

    return () => {
      const webglManager = timeline.webglManagerRef.current
      const app = webglManager.getApp()
      
      // Remove canvas from DOM before destroying
      if (app && timeline.pixiContainerRef.current) {
        const canvas = app.canvas as HTMLCanvasElement
        if (canvas.parentElement === timeline.pixiContainerRef.current) {
          timeline.pixiContainerRef.current.removeChild(canvas)
        }
      }
      
      // Clean up containers
      webglManager.cleanupContainers([
        timeline.timelineContainerRef.current,
        timeline.backgroundContainerRef.current,
        timeline.gridContainerRef.current,
        timeline.headersContainerRef.current,
        timeline.objectTracksContainerRef.current,
        timeline.playheadRef.current,
        timeline.waveformRef.current
      ])
      
      // Reset refs
      timeline.timelineContainerRef.current = null
      timeline.backgroundContainerRef.current = null
      timeline.gridContainerRef.current = null
      timeline.headersContainerRef.current = null
      timeline.objectTracksContainerRef.current = null
      timeline.playheadRef.current = null
      timeline.waveformRef.current = null
      
      // Destroy WebGL manager (this will destroy the PixiJS app)
      webglManager.destroy()
    }
  }, [timeline.theme]) // Only recreate when theme changes

  // Handle size changes
  useEffect(() => {
    const webglManager = timeline.webglManagerRef.current
    const app = webglManager.getApp()
    
    if (app && webglManager.isValid()) {
      if (webglManager.resizeApp(timeline.pixiSize.width, timeline.pixiSize.height)) {
        if (timeline.timelineContainerRef.current) {
          renderTimeline()
        }
      }
    }
  }, [timeline.pixiSize])

  // Setup ResizeObserver for responsive resize handling
  useEffect(() => {
    const updatePixiSize = () => {
      if (timeline.pixiContainerRef.current) {
        const rect = timeline.pixiContainerRef.current.getBoundingClientRect()
        const width = Math.max(400, rect.width)
        const dynamicHeight = timeline.calculateTimelineHeight()
        const newHeight = Math.max(dynamicHeight, Math.min(rect.height, height))
        timeline.setPixiSize({ width, height: newHeight })
      }
    }

    // Initial size setup
    updatePixiSize()
    
    // ResizeObserver for container size changes (handled by WebGLManager)
    // Window resize as fallback
    window.addEventListener('resize', updatePixiSize)
    
    return () => {
      window.removeEventListener('resize', updatePixiSize)
    }
  }, [timeline.objects.length, height, timeline.calculateTimelineHeight])

  // Main render function
  const renderTimeline = useCallback(() => {
    const webglManager = timeline.webglManagerRef.current
    const app = webglManager.getApp()
    
    if (!app || !webglManager.isValid()) {
      console.warn('PixiJS app not available for renderTimeline')
      return
    }

    const colors = timeline.getThemeColors()
    const context = timeline.getDrawingContext()

    // Initialize containers if needed
    if (!timeline.timelineContainerRef.current) {
      const timelineContainer = new Container()
      timelineContainer.x = 0
      timelineContainer.y = 0
      app.stage.addChild(timelineContainer)
      timeline.timelineContainerRef.current = timelineContainer

      // Create and configure sub-containers
      const backgroundContainer = new Container()
      backgroundContainer.x = 0
      backgroundContainer.y = 0
      
      const gridContainer = new Container()
      gridContainer.x = 0
      gridContainer.y = 0
      
      const headersContainer = new Container()
      headersContainer.x = 0
      headersContainer.y = 0
      
      const objectTracksContainer = new Container()
      objectTracksContainer.x = 0
      objectTracksContainer.y = 0
      
      const playheadContainer = new Container()
      playheadContainer.x = 0
      playheadContainer.y = 0
      
      timelineContainer.addChild(backgroundContainer)
      timelineContainer.addChild(gridContainer)
      timelineContainer.addChild(headersContainer)
      timelineContainer.addChild(objectTracksContainer)
      timelineContainer.addChild(playheadContainer)
      
      timeline.backgroundContainerRef.current = backgroundContainer
      timeline.gridContainerRef.current = gridContainer
      timeline.headersContainerRef.current = headersContainer
      timeline.objectTracksContainerRef.current = objectTracksContainer
      timeline.playheadRef.current = playheadContainer
    }

    // Always redraw all elements
    if (timeline.backgroundContainerRef.current) {
      drawBackground(timeline.backgroundContainerRef.current, colors, context)
      drawWaveformTrackBackground(timeline.backgroundContainerRef.current, colors, context)
    }

    if (timeline.gridContainerRef.current) {
      timeline.gridContainerRef.current.x = 0
      timeline.gridContainerRef.current.y = 0
      drawTimeGrid(timeline.gridContainerRef.current, colors, context)
    }

    if (timeline.headersContainerRef.current) {
      timeline.headersContainerRef.current.x = 0
      timeline.headersContainerRef.current.y = 0
      drawTrackHeaders(timeline.headersContainerRef.current, colors, context)
    }

    if (timeline.objectTracksContainerRef.current) {
      timeline.objectTracksContainerRef.current.x = 0
      timeline.objectTracksContainerRef.current.y = 0
      drawObjectTracks(timeline.objectTracksContainerRef.current, colors, context)
    }

    updateWaveform(colors)
    updatePlayhead()
  }, [timeline])

  // Update waveform display
  const updateWaveform = useCallback((colors: any) => {
    if (!timeline.timelineContainerRef.current) return
    
    // Remove existing waveform
    if (timeline.waveformRef.current) {
      timeline.timelineContainerRef.current.removeChild(timeline.waveformRef.current)
      timeline.waveformRef.current = null
    }
    
    if (timeline.immutableChannelData && timeline.immutableChannelData.length > 0 && timeline.duration > 0) {
      const waveformGraphics = new Graphics()
      const waveformTrackY = 30
      const waveformTrackHeight = TRACK_HEIGHT - 2
      const waveformCenterY = waveformTrackY + waveformTrackHeight / 2
      const contentWidth = timeline.pixiSize.width - HEADER_WIDTH
      
      // Calculate amplitude scale
      let maxAmplitude = 0
      for (let i = 0; i < timeline.immutableChannelData.length; i++) {
        const abs = Math.abs(timeline.immutableChannelData[i])
        if (abs > maxAmplitude) maxAmplitude = abs
      }
      
      const effectiveAmplitude = maxAmplitude > 0 ? maxAmplitude : 0.1
      const amplitudeScale = (waveformTrackHeight * 0.4) / effectiveAmplitude
      
      // Calculate visible time range
      const visibleStartTime = (timeline.scrollOffset / timeline.totalTimelineWidth) * timeline.duration
      const visibleEndTime = ((timeline.scrollOffset + contentWidth) / timeline.totalTimelineWidth) * timeline.duration
      
      // Draw waveform
      for (let x = 0; x < contentWidth; x += 1) {
        const timeAtPixel = visibleStartTime + (x / contentWidth) * (visibleEndTime - visibleStartTime)
        const exactSampleIndex = (timeAtPixel / timeline.duration) * timeline.immutableChannelData.length
        const sampleIndex = Math.floor(exactSampleIndex)
        
        if (sampleIndex >= 0 && sampleIndex < timeline.immutableChannelData.length) {
          const sample = timeline.immutableChannelData[sampleIndex]
          const barHeight = Math.abs(sample) * amplitudeScale
          const isPositive = sample >= 0
          
          if (isPositive) {
            waveformGraphics
              .rect(HEADER_WIDTH + x, waveformCenterY - barHeight, 1, barHeight)
              .fill(colors.waveform)
          } else {
            waveformGraphics
              .rect(HEADER_WIDTH + x, waveformCenterY, 1, barHeight)
              .fill(colors.waveformNegative)
          }
        }
      }
      
      timeline.timelineContainerRef.current.addChild(waveformGraphics)
      timeline.waveformRef.current = waveformGraphics
    }
  }, [timeline])

  // Update playhead position
  const updatePlayhead = useCallback(() => {
    if (!timeline.playheadRef.current || timeline.duration === 0) return
    
    timeline.playheadRef.current.removeChildren()
    
    const playheadX = HEADER_WIDTH + ((timeline.currentTime / timeline.duration) * timeline.totalTimelineWidth) - timeline.scrollOffset
    
    if (playheadX >= HEADER_WIDTH && playheadX <= timeline.pixiSize.width) {
      // Playhead line
      const playheadLine = new Graphics()
      playheadLine
        .moveTo(playheadX, 0)
        .lineTo(playheadX, timeline.pixiSize.height)
        .stroke({ width: 2, color: 0xff4444, pixelLine: true })
      
      // Playhead handle
      const playheadHandle = new Graphics()
      playheadHandle
        .rect(playheadX - 5, 0, 10, 20)
        .fill(0xff4444)
      
      playheadHandle.eventMode = 'static'
      playheadHandle.cursor = 'grab'
      
      timeline.playheadRef.current.addChild(playheadLine)
      timeline.playheadRef.current.addChild(playheadHandle)
    }
  }, [timeline])

  // Render timeline when data changes
  useEffect(() => {
    const webglManager = timeline.webglManagerRef.current
    if (webglManager.getApp() && webglManager.isValid()) {
      renderTimeline()
    }
  }, [renderTimeline])

  // Force re-render when waveform data changes
  useEffect(() => {
    const colors = timeline.getThemeColors()
    updateWaveform(colors)
  }, [timeline.immutableChannelData, updateWaveform])

  // Update playhead when currentTime changes
  useEffect(() => {
    updatePlayhead()
  }, [timeline.currentTime, updatePlayhead])

  // Handle theme changes
  useEffect(() => {
    const webglManager = timeline.webglManagerRef.current
    const app = webglManager.getApp()
    
    if (app && webglManager.isValid()) {
      app.renderer.background.color = timeline.hexToPixi(timeline.theme.background)
      renderTimeline()
    }
  }, [timeline.theme, renderTimeline])

  // Event handlers
  const eventHandlers = {
    setCurrentTime: timeline.setCurrentTime,
    setScrollOffset: timeline.setScrollOffset,
    setIsDraggingPlayhead: timeline.setIsDraggingPlayhead
  }

  const eventContext = {
    duration: timeline.duration,
    totalTimelineWidth: timeline.totalTimelineWidth,
    scrollOffset: timeline.scrollOffset,
    maxScrollOffset: timeline.maxScrollOffset,
    pixiSize: timeline.pixiSize,
    bpm: timeline.bpm,
    beatsPerMeasure: timeline.beatsPerMeasure,
    currentTime: timeline.currentTime
  }

  const mouseHandlers = createMouseEventHandlers(eventHandlers, eventContext, timeline.pixiContainerRef)
  const keyboardHandlers = createKeyboardEventHandlers(eventHandlers, eventContext)

  // Keyboard events
  useEffect(() => {
    document.addEventListener('keydown', keyboardHandlers.handleKeyDown)
    return () => document.removeEventListener('keydown', keyboardHandlers.handleKeyDown)
  }, [timeline.maxScrollOffset])

  const dynamicHeight = timeline.calculateTimelineHeight()
  
  return (
    <div style={{ position: 'relative', width: '100%', height: Math.max(dynamicHeight + 40, height) }}>
      <div 
        ref={timeline.pixiContainerRef}
        style={{ 
          width: '100%',
          height: Math.max(dynamicHeight, height - 20),
          overflow: 'hidden',
          border: `1px solid ${timeline.theme.border}`,
          borderRadius: '4px',
          cursor: timeline.isDraggingPlayhead ? 'grabbing' : 'default',
          background: timeline.theme.backgroundSecondary,
          position: 'relative'
        }}
        onMouseDown={mouseHandlers.handleMouseDown}
        onMouseMove={(e) => mouseHandlers.handleMouseMove(e, timeline.isDraggingPlayhead)}
        onMouseUp={mouseHandlers.handleMouseUp}
        onWheel={mouseHandlers.handleWheel}
        tabIndex={0}
      >
        {timeline.pixiLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: timeline.theme.text,
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Timeline Loading...
          </div>
        )}
      </div>
      
      {/* Horizontal Scrollbar */}
      {timeline.totalTimelineWidth > (timeline.pixiSize.width - HEADER_WIDTH) && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: HEADER_WIDTH,
          right: 0,
          height: '20px',
          background: timeline.theme.backgroundTertiary,
          border: `1px solid ${timeline.theme.border}`,
          borderTop: 'none',
          borderRadius: '0 0 4px 4px'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%'
          }}>
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              right: '4px',
              height: '12px',
              background: timeline.theme.background,
              borderRadius: '6px'
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${(timeline.scrollOffset / timeline.maxScrollOffset) * 100}%`,
                  width: `${Math.max(20, ((timeline.pixiSize.width - HEADER_WIDTH) / timeline.totalTimelineWidth) * 100)}%`,
                  height: '100%',
                  background: timeline.theme.accent,
                  borderRadius: '6px',
                  cursor: 'grab'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PixiTimeline