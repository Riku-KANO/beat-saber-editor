import React, { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function PreviewCameraSetup() {
  const { camera, scene } = useThree()
  
  useEffect(() => {
    // Set initial camera position and orientation
    camera.position.set(0, 2, -8)
    camera.lookAt(0, 0, 5)
    camera.updateProjectionMatrix()
  }, [camera])
  
  return null
}