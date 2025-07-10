import React, { useMemo } from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { Line } from '@react-three/drei'
import DraggableKeyframe from '../DraggableKeyframe'

interface Keyframe3DVisualizerProps {
  objectId: string
  color: string
  direction: 'x' | 'y' | 'z'
  timelineLength: number
  timelinePosition: [number, number, number]
}

function Keyframe3DVisualizer({ 
  objectId, 
  color, 
  direction, 
  timelineLength, 
  timelinePosition 
}: Keyframe3DVisualizerProps) {
  const { objects, duration, selectedObjectId, setSelectedObject, currentTime } = useEditorStore()
  
  const object = objects.find(obj => obj.id === objectId)
  if (!object) return null
  
  const { keyframePositions, pathLines } = useMemo(() => {
    const keyframePositions: { 
      position: [number, number, number], 
      time: number, 
      index: number,
      isAtCurrentTime: boolean
    }[] = []
    const pathLines: [number, number, number][] = []
    
    // Calculate keyframe positions on timeline
    object.keyframes.forEach((keyframe, index) => {
      const t = keyframe.time / duration
      const timelinePos = [...timelinePosition] as [number, number, number]
      
      if (direction === 'x') {
        timelinePos[0] += t * timelineLength
      } else if (direction === 'y') {
        timelinePos[1] += t * timelineLength
      } else {
        timelinePos[2] += t * timelineLength
      }
      
      const isAtCurrentTime = Math.abs(keyframe.time - currentTime) < 0.01
      
      keyframePositions.push({ 
        position: timelinePos, 
        time: keyframe.time, 
        index,
        isAtCurrentTime
      })
      
      // Add to path line
      pathLines.push(timelinePos)
    })
    
    return { keyframePositions, pathLines }
  }, [object.keyframes, duration, direction, timelineLength, timelinePosition, currentTime])
  
  
  const isSelected = selectedObjectId === objectId
  
  return (
    <group>
      {/* Path line connecting keyframes */}
      {pathLines.length > 1 && (
        <Line
          points={pathLines}
          color={color}
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      )}
      
      {/* Keyframe markers */}
      {keyframePositions.map((kf, index) => (
        <DraggableKeyframe
          key={`keyframe-${index}`}
          objectId={objectId}
          keyframeIndex={kf.index}
          position={kf.position}
          color={color}
          isAtCurrentTime={kf.isAtCurrentTime}
          isSelected={isSelected}
          direction={direction}
          timelineLength={timelineLength}
          timelinePosition={timelinePosition}
        />
      ))}
      
      {/* Keyframe labels */}
      {keyframePositions.map((kf, index) => (
        <group key={`label-${index}`}>
          <mesh position={[kf.position[0], kf.position[1] + 0.3, kf.position[2]]}>
            <planeGeometry args={[0.4, 0.2]} />
            <meshBasicMaterial color="black" transparent opacity={0.7} />
          </mesh>
          <mesh position={[kf.position[0], kf.position[1] + 0.3, kf.position[2] + 0.01]}>
            <planeGeometry args={[0.35, 0.15]} />
            <meshBasicMaterial color="white" />
          </mesh>
          {/* Text would go here - simplified for now */}
        </group>
      ))}
    </group>
  )
}

export default Keyframe3DVisualizer