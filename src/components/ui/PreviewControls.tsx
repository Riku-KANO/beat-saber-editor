import React, { useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useTheme } from '../../contexts/ThemeContext'

export default function PreviewControls() {
  const { theme } = useTheme()
  const { 
    isPlaying, 
    currentTime, 
    duration, 
    playAudio, 
    pauseAudio, 
    setCurrentTime,
    setIsPreviewMode,
    audioManager,
    audioBuffer
  } = useEditorStore()
  
  const animationRef = useRef<number>()

  // Set preview mode when component mounts
  useEffect(() => {
    setIsPreviewMode(true)
    
    // Cleanup: unset preview mode when component unmounts
    return () => {
      setIsPreviewMode(false)
    }
  }, [setIsPreviewMode])

  useEffect(() => {
    // AudioManager handles time tracking automatically, no need for manual animation loop
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const handlePlay = async () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      if (audioManager && audioBuffer) {
        playAudio()
      }
    }
  }

  const handleStop = () => {
    pauseAudio()
    setCurrentTime(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    
    // If audio is playing, seek to the new position
    if (audioManager && isPlaying) {
      audioManager.seekTo(newTime)
    }
  }

  return (
    <div 
      className="preview-controls" 
      style={{ 
        backgroundColor: theme.backgroundSecondary,
        borderBottom: `1px solid ${theme.border}`,
        color: theme.text
      }}
    >
      <div className="playback-controls">
        <button 
          onClick={handlePlay}
          style={{ 
            backgroundColor: theme.buttonBackground, 
            color: theme.buttonText,
            border: `1px solid ${theme.border}`,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.buttonHover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.buttonBackground
          }}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button 
          onClick={handleStop}
          style={{ 
            backgroundColor: theme.buttonBackground,
            color: theme.buttonText,
            border: `1px solid ${theme.border}`,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.buttonHover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.buttonBackground
          }}
        >
          ⏹️
        </button>
        <span className="time-display" style={{ color: theme.textSecondary }}>
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
      </div>
      <div className="seek-bar">
        <input
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="seek-slider"
          style={{ 
            backgroundColor: theme.backgroundTertiary,
            accentColor: theme.accent
          }}
        />
      </div>
      <div className="preview-info">
        <p style={{ color: theme.textMuted }}>Preview mode: Objects move towards you during playback</p>
      </div>
    </div>
  )
}