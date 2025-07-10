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
                  antialias: false, // Disable anti-aliasing to save memory
                  alpha: false,     // Disable alpha channel
                  powerPreference: "default" // Use default GPU preference
                }}
                onCreated={({ gl }) => {
                  gl.setClearColor(theme.sceneBackground)
                  // Aggressive memory reduction
                  gl.setPixelRatio(Math.min(window.devicePixelRatio, 1))
                  
                  // WebGL context lost recovery
                  gl.domElement.addEventListener('webglcontextlost', (event) => {
                    event.preventDefault()
                    console.warn('WebGL context lost - audio file may be too large')
                  })
                  gl.domElement.addEventListener('webglcontextrestored', () => {
                    console.log('WebGL context restored')
                  })
                }}
              >
                <XR store={xrStore}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} />
                  <Scene isPreview={true} />
                  <Grid infiniteGrid />
                  <OrbitControls />
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
                        antialias: false, // Disable anti-aliasing to save memory
                        alpha: false,     // Disable alpha channel
                        powerPreference: "default" // Use default GPU preference
                      }}
                      onCreated={({ gl }) => {
                        gl.setClearColor(theme.sceneBackground)
                        // Aggressive memory reduction
                        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1))
                        
                        // WebGL context lost recovery
                        gl.domElement.addEventListener('webglcontextlost', (event) => {
                          event.preventDefault()
                          console.warn('WebGL context lost - audio file may be too large')
                        })
                        gl.domElement.addEventListener('webglcontextrestored', () => {
                          console.log('WebGL context restored')
                        })
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