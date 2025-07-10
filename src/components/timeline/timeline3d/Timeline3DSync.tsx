import { useEffect } from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { useFrame } from '@react-three/fiber'

interface Timeline3DSyncProps {
  direction: 'x' | 'y' | 'z'
  timelineLength: number
  timelinePosition: [number, number, number]
  orbitControlsRef?: React.RefObject<any>
}

function Timeline3DSync({ 
  direction, 
  timelineLength, 
  timelinePosition, 
  orbitControlsRef 
}: Timeline3DSyncProps) {
  const { currentTime, duration, setCurrentTime } = useEditorStore()
  
  // Sync camera position with timeline when currentTime changes
  useFrame(({ camera }) => {
    if (!orbitControlsRef?.current) return
    
    const t = currentTime / duration
    const targetPosition = [...timelinePosition] as [number, number, number]
    
    // Calculate where camera should be positioned based on current time
    if (direction === 'x') {
      targetPosition[0] += t * timelineLength
    } else if (direction === 'y') {
      targetPosition[1] += t * timelineLength
    } else {
      targetPosition[2] += t * timelineLength
    }
    
    // Smoothly move camera to follow timeline
    const currentPos = camera.position
    const lerpFactor = 0.1
    
    if (direction === 'x') {
      camera.position.x = currentPos.x + (targetPosition[0] - currentPos.x) * lerpFactor
    } else if (direction === 'y') {
      camera.position.y = currentPos.y + (targetPosition[1] - currentPos.y) * lerpFactor
    } else {
      camera.position.z = currentPos.z + (targetPosition[2] - currentPos.z) * lerpFactor
    }
    
    // Update orbit controls target
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(targetPosition)
    }
  })
  
  // Handle scroll wheel for timeline scrubbing
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        
        const delta = event.deltaY
        const timeStep = 0.1
        const newTime = Math.max(0, Math.min(duration, currentTime + (delta > 0 ? timeStep : -timeStep)))
        
        setCurrentTime(newTime)
      }
    }
    
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [currentTime, duration, setCurrentTime])
  
  // Handle keyboard shortcuts for timeline navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        const { isPlaying, playAudio, pauseAudio } = useEditorStore.getState()
        if (isPlaying) {
          pauseAudio()
        } else {
          playAudio()
        }
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault()
        const newTime = Math.max(0, currentTime - 0.1)
        setCurrentTime(newTime)
      } else if (event.code === 'ArrowRight') {
        event.preventDefault()
        const newTime = Math.min(duration, currentTime + 0.1)
        setCurrentTime(newTime)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTime, duration, setCurrentTime])
  
  return null
}

export default Timeline3DSync