import React, { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  objectId: string
  position: [number, number, number]
  rotation: [number, number, number]
  onTransform: (position: [number, number, number], rotation: [number, number, number]) => void
}

function TransformGizmo({ objectId, position, rotation, onTransform }: Props) {
  const groupRef = useRef<Group>(null)
  const { camera, gl } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [dragAxis, setDragAxis] = useState<'x' | 'y' | 'z' | null>(null)
  const [dragStart, setDragStart] = useState<Vector3>(new Vector3())

  const handlePointerDown = (axis: 'x' | 'y' | 'z') => (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragAxis(axis)
    setDragStart(new Vector3().copy(e.point))
    gl.domElement.style.cursor = 'grabbing'
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging || !dragAxis || !dragStart) return
    
    const currentPoint = new Vector3().copy(e.point)
    const delta = currentPoint.clone().sub(dragStart)
    
    const newPosition: [number, number, number] = [...position]
    
    switch (dragAxis) {
      case 'x':
        newPosition[0] += delta.x
        break
      case 'y':
        newPosition[1] += delta.y
        break
      case 'z':
        newPosition[2] += delta.z
        break
    }
    
    onTransform(newPosition, rotation)
    setDragStart(currentPoint)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    setDragAxis(null)
    gl.domElement.style.cursor = 'auto'
  }

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={rotation}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <group scale={0.3}>
        <mesh
          position={[1, 0, 0]}
          onPointerDown={handlePointerDown('x')}
        >
          <cylinderGeometry args={[0.05, 0.05, 2]} rotation={[0, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
        
        <mesh
          position={[0, 1, 0]}
          onPointerDown={handlePointerDown('y')}
        >
          <cylinderGeometry args={[0.05, 0.05, 2]} />
          <meshBasicMaterial color="#44ff44" />
        </mesh>
        
        <mesh
          position={[0, 0, 1]}
          onPointerDown={handlePointerDown('z')}
        >
          <cylinderGeometry args={[0.05, 0.05, 2]} rotation={[Math.PI / 2, 0, 0]} />
          <meshBasicMaterial color="#4444ff" />
        </mesh>
        
        <mesh position={[1.5, 0, 0]}>
          <coneGeometry args={[0.1, 0.3]} rotation={[0, 0, -Math.PI / 2]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
        
        <mesh position={[0, 1.5, 0]}>
          <coneGeometry args={[0.1, 0.3]} />
          <meshBasicMaterial color="#44ff44" />
        </mesh>
        
        <mesh position={[0, 0, 1.5]}>
          <coneGeometry args={[0.1, 0.3]} rotation={[Math.PI / 2, 0, 0]} />
          <meshBasicMaterial color="#4444ff" />
        </mesh>
      </group>
    </group>
  )
}

export default TransformGizmo