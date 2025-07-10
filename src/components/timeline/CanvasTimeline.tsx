import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { getTimelineWidth, isAudioSafe } from '../../utils/timelineUtils'
import { useTheme } from '../../contexts/ThemeContext'

interface CanvasTimelineProps {
  height?: number
}

const TRACK_HEIGHT = 60
const HEADER_WIDTH = 120

function CanvasTimeline({ height = 300 }: CanvasTimelineProps) {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 300 })
  
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
    addKeyframe,
    updateKeyframe,
    deleteKeyframe,
    deleteObject,
    addObject,
    audioBuffer,
    setIsEditorPlaying,
    pauseAudio
  } = useEditorStore()

  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const pausedTimeRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)

  // Update ref when isEditorPlaying changes
  useEffect(() => {
    isPlayingRef.current = isEditorPlaying
  }, [isEditorPlaying])

  // Animation loop for playback - now handled by AudioManager
  useEffect(() => {
    // AudioManager handles time tracking, so we don't need to do it here
    // Just update refs for consistency
    isPlayingRef.current = isEditorPlaying
    
    if (isEditorPlaying && duration > 0) {
      startTimeRef.current = performance.now() - (currentTime * 1000)
    } else {
      pausedTimeRef.current = currentTime
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isEditorPlaying, duration, currentTime])
  
  const [scrollOffset, setScrollOffset] = useState(0)
  const [verticalScrollOffset, setVerticalScrollOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isManualScrolling, setIsManualScrolling] = useState(false)
  const [draggedKeyframe, setDraggedKeyframe] = useState<{
    objectId: string
    keyframeIndex: number
    startX: number
    startTime: number
  } | null>(null)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [hoveredKeyframe, setHoveredKeyframe] = useState<{
    objectId: string
    keyframeIndex: number
  } | null>(null)
  
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const totalTimelineWidth = getTimelineWidth(duration)
  const canvasWidth = canvasSize.width
  const canvasHeight = canvasSize.height
  const totalContentHeight = 120 + objects.length * TRACK_HEIGHT + 50 // base height + tracks + padding

  // Resize observer to adjust canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.max(400, rect.width)
        const height = Math.max(200, rect.height)
        setCanvasSize({ width, height })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])
  
  // Calculate timeline metrics
  const getSixteenthInterval = () => {
    const beatInterval = 60 / bpm
    return beatInterval / 4
  }

  // Auto-scroll to follow playhead (only when not manually scrolling)
  useEffect(() => {
    if (duration === 0 || isManualScrolling) return
    
    const playheadX = (currentTime / duration) * totalTimelineWidth
    const leftEdge = scrollOffset
    const rightEdge = scrollOffset + (canvasWidth - HEADER_WIDTH)
    
    // Only auto-scroll if playhead is significantly outside visible area
    const margin = 50 // pixels margin before auto-scrolling
    if (playheadX < leftEdge - margin || playheadX > rightEdge + margin) {
      const newScrollOffset = Math.max(0, Math.min(playheadX - (canvasWidth - HEADER_WIDTH) / 2, totalTimelineWidth - (canvasWidth - HEADER_WIDTH)))
      setScrollOffset(newScrollOffset)
    }
  }, [currentTime, duration, totalTimelineWidth, canvasWidth, scrollOffset, isManualScrolling])

  // Main canvas drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // Draw background
    ctx.fillStyle = theme.timelineBackground
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    if (duration === 0) return
    
    // Calculate visible time range
    const timelineContentWidth = canvasWidth - HEADER_WIDTH
    const startTime = (scrollOffset / totalTimelineWidth) * duration
    const endTime = ((scrollOffset + timelineContentWidth) / totalTimelineWidth) * duration
    
    // Save context for timeline content area
    ctx.save()
    ctx.rect(HEADER_WIDTH, 0, timelineContentWidth, canvasHeight)
    ctx.clip()
    
    // Apply vertical scroll offset
    ctx.translate(0, -verticalScrollOffset)
    
    // Draw time grid
    drawTimeGrid(ctx, startTime, endTime, timelineContentWidth)
    
    // Draw waveform if available
    if (audioBuffer) {
      drawWaveform(ctx, startTime, endTime, timelineContentWidth)
    }
    
    // Draw object tracks
    drawObjectTracks(ctx, startTime, endTime, timelineContentWidth)
    
    // Draw playhead
    drawPlayhead(ctx, timelineContentWidth)
    
    ctx.restore()
    
    // Draw track headers (outside clip region, with vertical scroll)
    drawTrackHeaders(ctx)
    
    // Draw scrollbars
    drawScrollbars(ctx)
    
  }, [
    canvasWidth, canvasHeight, duration, totalTimelineWidth, scrollOffset, verticalScrollOffset,
    currentTime, objects, selectedObjectId, hoveredKeyframe, audioBuffer, bpm, theme, isDraggingPlayhead
  ])

  const drawTimeGrid = (ctx: CanvasRenderingContext2D, startTime: number, endTime: number, contentWidth: number) => {
    // Main time markers (seconds)
    ctx.strokeStyle = theme.timelineGrid
    ctx.lineWidth = 1
    ctx.font = '10px Arial'
    ctx.fillStyle = theme.timelineText
    
    const startSecond = Math.floor(startTime)
    const endSecond = Math.ceil(endTime)
    
    for (let i = startSecond; i <= endSecond; i++) {
      const x = HEADER_WIDTH + ((i / duration) * totalTimelineWidth) - scrollOffset
      if (x >= HEADER_WIDTH && x <= canvasWidth) {
        ctx.beginPath()
        ctx.moveTo(x, 30)
        ctx.lineTo(x, canvasHeight)
        ctx.stroke()
        
        // Time label
        ctx.fillText(`${i}s`, x + 2, 20)
      }
    }
    
    // Subdivision markers (16th notes)
    ctx.strokeStyle = theme.borderSecondary
    ctx.lineWidth = 1
    
    const sixteenthInterval = getSixteenthInterval()
    const startSixteenth = Math.floor(startTime / sixteenthInterval)
    const endSixteenth = Math.ceil(endTime / sixteenthInterval)
    
    for (let i = startSixteenth; i <= endSixteenth; i++) {
      const time = i * sixteenthInterval
      if (time > duration) break
      
      // Skip if it's already a second marker
      if (Math.abs(time - Math.round(time)) < 0.01) continue
      
      const x = HEADER_WIDTH + ((time / duration) * totalTimelineWidth) - scrollOffset
      if (x >= HEADER_WIDTH && x <= canvasWidth) {
        ctx.beginPath()
        ctx.moveTo(x, 30)
        ctx.lineTo(x, canvasHeight)
        ctx.stroke()
      }
    }
  }

  const drawWaveform = (ctx: CanvasRenderingContext2D, startTime: number, endTime: number, contentWidth: number) => {
    if (!audioBuffer || duration === 0) return
    
    const waveformHeight = 80
    const waveformY = 30
    
    ctx.strokeStyle = theme.waveformColor
    ctx.lineWidth = 1
    ctx.beginPath()
    
    const channelData = audioBuffer.getChannelData(0)
    
    // Draw waveform for the visible time range
    const visibleStartTime = Math.max(0, startTime)
    const visibleEndTime = Math.min(duration, endTime)
    const visibleDuration = visibleEndTime - visibleStartTime
    
    if (visibleDuration <= 0) return
    
    // Calculate sample range for visible time
    const startSample = Math.floor((visibleStartTime / duration) * channelData.length)
    const endSample = Math.floor((visibleEndTime / duration) * channelData.length)
    const totalSamples = Math.max(1, endSample - startSample)
    
    // Calculate samples per pixel for optimal rendering
    const samplesPerPixel = Math.max(1, Math.floor(totalSamples / contentWidth))
    
    // Draw waveform line by line across the visible content width
    for (let x = 0; x < contentWidth; x++) {
      // Calculate time position for this pixel
      const timeProgress = x / contentWidth
      const currentTime = visibleStartTime + timeProgress * visibleDuration
      
      // Only draw if we're within the audio duration
      if (currentTime >= duration) break
      
      // Calculate sample position
      const sampleIndex = Math.floor((currentTime / duration) * channelData.length)
      const sampleStart = Math.max(0, sampleIndex)
      const sampleEnd = Math.min(sampleStart + samplesPerPixel, channelData.length)
      
      // Find min/max values for this pixel
      let min = 0, max = 0
      if (sampleStart < channelData.length) {
        for (let i = sampleStart; i < sampleEnd; i++) {
          if (i >= 0 && i < channelData.length) {
            const sample = channelData[i]
            if (sample < min) min = sample
            if (sample > max) max = sample
          }
        }
      }
      
      // Convert to canvas coordinates
      const yMin = waveformY + (1 + min) * waveformHeight / 2
      const yMax = waveformY + (1 + max) * waveformHeight / 2
      const canvasX = HEADER_WIDTH + x
      
      // Draw waveform line
      if (x === 0) {
        ctx.moveTo(canvasX, yMin)
      } else {
        ctx.lineTo(canvasX, yMin)
      }
      ctx.lineTo(canvasX, yMax)
    }
    
    ctx.stroke()
  }

  const drawObjectTracks = (ctx: CanvasRenderingContext2D, startTime: number, endTime: number, contentWidth: number) => {
    objects.forEach((obj, index) => {
      const trackY = 120 + index * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      // Track background
      ctx.fillStyle = selectedObjectId === obj.id ? theme.backgroundTertiary : theme.backgroundSecondary
      ctx.fillRect(HEADER_WIDTH, trackY, contentWidth, trackHeight)
      
      // Track border
      ctx.strokeStyle = theme.border
      ctx.lineWidth = 1
      ctx.strokeRect(HEADER_WIDTH, trackY, contentWidth, trackHeight)
      
      // Draw keyframes
      obj.keyframes.forEach((keyframe, kfIndex) => {
        const keyframeTime = keyframe.time
        if (keyframeTime < startTime || keyframeTime > endTime) return
        
        const x = HEADER_WIDTH + ((keyframeTime / duration) * totalTimelineWidth) - scrollOffset
        if (x < HEADER_WIDTH || x > canvasWidth) return
        
        const isHovered = hoveredKeyframe?.objectId === obj.id && hoveredKeyframe?.keyframeIndex === kfIndex
        const isDraggedKeyframe = draggedKeyframe?.objectId === obj.id && draggedKeyframe?.keyframeIndex === kfIndex
        
        // Keyframe circle
        ctx.fillStyle = isDraggedKeyframe ? '#00ff00' : isHovered ? theme.accentSecondary : theme.accent
        ctx.beginPath()
        ctx.arc(x, trackY + trackHeight / 2, isDraggedKeyframe ? 6 : 5, 0, Math.PI * 2)
        ctx.fill()
        
        // Keyframe outline
        ctx.strokeStyle = theme.text
        ctx.lineWidth = 1
        ctx.stroke()
      })
    })
  }

  const drawPlayhead = (ctx: CanvasRenderingContext2D, contentWidth: number) => {
    if (duration === 0) return
    
    const playheadX = HEADER_WIDTH + ((currentTime / duration) * totalTimelineWidth) - scrollOffset
    
    if (playheadX >= HEADER_WIDTH && playheadX <= canvasWidth) {
      ctx.strokeStyle = isDraggingPlayhead ? '#ff6666' : '#ff4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, canvasHeight)
      ctx.stroke()
      
      // Playhead handle (draggable)
      ctx.fillStyle = isDraggingPlayhead ? '#ff6666' : '#ff4444'
      ctx.fillRect(playheadX - 5, 0, 10, 20)
      
      // Add visual feedback for draggable handle
      if (isDraggingPlayhead) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(playheadX - 5, 0, 10, 20)
      }
    }
  }

  const drawTrackHeaders = (ctx: CanvasRenderingContext2D) => {
    // Save context for header area
    ctx.save()
    ctx.rect(0, 0, HEADER_WIDTH, canvasHeight)
    ctx.clip()
    
    // Apply vertical scroll offset for headers too
    ctx.translate(0, -verticalScrollOffset)
    
    // Header background (fill entire scrollable area)
    ctx.fillStyle = theme.backgroundSecondary
    ctx.fillRect(0, 0, HEADER_WIDTH, Math.max(canvasHeight, totalContentHeight))
    
    // Time display header
    ctx.fillStyle = theme.text
    ctx.font = 'bold 12px Arial'
    ctx.fillText(`${currentTime.toFixed(2)}s`, 10, 20)
    
    // Waveform header
    ctx.font = '10px Arial'
    ctx.fillText('Waveform', 10, 50)
    
    // Object track headers
    objects.forEach((obj, index) => {
      const trackY = 120 + index * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      // Header background
      ctx.fillStyle = selectedObjectId === obj.id ? theme.backgroundTertiary : theme.backgroundSecondary
      ctx.fillRect(0, trackY, HEADER_WIDTH, trackHeight)
      
      // Header border
      ctx.strokeStyle = theme.border
      ctx.lineWidth = 1
      ctx.strokeRect(0, trackY, HEADER_WIDTH, trackHeight)
      
      // Object info
      ctx.fillStyle = theme.text
      ctx.font = '10px Arial'
      ctx.fillText(obj.type, 10, trackY + 15)
      
      // Color indicator
      const colorMap: Record<string, string> = {
        red: '#ff4444',
        blue: '#4444ff',
        black: '#666',
        white: '#fff'
      }
      ctx.fillStyle = colorMap[obj.color] || '#fff'
      ctx.beginPath()
      ctx.arc(15, trackY + 25, 4, 0, Math.PI * 2)
      ctx.fill()
      
      // Cut direction
      if (obj.type === 'block' && obj.cutDirection) {
        ctx.fillStyle = theme.textMuted
        ctx.font = '8px Arial'
        ctx.fillText(obj.cutDirection, 25, trackY + 28)
      }
      
      // Delete button
      ctx.fillStyle = '#ff4444'
      ctx.fillRect(HEADER_WIDTH - 20, trackY + 5, 15, 15)
      ctx.fillStyle = theme.text
      ctx.font = '10px Arial'
      ctx.fillText('×', HEADER_WIDTH - 16, trackY + 15)
    })
    
    ctx.restore()
    
    // Header border (always visible)
    ctx.strokeStyle = theme.border
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, HEADER_WIDTH, canvasHeight)
  }

  const drawScrollbars = (ctx: CanvasRenderingContext2D) => {
    const scrollbarSize = 12
    const contentWidth = canvasWidth - HEADER_WIDTH
    
    // Horizontal scrollbar
    if (totalTimelineWidth > contentWidth) {
      const scrollbarY = canvasHeight - scrollbarSize
      
      // Horizontal scrollbar background
      ctx.fillStyle = theme.backgroundSecondary
      ctx.fillRect(HEADER_WIDTH, scrollbarY, contentWidth, scrollbarSize)
      
      // Horizontal scrollbar thumb
      const thumbWidth = (contentWidth / totalTimelineWidth) * contentWidth
      const thumbX = HEADER_WIDTH + (scrollOffset / totalTimelineWidth) * contentWidth
      
      ctx.fillStyle = theme.borderSecondary
      ctx.fillRect(thumbX, scrollbarY, thumbWidth, scrollbarSize)
    }
    
    // Vertical scrollbar
    if (totalContentHeight > canvasHeight) {
      const scrollbarX = canvasWidth - scrollbarSize
      const scrollableHeight = canvasHeight - (totalTimelineWidth > contentWidth ? scrollbarSize : 0)
      
      // Vertical scrollbar background
      ctx.fillStyle = theme.backgroundSecondary
      ctx.fillRect(scrollbarX, 0, scrollbarSize, scrollableHeight)
      
      // Vertical scrollbar thumb
      const thumbHeight = (canvasHeight / totalContentHeight) * scrollableHeight
      const thumbY = (verticalScrollOffset / (totalContentHeight - canvasHeight)) * (scrollableHeight - thumbHeight)
      
      ctx.fillStyle = theme.borderSecondary
      ctx.fillRect(scrollbarX, thumbY, scrollbarSize, thumbHeight)
    }
  }

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicking on playhead handle
    const playheadX = HEADER_WIDTH + ((currentTime / duration) * totalTimelineWidth) - scrollOffset
    if (duration > 0 && playheadX >= HEADER_WIDTH && playheadX <= canvasWidth) {
      // Check if click is on playhead handle
      if (x >= playheadX - 5 && x <= playheadX + 5 && y >= 0 && y <= 20) {
        setIsDraggingPlayhead(true)
        return
      }
    }
    
    // Check if clicking on keyframe
    const clickedKeyframe = getKeyframeAtPosition(x, y)
    if (clickedKeyframe) {
      setDraggedKeyframe({
        ...clickedKeyframe,
        startX: x,
        startTime: getTimeFromX(x)
      })
      setSelectedObject(clickedKeyframe.objectId)
      return
    }
    
    // Check if clicking on track header delete button
    const clickedDelete = getDeleteButtonAtPosition(x, y)
    if (clickedDelete) {
      deleteObject(clickedDelete.objectId)
      return
    }
    
    // Check if clicking on track
    const clickedTrack = getTrackAtPosition(x, y)
    if (clickedTrack) {
      setSelectedObject(clickedTrack.objectId)
    }
    
    // Set timeline position
    if (x >= HEADER_WIDTH) {
      const time = getTimeFromX(x)
      // Snap to nearest 16th note
      const sixteenthInterval = getSixteenthInterval()
      const snappedTime = Math.round(time / sixteenthInterval) * sixteenthInterval
      setCurrentTime(Math.max(0, Math.min(duration, snappedTime)))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Handle playhead dragging
    if (isDraggingPlayhead) {
      const time = getTimeFromX(x)
      // Snap to nearest 16th note
      const sixteenthInterval = getSixteenthInterval()
      const snappedTime = Math.round(time / sixteenthInterval) * sixteenthInterval
      setCurrentTime(Math.max(0, Math.min(duration, snappedTime)))
      return
    }
    
    // Handle keyframe dragging
    if (draggedKeyframe) {
      const newTime = getTimeFromX(x)
      const obj = objects.find(o => o.id === draggedKeyframe.objectId)
      if (obj && obj.keyframes[draggedKeyframe.keyframeIndex]) {
        const keyframe = obj.keyframes[draggedKeyframe.keyframeIndex]
        updateKeyframe(draggedKeyframe.objectId, draggedKeyframe.keyframeIndex, {
          ...keyframe,
          time: Math.max(0, Math.min(duration, newTime))
        })
      }
      return
    }
    
    // Update hover state
    const hoveredKf = getKeyframeAtPosition(x, y)
    setHoveredKeyframe(hoveredKf)
  }

  const handleMouseUp = () => {
    setDraggedKeyframe(null)
    setIsDraggingPlayhead(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const scrollSpeed = 30
    const contentWidth = canvasWidth - HEADER_WIDTH
    
    // Mark as manual scrolling
    setIsManualScrolling(true)
    
    // Clear existing timeout
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
    }
    
    // Set timeout to re-enable auto-scroll after manual scrolling stops
    manualScrollTimeoutRef.current = setTimeout(() => {
      setIsManualScrolling(false)
    }, 2000) // 2 seconds after last scroll
    
    // Handle horizontal scrolling (Shift + wheel or horizontal wheel)
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const deltaX = e.deltaX !== 0 ? e.deltaX : e.deltaY
      const newScrollOffset = Math.max(0, Math.min(scrollOffset + deltaX * scrollSpeed / 50, totalTimelineWidth - contentWidth))
      setScrollOffset(newScrollOffset)
    } else {
      // Handle vertical scrolling
      const maxVerticalScroll = Math.max(0, totalContentHeight - canvasHeight)
      const newVerticalScrollOffset = Math.max(0, Math.min(verticalScrollOffset + e.deltaY * scrollSpeed / 50, maxVerticalScroll))
      setVerticalScrollOffset(newVerticalScrollOffset)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if double-clicking on keyframe to delete
    const clickedKeyframe = getKeyframeAtPosition(x, y)
    if (clickedKeyframe) {
      deleteKeyframe(clickedKeyframe.objectId, clickedKeyframe.keyframeIndex)
      return
    }
    
    // Check if double-clicking on track to add keyframe
    const clickedTrack = getTrackAtPosition(x, y)
    if (clickedTrack && x >= HEADER_WIDTH) {
      const time = getTimeFromX(x)
      const obj = objects.find(o => o.id === clickedTrack.objectId)
      if (obj) {
        // Check if keyframe already exists at this time
        const existingKeyframe = obj.keyframes.find(kf => Math.abs(kf.time - time) < 0.1)
        if (!existingKeyframe) {
          addKeyframe(clickedTrack.objectId, {
            time,
            position: [0, 0, 0],
            rotation: [0, 0, 0]
          })
        }
      }
    }
  }

  // Helper functions
  const getTimeFromX = (x: number): number => {
    const timelineX = x - HEADER_WIDTH + scrollOffset
    return (timelineX / totalTimelineWidth) * duration
  }

  const getKeyframeAtPosition = (x: number, y: number) => {
    // Adjust y for vertical scroll offset
    const adjustedY = y + verticalScrollOffset
    
    for (let objIndex = 0; objIndex < objects.length; objIndex++) {
      const obj = objects[objIndex]
      const trackY = 120 + objIndex * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      if (adjustedY >= trackY && adjustedY <= trackY + trackHeight) {
        for (let kfIndex = 0; kfIndex < obj.keyframes.length; kfIndex++) {
          const keyframe = obj.keyframes[kfIndex]
          const keyframeX = HEADER_WIDTH + ((keyframe.time / duration) * totalTimelineWidth) - scrollOffset
          
          if (Math.abs(x - keyframeX) <= 8 && Math.abs(adjustedY - (trackY + trackHeight / 2)) <= 8) {
            return { objectId: obj.id, keyframeIndex: kfIndex }
          }
        }
      }
    }
    return null
  }

  const getTrackAtPosition = (x: number, y: number) => {
    // Adjust y for vertical scroll offset
    const adjustedY = y + verticalScrollOffset
    
    for (let objIndex = 0; objIndex < objects.length; objIndex++) {
      const obj = objects[objIndex]
      const trackY = 120 + objIndex * TRACK_HEIGHT
      const trackHeight = TRACK_HEIGHT - 2
      
      if (adjustedY >= trackY && adjustedY <= trackY + trackHeight) {
        return { objectId: obj.id }
      }
    }
    return null
  }

  const getDeleteButtonAtPosition = (x: number, y: number) => {
    // Adjust y for vertical scroll offset
    const adjustedY = y + verticalScrollOffset
    
    for (let objIndex = 0; objIndex < objects.length; objIndex++) {
      const obj = objects[objIndex]
      const trackY = 120 + objIndex * TRACK_HEIGHT
      
      if (x >= HEADER_WIDTH - 20 && x <= HEADER_WIDTH - 5 && 
          adjustedY >= trackY + 5 && adjustedY <= trackY + 20) {
        return { objectId: obj.id }
      }
    }
    return null
  }

  // Draw on every frame
  useEffect(() => {
    draw()
  }, [draw])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%',
        height: canvasHeight,
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ 
          display: 'block',
          cursor: (draggedKeyframe || isDraggingPlayhead) ? 'grabbing' : 'grab',
          width: '100%',
          height: '100%'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}

export default CanvasTimeline