import React, { createContext, useContext, useState, useEffect } from 'react'

export interface ThemeColors {
  // Background colors
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  
  // Text colors
  text: string
  textSecondary: string
  textMuted: string
  accentText: string // Text color for accent backgrounds
  
  // UI colors
  border: string
  borderSecondary: string
  accent: string
  accentSecondary: string
  
  // Canvas colors
  canvasBackground: string
  canvasBorder: string
  canvasText: string
  
  // 3D scene colors
  sceneBackground: string
  gridColor: string
  
  // Timeline colors
  timelineBackground: string
  timelineGrid: string
  timelineText: string
  waveformColor: string
  
  // Button colors
  buttonBackground: string
  buttonHover: string
  buttonActive: string
  buttonText: string
}

export const darkTheme: ThemeColors = {
  background: '#1a1a1a',
  backgroundSecondary: '#2a2a2a',
  backgroundTertiary: '#3a3a3a',
  
  text: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  accentText: '#ffffff',
  
  border: '#444444',
  borderSecondary: '#666666',
  accent: '#4a9eff',
  accentSecondary: '#357abd',
  
  canvasBackground: '#2a2a2a',
  canvasBorder: '#444444',
  canvasText: '#ffffff',
  
  sceneBackground: '#1a1a1a',
  gridColor: '#333333',
  
  timelineBackground: '#2a2a2a',
  timelineGrid: '#444444',
  timelineText: '#ffffff',
  waveformColor: '#4a9eff',
  
  buttonBackground: '#3a3a3a',
  buttonHover: '#4a4a4a',
  buttonActive: '#4a9eff',
  buttonText: '#ffffff'
}

export const lightTheme: ThemeColors = {
  background: '#f5f5f5',
  backgroundSecondary: '#e8e8e8',
  backgroundTertiary: '#d8d8d8',
  
  text: '#2a2a2a',
  textSecondary: '#4a4a4a',
  textMuted: '#6a6a6a',
  accentText: '#ffffff',
  
  border: '#c8c8c8',
  borderSecondary: '#a8a8a8',
  accent: '#2563eb',
  accentSecondary: '#1d4ed8',
  
  canvasBackground: '#e8e8e8',
  canvasBorder: '#c8c8c8',
  canvasText: '#2a2a2a',
  
  sceneBackground: '#f5f5f5',
  gridColor: '#c8c8c8',
  
  timelineBackground: '#e8e8e8',
  timelineGrid: '#c8c8c8',
  timelineText: '#2a2a2a',
  waveformColor: '#2563eb',
  
  buttonBackground: '#d8d8d8',
  buttonHover: '#c8c8c8',
  buttonActive: '#2563eb',
  buttonText: '#2a2a2a'
}

interface ThemeContextType {
  theme: ThemeColors
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(true)
  
  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDark(savedTheme === 'dark')
    }
  }, [])
  
  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])
  
  const toggleTheme = () => {
    setIsDark(!isDark)
  }
  
  const theme = isDark ? darkTheme : lightTheme
  
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}