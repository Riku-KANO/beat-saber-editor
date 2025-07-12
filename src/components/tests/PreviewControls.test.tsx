import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewControls from '../ui/PreviewControls'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { useEditorStore } from '../../store/editorStore'

// Mock the editor store
vi.mock('../../store/editorStore')

const mockUseEditorStore = vi.mocked(useEditorStore)
const mockPlayAudio = vi.fn()
const mockPauseAudio = vi.fn()
const mockSetCurrentTime = vi.fn()
const mockSetIsPreviewMode = vi.fn()

// Mock audio manager
const mockAudioManager = {
  seekTo: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  isPlaying: vi.fn(() => false),
}

// Wrapper component with theme provider
const PreviewControlsWithProviders = () => (
  <ThemeProvider>
    <PreviewControls />
  </ThemeProvider>
)

describe('PreviewControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation
    mockUseEditorStore.mockReturnValue({
      isPlaying: false,
      currentTime: 0,
      duration: 10,
      playAudio: mockPlayAudio,
      pauseAudio: mockPauseAudio,
      setCurrentTime: mockSetCurrentTime,
      setIsPreviewMode: mockSetIsPreviewMode,
      audioManager: mockAudioManager,
      audioBuffer: new ArrayBuffer(1024),
      // Add other store properties
      objects: [],
      selectedObjectId: null,
      audioFile: null,
      isEditorPlaying: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      loadAudioFile: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })
  })

  it('renders play button when not playing', () => {
    render(<PreviewControlsWithProviders />)
    
    const playButton = screen.getByRole('button', { name: /▶️/i })
    expect(playButton).toBeInTheDocument()
  })

  it('renders pause button when playing', () => {
    mockUseEditorStore.mockReturnValue({
      isPlaying: true,
      currentTime: 2.5,
      duration: 10,
      playAudio: mockPlayAudio,
      pauseAudio: mockPauseAudio,
      setCurrentTime: mockSetCurrentTime,
      setIsPreviewMode: mockSetIsPreviewMode,
      audioManager: mockAudioManager,
      audioBuffer: new ArrayBuffer(1024),
      objects: [],
      selectedObjectId: null,
      audioFile: null,
      isEditorPlaying: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      loadAudioFile: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })

    render(<PreviewControlsWithProviders />)
    
    const pauseButton = screen.getByRole('button', { name: /⏸️/i })
    expect(pauseButton).toBeInTheDocument()
  })

  it('displays current time and duration', () => {
    mockUseEditorStore.mockReturnValue({
      isPlaying: false,
      currentTime: 2.5,
      duration: 10,
      playAudio: mockPlayAudio,
      pauseAudio: mockPauseAudio,
      setCurrentTime: mockSetCurrentTime,
      setIsPreviewMode: mockSetIsPreviewMode,
      audioManager: mockAudioManager,
      audioBuffer: new ArrayBuffer(1024),
      objects: [],
      selectedObjectId: null,
      audioFile: null,
      isEditorPlaying: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      loadAudioFile: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })

    render(<PreviewControlsWithProviders />)
    
    const timeDisplay = screen.getByText('2.50s / 10.00s')
    expect(timeDisplay).toBeInTheDocument()
  })

  it('calls playAudio when play button is clicked and not playing', async () => {
    const user = userEvent.setup()
    render(<PreviewControlsWithProviders />)
    
    const playButton = screen.getByRole('button', { name: /▶️/i })
    await user.click(playButton)
    
    expect(mockPlayAudio).toHaveBeenCalled()
  })

  it('calls pauseAudio when pause button is clicked and playing', async () => {
    const user = userEvent.setup()
    
    mockUseEditorStore.mockReturnValue({
      isPlaying: true,
      currentTime: 2.5,
      duration: 10,
      playAudio: mockPlayAudio,
      pauseAudio: mockPauseAudio,
      setCurrentTime: mockSetCurrentTime,
      setIsPreviewMode: mockSetIsPreviewMode,
      audioManager: mockAudioManager,
      audioBuffer: new ArrayBuffer(1024),
      objects: [],
      selectedObjectId: null,
      audioFile: null,
      isEditorPlaying: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      loadAudioFile: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })

    render(<PreviewControlsWithProviders />)
    
    const pauseButton = screen.getByRole('button', { name: /⏸️/i })
    await user.click(pauseButton)
    
    expect(mockPauseAudio).toHaveBeenCalled()
  })

  it('calls stop functions when stop button is clicked', async () => {
    const user = userEvent.setup()
    render(<PreviewControlsWithProviders />)
    
    const stopButton = screen.getByRole('button', { name: /⏹️/i })
    await user.click(stopButton)
    
    expect(mockPauseAudio).toHaveBeenCalled()
    expect(mockSetCurrentTime).toHaveBeenCalledWith(0)
  })

  it('renders seek slider with correct values', () => {
    mockUseEditorStore.mockReturnValue({
      isPlaying: false,
      currentTime: 3,
      duration: 15,
      playAudio: mockPlayAudio,
      pauseAudio: mockPauseAudio,
      setCurrentTime: mockSetCurrentTime,
      setIsPreviewMode: mockSetIsPreviewMode,
      audioManager: mockAudioManager,
      audioBuffer: new ArrayBuffer(1024),
      objects: [],
      selectedObjectId: null,
      audioFile: null,
      isEditorPlaying: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      loadAudioFile: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })

    render(<PreviewControlsWithProviders />)
    
    const seekSlider = screen.getByDisplayValue('3')
    expect(seekSlider).toBeInTheDocument()
    expect(seekSlider).toHaveAttribute('min', '0')
    expect(seekSlider).toHaveAttribute('max', '15')
    expect(seekSlider).toHaveAttribute('step', '0.1')
  })

  it('updates current time when seek slider is changed', () => {
    render(<PreviewControlsWithProviders />)
    
    const seekSlider = screen.getByDisplayValue('0')
    
    // Use fireEvent for range input changes
    fireEvent.change(seekSlider, { target: { value: '5' } })
    
    expect(mockSetCurrentTime).toHaveBeenCalledWith(5)
  })

  it('sets preview mode on mount and unsets on unmount', () => {
    const { unmount } = render(<PreviewControlsWithProviders />)
    
    expect(mockSetIsPreviewMode).toHaveBeenCalledWith(true)
    
    unmount()
    
    expect(mockSetIsPreviewMode).toHaveBeenCalledWith(false)
  })

  it('displays preview mode info', () => {
    render(<PreviewControlsWithProviders />)
    
    const previewInfo = screen.getByText(/preview mode: objects move towards you during playback/i)
    expect(previewInfo).toBeInTheDocument()
  })
})