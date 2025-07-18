import '@pixi/layout' // Import layout before PixiJS to ensure mixins are applied
import '@pixi/react';
import '@pixi/layout/react';
import { LayoutContainer } from '@pixi/layout/components'
import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { useEditorStore } from '../../store/editorStore'
import { useTheme } from '../../contexts/ThemeContext'



// Extend @pixi/react with PIXI components
extend({ Container, Graphics, Text, LayoutContainer })

interface ReactPixiTimelineProps {
  height?: number
}

const TRACK_HEIGHT = 60
const HEADER_WIDTH = 120

function ReactPixiTimeline({ height = 300 }: ReactPixiTimelineProps) {
  const { theme } = useTheme()
  const [viewportWidth, setViewportWidth] = useState(800)
  const [scrollX, setScrollX] = useState(0)
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<any>(null)

  const {
    objects = [],
    selectedObjectId,
    currentTime = 0,
    duration = 0,
    audioBuffer,
    setCurrentTime
  } = useEditorStore()

  // Color conversion utility
  const hexToPixi = useCallback((hex: string): number => {
    if (!hex) return 0x000000
    const cleanHex = hex.replace('#', '')
    const parsed = parseInt(cleanHex, 16)
    return isNaN(parsed) ? 0x000000 : parsed
  }, [])

  // Theme colors for PixiJS
  const colors = useMemo(() => ({
    background: hexToPixi(theme.background),
    backgroundSecondary: hexToPixi(theme.backgroundSecondary),
    backgroundTertiary: hexToPixi(theme.backgroundTertiary),
    border: hexToPixi(theme.border),
    text: hexToPixi(theme.text),
    textSecondary: hexToPixi(theme.textSecondary),
    accent: hexToPixi(theme.accent),
  }), [theme, hexToPixi])

  // Timeline dimensions
  const timelineWidth = useMemo(() => {
    if (duration === 0) return 800
    return Math.max(800, duration * 100) // 100px per second
  }, [duration])

  const timelineHeight = useMemo(() => {
    const headerHeight = 30
    const waveformHeight = TRACK_HEIGHT
    const objectTracksHeight = objects.length * TRACK_HEIGHT
    return Math.max(height, headerHeight + waveformHeight + objectTracksHeight + 40)
  }, [objects.length, height])

  // Enhanced text style for headers
  const headerTextStyle = useMemo(() => ({
    fontFamily: 'system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600' as const,
    fill: colors.text
  }), [colors.text])
  
  const subTextStyle = useMemo(() => ({
    fontFamily: 'system-ui, sans-serif', 
    fontSize: 10,
    fontWeight: '400' as const,
    fill: colors.textSecondary
  }), [colors.textSecondary])

  // Text style
  const textStyle = useMemo(() => ({
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '500' as const,
    fill: colors.text
  }), [colors.text])

  // Timeline click handling
  const handleClick = useCallback((event: any) => {
    if (!setCurrentTime || duration === 0) return
    
    const globalPosition = event.data.global
    const timelineX = globalPosition.x + scrollX
    
    if (timelineX >= 0) {
      const newTime = (timelineX / timelineWidth) * duration
      setCurrentTime(Math.max(0, Math.min(duration, newTime)))
    }
  }, [timelineWidth, duration, setCurrentTime, scrollX])

  // Viewport width updates
  useEffect(() => {
    const updateViewportWidth = () => {
      if (timelineContainerRef.current) {
        const rect = timelineContainerRef.current.getBoundingClientRect()
        setViewportWidth(Math.max(400, rect.width - HEADER_WIDTH - 20))
      }
    }
    
    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  // Drawing functions (drawHeader removed as layout handles backgrounds)

  const drawTimeGrid = useCallback((graphics: Graphics) => {
    graphics.clear()
    if (duration === 0) return

    const secondWidth = timelineWidth / duration
    
    // Only draw visible grid lines
    const startSecond = Math.floor(scrollX / secondWidth)
    const endSecond = Math.ceil((scrollX + viewportWidth) / secondWidth)
    
    for (let second = startSecond; second <= Math.min(endSecond, duration); second++) {
      const x = second * secondWidth
      if (x >= scrollX && x <= scrollX + viewportWidth) {
        graphics.moveTo(x, 0)
        graphics.lineTo(x, timelineHeight)
        graphics.stroke({ width: second % 5 === 0 ? 2 : 1, color: colors.border, alpha: 0.3 })
      }
    }
  }, [duration, timelineWidth, timelineHeight, scrollX, viewportWidth, colors.border])

  const drawWaveform = useCallback((graphics: Graphics) => {
    graphics.clear()
    if (!audioBuffer || duration === 0) return

    const channelData = audioBuffer.getChannelData(0)
    const trackCenterY = TRACK_HEIGHT / 2
    const trackHeight = TRACK_HEIGHT - 10

    // Only draw visible portion of waveform
    const startX = Math.max(0, scrollX)
    const endX = Math.min(timelineWidth, scrollX + viewportWidth)
    
    for (let x = startX; x < endX; x += 2) {
      const sampleIndex = Math.floor((x / timelineWidth) * channelData.length)
      if (sampleIndex >= 0 && sampleIndex < channelData.length) {
        const sample = channelData[sampleIndex]
        const barHeight = Math.abs(sample) * trackHeight * 0.5
        
        if (sample >= 0) {
          graphics.rect(x, trackCenterY - barHeight, 2, barHeight)
        } else {
          graphics.rect(x, trackCenterY, 2, barHeight)
        }
        graphics.fill(colors.accent)
      }
    }
  }, [audioBuffer, duration, timelineWidth, scrollX, viewportWidth, colors.accent])

  const drawPlayhead = useCallback((graphics: Graphics) => {
    graphics.clear()
    if (duration === 0) return
    
    const playheadX = (currentTime / duration) * timelineWidth - scrollX
    
    // Only draw playhead if it's visible in the viewport
    if (playheadX >= 0 && playheadX <= viewportWidth) {
      // Draw playhead line across full timeline height
      graphics.moveTo(playheadX, 0)
      graphics.lineTo(playheadX, timelineHeight)
      graphics.stroke({ width: 2, color: 0xff4444 })
      
      // Playhead handle at top
      graphics.rect(playheadX - 5, 0, 10, 20)
      graphics.fill(0xff4444)
    }
  }, [currentTime, duration, timelineWidth, scrollX, viewportWidth, timelineHeight])

  return (
    <div
      ref={timelineContainerRef}
      style={{ 
        width: '100%', 
        height: timelineHeight + 40,
        border: `1px solid ${theme.border}`,
        borderRadius: '4px',
        background: theme.backgroundSecondary,
        position: 'relative',
        overflow: 'hidden'
      }}
      tabIndex={0}
    >
      <Application
        width={viewportWidth + HEADER_WIDTH}
        height={timelineHeight}
        antialias={true}
        resolution={window.devicePixelRatio || 1}
        backgroundColor={colors.background}
        resizeTo={timelineContainerRef}
      >
        {/* Main Timeline Layout Container */}
        <layoutContainer
          layout={{
            width: '100%',
            height: '100%',
            flexDirection: 'row'
          }}
        >
          {/* Fixed Header Column */}
          <pixiContainer 
            layout={{
              width: HEADER_WIDTH,
              height: '100%',
              flexDirection: 'column',
              backgroundColor: colors.backgroundTertiary,
              position: 'relative'
            }}
          >
            {/* Top Header Area */}
            <pixiContainer 
              layout={{
                width: '100%',
                height: 30 + TRACK_HEIGHT,
                flexDirection: 'column',
                backgroundColor: colors.backgroundTertiary
              }}
            >
              <pixiText
                text={`${currentTime.toFixed(2)}s`}
                x={10}
                y={5}
                style={textStyle}
              />
              
              <pixiText
                text="Audio"
                x={10}
                y={40}
                style={textStyle}
              />
            </pixiContainer>

            {/* Track Headers - Fixed */}
            <pixiContainer 
              layout={{
                width: '100%',
                flex: 1,
                flexDirection: 'column',
                backgroundColor: colors.backgroundTertiary
              }}
            >
              {objects.map((obj) => {
                const isSelected = selectedObjectId === obj.id

                return (
                  <pixiContainer 
                    key={`header-${obj.id}`}
                    layout={{
                      width: '100%',
                      height: TRACK_HEIGHT,
                      backgroundColor: isSelected ? colors.backgroundSecondary : colors.backgroundTertiary,
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderTopWidth: 1,
                      borderColor: colors.border
                    }}
                  >
                    <pixiText
                      text={obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}
                      x={20}
                      y={20}
                      style={headerTextStyle}
                    />
                    
                    <pixiText
                      text={obj.keyframes.length.toString()}
                      x={100}
                      y={35}
                      style={subTextStyle}
                    />
                  </pixiContainer>
                )
              })}
            </pixiContainer>
          </pixiContainer>

          {/* Scrollable Content Column */}
          <layoutContainer
            ref={scrollContainerRef}
            layout={{
              flex: 1,
              height: '100%',
              flexDirection: 'column',
              overflowX: 'scroll'
            }}
            trackpad={{ constrain: true }}
            onPointerDown={handleClick}
            onScroll={(e: any) => setScrollX(e.scrollX || 0)}
          >
            {/* Scrollable Content Container */}
            <pixiContainer 
              layout={{
                width: timelineWidth,
                height: '100%',
                flexDirection: 'column'
              }}
            >
              {/* Timeline Header */}
              <pixiContainer 
                layout={{
                  width: timelineWidth,
                  height: 30,
                  backgroundColor: colors.backgroundTertiary
                }}
              >
                <pixiGraphics draw={drawTimeGrid} />
              </pixiContainer>

              {/* Waveform Track */}
              <pixiContainer 
                layout={{
                  width: timelineWidth,
                  height: TRACK_HEIGHT,
                  backgroundColor: colors.backgroundSecondary,
                  position: 'relative'
                }}
              >
                <pixiGraphics draw={drawWaveform} />
              </pixiContainer>

              {/* Object Tracks */}
              {objects.map((obj) => {
                const isSelected = selectedObjectId === obj.id

                return (
                  <pixiContainer 
                    key={obj.id}
                    layout={{
                      width: timelineWidth,
                      height: TRACK_HEIGHT,
                      backgroundColor: isSelected ? colors.backgroundTertiary : colors.backgroundSecondary,
                      borderTopWidth: 1,
                      borderColor: colors.border,
                      position: 'relative'
                    }}
                  >
                    {/* Keyframes */}
                    {obj.keyframes.map((keyframe, kIndex) => {
                      const x = (keyframe.time / duration) * timelineWidth
                      
                      return (
                        <pixiGraphics 
                          key={kIndex}
                          draw={(graphics: Graphics) => {
                            graphics.clear()
                            graphics.circle(x, TRACK_HEIGHT / 2, 5)
                            graphics.fill(colors.accent)
                            graphics.stroke({ width: 1, color: colors.text })
                          }}
                        />
                      )
                    })}
                  </pixiContainer>
                )
              })}
            </pixiContainer>
          </layoutContainer>
        </layoutContainer>

        {/* Playhead Overlay - Absolute positioned to show over scrollable content */}
        <pixiContainer 
          layout={{
            position: 'absolute',
            top: 0,
            left: HEADER_WIDTH,
            width: viewportWidth,
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          <pixiGraphics draw={drawPlayhead} />
        </pixiContainer>
      </Application>
    </div>
  )
}

export default ReactPixiTimeline