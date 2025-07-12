import type { Meta, StoryObj } from '@storybook/react'
import DraggableKeyframe from './DraggableKeyframe'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { useEditorStore } from '../../store/editorStore'
import { useEffect } from 'react'

// Mock setup for 3D environment
const DraggableKeyframeWithSetup = ({ 
  objects = [],
  currentTime = 0,
  duration = 10,
  selectedObjectId = null,
  ...keyframeProps 
}: any) => {
  useEffect(() => {
    const store = useEditorStore.getState()
    
    // Reset and set mock data
    store.objects.length = 0
    store.objects.push(...objects)
    
    useEditorStore.setState({
      currentTime,
      duration,
      selectedObjectId
    })
  }, [objects, currentTime, duration, selectedObjectId])

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Grid args={[10, 10]} />
      <DraggableKeyframe {...keyframeProps} />
      <OrbitControls />
    </Canvas>
  )
}

const meta: Meta<typeof DraggableKeyframe> = {
  title: 'Timeline/DraggableKeyframe',
  component: DraggableKeyframe,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ width: '100%', height: '400px', background: '#1a1a1a' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof DraggableKeyframe>

const mockObjects = [
  {
    id: 'test-object',
    type: 'block' as const,
    color: 'red' as const,
    cutDirection: 'up' as const,
    keyframes: [
      { time: 1, position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
      { time: 3, position: [1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
    ]
  }
]

export const RedKeyframe: Story = {
  render: () => (
    <DraggableKeyframeWithSetup
      objects={mockObjects}
      currentTime={1}
      duration={5}
      selectedObjectId="test-object"
      objectId="test-object"
      keyframeIndex={0}
      position={[0, 0, 0]}
      color="#ff4444"
      isAtCurrentTime={true}
      isSelected={true}
      direction="z"
      timelineLength={5}
      timelinePosition={[0, 0, -2]}
    />
  )
}

export const BlueKeyframe: Story = {
  render: () => (
    <DraggableKeyframeWithSetup
      objects={mockObjects}
      currentTime={0}
      duration={5}
      objectId="test-object"
      keyframeIndex={0}
      position={[1, 0, 0]}
      color="#4444ff"
      isAtCurrentTime={false}
      isSelected={false}
      direction="z"
      timelineLength={5}
      timelinePosition={[0, 0, -2]}
    />
  )
}

export const SelectedKeyframe: Story = {
  render: () => (
    <DraggableKeyframeWithSetup
      objects={mockObjects}
      currentTime={1}
      duration={5}
      selectedObjectId="test-object"
      objectId="test-object"
      keyframeIndex={0}
      position={[0, 1, 0]}
      color="#44ff44"
      isAtCurrentTime={true}
      isSelected={true}
      direction="x"
      timelineLength={5}
      timelinePosition={[-2, 0, 0]}
    />
  )
}

export const MultipleKeyframes: Story = {
  render: () => (
    <DraggableKeyframeWithSetup
      objects={[
        {
          id: 'obj1',
          type: 'block' as const,
          color: 'red' as const,
          cutDirection: 'up' as const,
          keyframes: [
            { time: 0.5, position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
            { time: 2, position: [1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
          ]
        },
        {
          id: 'obj2',
          type: 'block' as const,
          color: 'blue' as const,
          cutDirection: 'down' as const,
          keyframes: [
            { time: 1, position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
          ]
        }
      ]}
      currentTime={1}
      duration={3}
      selectedObjectId="obj1"
    >
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Grid args={[10, 10]} />
        
        {/* Red keyframes */}
        <DraggableKeyframe
          objectId="obj1"
          keyframeIndex={0}
          position={[-2, 0, 0]}
          color="#ff4444"
          isAtCurrentTime={false}
          isSelected={true}
          direction="z"
          timelineLength={3}
          timelinePosition={[0, 0, -1]}
        />
        <DraggableKeyframe
          objectId="obj1"
          keyframeIndex={1}
          position={[0, 0, 0]}
          color="#ff4444"
          isAtCurrentTime={false}
          isSelected={true}
          direction="z"
          timelineLength={3}
          timelinePosition={[0, 0, -1]}
        />
        
        {/* Blue keyframe */}
        <DraggableKeyframe
          objectId="obj2"
          keyframeIndex={0}
          position={[-1, 0, 0]}
          color="#4444ff"
          isAtCurrentTime={true}
          isSelected={false}
          direction="z"
          timelineLength={3}
          timelinePosition={[0, 0, -1]}
        />
        
        <OrbitControls />
      </Canvas>
    </DraggableKeyframeWithSetup>
  )
}

export const TimelineYDirection: Story = {
  render: () => (
    <DraggableKeyframeWithSetup
      objects={mockObjects}
      currentTime={2}
      duration={5}
      objectId="test-object"
      keyframeIndex={0}
      position={[0, -2, 0]}
      color="#ff44ff"
      isAtCurrentTime={false}
      isSelected={true}
      direction="y"
      timelineLength={4}
      timelinePosition={[0, -2, 0]}
    />
  )
}