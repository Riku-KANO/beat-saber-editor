import React, { useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { Sphere } from '@react-three/drei'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

interface DraggableKeyframeProps {
  objectId: string
  keyframeIndex: number
  position: [number, number, number]
  color: string
  isAtCurrentTime: boolean
  isSelected: boolean
  direction: 'x' | 'y' | 'z'
  timelineLength: number
  timelinePosition: [number, number, number]
}

function DraggableKeyframe({
  objectId,
  keyframeIndex,
  position,
  color,
  isAtCurrentTime,
  isSelected,
  direction,
  timelineLength,
  timelinePosition
}: DraggableKeyframeProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Vector3>(new Vector3())
  const { objects, duration, updateKeyframe, setSelectedObject, setCurrentTime } = useEditorStore()
  
  const object = objects.find(obj => obj.id === objectId)
  if (!object) return null
  
  const keyframe = object.keyframes[keyframeIndex]
  if (!keyframe) return null
  
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setIsDragging(true)
    setSelectedObject(objectId)
    
    const point = event.point
    const currentPos = new Vector3(...position)
    setDragOffset(currentPos.clone().sub(point))
    
    // Set current time to this keyframe's time
    setCurrentTime(keyframe.time)
  }
  
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return
    
    event.stopPropagation()
    const point = event.point.clone().add(dragOffset)
    
    // Calculate new time based on position along timeline
    let newTime = keyframe.time
    
    if (direction === 'x') {
      const relativePos = point.x - timelinePosition[0]
      newTime = Math.max(0, Math.min(duration, (relativePos / timelineLength) * duration))
    } else if (direction === 'y') {
      const relativePos = point.y - timelinePosition[1]
      newTime = Math.max(0, Math.min(duration, (relativePos / timelineLength) * duration))
    } else {
      const relativePos = point.z - timelinePosition[2]
      newTime = Math.max(0, Math.min(duration, (relativePos / timelineLength) * duration))
    }
    
    // Update keyframe with new time
    const updatedKeyframe = {
      ...keyframe,
      time: newTime
    }
    
    updateKeyframe(objectId, keyframeIndex, updatedKeyframe)
    setCurrentTime(newTime)
  }
  
  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setIsDragging(false)
  }
  
  // Update mesh position when keyframe changes
  useFrame(() => {
    if (!meshRef.current || isDragging) return
    
    const t = keyframe.time / duration
    const newPos = [...timelinePosition] as [number, number, number]
    
    if (direction === 'x') {
      newPos[0] += t * timelineLength
    } else if (direction === 'y') {
      newPos[1] += t * timelineLength
    } else {
      newPos[2] += t * timelineLength
    }
    
    meshRef.current.position.set(newPos[0], newPos[1], newPos[2])
  })
  
  return (
    <Sphere
      ref={meshRef}
      position={position}
      args={[isAtCurrentTime ? 0.12 : 0.08]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <meshBasicMaterial
        color={isDragging ? 'yellow' : (isAtCurrentTime ? 'yellow' : color)}
        transparent
        opacity={isSelected ? 1.0 : 0.7}
      />
    </Sphere>
  )
}

export default DraggableKeyframe