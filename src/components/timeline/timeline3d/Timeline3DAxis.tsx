import React, { useMemo, useState } from 'react'
import { Line, Text } from '@react-three/drei'
import { useEditorStore } from '../../../store/editorStore'

interface Timeline3DAxisProps {
  direction: 'x' | 'y' | 'z'
  length: number
  position: [number, number, number]
}

function Timeline3DAxis({ direction, length, position }: Timeline3DAxisProps) {
  const { duration, bpm, beatsPerMeasure, currentTime, setCurrentTime } = useEditorStore()
  const [hoveredMarker, setHoveredMarker] = useState<number | null>(null)
  
  const { axisPoints, beatMarkers, measureMarkers, sixteenthMarkers, timeLabels } = useMemo(() => {
    const beatInterval = 60 / bpm
    const measureInterval = beatInterval * beatsPerMeasure
    const sixteenthInterval = beatInterval / 4
    const axisPoints: [number, number, number][] = []
    const beatMarkers: { position: [number, number, number], scale: number, time: number }[] = []
    const measureMarkers: { position: [number, number, number], scale: number, time: number }[] = []
    const sixteenthMarkers: { position: [number, number, number], scale: number, time: number }[] = []
    const timeLabels: { position: [number, number, number], text: string }[] = []
    
    // Main axis line
    const startPos = [...position] as [number, number, number]
    const endPos = [...position] as [number, number, number]
    
    if (direction === 'x') {
      endPos[0] += length
    } else if (direction === 'y') {
      endPos[1] += length
    } else {
      endPos[2] += length
    }
    
    axisPoints.push(startPos, endPos)
    
    // Beat, measure, and 16th note markers - use fixed spatial intervals
    const spatialInterval = 2 // Fixed 2 units spatial interval
    for (let spatialPos = 0; spatialPos <= length; spatialPos += spatialInterval) {
      const time = spatialPos * 0.5 // Fixed time = 0.5s per unit
      const t = spatialPos / length
      const markerPos = [...position] as [number, number, number]
      
      if (direction === 'x') {
        markerPos[0] += t * length
      } else if (direction === 'y') {
        markerPos[1] += t * length
      } else {
        markerPos[2] += t * length
      }
      
      const isMeasure = Math.abs(time % measureInterval) < 0.01
      const isBeat = Math.abs(time % beatInterval) < 0.01
      const is16th = Math.abs(time % sixteenthInterval) < 0.01
      
      if (isMeasure) {
        measureMarkers.push({ position: markerPos, scale: 0.3, time })
        
        // Add time labels for measures
        const labelPos = [...markerPos] as [number, number, number]
        labelPos[1] += 0.5
        timeLabels.push({ 
          position: labelPos, 
          text: `${Math.round(time * 10) / 10}s` 
        })
      } else if (isBeat) {
        beatMarkers.push({ position: markerPos, scale: 0.15, time })
      } else if (is16th) {
        sixteenthMarkers.push({ position: markerPos, scale: 0.08, time })
      }
    }
    
    return { axisPoints, beatMarkers, measureMarkers, sixteenthMarkers, timeLabels }
  }, [duration, bpm, beatsPerMeasure, direction, length, position])
  
  const handleMarkerClick = (time: number) => {
    setCurrentTime(time)
  }
  
  const handleMarkerHover = (time: number | null) => {
    setHoveredMarker(time)
  }
  
  // Current time indicator - use fixed spatial scale (0.5s per unit)
  const currentTimeIndicator = useMemo(() => {
    const spatialPos = currentTime / 0.5 // 0.5s per unit
    const t = Math.min(spatialPos / length, 1) // Clamp to timeline length
    const indicatorPos = [...position] as [number, number, number]
    
    if (direction === 'x') {
      indicatorPos[0] += t * length
    } else if (direction === 'y') {
      indicatorPos[1] += t * length
    } else {
      indicatorPos[2] += t * length
    }
    
    return indicatorPos
  }, [currentTime, direction, length, position])
  
  return (
    <group>
      {/* Main axis line */}
      <Line
        points={axisPoints}
        color="gray"
        lineWidth={2}
      />
      
      {/* 16th note markers */}
      {sixteenthMarkers.map((marker, index) => (
        <mesh 
          key={`sixteenth-${index}`} 
          position={marker.position}
          onClick={(e) => {
            e.stopPropagation()
            handleMarkerClick(marker.time)
          }}
          onPointerEnter={(e) => {
            e.stopPropagation()
            handleMarkerHover(marker.time)
          }}
          onPointerLeave={(e) => {
            e.stopPropagation()
            handleMarkerHover(null)
          }}
        >
          <cylinderGeometry args={[0.01, 0.01, marker.scale]} />
          <meshBasicMaterial 
            color={hoveredMarker === marker.time ? "yellow" : "darkgray"} 
            transparent
            opacity={hoveredMarker === marker.time ? 0.8 : 0.6}
          />
        </mesh>
      ))}
      
      {/* Beat markers */}
      {beatMarkers.map((marker, index) => (
        <mesh 
          key={`beat-${index}`} 
          position={marker.position}
          onClick={(e) => {
            e.stopPropagation()
            handleMarkerClick(marker.time)
          }}
          onPointerEnter={(e) => {
            e.stopPropagation()
            handleMarkerHover(marker.time)
          }}
          onPointerLeave={(e) => {
            e.stopPropagation()
            handleMarkerHover(null)
          }}
        >
          <cylinderGeometry args={[0.02, 0.02, marker.scale]} />
          <meshBasicMaterial 
            color={hoveredMarker === marker.time ? "yellow" : "lightgray"}
            transparent
            opacity={hoveredMarker === marker.time ? 1.0 : 0.8}
          />
        </mesh>
      ))}
      
      {/* Measure markers */}
      {measureMarkers.map((marker, index) => (
        <mesh 
          key={`measure-${index}`} 
          position={marker.position}
          onClick={(e) => {
            e.stopPropagation()
            handleMarkerClick(marker.time)
          }}
          onPointerEnter={(e) => {
            e.stopPropagation()
            handleMarkerHover(marker.time)
          }}
          onPointerLeave={(e) => {
            e.stopPropagation()
            handleMarkerHover(null)
          }}
        >
          <cylinderGeometry args={[0.04, 0.04, marker.scale]} />
          <meshBasicMaterial 
            color={hoveredMarker === marker.time ? "yellow" : "white"}
            transparent
            opacity={hoveredMarker === marker.time ? 1.0 : 0.9}
          />
        </mesh>
      ))}
      
      {/* Time labels */}
      {timeLabels.map((label, index) => (
        <Text
          key={`label-${index}`}
          position={label.position}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
        >
          {label.text}
        </Text>
      ))}
      
      {/* Current time indicator */}
      <mesh position={currentTimeIndicator}>
        <cylinderGeometry args={[0.06, 0.06, 0.5]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </group>
  )
}

export default Timeline3DAxis