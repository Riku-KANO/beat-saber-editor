import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AudioImport from '../ui/AudioImport'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { useEditorStore } from '../../store/editorStore'

// Mock the editor store
vi.mock('../../store/editorStore')

const mockUseEditorStore = vi.mocked(useEditorStore)
const mockLoadAudioFile = vi.fn()

// Wrapper component with theme provider
const AudioImportWithProviders = () => (
  <ThemeProvider>
    <AudioImport />
  </ThemeProvider>
)

describe('AudioImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation
    mockUseEditorStore.mockReturnValue({
      audioFile: null,
      loadAudioFile: mockLoadAudioFile,
      // Add other store properties with default values
      objects: [],
      currentTime: 0,
      duration: 0,
      selectedObjectId: null,
      audioBuffer: null,
      audioManager: null,
      isPlaying: false,
      isEditorPlaying: false,
      isPreviewMode: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setCurrentTime: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      playAudio: vi.fn(),
      pauseAudio: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setIsPreviewMode: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })
  })

  it('renders import button when no audio file is loaded', () => {
    render(<AudioImportWithProviders />)
    
    const button = screen.getByRole('button', { name: /import audio/i })
    expect(button).toBeInTheDocument()
  })

  it('shows loaded file name when audio file is present', () => {
    const mockFile = new File([''], 'test-audio.mp3', { type: 'audio/mp3' })
    
    mockUseEditorStore.mockReturnValue({
      audioFile: mockFile,
      loadAudioFile: mockLoadAudioFile,
      objects: [],
      currentTime: 0,
      duration: 0,
      selectedObjectId: null,
      audioBuffer: null,
      audioManager: null,
      isPlaying: false,
      isEditorPlaying: false,
      isPreviewMode: false,
      bpm: 120,
      beatsPerMeasure: 4,
      addObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      setCurrentTime: vi.fn(),
      setSelectedObject: vi.fn(),
      addKeyframe: vi.fn(),
      updateKeyframe: vi.fn(),
      deleteKeyframe: vi.fn(),
      playAudio: vi.fn(),
      pauseAudio: vi.fn(),
      setIsPlaying: vi.fn(),
      setIsEditorPlaying: vi.fn(),
      setIsPreviewMode: vi.fn(),
      setBpm: vi.fn(),
      setBeatsPerMeasure: vi.fn(),
    })

    render(<AudioImportWithProviders />)
    
    const button = screen.getByRole('button', { name: /loaded: test-audio.mp3/i })
    expect(button).toBeInTheDocument()
  })

  it('opens file dialog when button is clicked', async () => {
    const user = userEvent.setup()
    render(<AudioImportWithProviders />)
    
    const button = screen.getByRole('button', { name: /import audio/i })
    
    // Mock the click method on the hidden input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    
    await user.click(button)
    
    expect(clickSpy).toHaveBeenCalled()
  })

  it('calls loadAudioFile when valid audio file is selected', async () => {
    mockLoadAudioFile.mockResolvedValueOnce(undefined)
    
    render(<AudioImportWithProviders />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' })
    
    await userEvent.upload(fileInput, mockFile)
    
    expect(mockLoadAudioFile).toHaveBeenCalledWith(mockFile)
  })

  it('handles loadAudioFile errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    mockLoadAudioFile.mockRejectedValueOnce(new Error('Failed to load'))
    
    render(<AudioImportWithProviders />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' })
    
    await userEvent.upload(fileInput, mockFile)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load audio file:', expect.any(Error))
      expect(alertSpy).toHaveBeenCalledWith('Failed to load audio file. Please try a different file.')
    })
    
    consoleSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('only accepts audio files', () => {
    render(<AudioImportWithProviders />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toHaveAttribute('accept', 'audio/*')
  })

  it('has hidden file input', () => {
    render(<AudioImportWithProviders />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toHaveStyle({ display: 'none' })
  })
})