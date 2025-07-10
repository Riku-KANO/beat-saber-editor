import { useRef, useMemo } from 'react'
import BeatSaberBlock from '../objects/BeatSaberBlock'
import BeatSaberSaber from '../objects/BeatSaberSaber'
import BeatSaberObstacle from '../objects/BeatSaberObstacle'
import BeatSaberBomb from '../objects/BeatSaberBomb'
import Timeline3DAxis from '../timeline/timeline3d/Timeline3DAxis'
import Timeline3DGrid from '../timeline/timeline3d/Timeline3DGrid'
import Timeline3DObjectPlacer from '../timeline/timeline3d/Timeline3DObjectPlacer'
import Keyframe3DVisualizer from '../timeline/timeline3d/Keyframe3DVisualizer'
import Timeline3DSync from '../timeline/timeline3d/Timeline3DSync'
import { useEditorStore } from '../../store/editorStore'

interface SceneProps {
  isPreview?: boolean
}

function Scene({ isPreview = false }: SceneProps) {
  const { objects, currentTime, setSelectedObject, duration } = useEditorStore()
  const orbitControlsRef = useRef<any>(null)

  const renderObject = (obj: any) => {
    const commonProps = {
      key: obj.id,
      object: obj,
      currentTime: currentTime,
      isPreview: isPreview,
      isEditor: !isPreview
    }

    switch (obj.type) {
      case 'block':
        return <BeatSaberBlock {...commonProps} />
      case 'saber':
        return <BeatSaberSaber {...commonProps} />
      case 'obstacle':
        return <BeatSaberObstacle {...commonProps} />
      case 'bomb':
        return <BeatSaberBomb id={obj.id} keyframes={obj.keyframes} isPreview={isPreview} isEditor={!isPreview} />
      default:
        return <BeatSaberBlock {...commonProps} />
    }
  }

  const timelineLength = useMemo(() => {
    // Prevent excessive timeline length that could cause WebGL issues
    if (duration === 0) return 50 // Default length when no audio loaded
    if (duration > 300) return 100 // For very long audio, use fixed length
    return Math.max(50, Math.min(duration * 2, 100))
  }, [duration])
  const timelinePosition: [number, number, number] = [0, 0, 0]
  const timelineDirection = 'z'
  const timelineLanes = 4

  return (
    <group onClick={(e) => {
      e.stopPropagation()
      setSelectedObject(null)
    }}>
      {objects.map(renderObject)}
      
      {/* 3D Timeline - only show in editor mode */}
      {!isPreview && (
        <>
          <Timeline3DAxis
            direction={timelineDirection}
            length={timelineLength}
            position={timelinePosition}
          />
          
          {/* 16th note grid */}
          <Timeline3DGrid
            direction={timelineDirection}
            length={timelineLength}
            position={[timelinePosition[0], timelinePosition[1] + 1, timelinePosition[2]]}
            lanes={timelineLanes}
          />
          
          {/* Object placement interface */}
          <Timeline3DObjectPlacer
            direction={timelineDirection}
            length={timelineLength}
            position={[timelinePosition[0], timelinePosition[1] + 1, timelinePosition[2]]}
            lanes={timelineLanes}
          />
          
          
          {/* Keyframe visualizers for each object */}
          {objects.map((obj) => (
            <Keyframe3DVisualizer
              key={`keyframes-${obj.id}`}
              objectId={obj.id}
              color={obj.color}
              direction={timelineDirection}
              timelineLength={timelineLength}
              timelinePosition={timelinePosition}
            />
          ))}
          
          {/* Timeline sync component */}
          <Timeline3DSync
            direction={timelineDirection}
            timelineLength={timelineLength}
            timelinePosition={timelinePosition}
            orbitControlsRef={orbitControlsRef}
          />
        </>
      )}
    </group>
  )
}

export default Scene