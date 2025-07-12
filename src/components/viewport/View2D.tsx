import React, { useRef, useEffect } from 'react'
import { useEditorStore, EditorObject } from '../../store/editorStore'
import { useTheme } from '../../contexts/ThemeContext'
import './View2D.css'

function View2D() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { objects, selectedObjectId, currentTime, bpm, beatsPerMeasure, setSelectedObject, updateKeyframe, addKeyframe, setCurrentTime, updateObject } = useEditorStore()
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = React.useState({ width: 400, height: 300 })
  const [isDraggingTimeline, setIsDraggingTimeline] = React.useState(false)
  
  // Get selected object for UI display
  const selectedObject = selectedObjectId ? objects.find(obj => obj.id === selectedObjectId) : null
  
  // Calculate timeline position info
  const getSixteenthInterval = () => {
    const beatInterval = 60 / bpm
    return beatInterval / 4
  }
  
  const getCurrentSixteenthIndex = () => {
    const sixteenthInterval = getSixteenthInterval()
    return Math.round(currentTime / sixteenthInterval)
  }
  
  const getCurrentMeasure = () => {
    const beatInterval = 60 / bpm
    const measureInterval = beatInterval * beatsPerMeasure
    return Math.floor(currentTime / measureInterval) + 1
  }
  
  const getCurrentBeat = () => {
    const beatInterval = 60 / bpm
    const measureInterval = beatInterval * beatsPerMeasure
    const timeInMeasure = currentTime % measureInterval
    return Math.floor(timeInMeasure / beatInterval) + 1
  }
  
  const getCurrentSixteenthInBeat = () => {
    const beatInterval = 60 / bpm
    const sixteenthInterval = beatInterval / 4
    const timeInBeat = currentTime % beatInterval
    return Math.floor(timeInBeat / sixteenthInterval) + 1
  }

  const interpolateKeyframes = (keyframes: any[], time: number) => {
    if (keyframes.length === 0) return { position: [0, 0, 0], rotation: [0, 0, 0] }
    if (keyframes.length === 1) return keyframes[0]

    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
    
    if (time <= sortedKeyframes[0].time) return sortedKeyframes[0]
    if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) return sortedKeyframes[sortedKeyframes.length - 1]

    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      const current = sortedKeyframes[i]
      const next = sortedKeyframes[i + 1]
      
      if (time >= current.time && time <= next.time) {
        const t = (time - current.time) / (next.time - current.time)
        return {
          position: [
            current.position[0] + (next.position[0] - current.position[0]) * t,
            current.position[1] + (next.position[1] - current.position[1]) * t,
            current.position[2] + (next.position[2] - current.position[2]) * t
          ],
          rotation: [
            current.rotation[0] + (next.rotation[0] - current.rotation[0]) * t,
            current.rotation[1] + (next.rotation[1] - current.rotation[1]) * t,
            current.rotation[2] + (next.rotation[2] - current.rotation[2]) * t
          ]
        }
      }
    }
    
    return sortedKeyframes[0]
  }

  // Resize observer to adjust canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.max(300, rect.width - 20) // 10px padding on each side
        // Account for header (60px) and properties panel (selectedObject ? 44px : 0px)
        const propertiesPanelHeight = selectedObject ? 44 : 0
        const height = Math.max(200, rect.height - 60 - propertiesPanelHeight)
        setCanvasSize({ width, height })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [selectedObject])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Update canvas size
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set up 2D coordinate system (top-down view) - responsive centering
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const scale = Math.min(canvas.width, canvas.height) / 20 // Responsive scale based on canvas size

    // Draw grid - extended range for better visibility
    ctx.strokeStyle = theme.gridColor
    ctx.lineWidth = 1
    for (let i = -15; i <= 15; i++) {
      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(centerX + i * scale, 0)
      ctx.lineTo(centerX + i * scale, canvas.height)
      ctx.stroke()
      
      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(0, centerY + i * scale)
      ctx.lineTo(canvas.width, centerY + i * scale)
      ctx.stroke()
    }

    // Draw center axes
    ctx.strokeStyle = theme.borderSecondary
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, canvas.height)
    ctx.moveTo(0, centerY)
    ctx.lineTo(canvas.width, centerY)
    ctx.stroke()

    // Draw objects at current timeline position (static cross-section)
    objects.forEach(obj => {
      // Show objects that have keyframes exactly at current 16th note position
      const beatInterval = 60 / bpm
      const sixteenthInterval = beatInterval / 4
      const currentSixteenthIndex = Math.round(currentTime / sixteenthInterval)
      const exactSixteenthTime = currentSixteenthIndex * sixteenthInterval
      const tolerance = sixteenthInterval * 0.1 // Very strict tolerance (10%)
      
      const exactKeyframe = obj.keyframes.find(kf => Math.abs(kf.time - exactSixteenthTime) < tolerance)
      if (!exactKeyframe) return
      const nearbyKeyframe = exactKeyframe
      
      const x = centerX - nearbyKeyframe.position[0] * scale // X軸を反転
      const y = centerY - nearbyKeyframe.position[1] * scale // Y becomes Y in 2D view

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(nearbyKeyframe.rotation[2]) // Z rotation in 2D
      
      // Always full opacity since we only show exact keyframes
      const opacity = 1.0
      
      // Draw object based on type
      if (obj.type === 'block') {
        ctx.globalAlpha = opacity
        ctx.fillStyle = obj.color === 'red' ? '#ff4444' : '#4444ff'
        ctx.fillRect(-15, -15, 30, 30)
        
        // Draw cut direction indicator
        ctx.strokeStyle = theme.text
        ctx.lineWidth = 3
        ctx.beginPath()
        if (obj.cutDirection === 'up') {
          ctx.moveTo(0, 10)
          ctx.lineTo(0, -10)
          ctx.moveTo(-5, -5)
          ctx.lineTo(0, -10)
          ctx.lineTo(5, -5)
        } else if (obj.cutDirection === 'down') {
          ctx.moveTo(0, -10)
          ctx.lineTo(0, 10)
          ctx.moveTo(-5, 5)
          ctx.lineTo(0, 10)
          ctx.lineTo(5, 5)
        } else if (obj.cutDirection === 'left') {
          ctx.moveTo(10, 0)
          ctx.lineTo(-10, 0)
          ctx.moveTo(-5, -5)
          ctx.lineTo(-10, 0)
          ctx.lineTo(-5, 5)
        } else if (obj.cutDirection === 'right') {
          ctx.moveTo(-10, 0)
          ctx.lineTo(10, 0)
          ctx.moveTo(5, -5)
          ctx.lineTo(10, 0)
          ctx.lineTo(5, 5)
        } else if (obj.cutDirection === 'any') {
          // Draw circle for "any direction"
          ctx.arc(0, 0, 8, 0, Math.PI * 2)
        }
        ctx.stroke()
        
        // Draw keyframe indicator (always present since we only show exact keyframes)
        ctx.globalAlpha = 1.0
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.arc(0, -25, 4, 0, Math.PI * 2)
        ctx.fill()
        
      } else if (obj.type === 'bomb') {
        ctx.globalAlpha = opacity
        ctx.fillStyle = theme.backgroundTertiary
        ctx.beginPath()
        ctx.arc(0, 0, 15, 0, Math.PI * 2)
        ctx.fill()
        
        // Draw keyframe indicator (always present)
        ctx.globalAlpha = 1.0
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.arc(0, -20, 4, 0, Math.PI * 2)
        ctx.fill()
        
      } else if (obj.type === 'obstacle') {
        ctx.globalAlpha = opacity
        ctx.fillStyle = theme.textMuted
        ctx.fillRect(-15, -15, 30, 30)
        
        // Draw keyframe indicator (always present)
        ctx.globalAlpha = 1.0
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.arc(0, -20, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      
      ctx.globalAlpha = 1.0

      // Highlight selected object
      if (selectedObjectId === obj.id) {
        ctx.strokeStyle = isDragging ? '#00ff00' : theme.accent
        ctx.lineWidth = isDragging ? 4 : 3
        ctx.beginPath()
        ctx.arc(0, 0, 25, 0, Math.PI * 2)
        ctx.stroke()
        
        // Add drag indicator
        if (isDragging) {
          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.arc(0, 0, 35, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      ctx.restore()
    })

    // Draw timeline info and labels
    ctx.fillStyle = theme.text
    ctx.font = '12px Arial'
    ctx.fillText('X', canvas.width - 20, centerY - 10)
    ctx.fillText('Y', centerX + 10, 15)
    
    // Draw timeline position info
    ctx.fillStyle = theme.accent
    ctx.font = 'bold 14px Arial'
    const timeInfo = `Time: ${currentTime.toFixed(2)}s`
    const measureInfo = `M${getCurrentMeasure()}:${getCurrentBeat()}:${getCurrentSixteenthInBeat()}`
    const sixteenthInfo = `16th: ${getCurrentSixteenthIndex() + 1}`
    
    ctx.fillText(timeInfo, 10, 20)
    ctx.fillText(measureInfo, 10, 40)
    ctx.fillText(sixteenthInfo, 10, 60)
    
    // Draw timeline scrubber at bottom
    const timelineY = canvas.height - 30
    const timelineStartX = 50
    const timelineEndX = canvas.width - 50
    const timelineWidth = timelineEndX - timelineStartX
    
    // Draw timeline track
    ctx.strokeStyle = theme.borderSecondary
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(timelineStartX, timelineY)
    ctx.lineTo(timelineEndX, timelineY)
    ctx.stroke()
    
    // Draw timeline markers (16th notes)
    const sixteenthInterval = getSixteenthInterval()
    const maxTime = 60 // Show up to 60 seconds
    const pixelsPerSecond = timelineWidth / maxTime
    
    ctx.strokeStyle = theme.gridColor
    ctx.lineWidth = 1
    for (let time = 0; time <= maxTime; time += sixteenthInterval) {
      const x = timelineStartX + (time / maxTime) * timelineWidth
      if (x <= timelineEndX) {
        const isMainBeat = Math.round(time / (60 / bpm)) === time / (60 / bpm)
        ctx.beginPath()
        ctx.moveTo(x, timelineY - (isMainBeat ? 8 : 4))
        ctx.lineTo(x, timelineY + (isMainBeat ? 8 : 4))
        ctx.stroke()
      }
    }
    
    // Draw current time indicator (draggable)
    const currentTimeX = timelineStartX + (currentTime / maxTime) * timelineWidth
    if (currentTimeX >= timelineStartX && currentTimeX <= timelineEndX) {
      ctx.strokeStyle = isDraggingTimeline ? '#ff6666' : '#ff4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(currentTimeX, timelineY - 15)
      ctx.lineTo(currentTimeX, timelineY + 15)
      ctx.stroke()
      
      // Draw draggable handle
      ctx.fillStyle = isDraggingTimeline ? '#ff6666' : '#ff4444'
      ctx.beginPath()
      ctx.arc(currentTimeX, timelineY, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    
  }, [objects, currentTime, selectedObjectId, bpm, beatsPerMeasure, canvasSize, theme, isDraggingTimeline])

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const scale = Math.min(canvas.width, canvas.height) / 20

    return { x, y, centerX, centerY, scale }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const { x, y, centerX, centerY, scale } = coords
    const canvas = canvasRef.current
    if (!canvas) return

    // Check if click is on timeline scrubber
    const timelineY = canvas.height - 30
    const timelineStartX = 50
    const timelineEndX = canvas.width - 50
    const timelineWidth = timelineEndX - timelineStartX
    const maxTime = 60
    const currentTimeX = timelineStartX + (currentTime / maxTime) * timelineWidth

    // Check if click is on timeline handle
    const timelineDistance = Math.sqrt((x - currentTimeX) ** 2 + (y - timelineY) ** 2)
    if (timelineDistance <= 12) {
      setIsDraggingTimeline(true)
      return
    }

    // Check if click is on timeline track
    if (y >= timelineY - 15 && y <= timelineY + 15 && x >= timelineStartX && x <= timelineEndX) {
      const clickedTime = ((x - timelineStartX) / timelineWidth) * maxTime
      // Snap to nearest 16th note
      const sixteenthInterval = getSixteenthInterval()
      const snappedTime = Math.round(clickedTime / sixteenthInterval) * sixteenthInterval
      setCurrentTime(Math.max(0, Math.min(maxTime, snappedTime)))
      setIsDraggingTimeline(true)
      return
    }

    // Check if click is on any object (use exact 16th note position)
    const beatInterval = 60 / bpm
    const sixteenthInterval = beatInterval / 4
    const currentSixteenthIndex = Math.round(currentTime / sixteenthInterval)
    const exactSixteenthTime = currentSixteenthIndex * sixteenthInterval
    const tolerance = sixteenthInterval * 0.1
    
    for (const obj of objects) {
      // Only check objects that have keyframes at current 16th note position
      const exactKeyframe = obj.keyframes.find(kf => Math.abs(kf.time - exactSixteenthTime) < tolerance)
      if (!exactKeyframe) continue
      
      const objX = centerX - exactKeyframe.position[0] * scale // X軸を反転
      const objY = centerY - exactKeyframe.position[1] * scale

      const distance = Math.sqrt((x - objX) ** 2 + (y - objY) ** 2)
      if (distance <= 25) {
        setSelectedObject(obj.id)
        setIsDragging(true)
        setDragOffset({ x: x - objX, y: y - objY })
        return
      }
    }

    // Click on empty space deselects
    setSelectedObject(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const { x, y, centerX, centerY, scale } = coords
    const canvas = canvasRef.current
    if (!canvas) return

    // Handle timeline dragging
    if (isDraggingTimeline) {
      const timelineY = canvas.height - 30
      const timelineStartX = 50
      const timelineEndX = canvas.width - 50
      const timelineWidth = timelineEndX - timelineStartX
      const maxTime = 60

      const newTime = ((x - timelineStartX) / timelineWidth) * maxTime
      // Snap to nearest 16th note
      const sixteenthInterval = getSixteenthInterval()
      const snappedTime = Math.round(newTime / sixteenthInterval) * sixteenthInterval
      setCurrentTime(Math.max(0, Math.min(maxTime, snappedTime)))
      return
    }

    // Handle object dragging
    if (!isDragging || !selectedObjectId) return

    // Calculate new position
    const newX = -(x - dragOffset.x - centerX) / scale // X軸を反転
    const newY = -(y - dragOffset.y - centerY) / scale // Y coordinate for 2D view

    // Find the selected object and update its keyframe
    const selectedObject = objects.find(obj => obj.id === selectedObjectId)
    if (selectedObject) {
      // Find keyframe at exact current 16th note position
      const beatInterval = 60 / bpm
      const sixteenthInterval = beatInterval / 4
      const currentSixteenthIndex = Math.round(currentTime / sixteenthInterval)
      const exactSixteenthTime = currentSixteenthIndex * sixteenthInterval
      const tolerance = sixteenthInterval * 0.1 // Very strict tolerance
      let keyframeIndex = selectedObject.keyframes.findIndex(
        kf => Math.abs(kf.time - exactSixteenthTime) < tolerance
      )
      
      if (keyframeIndex === -1) {
        // Create new keyframe if none exists at current time
        const interpolated = interpolateKeyframes(selectedObject.keyframes, exactSixteenthTime)
        const newKeyframe = {
          time: exactSixteenthTime,
          position: [newX, newY, interpolated.position[2]] as [number, number, number],
          rotation: interpolated.rotation
        }
        addKeyframe(selectedObjectId, newKeyframe)
      } else {
        // Update existing keyframe
        const currentKeyframe = selectedObject.keyframes[keyframeIndex]
        updateKeyframe(selectedObjectId, keyframeIndex, {
          ...currentKeyframe,
          position: [newX, newY, currentKeyframe.position[2]]
        })
      }
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
    setIsDraggingTimeline(false)
  }

  // Cut direction options
  const cutDirectionOptions = [
    { value: 'up', label: '↑ Up', symbol: '↑' },
    { value: 'down', label: '↓ Down', symbol: '↓' },
    { value: 'left', label: '← Left', symbol: '←' },
    { value: 'right', label: '→ Right', symbol: '→' },
    { value: 'any', label: '● Any Direction', symbol: '●' }
  ]

  const handleCutDirectionChange = (newCutDirection: string) => {
    if (selectedObject && selectedObject.type === 'block') {
      updateObject(selectedObjectId!, { cutDirection: newCutDirection as any })
    }
  }

  return (
    <div ref={containerRef} className="view2d" style={{ background: theme.background, borderColor: theme.border }}>
      <div className="view2d-header" style={{ background: theme.backgroundSecondary, borderBottomColor: theme.border }}>
        <h3 style={{ color: theme.text }}>Timeline Cross-Section</h3>
        <div className="timeline-info">
          <span style={{ background: theme.backgroundTertiary, color: theme.text, borderLeftColor: theme.accent }}>Time: {currentTime.toFixed(2)}s</span>
          <span style={{ background: theme.backgroundTertiary, color: theme.text, borderLeftColor: theme.accent }}>M{getCurrentMeasure()}:{getCurrentBeat()}:{getCurrentSixteenthInBeat()}</span>
        </div>
      </div>
      
      {/* Object Properties Panel */}
      {selectedObject && (
        <div className="object-properties" style={{ 
          background: theme.backgroundSecondary, 
          borderBottom: `1px solid ${theme.border}`,
          padding: '8px 10px',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          flexWrap: 'wrap',
          minHeight: '44px'
        }}>
          <div style={{ color: theme.text, fontSize: '13px', fontWeight: 'bold' }}>
            Selected: {selectedObject.type.charAt(0).toUpperCase() + selectedObject.type.slice(1)} 
            <span style={{ 
              color: selectedObject.color === 'red' ? '#ff4444' : selectedObject.color === 'blue' ? '#4444ff' : theme.text,
              marginLeft: '8px'
            }}>
              ({selectedObject.color})
            </span>
          </div>
          
          {selectedObject.type === 'block' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ color: theme.text, fontSize: '12px' }}>Cut Direction:</label>
              <div style={{ display: 'flex', gap: '3px' }}>
                {cutDirectionOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleCutDirectionChange(option.value)}
                    style={{
                      background: selectedObject.cutDirection === option.value ? theme.accent : theme.backgroundTertiary,
                      color: selectedObject.cutDirection === option.value ? 'white' : theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '3px',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      minWidth: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={option.label}
                  >
                    {option.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="view2d-canvas"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{ cursor: (isDragging || isDraggingTimeline) ? 'grabbing' : 'grab', background: theme.sceneBackground }}
      />
    </div>
  )
}

export default View2D