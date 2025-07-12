// Shared timeline utilities for consistent width calculation across components

export const DEFAULT_PIXELS_PER_SECOND = 100
export const MIN_PIXELS_PER_SECOND = 20
export const MAX_DURATION = 600 // 10 minutes max - increased since we now have scrolling
export const HEADER_WIDTH = 120 // Width of the left header area

export const getTimelineWidth = (duration: number, availableWidth?: number): number => {
  const safeDuration = Math.min(duration, MAX_DURATION)
  
  if (availableWidth && safeDuration > 0) {
    // Calculate pixels per second to fit the available width
    const contentWidth = availableWidth - HEADER_WIDTH
    const pixelsPerSecond = contentWidth / safeDuration
    
    // For short audio (less than available width at default scale), expand to fill
    // For long audio, use minimum scale to enable scrolling
    if (pixelsPerSecond >= MIN_PIXELS_PER_SECOND) {
      return Math.max(contentWidth, safeDuration * MIN_PIXELS_PER_SECOND)
    } else {
      return safeDuration * MIN_PIXELS_PER_SECOND
    }
  }
  
  // Fallback to default calculation
  return safeDuration * DEFAULT_PIXELS_PER_SECOND
}

export const getViewportWidth = (): number => {
  return 800 // Default viewport width
}

export const isAudioSafe = (duration: number, fileSize?: number): boolean => {
  if (duration > MAX_DURATION) return false
  if (fileSize && fileSize > 50 * 1024 * 1024) return false // 50MB limit
  return true
}