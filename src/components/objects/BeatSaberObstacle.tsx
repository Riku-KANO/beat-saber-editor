import React, { useRef, useMemo } from 'react'
import { Mesh } from 'three'
import { EditorObject, Keyframe, useEditorStore } from '../../store/editorStore'
import { useCameraCulling } from '../../utils/cullingUtils'
import TransformGizmo from './TransformGizmo'

interface Props {
  object: EditorObject
  currentTime: number
  isPreview?: boolean
  isEditor?: boolean
}

function interpolateKeyframes(keyframes: Keyframe[], time: number) {
  if (keyframes.length === 0) return { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
  if (keyframes.length === 1) return { position: keyframes[0].position, rotation: keyframes[0].rotation }

  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
  
  if (time <= sortedKeyframes[0].time) {
    return { position: sortedKeyframes[0].position, rotation: sortedKeyframes[0].rotation }
  }
  
  if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    const last = sortedKeyframes[sortedKeyframes.length - 1]
    return { position: last.position, rotation: last.rotation }
  }

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

  return { position: sortedKeyframes[0].position, rotation: sortedKeyframes[0].rotation }
}

function BeatSaberObstacle({ object, currentTime, isPreview = false, isEditor = false }: Props) {
  const meshRef = useRef<Mesh>(null)
  const { selectedObjectId, updateKeyframe, bpm } = useEditorStore()
  const { isObjectVisible } = useCameraCulling()
  
  // Calculate 16th note interval for tolerance
  const getSixteenthInterval = () => {
    const beatInterval = 60 / bpm
    return beatInterval / 4
  }
  
  const interpolated = useMemo(() => 
    interpolateKeyframes(object.keyframes, currentTime),
    [object.keyframes, currentTime]
  )

  // Check if object should be rendered (culling)
  const shouldRender = useMemo(() => 
    isObjectVisible(interpolated.position),
    [interpolated.position, isObjectVisible]
  )

  // Don't render if object is too far from camera
  if (!shouldRender) {
    return null
  }
  
  const previewPosition: [number, number, number] = isPreview 
    ? [interpolated.position[0], interpolated.position[1], interpolated.position[2] + 20 - currentTime * 10]
    : interpolated.position
    
  // In Editor mode, show all keyframes as separate instances
  if (isEditor) {
    return (
      <group>
        {object.keyframes.map((keyframe, index) => {
          const tolerance = getSixteenthInterval() * 0.8
          const isCurrentFrame = Math.abs(keyframe.time - currentTime) < tolerance
          const opacity = isCurrentFrame ? 0.7 : 0.3
          const scale = isCurrentFrame ? 1.1 : 0.9
          
          return (
            <group key={`${object.id}-kf-${index}`}>
              <mesh 
                position={keyframe.position}
                rotation={keyframe.rotation}
                scale={[scale, scale, scale]}
              >
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshStandardMaterial 
                  color="#ff0000" 
                  transparent 
                  opacity={opacity}
                  emissive={isCurrentFrame ? '#ffffff' : '#000000'}
                  emissiveIntensity={isCurrentFrame ? 0.1 : 0}
                />
              </mesh>
              
              {/* Keyframe indicator */}
              {isCurrentFrame && (
                <mesh position={[keyframe.position[0], keyframe.position[1] + 2, keyframe.position[2]]}>
                  <sphereGeometry args={[0.1, 8, 8]} />
                  <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
                </mesh>
              )}
              
              {/* Transform gizmo for current frame */}
              {selectedObjectId === object.id && isCurrentFrame && (
                <TransformGizmo
                  objectId={object.id}
                  position={keyframe.position}
                  rotation={keyframe.rotation}
                  onTransform={(position, rotation) => {
                    updateKeyframe(object.id, index, {
                      ...keyframe,
                      position,
                      rotation
                    })
                  }}
                />
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

    return (
      <group>
        <mesh 
          ref={meshRef}
          position={finalPosition}
          rotation={interpolated.rotation}
        >
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      </group>
    )
  }
  
  // If neither editor nor preview mode, return null
  return null
}

export default BeatSaberObstacle