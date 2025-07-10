// Shared timeline utilities for consistent width calculation across components

export const PIXELS_PER_SECOND = 100
export const MAX_DURATION = 600 // 10 minutes max - increased since we now have scrolling
export const VIEWPORT_WIDTH = 800 // Fixed viewport width for canvas

export const getTimelineWidth = (duration: number): number => {
  // No artificial width limit since we have scrolling
  const safeDuration = Math.min(duration, MAX_DURATION)
  return safeDuration * PIXELS_PER_SECOND
}

export const getViewportWidth = (): number => {
  return VIEWPORT_WIDTH
}

export const isAudioSafe = (duration: number, fileSize?: number): boolean => {
  if (duration > MAX_DURATION) return false
  if (fileSize && fileSize > 50 * 1024 * 1024) return false // 50MB limit
  return true
}