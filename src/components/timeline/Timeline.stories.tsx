import type { Meta, StoryObj } from '@storybook/react'
import Timeline from './Timeline'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { useEditorStore } from '../../store/editorStore'
import { useEffect } from 'react'

// Mock hook for providing default data
const TimelineWithData = ({ 
  objects = [], 
  currentTime = 0, 
  duration = 10,
  bpm = 120,
  isPlaying = false 
}: any) => {
  useEffect(() => {
    // Set up store with mock data
    const store = useEditorStore.getState()
    
    // Reset and set mock data
    store.objects.length = 0
    store.objects.push(...objects)
    
    // Update store state
    useEditorStore.setState({
      currentTime,
      duration,
      bpm,
      isEditorPlaying: isPlaying,
      selectedObjectId: objects.length > 0 ? objects[0].id : null
    })
  }, [objects, currentTime, duration, bpm, isPlaying])

  return <Timeline />
}

const meta: Meta<typeof Timeline> = {
  title: 'Timeline/Timeline',
  component: Timeline,
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
type Story = StoryObj<typeof Timeline>

const sampleObjects = [
  {
    id: '1',
    type: 'block' as const,
    color: 'red' as const,
    cutDirection: 'up' as const,
    keyframes: [
      { time: 0, position: [-1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
      { time: 2, position: [1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
    ]
  },
  {
    id: '2', 
    type: 'block' as const,
    color: 'blue' as const,
    cutDirection: 'down' as const,
    keyframes: [
      { time: 1, position: [1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
      { time: 3, position: [-1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
    ]
  },
  {
    id: '3',
    type: 'bomb' as const,
    color: 'black' as const,
    keyframes: [
      { time: 1.5, position: [0, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
    ]
  }
]

export const Default: Story = {
  render: () => <TimelineWithData />
}

export const WithSampleData: Story = {
  render: () => (
    <TimelineWithData 
      objects={sampleObjects}
      duration={5}
      currentTime={1}
    />
  )
}

export const Playing: Story = {
  render: () => (
    <TimelineWithData 
      objects={sampleObjects}
      duration={5}
      currentTime={2}
      isPlaying={true}
    />
  )
}

export const EmptyTimeline: Story = {
  render: () => (
    <TimelineWithData 
      objects={[]}
      duration={10}
      currentTime={0}
    />
  )
}

export const LongTimeline: Story = {
  render: () => (
    <TimelineWithData 
      objects={[
        {
          id: '1',
          type: 'block' as const,
          color: 'red' as const,
          cutDirection: 'up' as const,
          keyframes: [
            { time: 0, position: [-1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
            { time: 15, position: [1, 1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
            { time: 30, position: [0, 2, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
          ]
        }
      ]}
      duration={60}
      currentTime={15}
    />
  )
}

export const HighBPM: Story = {
  render: () => (
    <TimelineWithData 
      objects={sampleObjects}
      duration={5}
      currentTime={1}
      bpm={180}
    />
  )
}