import { Graphics, Text, Container } from 'pixi.js'
import { EditorObject } from '../../../store/editorStore'

export interface ThemeColors {
  background: number
  backgroundSecondary: number
  backgroundTertiary: number
  border: number
  text: number
  textSecondary: number
  accent: number
  waveform: number
  waveformNegative: number
}

export interface DrawingContext {
  pixiSize: { width: number; height: number }
  scrollOffset: number
  totalTimelineWidth: number
  duration: number
  currentTime: number
  bpm: number
  beatsPerMeasure: number
  objects: EditorObject[]
  selectedObjectId: string | null
}

const TRACK_HEIGHT = 60
const HEADER_WIDTH = 120

// BPM-based timing utilities
export const getBeatDuration = (bpm: number) => 60 / bpm
export const getMeasureDuration = (bpm: number, beatsPerMeasure: number) => getBeatDuration(bpm) * beatsPerMeasure
export const getSubdivisionDuration = (bpm: number, beatsPerMeasure: number) => getMeasureDuration(bpm, beatsPerMeasure) / 16

export const getBeatInfo = (time: number, bpm: number, beatsPerMeasure: number) => {
  const beatDuration = getBeatDuration(bpm)
  const beatPosition = time / beatDuration
  const measure = Math.floor(beatPosition / beatsPerMeasure)
  const beatInMeasure = Math.floor(beatPosition % beatsPerMeasure)
  const subdivision = Math.floor((time / getSubdivisionDuration(bpm, beatsPerMeasure)) % 16)
  
  return { measure, beatInMeasure, subdivision, totalBeats: beatPosition }
}

export const drawBackground = (container: Container, colors: ThemeColors, ctx: DrawingContext) => {
  container.removeChildren()
  
  // Main timeline background
  const bg = new Graphics()
    .rect(0, 0, ctx.pixiSize.width, ctx.pixiSize.height)
    .fill(colors.background)
  container.addChild(bg)
}

export const drawWaveformTrackBackground = (container: Container, colors: ThemeColors, ctx: DrawingContext) => {
  // Waveform track background
  const waveformBg = new Graphics()
    .rect(HEADER_WIDTH, 30, ctx.pixiSize.width - HEADER_WIDTH, TRACK_HEIGHT - 2)
    .fill(colors.backgroundSecondary)
    .stroke({ width: 1, color: colors.border })
  container.addChild(waveformBg)
}

export const drawTimeGrid = (container: Container, colors: ThemeColors, ctx: DrawingContext) => {
  container.removeChildren()
  
  if (ctx.duration === 0) return
  
  const gridGraphics = new Graphics()
  const contentWidth = ctx.pixiSize.width - HEADER_WIDTH
  
  // Calculate time range for visible area
  const visibleStartTime = (ctx.scrollOffset / ctx.totalTimelineWidth) * ctx.duration
  const visibleEndTime = ((ctx.scrollOffset + contentWidth) / ctx.totalTimelineWidth) * ctx.duration
  
  // Draw main beat lines
  const beatDuration = getBeatDuration(ctx.bpm)
  for (let time = 0; time <= ctx.duration; time += beatDuration) {
    if (time >= visibleStartTime && time <= visibleEndTime) {
      const x = HEADER_WIDTH + ((time / ctx.duration) * ctx.totalTimelineWidth) - ctx.scrollOffset
      if (x >= HEADER_WIDTH && x <= ctx.pixiSize.width) {
        gridGraphics
          .moveTo(x, 30)
          .lineTo(x, ctx.pixiSize.height)
          .stroke({ width: 2, color: colors.border, alpha: 0.6 })
      }
    }
  }
  
  // Draw subdivision lines (16th notes)
  const subdivisionDuration = getSubdivisionDuration(ctx.bpm, ctx.beatsPerMeasure)
  for (let time = 0; time <= ctx.duration; time += subdivisionDuration) {
    if (time >= visibleStartTime && time <= visibleEndTime) {
      const x = HEADER_WIDTH + ((time / ctx.duration) * ctx.totalTimelineWidth) - ctx.scrollOffset
      if (x >= HEADER_WIDTH && x <= ctx.pixiSize.width) {
        gridGraphics
          .moveTo(x, 30)
          .lineTo(x, ctx.pixiSize.height)
          .stroke({ width: 1, color: colors.border, alpha: 0.3 })
      }
    }
  }

  container.addChild(gridGraphics)
}

