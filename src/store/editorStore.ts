import { create } from 'zustand'
import { loadAudioFile, validateAudioFile, AudioData } from '../services/audioService'
import { AudioManager } from '../services/audioManager'

export interface Keyframe {
  time: number
  position: [number, number, number]
  rotation: [number, number, number]
}

export interface EditorObject {
  id: string
  type: 'block' | 'saber' | 'obstacle' | 'bomb' | 'effect'
  color: 'red' | 'blue' | 'white' | 'black' | 'purple' | 'green' | 'yellow'
  keyframes: Keyframe[]
  cutDirection?: 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight' | 'any'
  effectType?: 'sparkle' | 'ring' | 'burst' | 'laser'
}

interface EditorState {
  objects: EditorObject[]
  currentTime: number
  duration: number
  selectedObjectId: string | null
  audioFile: File | null
  audioBuffer: AudioBuffer | null
  audioManager: AudioManager | null
  isPlaying: boolean
  isEditorPlaying: boolean
  isPreviewMode: boolean
  bpm: number
  beatsPerMeasure: number
  addObject: (object: EditorObject) => void
  updateObject: (id: string, updates: Partial<EditorObject>) => void
  deleteObject: (id: string) => void
  setCurrentTime: (time: number) => void
  setSelectedObject: (id: string | null) => void
  addKeyframe: (objectId: string, keyframe: Keyframe) => void
  updateKeyframe: (objectId: string, keyframeIndex: number, keyframe: Keyframe) => void
  deleteKeyframe: (objectId: string, keyframeIndex: number) => void
  loadAudioFile: (file: File) => Promise<void>
  playAudio: () => void
  pauseAudio: () => void
  setIsPlaying: (playing: boolean) => void
  setIsEditorPlaying: (playing: boolean) => void
  setIsPreviewMode: (preview: boolean) => void
  setBpm: (bpm: number) => void
  setBeatsPerMeasure: (beats: number) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  objects: [
    {
      id: '1',
      type: 'block',
      color: 'red',
      cutDirection: 'up',
      keyframes: [
        { time: 0, position: [-1, 1, 0], rotation: [0, 0, 0] }
      ]
    },
    {
      id: '2',
      type: 'block',
      color: 'blue',
      cutDirection: 'down',
      keyframes: [
        { time: 0, position: [1, 1, 0], rotation: [0, 0, 0] }
      ]
    }
  ],
  currentTime: 0,
  duration: 5,
  selectedObjectId: null,
  audioFile: null,
  audioBuffer: null,
  audioManager: null,
  isPlaying: false,
  isEditorPlaying: false,
  isPreviewMode: false,
  bpm: 120,
  beatsPerMeasure: 4,

  addObject: (object) =>
    set((state) => ({
      objects: [...state.objects, object]
    })),

  updateObject: (id, updates) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj
      )
    })),

  deleteObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
    })),

  setCurrentTime: (time) => {
    set({ currentTime: time })
    const { audioManager } = get()
    if (audioManager && !audioManager.isPlaying()) {
      // Delay audio seek to avoid immediate callback interference
      setTimeout(() => {
        audioManager.seekTo(time)
      }, 0)
    }
  },

  setSelectedObject: (id) => set({ selectedObjectId: id }),

  addKeyframe: (objectId, keyframe) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === objectId
          ? { ...obj, keyframes: [...obj.keyframes, keyframe].sort((a, b) => a.time - b.time) }
          : obj
      )
    })),

  updateKeyframe: (objectId, keyframeIndex, keyframe) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === objectId
          ? {
              ...obj,
              keyframes: obj.keyframes.map((kf, index) =>
                index === keyframeIndex ? keyframe : kf
              )
            }
          : obj
      )
    })),

  deleteKeyframe: (objectId, keyframeIndex) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === objectId
          ? {
              ...obj,
              keyframes: obj.keyframes.filter((_, index) => index !== keyframeIndex)
            }
          : obj
      )
    })),

  loadAudioFile: async (file) => {
    // Validate file first
    const validation = validateAudioFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }
    
    // Clean up existing audio manager
    const state = get()
    if (state.audioManager) {
      await state.audioManager.cleanup()
    }
    
    try {
      // Load audio file using service
      const { audioData } = await loadAudioFile(file)
      
      // Create new audio manager
      const audioManager = new AudioManager((playbackState) => {
        // Update store state when audio manager state changes
        // Only update currentTime if audio is playing to avoid overriding manual seeks
        const state = get()
        const updates: Partial<Pick<EditorState, 'currentTime' | 'duration' | 'isPlaying' | 'isEditorPlaying'>> = {
          duration: playbackState.duration,
          isPlaying: playbackState.isPlaying,
          isEditorPlaying: playbackState.isEditorPlaying
        }
        
        // Only update currentTime if audio is actually playing to avoid overriding manual seeks
        if (playbackState.isPlaying) {
          updates.currentTime = playbackState.currentTime
        }
        
        set(updates)
      })
      
      // Set audio data in manager
      audioManager.setAudioData(audioData)
      
      set({
        audioFile: file,
        audioBuffer: audioData.buffer,
        audioManager,
        duration: audioData.duration
      })
      
    } catch (error) {
      throw error
    }
  },

  playAudio: async () => {
    const { audioManager, currentTime, isPreviewMode } = get()
    if (!audioManager) return
    
    await audioManager.play(currentTime)
    
    // Update the appropriate playing state based on mode
    if (isPreviewMode) {
      set({ isPlaying: true })
    } else {
      set({ isEditorPlaying: true })
    }
  },

  pauseAudio: () => {
    const { audioManager, isPreviewMode } = get()
    if (!audioManager) return
    
    audioManager.pause()
    
    // Update the appropriate playing state based on mode
    if (isPreviewMode) {
      set({ isPlaying: false })
    } else {
      set({ isEditorPlaying: false })
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setIsEditorPlaying: (playing) => set({ isEditorPlaying: playing }),

  setIsPreviewMode: (preview) => set({ isPreviewMode: preview }),

  setBpm: (bpm) => set({ bpm }),

  setBeatsPerMeasure: (beats) => set({ beatsPerMeasure: beats })
}))