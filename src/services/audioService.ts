import { isAudioSafe, MAX_DURATION } from '../utils/timelineUtils'

export interface AudioData {
  file: File
  buffer: AudioBuffer
  context: AudioContext
  duration: number
}

export interface AudioLoadResult {
  audioData: AudioData
  cleanup: () => Promise<void>
}

/**
 * Loads an audio file and returns audio data with cleanup function
 */
export async function loadAudioFile(file: File): Promise<AudioLoadResult> {
  // Check file size limit (30MB - reduced for better performance)
  if (file.size > 30 * 1024 * 1024) {
    throw new Error(`Audio file too large (max 30MB, got ${Math.round(file.size / 1024 / 1024)}MB)`)
  }
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // Check if arrayBuffer is too large  
    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
      throw new Error('Audio data too large after decoding')
    }
    
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Use shared safety check
    if (!isAudioSafe(audioBuffer.duration, file.size)) {
      throw new Error(`Audio file too long (max ${MAX_DURATION / 60} minutes, got ${Math.round(audioBuffer.duration / 60)} minutes)`)
    }
    
    const audioData: AudioData = {
      file,
      buffer: audioBuffer,
      context: audioContext,
      duration: audioBuffer.duration
    }
    
    const cleanup = async () => {
      try {
        await audioContext.close()
      } catch (closeError) {
        console.warn('Failed to close audio context:', closeError)
      }
    }
    
    return { audioData, cleanup }
    
  } catch (error) {
    // Clean up on error
    try {
      await audioContext.close()
    } catch (closeError) {
      console.warn('Failed to close audio context:', closeError)
    }
    throw error
  }
}

/**
 * Validates if an audio file can be loaded
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > 30 * 1024 * 1024) {
    return {
      valid: false,
      error: `Audio file too large (max 30MB, got ${Math.round(file.size / 1024 / 1024)}MB)`
    }
  }
  
  // Check file type
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/flac']
  if (!validTypes.some(type => file.type.startsWith(type) || file.type === type)) {
    return {
      valid: false,
      error: `Unsupported audio format: ${file.type}`
    }
  }
  
  return { valid: true }
}