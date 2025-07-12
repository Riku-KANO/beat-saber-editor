import React, { useEffect } from 'react'
import { useXR, useXREvent } from '@react-three/xr'
import { useEditorStore } from '../../store/editorStore'

export function XRAudioControls() {
  const { isPresenting } = useXR()
  const { isPlaying, playAudio, pauseAudio } = useEditorStore()

  // Listen for XR input events
  useXREvent('squeezestart', (event) => {
    console.log('Squeeze start event:', event)
    // Toggle music on squeeze (grip button)
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  })

  useXREvent('selectstart', (event) => {
    console.log('Select start event:', event)
    // Toggle music on select (trigger button)
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  })

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

  // Simple status indicator only
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
    </group>
  )
}