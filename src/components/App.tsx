import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { XR, createXRStore } from '@react-three/xr'
import Scene from './viewport/Scene'
import Timeline from './timeline/Timeline'
import PreviewControls from './ui/PreviewControls'
import View2D from './viewport/View2D'
import Sidebar from './ui/Sidebar'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'
import XRButton from './xr/XRButton'
import { CustomLeftHandSaber, CustomRightHandSaber } from './xr/XRHands'
import { XRInitialPose } from './xr/XRInitialPose'
import { XRAudioControls } from './xr/XRAudioControls'
import { PreviewCameraSetup } from './ui/PreviewCameraSetup'
import { useEditorStore } from '../store/editorStore'
import '../App.css'

type Tab = 'preview' | 'editor'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  
  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}

function SidebarToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { theme } = useTheme()
  
  return (
    <button 
      className="sidebar-toggle"
      onClick={onToggle}
      title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      style={{
        background: 'none',
        border: `1px solid ${theme.border}`,
        color: theme.text,
        fontSize: '16px',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        height: '28px'
      }}
    >
      {isOpen ? '❮' : '❯'}
    </button>
  )
}

// Create XR store with custom hand sabers
const xrStore = createXRStore({
  hand: {
    left: CustomLeftHandSaber,
    right: CustomRightHandSaber
  }
})

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('preview')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen')
    return saved ? JSON.parse(saved) : true
  })
  const { theme } = useTheme()
  
  const { 
    bpm, 
    beatsPerMeasure, 
    setBpm, 
    setBeatsPerMeasure,
    currentTime 
  } = useEditorStore()

  // Time signature presets
  const timeSignatures = [
    { label: '4/4', beatsPerMeasure: 4, noteValue: 4 },
    { label: '3/4', beatsPerMeasure: 3, noteValue: 4 },
    { label: '6/8', beatsPerMeasure: 6, noteValue: 8 },
    { label: '2/4', beatsPerMeasure: 2, noteValue: 4 },
    { label: '5/4', beatsPerMeasure: 5, noteValue: 4 },
    { label: '7/8', beatsPerMeasure: 7, noteValue: 8 }
  ]

  // Get current beat info for display
  const getBeatInfo = (time: number, bpm: number, beatsPerMeasure: number) => {
    const beatDuration = 60 / bpm
    const beatPosition = time / beatDuration
    const measure = Math.floor(beatPosition / beatsPerMeasure)
    const beatInMeasure = Math.floor(beatPosition % beatsPerMeasure)
    const subdivision = Math.floor((time / (beatDuration * beatsPerMeasure / 16)) % 16)
    return { measure, beatInMeasure, subdivision }
  }

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  return (
    <div className="app" style={{ background: theme.background }}>
      <div 
        className="sidebar-container" 
        style={{ 
          width: sidebarOpen ? '250px' : '0px',
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <Sidebar />
      </div>
      <div className="main-area" style={{ 
        width: sidebarOpen ? 'calc(100% - 250px)' : '100%',
        transition: 'width 0.3s ease'
      }}>
        <div className="tab-header" style={{ background: theme.backgroundSecondary, borderBottom: `1px solid ${theme.border}` }}>
          <div className="tab-header-left">
            <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <button 
              className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
              style={{
                color: activeTab === 'preview' ? theme.text : theme.textSecondary,
                background: activeTab === 'preview' ? theme.backgroundTertiary : 'transparent',
                borderBottomColor: activeTab === 'preview' ? theme.accent : 'transparent'
              }}
            >
              Preview
            </button>
            <button 
              className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
              style={{
                color: activeTab === 'editor' ? theme.text : theme.textSecondary,
                background: activeTab === 'editor' ? theme.backgroundTertiary : 'transparent',
                borderBottomColor: activeTab === 'editor' ? theme.accent : 'transparent'
              }}
            >
              Editor
            </button>
          </div>
          <div className="tab-header-right">
            <ThemeToggle />
          </div>
        </div>

        {/* Music Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '10px',
          background: theme.backgroundTertiary,
          borderBottom: `1px solid ${theme.border}`,
          fontSize: '13px'
        }}>
          {/* BPM Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: theme.textSecondary, minWidth: '35px' }}>BPM:</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || 120)}
              style={{
                width: '70px',
                background: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                padding: '4px 8px',
                fontSize: '12px'
              }}
              min="60"
              max="200"
            />
          </div>

          {/* Time Signature Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: theme.textSecondary, minWidth: '85px' }}>Time Signature:</label>
            <select
              value={(() => {
                // Find the time signature that matches current beatsPerMeasure
                const current = timeSignatures.find(ts => ts.beatsPerMeasure === beatsPerMeasure)
                return current ? current.label : '4/4'
              })()}
              onChange={(e) => {
                const selected = timeSignatures.find(ts => ts.label === e.target.value)
                if (selected) {
                  setBeatsPerMeasure(selected.beatsPerMeasure)
                }
              }}
              style={{
                background: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                padding: '4px 8px',
                fontSize: '12px'
              }}
            >
              {timeSignatures.map(ts => (
                <option key={ts.label} value={ts.label}>
                  {ts.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Position Display */}
          <div style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            color: theme.accent,
            fontWeight: 'bold'
          }}>
            <span style={{ color: theme.textSecondary }}>Position:</span>
            <span>
              {(() => {
                const beatInfo = getBeatInfo(currentTime, bpm, beatsPerMeasure)
                return `M${beatInfo.measure + 1}:${beatInfo.beatInMeasure + 1}:${beatInfo.subdivision + 1}`
              })()}
            </span>
            <span style={{ color: theme.textSecondary, fontSize: '11px' }}>
              ({currentTime.toFixed(3)}s)
            </span>
          </div>
        </div>
        <div className="tab-content">
          {activeTab === 'preview' && (
            <div className="preview-tab">
              <div className="preview-controls">
                <PreviewControls />
                <XRButton xrStore={xrStore} />
              </div>
              <Canvas 
                camera={{ position: [0, 2, -8], fov: 60 }}
                gl={{ 
                  antialias: false,
                  alpha: false,
                  powerPreference: "low-power", // Use low-power GPU
                  preserveDrawingBuffer: false,
                  failIfMajorPerformanceCaveat: false,
                  depth: true,
                  stencil: false // Disable stencil buffer
                }}
                dpr={1} // Force pixel ratio to 1
                onCreated={({ gl, camera }) => {
                  try {
                    gl.setClearColor(theme.sceneBackground || '#1a1a1a')
                    gl.setPixelRatio(1) // Force 1x pixel ratio
                    
                    // WebGL context lost recovery
                    gl.domElement.addEventListener('webglcontextlost', (event) => {
                      event.preventDefault()
                    })
                    gl.domElement.addEventListener('webglcontextrestored', () => {
                      // Context restored
                    })
                  } catch (error) {
                    console.error('Error setting up preview canvas:', error)
                  }
                }}
              >
                <XR store={xrStore}>
                  <XRInitialPose />
                  <XRAudioControls />
                  <PreviewCameraSetup />
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} />
                  <group position={[0, 0, 5]}>
                    <Scene isPreview={true} />
                  </group>
                  <Grid infiniteGrid />
                  <OrbitControls 
                    target={[0, 0, 5]}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                  />
                </XR>
              </Canvas>
            </div>
          )}
          {activeTab === 'editor' && (
            <div className="editor-tab">
              <div className="editor-layout">
                <div className="editor-top">
                  <div className="editor-3d">
                    <Canvas 
                      camera={{ position: [0, 2, -8], fov: 60 }}
                      gl={{ 
                        antialias: false,
                        alpha: false,
                        powerPreference: "low-power", // Use low-power GPU
                        preserveDrawingBuffer: false,
                        failIfMajorPerformanceCaveat: false,
                        depth: true,
                        stencil: false // Disable stencil buffer
                      }}
                      dpr={1} // Force pixel ratio to 1
                      onCreated={({ gl }) => {
                        try {
                          gl.setClearColor(theme.sceneBackground || '#1a1a1a')
                          gl.setPixelRatio(1) // Force 1x pixel ratio
                          
                          // WebGL context lost recovery
                          gl.domElement.addEventListener('webglcontextlost', (event) => {
                            event.preventDefault()
                          })
                          gl.domElement.addEventListener('webglcontextrestored', () => {
                            // Context restored
                          })
                        } catch (error) {
                          console.error('Error setting up editor canvas:', error)
                        }
                      }}
                    >
                      <ambientLight intensity={0.5} />
                      <pointLight position={[10, 10, 10]} />
                      <Scene isPreview={false} />
                      <Grid infiniteGrid />
                      <OrbitControls />
                    </Canvas>
                  </div>
                  <div className="editor-2d">
                    <View2D />
                  </div>
                </div>
                <div className="editor-bottom">
                  <Timeline />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App