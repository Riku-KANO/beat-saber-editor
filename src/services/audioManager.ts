import { AudioData } from './audioService'

export interface AudioPlaybackState {
  isPlaying: boolean
  isEditorPlaying: boolean
  currentTime: number
  duration: number
}

export class AudioManager {
  private audioData: AudioData | null = null
  private audioSource: AudioBufferSourceNode | null = null
  private onStateChange: (state: AudioPlaybackState) => void = () => {}
  private animationFrameId: number | null = null
  private startTime: number = 0
  private pausedTime: number = 0
  private playbackStartTime: number = 0
  
  constructor(onStateChange: (state: AudioPlaybackState) => void) {
    this.onStateChange = onStateChange
  }
  
  /**
   * Set audio data for playback
   */
  setAudioData(audioData: AudioData | null) {
    this.stop()
    this.audioData = audioData
    this.pausedTime = 0
    this.emitStateChange()
  }
  
  /**
   * Start audio playback from current position
   */
  async play(fromTime: number = 0) {
    if (!this.audioData) return
    
    // Resume audio context if suspended - await for browser compatibility
    if (this.audioData.context.state === 'suspended') {
      await this.audioData.context.resume()
    }
    
    this.stop() // Stop any existing playback
    
    this.audioSource = this.audioData.context.createBufferSource()
    this.audioSource.buffer = this.audioData.buffer
    this.audioSource.connect(this.audioData.context.destination)
    
    // Start playback from specified time
    this.audioSource.start(0, fromTime)
    this.playbackStartTime = performance.now()
    this.pausedTime = fromTime
    
    // Start animation loop for time tracking
    this.startTimeTracking()
    
    this.emitStateChange()
    
    // Handle playback end
    this.audioSource.onended = () => {
      this.stop()
    }
  }
  
  /**
   * Pause audio playback
   */
  pause() {
    if (this.audioSource && this.audioData) {
      this.pausedTime = this.getCurrentTime()
      this.audioSource.stop()
      this.audioSource = null
      this.stopTimeTracking()
      this.emitStateChange()
    }
  }
  
  /**
   * Stop audio playback
   */
  stop() {
    if (this.audioSource) {
      this.audioSource.stop()
      this.audioSource = null
    }
    this.stopTimeTracking()
    this.pausedTime = 0
    this.emitStateChange()
  }
  
  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioData) return 0
    
    if (this.audioSource) {
      const elapsed = (performance.now() - this.playbackStartTime) / 1000
      return Math.min(this.pausedTime + elapsed, this.audioData.duration)
    }
    
    return this.pausedTime
  }
  
  /**
   * Seek to specific time
   */
  seekTo(time: number) {
    if (!this.audioData) return
    
    const wasPlaying = this.isPlaying()
    this.pause()
    this.pausedTime = Math.max(0, Math.min(time, this.audioData.duration))
    
    if (wasPlaying) {
      this.play(this.pausedTime)
    }
    
    this.emitStateChange()
  }
  
  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.audioSource !== null
  }
  
  /**
   * Get audio duration
   */
  getDuration(): number {
    return this.audioData?.duration || 0
  }
  
  /**
   * Get audio buffer for waveform visualization
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.audioData?.buffer || null
  }
  
  /**
   * Clean up resources
   */
  async cleanup() {
    this.stop()
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.audioData = null
  }
  
  private emitStateChange() {
    this.onStateChange({
      isPlaying: this.isPlaying(),
      isEditorPlaying: this.isPlaying(),
      currentTime: this.getCurrentTime(),
      duration: this.getDuration()
    })
  }
  
  private startTimeTracking() {
    this.stopTimeTracking()
    
    const updateTime = () => {
      if (this.audioSource && this.audioData) {
        const currentTime = this.getCurrentTime()
        
        // Check if we've reached the end
        if (currentTime >= this.audioData.duration) {
          this.stop()
          return
        }
        
        // Emit state change with current time
        this.emitStateChange()
        
        // Schedule next update
        this.animationFrameId = requestAnimationFrame(updateTime)
      }
    }
    
    this.animationFrameId = requestAnimationFrame(updateTime)
  }
  
  private stopTimeTracking() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
}