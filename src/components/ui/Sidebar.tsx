import React, { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useProjectStore, BeatSaberProject } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateProject: (name: string, artist: string, bpm: number) => void
}

function NewProjectModal({ isOpen, onClose, onCreateProject }: NewProjectModalProps) {
  const { theme } = useTheme()
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [bpm, setBpm] = useState(120)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && artist.trim()) {
      onCreateProject(name.trim(), artist.trim(), bpm)
      setName('')
      setArtist('')
      setBpm(120)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: theme.backgroundSecondary,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: theme.text, margin: '0 0 20px 0' }}>New Beat Saber Project</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: theme.textSecondary, display: 'block', marginBottom: '4px' }}>
              Song Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme.backgroundTertiary,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '14px'
              }}
              placeholder="Enter song name"
              required
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: theme.textSecondary, display: 'block', marginBottom: '4px' }}>
              Artist
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme.backgroundTertiary,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '14px'
              }}
              placeholder="Enter artist name"
              required
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: theme.textSecondary, display: 'block', marginBottom: '4px' }}>
              BPM
            </label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme.backgroundTertiary,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '14px'
              }}
              min="60"
              max="300"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.backgroundTertiary,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.textSecondary,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                backgroundColor: theme.accent,
                border: 'none',
                borderRadius: '4px',
                color: theme.accentText,
                cursor: 'pointer'
              }}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectItem({ project, onLoad, onDelete, isActive }: {
  project: BeatSaberProject
  onLoad: () => void
  onDelete: () => void
  isActive: boolean
}) {
  const { theme } = useTheme()
  
  return (
    <div
      style={{
        padding: '12px',
        margin: '4px 0',
        backgroundColor: isActive ? theme.backgroundTertiary : theme.backgroundSecondary,
        border: `1px solid ${isActive ? theme.accent : theme.border}`,
        borderRadius: '6px',
        cursor: 'pointer'
      }}
      onClick={onLoad}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: theme.text, margin: '0 0 4px 0', fontSize: '14px' }}>
            {project.name}
          </h4>
          <p style={{ color: theme.textSecondary, margin: '0 0 4px 0', fontSize: '12px' }}>
            by {project.artist}
          </p>
          <div style={{ color: theme.textMuted, fontSize: '11px' }}>
            <span>{project.bpm} BPM</span>
            {project.duration > 0 && <span> • {project.duration.toFixed(1)}s</span>}
            <span> • {project.objectCount} objects</span>
          </div>
          <div style={{ color: theme.textMuted, fontSize: '10px', marginTop: '4px' }}>
            Modified: {new Date(project.lastModified).toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{
            background: 'none',
            border: 'none',
            color: theme.textMuted,
            cursor: 'pointer',
            padding: '4px',
            fontSize: '12px'
          }}
          title="Delete project"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { theme } = useTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const { 
    projects, 
    currentProject, 
    createProject, 
    deleteProject, 
    loadProject,
    updateCurrentProject
  } = useProjectStore()
  
  const { objects, duration, bpm, setBpm } = useEditorStore()

  React.useEffect(() => {
    if (currentProject) {
      updateCurrentProject({
        objectCount: objects.length,
        duration: duration,
        bpm: bpm
      })
    }
  }, [objects.length, duration, bpm, currentProject, updateCurrentProject])

  const handleCreateProject = (name: string, artist: string, projectBpm: number) => {
    createProject(name, artist, projectBpm)
    setBpm(projectBpm)
  }

  const handleLoadProject = (project: BeatSaberProject) => {
    loadProject(project.id)
    setBpm(project.bpm)
  }

  return (
    <div style={{ 
      height: '100%', 
      width: '250px',
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: theme.backgroundSecondary,
      borderRight: `1px solid ${theme.border}`,
      flexShrink: 0
    }}>
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}` }}>
        <h2 style={{ color: theme.text, margin: '0 0 16px 0', fontSize: '18px' }}>
          Beat Saber Editor
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: theme.accent,
            border: 'none',
            borderRadius: '6px',
            color: theme.accentText,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + New Project
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {currentProject && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: theme.textSecondary, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Project
            </h3>
            <ProjectItem
              project={currentProject}
              onLoad={() => {}}
              onDelete={() => {}}
              isActive={true}
            />
          </div>
        )}

        <h3 style={{ color: theme.textSecondary, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Recent Projects
        </h3>
        
        {projects.length === 0 ? (
          <div style={{ 
            color: theme.textMuted, 
            textAlign: 'center', 
            padding: '24px 16px',
            fontSize: '14px'
          }}>
            No projects yet.
            <br />
            Create your first Beat Saber project!
          </div>
        ) : (
          projects
            .filter(p => p.id !== currentProject?.id)
            .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
            .map(project => (
              <ProjectItem
                key={project.id}
                project={project}
                onLoad={() => handleLoadProject(project)}
                onDelete={() => {
                  if (confirm(`Delete project "${project.name}"?`)) {
                    deleteProject(project.id)
                  }
                }}
                isActive={false}
              />
            ))
        )}
      </div>

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  )
}