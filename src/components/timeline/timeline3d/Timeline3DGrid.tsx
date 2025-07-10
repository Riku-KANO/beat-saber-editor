import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useEditorStore } from '../../../store/editorStore'

interface Timeline3DGridProps {
  direction: 'x' | 'y' | 'z'
  length: number
  position: [number, number, number]
  lanes?: number
}

function Timeline3DGrid({ direction, length, position, lanes = 4 }: Timeline3DGridProps) {
  const { duration, bpm, beatsPerMeasure } = useEditorStore()
  
  const { gridLines, sixteenthMarkers, beatMarkers, measureMarkers } = useMemo(() => {
    const beatInterval = 60 / bpm
    const sixteenthInterval = beatInterval / 4 // 16th notes
    const measureInterval = beatInterval * beatsPerMeasure
    
    const gridLines: [number, number, number][][] = []
    const sixteenthMarkers: { position: [number, number, number], scale: number }[] = []
    const beatMarkers: { position: [number, number, number], scale: number }[] = []
    const measureMarkers: { position: [number, number, number], scale: number }[] = []
    
    // Create horizontal lanes
    for (let lane = 0; lane <= lanes; lane++) {
      const laneOffset = (lane - lanes/2) * 0.5
      const startPos = [...position] as [number, number, number]
      const endPos = [...position] as [number, number, number]
      
      if (direction === 'x') {
        startPos[2] += laneOffset
        endPos[2] += laneOffset
        endPos[0] += length
      } else if (direction === 'y') {
        startPos[2] += laneOffset
        endPos[2] += laneOffset
        endPos[1] += length
      } else {
        startPos[0] += laneOffset
        endPos[0] += laneOffset
        endPos[2] += length
      }
      
      gridLines.push([startPos, endPos])
    }
    
    // Create vertical time markers - use fixed spatial intervals
    const spatialInterval = 2 // Fixed 2 units spatial interval
    for (let spatialPos = 0; spatialPos <= length; spatialPos += spatialInterval) {
      const time = spatialPos * 0.5 // Fixed time = 0.5s per unit
      const t = spatialPos / length
      const is16th = Math.abs(time % sixteenthInterval) < 0.01
      const isBeat = Math.abs(time % beatInterval) < 0.01
      const isMeasure = Math.abs(time % measureInterval) < 0.01
      
      if (is16th) {
        // Create vertical line across all lanes
        const topPos = [...position] as [number, number, number]
        const bottomPos = [...position] as [number, number, number]
        
        if (direction === 'x') {
          topPos[0] += t * length
          bottomPos[0] += t * length
          topPos[2] += lanes * 0.5 / 2
          bottomPos[2] -= lanes * 0.5 / 2
        } else if (direction === 'y') {
          topPos[1] += t * length
          bottomPos[1] += t * length
          topPos[2] += lanes * 0.5 / 2
          bottomPos[2] -= lanes * 0.5 / 2
        } else {
          topPos[2] += t * length
          bottomPos[2] += t * length
          topPos[0] += lanes * 0.5 / 2
          bottomPos[0] -= lanes * 0.5 / 2
        }
        
        gridLines.push([topPos, bottomPos])
        
        // Add markers at center
        const markerPos = [...position] as [number, number, number]
        if (direction === 'x') {
          markerPos[0] += t * length
        } else if (direction === 'y') {
          markerPos[1] += t * length
        } else {
          markerPos[2] += t * length
        }
        
        if (isMeasure) {
          measureMarkers.push({ position: markerPos, scale: 0.4 })
        } else if (isBeat) {
          beatMarkers.push({ position: markerPos, scale: 0.2 })
        } else {
          sixteenthMarkers.push({ position: markerPos, scale: 0.1 })
        }
      }
    }
    
    return { gridLines, sixteenthMarkers, beatMarkers, measureMarkers }
  }, [duration, bpm, beatsPerMeasure, direction, length, position, lanes])
  
  return (
    <group>
      {/* Grid lines */}
      {gridLines.map((line, index) => (
        <Line
          key={`grid-line-${index}`}
          points={line}
          color="#333"
          lineWidth={1}
        />
      ))}
      
      {/* 16th note markers */}
      {sixteenthMarkers.map((marker, index) => (
        <mesh key={`sixteenth-${index}`} position={marker.position}>
          <cylinderGeometry args={[0.01, 0.01, marker.scale]} />
          <meshBasicMaterial color="darkgray" />
        </mesh>
      ))}
      
      {/* Beat markers */}
      {beatMarkers.map((marker, index) => (
        <mesh key={`beat-${index}`} position={marker.position}>
          <cylinderGeometry args={[0.02, 0.02, marker.scale]} />
          <meshBasicMaterial color="lightgray" />
        </mesh>
      ))}
      
      {/* Measure markers */}
      {measureMarkers.map((marker, index) => (
        <mesh key={`measure-${index}`} position={marker.position}>
          <cylinderGeometry args={[0.04, 0.04, marker.scale]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
    </group>
  )
}

export default Timeline3DGrid