// PixiJS best practice: optimal text settings for crisp rendering across all environments
const getTextSettings = () => {
  // Use consistent high-quality settings for all environments
  return {
    fontSize: 14, // Consistent readable size
    resolution: Math.max(window.devicePixelRatio || 1, 2), // Minimum 2x resolution for crisp text
    fontWeight: '500' as const, // Medium weight for better readability
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  }
}

export const drawTrackHeaders = (container: Container, colors: ThemeColors, ctx: DrawingContext) => {
  container.removeChildren()
  
  // Header background
  const headerBg = new Graphics()
    .rect(0, 0, HEADER_WIDTH, ctx.pixiSize.height)
    .fill(colors.backgroundTertiary)
    .stroke({ width: 1, color: colors.border })
  container.addChild(headerBg)
  
  // Time display with improved text rendering
  const beatInfo = getBeatInfo(ctx.currentTime, ctx.bpm, ctx.beatsPerMeasure)
  const textSettings = getTextSettings()
  
  const timeText = new Text({
    text: `${ctx.currentTime.toFixed(3)}s`,
    style: {
      fontFamily: textSettings.fontFamily,
      fontSize: textSettings.fontSize,
      fill: colors.text,
      fontWeight: textSettings.fontWeight,
      align: 'left',
      letterSpacing: 0,
      lineHeight: textSettings.fontSize * 1.2,
      // Remove drop shadow for cleaner text
      stroke: {
        color: colors.background,
        width: 0.5,
        alpha: 0.3
      }
    },
    resolution: textSettings.resolution
  })
  timeText.x = 10
  timeText.y = 5
  container.addChild(timeText)
  
  // Beat position display
  const beatText = new Text({
    text: `M${beatInfo.measure + 1}:${beatInfo.beatInMeasure + 1}:${beatInfo.subdivision + 1}`,
    style: {
      fontFamily: textSettings.fontFamily,
      fontSize: textSettings.fontSize,
      fill: colors.accent,
      fontWeight: textSettings.fontWeight,
      align: 'left',
      letterSpacing: 0,
      lineHeight: textSettings.fontSize * 1.2,
      stroke: {
        color: colors.background,
        width: 0.5,
        alpha: 0.3
      }
    },
    resolution: textSettings.resolution
  })
  beatText.x = 10
  beatText.y = 18
  container.addChild(beatText)
  
  // Waveform track header
  const waveformTrackY = 30
  const waveformTrackHeight = TRACK_HEIGHT - 2
  
  const waveformHeaderBg = new Graphics()
    .rect(0, waveformTrackY, HEADER_WIDTH, waveformTrackHeight)
    .fill(colors.backgroundTertiary)
    .stroke({ width: 1, color: colors.border })
  container.addChild(waveformHeaderBg)
  
  const waveformText = new Text({
    text: 'Waveform',
    style: {
      fontFamily: textSettings.fontFamily,
      fontSize: textSettings.fontSize,
      fill: colors.text,
      fontWeight: textSettings.fontWeight,
      align: 'left',
      letterSpacing: 0,
      lineHeight: textSettings.fontSize * 1.2,
      stroke: {
        color: colors.background,
        width: 0.5,
        alpha: 0.3
      }
    },
    resolution: textSettings.resolution
  })
  waveformText.x = 10
  waveformText.y = waveformTrackY + 10
  container.addChild(waveformText)
  
  // Object track headers
  const objectTracksStartY = waveformTrackY + TRACK_HEIGHT
  ctx.objects.forEach((obj, index) => {
    const trackY = objectTracksStartY + index * TRACK_HEIGHT
    const trackHeight = TRACK_HEIGHT - 2
    
    // Track header background
    const trackHeaderBg = new Graphics()
      .rect(0, trackY, HEADER_WIDTH, trackHeight)
      .fill(ctx.selectedObjectId === obj.id ? colors.backgroundSecondary : colors.backgroundTertiary)
      .stroke({ width: 1, color: colors.border })
    container.addChild(trackHeaderBg)
    
    // Object type text with crisp rendering
    const objText = new Text({
      text: obj.type,
      style: {
        fontFamily: textSettings.fontFamily,
        fontSize: textSettings.fontSize,
        fill: colors.text,
        fontWeight: textSettings.fontWeight,
        align: 'left',
        letterSpacing: 0,
        lineHeight: textSettings.fontSize * 1.2,
        stroke: {
          color: colors.background,
          width: 0.5,
          alpha: 0.3
        }
      },
      resolution: textSettings.resolution
    })
    objText.x = 10
    objText.y = trackY + 5
    container.addChild(objText)
    
    // Color indicator
    const colorMap: Record<string, number> = {
      red: 0xff4444,
      blue: 0x4444ff,
      black: 0x666666,
      white: 0xcccccc
    }
    
    const colorIndicator = new Graphics()
      .circle(85, trackY + trackHeight / 2, 6)
      .fill(colorMap[obj.color] || colors.textSecondary)
    container.addChild(colorIndicator)
    
    // Cut direction text for blocks
    if (obj.type === 'block' && obj.cutDirection) {
      const cutText = new Text({
        text: obj.cutDirection,
        style: {
          fontFamily: textSettings.fontFamily,
          fontSize: Math.max(12, textSettings.fontSize - 2), // Slightly smaller but still readable
          fill: colors.textSecondary,
          fontWeight: '400',
          align: 'left',
          letterSpacing: 0,
          lineHeight: (textSettings.fontSize - 2) * 1.2,
          stroke: {
            color: colors.background,
            width: 0.3,
            alpha: 0.2
          }
        },
        resolution: textSettings.resolution
      })
      cutText.x = 25
      cutText.y = trackY + 20
      container.addChild(cutText)
    }
  })
}

