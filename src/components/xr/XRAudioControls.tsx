import { useEffect } from 'react'
import { useXR, useXREvent } from '@react-three/xr'
import { useEditorStore } from '../../store/editorStore'

export function XRAudioControls() {
  const xr = useXR()
  const isPresenting = !!xr.session
  const { isPlaying, playAudio, pauseAudio, setIsPreviewMode } = useEditorStore()

  // Set preview mode when entering XR
  useEffect(() => {
    if (isPresenting) {
      setIsPreviewMode(true)
    } else {
      setIsPreviewMode(false)
    }
  }, [isPresenting, setIsPreviewMode])

  // Listen for XR input events
  useXREvent('squeezestart', (event) => {
    console.log('Squeeze start event:', event)
    // Toggle music on squeeze (grip button)
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }, { handedness: 'right' })

  useXREvent('selectstart', (event) => {
    console.log('Select start event:', event)
    // Toggle music on select (trigger button)
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }, { handedness: 'left' })

  useEffect(() => {
    if (!isPresenting) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Listen for keyboard events as fallback
      if (event.key === 'a' || event.key === 'A') {
        console.log('A key pressed - toggling music')
        if (isPlaying) {
          pauseAudio()
        } else {
          playAudio()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPresenting, isPlaying, playAudio, pauseAudio])

  if (!isPresenting) return null

  // XR UI elements
  return (
    <group position={[0, 1.5, 2]}>
      {/* Status indicator */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={isPlaying ? '#44ff44' : '#ff4444'}
          emissive={isPlaying ? '#44ff44' : '#ff4444'}
          emissiveIntensity={0.8}
        />
      </mesh>
      
      {/* Play/Pause button */}
      <mesh position={[0, -0.5, 0]} onClick={() => {
        if (isPlaying) {
          pauseAudio()
        } else {
          playAudio()
        }
      }}>
        <boxGeometry args={[0.3, 0.3, 0.1]} />
        <meshStandardMaterial 
          color={isPlaying ? '#ff4444' : '#44ff44'}
          emissive={isPlaying ? '#ff4444' : '#44ff44'}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Instructions text */}
      <mesh position={[0, -1.2, 0]}>
        <planeGeometry args={[2, 0.5]} />
        <meshStandardMaterial 
          color="#ffffff"
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}