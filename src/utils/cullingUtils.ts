import { Vector3 } from 'three'
import { useThree } from '@react-three/fiber'

// Camera culling utility
export const CULLING_DISTANCE = 30 // Maximum render distance

export const useCameraCulling = () => {
  const { camera } = useThree()
  
  const isObjectVisible = (objectPosition: [number, number, number]): boolean => {
    const cameraPos = new Vector3()
    camera.getWorldPosition(cameraPos)
    
    const objPos = new Vector3(objectPosition[0], objectPosition[1], objectPosition[2])
    const distance = cameraPos.distanceTo(objPos)
    
    return distance <= CULLING_DISTANCE
  }
  
  return { isObjectVisible }
}

// Simple distance check without hooks (for use in components)
export const isPositionVisible = (
  objectPosition: [number, number, number], 
  cameraPosition: [number, number, number] = [0, 2, -8]
): boolean => {
  const dx = objectPosition[0] - cameraPosition[0]
  const dy = objectPosition[1] - cameraPosition[1]
  const dz = objectPosition[2] - cameraPosition[2]
  
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  return distance <= CULLING_DISTANCE
}