export const drawObjectTracks = (container: Container, colors: ThemeColors, ctx: DrawingContext) => {
  container.removeChildren()
  
  if (ctx.duration === 0) return
  
  const contentWidth = ctx.pixiSize.width - HEADER_WIDTH
  const objectTracksStartY = 30 + TRACK_HEIGHT // Start after waveform track

  ctx.objects.forEach((obj, index) => {
    const trackY = objectTracksStartY + index * TRACK_HEIGHT
    const trackHeight = TRACK_HEIGHT - 2
    
    // Track background
    const trackBg = new Graphics()
      .rect(HEADER_WIDTH, trackY, contentWidth, trackHeight)
      .fill(ctx.selectedObjectId === obj.id ? colors.backgroundTertiary : colors.backgroundSecondary)
      .stroke({ width: 1, color: colors.border })
    
    container.addChild(trackBg)

    // Calculate visible time range
    const visibleStartTime = (ctx.scrollOffset / ctx.totalTimelineWidth) * ctx.duration
    const visibleEndTime = ((ctx.scrollOffset + contentWidth) / ctx.totalTimelineWidth) * ctx.duration

    // Draw keyframes only if they're in the visible range
    obj.keyframes.forEach((keyframe) => {
      if (keyframe.time >= visibleStartTime && keyframe.time <= visibleEndTime) {
        const x = HEADER_WIDTH + ((keyframe.time / ctx.duration) * ctx.totalTimelineWidth) - ctx.scrollOffset
        
        if (x >= HEADER_WIDTH && x <= ctx.pixiSize.width) {
          const keyframeCircle = new Graphics()
            .circle(x, trackY + trackHeight / 2, 5)
            .fill(colors.accent)
            .stroke({ width: 1, color: colors.text })
          
          container.addChild(keyframeCircle)
        }
      }
    })
  })
}