import React, { useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useTheme } from '../../contexts/ThemeContext'

function AudioImport() {
  const { theme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { audioFile, loadAudioFile } = useEditorStore()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      try {
        await loadAudioFile(file)
      } catch (error) {
        console.error('Failed to load audio file:', error)
        alert('Failed to load audio file. Please try a different file.')
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div style={{ marginBottom: '10px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button 
        onClick={handleClick}
        style={{
          padding: '8px 16px',
          backgroundColor: audioFile ? theme.buttonActive : theme.buttonBackground,
          color: audioFile ? theme.accentText : theme.buttonText,
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {audioFile ? `Loaded: ${audioFile.name}` : 'Import Audio'}
      </button>
    </div>
  )
}

export default AudioImport