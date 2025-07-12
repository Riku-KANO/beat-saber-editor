import React, { useRef, Suspense } from 'react'
import { useXRInputSourceStateContext, XRSpace, XRHandModel, PointerCursorModel, useTouchPointer } from '@react-three/xr'
import { Object3D } from 'three'

interface SaberProps {
  color: string
}

function SaberModel({ color }: SaberProps) {
  return (
    <group position={[0, 0, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Saber handle */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Saber blade */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Saber tip */}
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.015, 0.1, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Saber glow effect */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.1}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  )
}

export function CustomLeftHandSaber() {
  const state = useXRInputSourceStateContext('hand')
  const saberRef = useRef<Object3D>(null)
  const pointer = useTouchPointer(saberRef, state)

  return (
    <>
      <XRSpace ref={saberRef} space={state.inputSource.hand.get('middle-finger-tip')!} />
      <Suspense fallback={null}>
        <XRHandModel />
        <SaberModel color="#ff0000" />
      </Suspense>
      <PointerCursorModel pointer={pointer} opacity={0.5} />
    </>
  )
}

export function CustomRightHandSaber() {
  const state = useXRInputSourceStateContext('hand')
  const saberRef = useRef<Object3D>(null)
  const pointer = useTouchPointer(saberRef, state)

  return (
    <>
      <XRSpace ref={saberRef} space={state.inputSource.hand.get('middle-finger-tip')!} />
      <Suspense fallback={null}>
        <XRHandModel />
        <SaberModel color="#0000ff" />
      </Suspense>
      <PointerCursorModel pointer={pointer} opacity={0.5} />
    </>
  )
}