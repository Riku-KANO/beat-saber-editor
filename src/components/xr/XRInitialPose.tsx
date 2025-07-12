import React, { useEffect } from 'react'
import { useXR } from '@react-three/xr'
import { useThree } from '@react-three/fiber'

export function XRInitialPose() {
  const { isPresenting } = useXR()
  const { camera } = useThree()

  useEffect(() => {
    if (isPresenting) {
      // XRに入った時にカメラをブロックの方向に向ける
      camera.lookAt(0, 0, 5)
    }
  }, [isPresenting, camera])

  return null
}