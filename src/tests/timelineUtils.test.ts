import { describe, it, expect } from 'vitest'
import { 
  getTimelineWidth, 
  getViewportWidth, 
  isAudioSafe,
  PIXELS_PER_SECOND,
  MAX_DURATION,
  VIEWPORT_WIDTH
} from '../utils/timelineUtils'

describe('timelineUtils', () => {
  describe('getTimelineWidth', () => {
    it('calculates correct width for normal duration', () => {
      const duration = 5
      const expectedWidth = duration * PIXELS_PER_SECOND
      
      expect(getTimelineWidth(duration)).toBe(expectedWidth)
    })

    it('caps width at max duration', () => {
      const duration = MAX_DURATION + 100
      const expectedWidth = MAX_DURATION * PIXELS_PER_SECOND
      
      expect(getTimelineWidth(duration)).toBe(expectedWidth)
    })

    it('handles zero duration', () => {
      expect(getTimelineWidth(0)).toBe(0)
    })

    it('handles small decimal durations', () => {
      const duration = 1.5
      const expectedWidth = duration * PIXELS_PER_SECOND
      
      expect(getTimelineWidth(duration)).toBe(expectedWidth)
    })

    it('handles exactly max duration', () => {
      const expectedWidth = MAX_DURATION * PIXELS_PER_SECOND
      
      expect(getTimelineWidth(MAX_DURATION)).toBe(expectedWidth)
    })
  })

  describe('getViewportWidth', () => {
    it('returns fixed viewport width', () => {
      expect(getViewportWidth()).toBe(VIEWPORT_WIDTH)
    })
  })

  describe('isAudioSafe', () => {
    it('returns true for safe duration without file size', () => {
      expect(isAudioSafe(300)).toBe(true)
    })

    it('returns false for duration exceeding max', () => {
      expect(isAudioSafe(MAX_DURATION + 1)).toBe(false)
    })

    it('returns true for safe duration and file size', () => {
      const safeFileSize = 10 * 1024 * 1024 // 10MB
      expect(isAudioSafe(300, safeFileSize)).toBe(true)
    })

    it('returns false for file size exceeding 50MB', () => {
      const largeFileSize = 60 * 1024 * 1024 // 60MB
      expect(isAudioSafe(300, largeFileSize)).toBe(false)
    })

    it('returns false for both duration and file size exceeding limits', () => {
      const largeFileSize = 60 * 1024 * 1024 // 60MB
      expect(isAudioSafe(MAX_DURATION + 1, largeFileSize)).toBe(false)
    })

    it('handles zero duration', () => {
      expect(isAudioSafe(0)).toBe(true)
    })

    it('handles exactly max duration', () => {
      expect(isAudioSafe(MAX_DURATION)).toBe(true)
    })

    it('handles exactly 50MB file size', () => {
      const exactFileSize = 50 * 1024 * 1024 // 50MB
      expect(isAudioSafe(300, exactFileSize)).toBe(true)
    })

    it('handles file size just over 50MB', () => {
      const overFileSize = 50 * 1024 * 1024 + 1 // 50MB + 1 byte
      expect(isAudioSafe(300, overFileSize)).toBe(false)
    })
  })

  describe('constants', () => {
    it('has expected constant values', () => {
      expect(PIXELS_PER_SECOND).toBe(100)
      expect(MAX_DURATION).toBe(600)
      expect(VIEWPORT_WIDTH).toBe(800)
    })
  })
})