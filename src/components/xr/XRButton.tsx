import React from 'react'
import { XRStore } from '@react-three/xr'
import { useTheme } from '../../contexts/ThemeContext'

interface XRButtonProps {
  className?: string
  xrStore: XRStore
}

export default function XRButton({ className, xrStore }: XRButtonProps) {
  const { theme } = useTheme()

  const handleEnterXR = async () => {
    try {
      // Try VR first, fallback to AR
      if (navigator.xr) {
        const vrSupported = await navigator.xr.isSessionSupported('immersive-vr')
        if (vrSupported) {
          xrStore.enterVR()
        } else {
          const arSupported = await navigator.xr.isSessionSupported('immersive-ar')
          if (arSupported) {
            xrStore.enterAR()
          } else {
            alert('XR not supported on this device')
          }
        }
      } else {
        alert('WebXR not supported on this browser')
      }
    } catch (error) {
      console.error('Error entering XR:', error)
      alert('Failed to enter XR mode')
    }
  }

  const handleExitXR = () => {
    xrStore.exitXR()
  }

  return (
    <button
      className={`xr-button ${className || ''}`}
      onClick={xrStore.isPresenting ? handleExitXR : handleEnterXR}
      style={{
        background: xrStore.isPresenting ? theme.accent : theme.backgroundSecondary,
        color: xrStore.isPresenting ? 'white' : theme.text,
        border: `2px solid ${theme.accent}`,
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        if (!xrStore.isPresenting) {
          e.currentTarget.style.background = theme.accent
          e.currentTarget.style.color = 'white'
        }
      }}
      onMouseLeave={(e) => {
        if (!xrStore.isPresenting) {
          e.currentTarget.style.background = theme.backgroundSecondary
          e.currentTarget.style.color = theme.text
        }
      }}
    >
      <span style={{ fontSize: '20px' }}>🥽</span>
      {xrStore.isPresenting ? 'Exit XR' : 'Enter XR'}
    </button>
  )
}