import React, { useState, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useEditorStore } from '../../../store/editorStore'
import { Mesh, Vector3, Raycaster } from 'three'

interface Timeline3DObjectPlacerProps {
  direction: 'x' | 'y' | 'z'
  length: number
  position: [number, number, number]
  lanes?: number
}

function Timeline3DObjectPlacer({ direction, length, position, lanes = 4 }: Timeline3DObjectPlacerProps) {
  const { camera, raycaster, gl } = useThree()
  const { duration, bpm, beatsPerMeasure, addObject } = useEditorStore()
  const [hoveredCell, setHoveredCell] = useState<{ time: number, lane: number } | null>(null)
  const [selectedObjectType, setSelectedObjectType] = useState<'block' | 'bomb' | 'obstacle'>('block')
  const [selectedColor, setSelectedColor] = useState<'red' | 'blue'>('red')
  const planeRef = useRef<Mesh>(null)
  
  const beatInterval = 60 / bpm
  const sixteenthInterval = beatInterval / 4
  
  const getGridPosition = (time: number, lane: number): [number, number, number] => {
    const t = time / duration
    const laneOffset = (lane - lanes/2) * 0.5 + 0.25
    const gridPos = [...position] as [number, number, number]
    
    if (direction === 'x') {
      gridPos[0] += t * length
      gridPos[2] += laneOffset
    } else if (direction === 'y') {
      gridPos[1] += t * length
      gridPos[2] += laneOffset
    } else {
      gridPos[2] += t * length
      gridPos[0] += laneOffset
    }
    
    return gridPos
  }
  
  const getTimeAndLaneFromPosition = (pos: Vector3): { time: number, lane: number } | null => {
    let timePos: number, lanePos: number
    
    if (direction === 'x') {
      timePos = pos.x - position[0]
      lanePos = pos.z - position[2]
    } else if (direction === 'y') {
      timePos = pos.y - position[1]
      lanePos = pos.z - position[2]
    } else {
      timePos = pos.z - position[2]
      lanePos = pos.x - position[0]
    }
    
    const time = (timePos / length) * duration
    const lane = Math.round((lanePos - 0.25) / 0.5 + lanes/2)
    
    // Snap to 16th note grid
    const snappedTime = Math.round(time / sixteenthInterval) * sixteenthInterval
    
    if (snappedTime >= 0 && snappedTime <= duration && lane >= 0 && lane < lanes) {
      return { time: snappedTime, lane }
    }
    
    return null
  }
  
  const handlePointerMove = (event: any) => {
    if (!planeRef.current) return
    
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    raycaster.setFromCamera({ x, y }, camera)
    const intersects = raycaster.intersectObject(planeRef.current)
    
    if (intersects.length > 0) {
      const intersect = intersects[0]
      const gridCell = getTimeAndLaneFromPosition(intersect.point)
      setHoveredCell(gridCell)
    } else {
      setHoveredCell(null)
    }
  }
  
  const handleClick = (event: any) => {
    if (!hoveredCell) return
    
    const { time, lane } = hoveredCell
    const gridPos = getGridPosition(time, lane)
    
    // Create new object at the clicked timeline position
    const newObject = {
      id: `obj-${Date.now()}-${Math.random()}`,
      type: selectedObjectType,
      color: selectedObjectType === 'block' ? selectedColor : 'black' as any,
      cutDirection: selectedObjectType === 'block' ? 'up' as any : undefined,
      keyframes: [{
        time,
        position: gridPos,
        rotation: [0, 0, 0] as [number, number, number]
      }]
    }
    
    addObject(newObject)
  }
  
  // Create invisible plane for raycasting
  const planeGeometry = React.useMemo(() => {
    const width = direction === 'x' ? length : lanes * 0.5
    const height = direction === 'x' ? lanes * 0.5 : length
    return { width, height }
  }, [direction, length, lanes])
  
  const planePosition = React.useMemo(() => {
    const pos = [...position] as [number, number, number]
    if (direction === 'x') {
      pos[0] += length / 2
    } else if (direction === 'y') {
      pos[1] += length / 2
    } else {
      pos[2] += length / 2
    }
    return pos
  }, [direction, length, position])
  
  const planeRotation = React.useMemo(() => {
    if (direction === 'x') {
      return [0, 0, 0] as [number, number, number]
    } else if (direction === 'y') {
      return [Math.PI / 2, 0, 0] as [number, number, number]
    } else {
      return [0, Math.PI / 2, 0] as [number, number, number]
    }
  }, [direction])
  
  return (
    <group>
      {/* Invisible plane for raycasting */}
      <mesh
        ref={planeRef}
        position={planePosition}
        rotation={planeRotation}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[planeGeometry.width, planeGeometry.height]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      
      {/* Hover indicator */}
      {hoveredCell && (
        <mesh position={getGridPosition(hoveredCell.time, hoveredCell.lane)}>
          <boxGeometry args={[0.4, 0.4, 0.1]} />
          <meshBasicMaterial color="yellow" transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Object type selector UI (floating above timeline) */}
      <group position={[position[0], position[1] + 2, position[2]]}>
        <mesh
          position={[-1, 0, 0]}
          onClick={() => setSelectedObjectType('block')}
        >
          <boxGeometry args={[0.3, 0.3, 0.1]} />
          <meshBasicMaterial color={selectedObjectType === 'block' ? '#ffff00' : '#ff4444'} />
        </mesh>
        
        <mesh
          position={[0, 0, 0]}
          onClick={() => setSelectedObjectType('bomb')}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color={selectedObjectType === 'bomb' ? '#ffff00' : '#333333'} />
        </mesh>
        
        <mesh
          position={[1, 0, 0]}
          onClick={() => setSelectedObjectType('obstacle')}
        >
          <boxGeometry args={[0.4, 0.6, 0.1]} />
          <meshBasicMaterial color={selectedObjectType === 'obstacle' ? '#ffff00' : '#888888'} />
        </mesh>
        
        {/* Color selector for blocks */}
        {selectedObjectType === 'block' && (
          <group position={[0, -0.5, 0]}>
            <mesh
              position={[-0.3, 0, 0]}
              onClick={() => setSelectedColor('red')}
            >
              <boxGeometry args={[0.2, 0.2, 0.1]} />
              <meshBasicMaterial color={selectedColor === 'red' ? '#ffff00' : '#ff4444'} />
            </mesh>
            <mesh
              position={[0.3, 0, 0]}
              onClick={() => setSelectedColor('blue')}
            >
              <boxGeometry args={[0.2, 0.2, 0.1]} />
              <meshBasicMaterial color={selectedColor === 'blue' ? '#ffff00' : '#4444ff'} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}

export default Timeline3DObjectPlacer