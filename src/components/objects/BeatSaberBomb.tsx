import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { useEditorStore } from '../../store/editorStore'
import { useCameraCulling } from '../../utils/cullingUtils'

interface BeatSaberBombProps {
  id: string
  keyframes: Array<{
    time: number
    position: [number, number, number]
    rotation: [number, number, number]
  }>
  isPreview?: boolean
  isEditor?: boolean
}

function interpolateKeyframes(keyframes: BeatSaberBombProps['keyframes'], time: number) {
  if (keyframes.length === 0) return { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
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
        ] as [number, number, number],
        rotation: [
          current.rotation[0] + (next.rotation[0] - current.rotation[0]) * t,
          current.rotation[1] + (next.rotation[1] - current.rotation[1]) * t,
          current.rotation[2] + (next.rotation[2] - current.rotation[2]) * t
        ] as [number, number, number]
      }
    }
  }
  
  return sortedKeyframes[0]
}

export default function BeatSaberBomb({ id, keyframes, isPreview = false, isEditor = false }: BeatSaberBombProps) {
  const meshRef = useRef<Mesh>(null)
  const { currentTime, setSelectedObject, selectedObjectId, bpm } = useEditorStore()
  const { isObjectVisible } = useCameraCulling()
  
  // Calculate 16th note interval for tolerance
  const getSixteenthInterval = () => {
    const beatInterval = 60 / bpm
    return beatInterval / 4
  }

  const { position, rotation } = interpolateKeyframes(keyframes, currentTime)

  // Check if object should be rendered (culling)
  const shouldRender = useMemo(() => 
    isObjectVisible(position),
    [position, isObjectVisible]
  )

  // Don't render if object is too far from camera
  if (!shouldRender) {
    return null
  }
  
  const previewPosition: [number, number, number] = isPreview 
    ? [position[0], position[1], position[2] + 20 - currentTime * 10]
    : position
    
  // In Editor mode, show all keyframes as separate instances
  if (isEditor) {
    return (
      <group>
        {keyframes.map((keyframe, index) => {
          const tolerance = getSixteenthInterval() * 0.8
          const isCurrentFrame = Math.abs(keyframe.time - currentTime) < tolerance
          const opacity = isCurrentFrame ? 1.0 : 0.4
          const scale = isCurrentFrame ? 1.1 : 0.9
          
          return (
            <group key={`${id}-kf-${index}`}>
              <mesh
                position={keyframe.position}
                rotation={keyframe.rotation}
                scale={[scale, scale, scale]}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedObject(id)
                }}
              >
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshStandardMaterial
                  color={isCurrentFrame ? '#ff6b6b' : '#2c2c2c'}
                  transparent
                  opacity={opacity}
                  emissive={isCurrentFrame ? '#ff0000' : '#000000'}
                  emissiveIntensity={isCurrentFrame ? 0.3 : 0}
                />
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial
                  color="#ff0000"
                  transparent
                  opacity={opacity * 0.7}
                />
              </mesh>
              
              {/* Keyframe indicator */}
              {isCurrentFrame && (
                <mesh position={[keyframe.position[0], keyframe.position[1] + 0.6, keyframe.position[2]]}>
                  <sphereGeometry args={[0.1, 8, 8]} />
                  <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
                </mesh>
              )}
            </group>
          )
        })}
      </group>
    )
  }
  
  // Preview mode logic - only show if in preview mode
  if (isPreview) {
    const finalPosition = previewPosition

    useFrame(() => {
      if (meshRef.current) {
        meshRef.current.position.set(...previewPosition)
        meshRef.current.rotation.set(...rotation)
      }
    })

    const handleClick = (e: any) => {
      e.stopPropagation()
      setSelectedObject(id)
    }

    const isSelected = selectedObjectId === id

    return (
      <mesh
        ref={meshRef}
        onClick={handleClick}
        position={finalPosition}
        rotation={rotation}
      >
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#ff6b6b' : '#2c2c2c'}
          wireframe={isSelected}
          emissive={isSelected ? '#ff0000' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial
          color="#ff0000"
          transparent
          opacity={0.7}
        />
      </mesh>
    )
  }
  
  // If neither editor nor preview mode, return null
  return null
}