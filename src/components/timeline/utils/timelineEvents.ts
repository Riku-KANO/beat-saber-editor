import React from 'react'
import { getSubdivisionDuration } from './timelineDrawing'

export interface TimelineEventHandlers {
  setCurrentTime: (time: number) => void
  setScrollOffset: (offset: number) => void
  setIsDraggingPlayhead: (dragging: boolean) => void
}

export interface TimelineEventContext {
  duration: number
  totalTimelineWidth: number
  scrollOffset: number
  maxScrollOffset: number
  pixiSize: { width: number; height: number }
  bpm: number
  beatsPerMeasure: number
  currentTime: number
}

const HEADER_WIDTH = 120

// Snap to subdivision (1/16 of a measure)
export const snapToSubdivision = (time: number, bpm: number, beatsPerMeasure: number) => {
  const subdivisionDuration = getSubdivisionDuration(bpm, beatsPerMeasure)
  return Math.round(time / subdivisionDuration) * subdivisionDuration
}

export const createMouseEventHandlers = (
  handlers: TimelineEventHandlers,
  context: TimelineEventContext,
  pixiContainerRef: React.RefObject<HTMLDivElement>
) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = pixiContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicking on playhead area for dragging
    if (context.duration > 0) {
      const playheadX = HEADER_WIDTH + ((context.currentTime / context.duration) * context.totalTimelineWidth) - context.scrollOffset
      if (x >= playheadX - 10 && x <= playheadX + 10 && y >= 0 && y <= context.pixiSize.height) {
        handlers.setIsDraggingPlayhead(true)
        return
      }
    }
    
    // Set timeline position for clicks outside playhead
    if (x >= HEADER_WIDTH && context.duration > 0) {
      const timelineX = x - HEADER_WIDTH + context.scrollOffset
      const rawTime = (timelineX / context.totalTimelineWidth) * context.duration
      const snappedTime = snapToSubdivision(rawTime, context.bpm, context.beatsPerMeasure)
      handlers.setCurrentTime(Math.max(0, Math.min(context.duration, snappedTime)))
    }
  }

  const handleMouseMove = (e: React.MouseEvent, isDraggingPlayhead: boolean) => {
    if (!isDraggingPlayhead || context.duration === 0) return
    
    const rect = pixiContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const timelineX = x - HEADER_WIDTH + context.scrollOffset
    const rawTime = (timelineX / context.totalTimelineWidth) * context.duration
    const snappedTime = snapToSubdivision(rawTime, context.bpm, context.beatsPerMeasure)
    handlers.setCurrentTime(Math.max(0, Math.min(context.duration, snappedTime)))
  }

  const handleMouseUp = () => {
    handlers.setIsDraggingPlayhead(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const scrollSpeed = 50
    const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed
    const newOffset = Math.max(0, Math.min(context.maxScrollOffset, context.scrollOffset + delta))
    handlers.setScrollOffset(newOffset)
  }

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  }
}

export const createKeyboardEventHandlers = (
  handlers: TimelineEventHandlers,
  context: TimelineEventContext
) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!document.activeElement?.closest('.timeline')) return
    
    const scrollSpeed = 100
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        handlers.setScrollOffset(Math.max(0, context.scrollOffset - scrollSpeed))
        break
      case 'ArrowRight':
        e.preventDefault()
        handlers.setScrollOffset(Math.min(context.maxScrollOffset, context.scrollOffset + scrollSpeed))
        break
      case 'Home':
        e.preventDefault()
        handlers.setScrollOffset(0)
        break
      case 'End':
        e.preventDefault()
        handlers.setScrollOffset(context.maxScrollOffset)
        break
    }
  }

  return { handleKeyDown }
}