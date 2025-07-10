import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useTheme } from '../../contexts/ThemeContext'
import CanvasTimeline from './CanvasTimeline'
import AudioImport from '../ui/AudioImport'
import './Timeline.css'

function Timeline() {
  const { theme } = useTheme()
  const { 
    currentTime, 
    duration, 
    isEditorPlaying,
    bpm,
    beatsPerMeasure,
    setCurrentTime,
    setIsEditorPlaying,
    addObject,
    playAudio,
    pauseAudio
  } = useEditorStore()

  // 16th note navigation functions
  const getSixteenthInterval = () => {
    const beatInterval = 60 / bpm
    return beatInterval / 4
  }

  const getCurrentSixteenthIndex = () => {
    const sixteenthInterval = getSixteenthInterval()
    return Math.round(currentTime / sixteenthInterval)
  }

  const stepToNextSixteenth = () => {
    const sixteenthInterval = getSixteenthInterval()
    const currentIndex = getCurrentSixteenthIndex()
    const nextTime = (currentIndex + 1) * sixteenthInterval
    if (nextTime <= duration) {
      setCurrentTime(nextTime)
    }
  }

  const stepToPrevSixteenth = () => {
    const sixteenthInterval = getSixteenthInterval()
    const currentIndex = getCurrentSixteenthIndex()
    const prevTime = Math.max(0, (currentIndex - 1) * sixteenthInterval)
    setCurrentTime(prevTime)
  }

  const jumpToMeasure = (direction: 'next' | 'prev') => {
    const beatInterval = 60 / bpm
    const measureInterval = beatInterval * beatsPerMeasure
    const currentMeasure = Math.floor(currentTime / measureInterval)
    
    let targetTime: number
    if (direction === 'next') {
      targetTime = (currentMeasure + 1) * measureInterval
    } else {
      targetTime = Math.max(0, currentMeasure * measureInterval)
    }
    
    if (targetTime <= duration) {
      setCurrentTime(targetTime)
    }
  }

  return (
    <div className="timeline" style={{ background: theme.background }}>
      <div className="timeline-controls" style={{ background: theme.backgroundSecondary, borderBottomColor: theme.border }}>
        <AudioImport />
        <div className="transport-controls">
          <button 
            onClick={async () => {
              if (isEditorPlaying) {
                pauseAudio()
              } else {
                await playAudio()
              }
            }}
            className={`play-button ${isEditorPlaying ? 'playing' : ''}`}
            style={{ 
              background: isEditorPlaying ? theme.buttonActive : theme.buttonBackground,
              color: isEditorPlaying ? theme.accentText : theme.buttonText,
              borderColor: theme.border
            }}
          >
            {isEditorPlaying ? '⏸' : '▶'}
          </button>
          <button 
            onClick={() => {
              pauseAudio()
              setCurrentTime(0)
            }}
            className="stop-button"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            ⏹
          </button>
        </div>
        
        <div className="frame-controls">
          <button 
            onClick={() => jumpToMeasure('prev')}
            className="frame-button"
            title="Previous Measure"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            ⏮
          </button>
          <button 
            onClick={stepToPrevSixteenth}
            className="frame-button"
            title="Previous 16th Note"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            ⏪
          </button>
          <span className="frame-info" style={{ color: theme.textSecondary }}>
            {getCurrentSixteenthIndex() + 1}/{Math.ceil(duration / getSixteenthInterval())}
          </span>
          <button 
            onClick={stepToNextSixteenth}
            className="frame-button"
            title="Next 16th Note"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            ⏩
          </button>
          <button 
            onClick={() => jumpToMeasure('next')}
            className="frame-button"
            title="Next Measure"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            ⏭
          </button>
        </div>
        <span className="time-display" style={{ color: theme.textSecondary }}>
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
        <div className="add-object-controls">
          <button 
            onClick={() => {
              // Calculate position on 3D timeline using fixed scale (0.5s per unit)
              const timelinePosition = [0, 0, 0]
              const timelineZ = timelinePosition[2] + currentTime / 0.5
              addObject({
                id: Date.now().toString(),
                type: 'block',
                color: 'red',
                cutDirection: 'up',
                keyframes: [{ time: currentTime, position: [0, 1, timelineZ], rotation: [0, 0, 0] }]
              })
            }}
            className="add-object-button red"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: '#ff4444'
            }}
          >
            + Red Block
          </button>
          <button 
            onClick={() => {
              // Calculate position on 3D timeline using fixed scale (0.5s per unit)
              const timelinePosition = [0, 0, 0]
              const timelineZ = timelinePosition[2] + currentTime / 0.5
              addObject({
                id: Date.now().toString(),
                type: 'block',
                color: 'blue',
                cutDirection: 'down',
                keyframes: [{ time: currentTime, position: [1, 1, timelineZ], rotation: [0, 0, 0] }]
              })
            }}
            className="add-object-button blue"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: '#4444ff'
            }}
          >
            + Blue Block
          </button>
          <button 
            onClick={() => {
              // Calculate position on 3D timeline using fixed scale (0.5s per unit)
              const timelinePosition = [0, 0, 0]
              const timelineZ = timelinePosition[2] + currentTime / 0.5
              addObject({
                id: Date.now().toString(),
                type: 'bomb',
                color: 'black',
                keyframes: [{ time: currentTime, position: [-1, 1, timelineZ], rotation: [0, 0, 0] }]
              })
            }}
            className="add-object-button black"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            + Bomb
          </button>
          <button 
            onClick={() => {
              // Calculate position on 3D timeline using fixed scale (0.5s per unit)
              const timelinePosition = [0, 0, 0]
              const timelineZ = timelinePosition[2] + currentTime / 0.5
              addObject({
                id: Date.now().toString(),
                type: 'obstacle',
                color: 'white',
                keyframes: [{ time: currentTime, position: [0, 0, timelineZ], rotation: [0, 0, 0] }]
              })
            }}
            className="add-object-button white"
            style={{ 
              background: theme.buttonBackground,
              color: theme.buttonText,
              borderColor: theme.border
            }}
          >
            + Wall
          </button>
        </div>
      </div>
      
      <div className="timeline-content">
        <CanvasTimeline height={250} />
      </div>
    </div>
  )
}

export default Timeline